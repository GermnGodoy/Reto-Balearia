"use client";

import dynamic from "next/dynamic";
import { useMemo, useEffect, useState } from "react";

// Dynamically import Plotly to avoid SSR issues
const Plot = dynamic(() => import("react-plotly.js"), { ssr: false });

// ───────────────── Types flexibles ─────────────────
type SHAPNode = { name?: string; label?: string; id?: string | number };
type SHAPLink = { source: number | string; target: number | string; value: number };

export type SHAPData = {
  nodes: SHAPNode[];
  links: SHAPLink[];
};

type SHAPChartProps = {
  data: SHAPData;
  baseValue?: number; // baseline (E[f(x)]) si lo tienes; si no, 0
  className?: string;
};

export function SHAPChart({ data, baseValue = 0, className = "" }: SHAPChartProps) {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const checkTheme = () => setIsDark(document.documentElement.classList.contains("dark"));
    checkTheme();
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  // ─────────────── Normalización de nodos/links ───────────────
  const norm = useMemo(() => {
    const nodes = Array.isArray(data?.nodes) ? data.nodes : [];
    const links = Array.isArray(data?.links) ? data.links : [];

    // nombre amable de nodo
    const nodeName = (n: SHAPNode, i: number) => {
      const raw = (n.name ?? n.label ?? (typeof n.id !== "undefined" ? String(n.id) : `Node ${i}`)).toString();
      return raw;
    };

    // construir arrays finales de nombres y mapa para resolver ids/labels a índices
    const names: string[] = nodes.map(nodeName);
    const indexByKey = new Map<string, number>();
    nodes.forEach((n, i) => {
      const candidates = [
        typeof n.id !== "undefined" ? String(n.id) : null,
        typeof n.name === "string" ? n.name : null,
        typeof n.label === "string" ? n.label : null,
        names[i],
      ].filter(Boolean) as string[];
      for (const key of candidates) indexByKey.set(key.toLowerCase(), i);
    });

    // localiza índice de Prediction (id/label/name = "Prediction", case-insensitive)
    const predictionIndexExplicit = (() => {
      const idx = names.findIndex((nm) => nm.toLowerCase() === "prediction");
      if (idx >= 0) return idx;
      // también prueba por id/label "Prediction" si no estaba en name
      const probe = indexByKey.get("prediction");
      if (typeof probe === "number") return probe;
      return -1;
    })();

    const predictionIndex = predictionIndexExplicit >= 0 ? predictionIndexExplicit : Math.max(0, names.length - 1);

    // resolver source/target a índices
    const resolve = (v: number | string): number | null => {
      if (typeof v === "number" && Number.isFinite(v) && v >= 0 && v < names.length) return v;
      if (typeof v === "string") {
        const m = indexByKey.get(v.toLowerCase());
        if (typeof m === "number") return m;
      }
      return null;
    };

    // normalizar links válidos
    const normLinks = links
      .map((lk) => {
        const s = resolve(lk.source);
        const t = resolve(lk.target);
        const val = Number(lk.value);
        if (s === null || t === null || !Number.isFinite(val)) return null;
        return { source: s, target: t, value: val };
      })
      .filter(Boolean) as { source: number; target: number; value: number }[];

    return { names, links: normLinks, predictionIndex };
  }, [data]);

  const chartData = useMemo(() => {
    // Extrae contribuciones hacia Prediction
    const contributions = norm.links
      .filter((link) => link.target === norm.predictionIndex)
      .map((link) => ({
        feature: norm.names[link.source],
        value: link.value, // usamos el valor tal cual (normalmente >=0 en tus “pesos”)
      }))
      .filter((c) => Number.isFinite(c.value))
      .sort((a, b) => Math.abs(b.value) - Math.abs(a.value)); // mayor a menor

    // Waterfall acumulado (todos positivos si vienen de “pesos”)
    let cumulative = baseValue ?? 0;
    const cumulativeStarts: number[] = [];
    const cumulativeEnds: number[] = [];
    for (const c of contributions) {
      cumulativeStarts.push(cumulative);
      cumulative += c.value;
      cumulativeEnds.push(cumulative);
    }

    return {
      features: contributions.map((c) => c.feature),
      values: contributions.map((c) => c.value),
      cumulativeStarts,
      cumulativeEnds,
    };
  }, [norm, baseValue]);

  const textColor = isDark ? "rgb(255, 255, 255)" : "rgb(0, 0, 0)";
  const gridColor = isDark ? "rgb(115, 115, 115)" : "rgb(229, 229, 229)";
  const barColorPos = "rgb(255, 100, 120)"; // positivo
  const barColorNeg = "rgb(100, 150, 255)"; // (por si acaso llegaran negativos)
  const connectorColor = "rgb(163, 163, 163)";

  // Construir shapes y anotaciones
  const shapes: any[] = [];
  const annotations: any[] = [];

  chartData.values.forEach((value, index) => {
    const yPos = chartData.features.length - index - 1; // top → bottom
    const start = chartData.cumulativeStarts[index];
    const end = chartData.cumulativeEnds[index];
    const color = value >= 0 ? barColorPos : barColorNeg;

    const barHeight = 0.6;
    const triangleWidth = Math.max(Math.abs(value) * 0.08, 0.02); // mínimo visual

    // Conector desde barra anterior
    if (index > 0) {
      const prevEnd = chartData.cumulativeEnds[index - 1];
      const prevYPos = chartData.features.length - index;
      shapes.push({
        type: "line",
        x0: prevEnd,
        x1: start,
        y0: prevYPos - barHeight / 2,
        y1: yPos + barHeight / 2,
        line: { color: connectorColor, width: 1 },
        xref: "x",
        yref: "y",
      });
    }

    // Rectángulo principal
    const barEnd = value >= 0 ? end - triangleWidth : end + triangleWidth;
    shapes.push({
      type: "rect",
      x0: Math.min(start, barEnd),
      x1: Math.max(start, barEnd),
      y0: yPos - barHeight / 2,
      y1: yPos + barHeight / 2,
      fillcolor: color,
      line: { width: 0 },
      xref: "x",
      yref: "y",
    });

    // Triángulo de punta
    const triangleStart = value >= 0 ? end - triangleWidth : end + triangleWidth;
    shapes.push({
      type: "path",
      path:
        value >= 0
          ? `M ${triangleStart},${yPos - barHeight / 2} L ${end},${yPos} L ${triangleStart},${yPos + barHeight / 2} Z`
          : `M ${triangleStart},${yPos - barHeight / 2} L ${end},${yPos} L ${triangleStart},${yPos + barHeight / 2} Z`,
      fillcolor: color,
      line: { width: 0 },
      xref: "x",
      yref: "y",
    });

    // Etiqueta de feature (centrada en la barra)
    annotations.push({
      x: (start + end) / 2,
      y: yPos,
      text: chartData.features[index],
      showarrow: false,
      font: { size: 11, color: "white", weight: 600 },
      xref: "x",
      yref: "y",
      xanchor: "center",
      yanchor: "middle",
    });

    // Valor aportado
    annotations.push({
      x: end,
      y: yPos,
      text: `${value >= 0 ? "+" : ""}${value.toFixed(2)}`,
      showarrow: false,
      font: { size: 10, color: color },
      xanchor: value >= 0 ? "left" : "right",
      xshift: value >= 0 ? 8 : -8,
      xref: "x",
      yref: "y",
    });
  });

  // Anotaciones de baseline y predicción final
  annotations.push({
    x: baseValue ?? 0,
    y: chartData.features.length,
    text: `E[f(x)] = ${(baseValue ?? 0).toFixed(2)}`,
    showarrow: false,
    font: { size: 11, color: textColor },
    xanchor: "center",
    yanchor: "bottom",
    xref: "x",
    yref: "y",
  });

  const finalValue =
    chartData.cumulativeEnds.length > 0
      ? chartData.cumulativeEnds[chartData.cumulativeEnds.length - 1]
      : baseValue ?? 0;

  annotations.push({
    x: finalValue,
    y: -0.5,
    text: `f(x) = ${finalValue.toFixed(2)}`,
    showarrow: false,
    font: { size: 11, color: textColor },
    xanchor: "center",
    yanchor: "top",
    xref: "x",
    yref: "y",
  });

  return (
    <div className={className}>
      <Plot
        key={isDark ? "dark" : "light"}
        data={[
          {
            type: "scatter",
            mode: "markers",
            x: chartData.cumulativeEnds,
            y: chartData.cumulativeEnds.map((_, index) => chartData.features.length - index - 1),
            marker: { size: 15, color: "rgba(0,0,0,0)", line: { width: 0 } },
            text: chartData.cumulativeEnds.map((val, idx) =>
              `<b>${chartData.features[idx]}</b><br>Prediction: ${val.toFixed(
                2
              )}<br>Contribution: ${chartData.values[idx] >= 0 ? "+" : ""}${chartData.values[idx].toFixed(2)}`
            ),
            hovertemplate: "%{text}<extra></extra>",
            showlegend: false,
            hoverlabel: {
              bgcolor: isDark ? "rgb(0, 0, 0)" : "rgb(255, 255, 255)",
              bordercolor: isDark ? "rgb(255, 255, 255)" : "rgb(0, 0, 0)",
              font: { color: textColor, size: 12 },
            },
          },
        ]}
        layout={{
          autosize: true,
          paper_bgcolor: "rgba(0,0,0,0)",
          plot_bgcolor: "rgba(0,0,0,0)",
          font: { family: "system-ui, -apple-system, sans-serif", size: 12, color: textColor },
          xaxis: {
            title: { text: "Contribution", font: { size: 13, color: textColor } },
            tickfont: { size: 11, color: textColor },
            gridcolor: gridColor,
            showgrid: true,
            zeroline: true,
            zerolinecolor: "rgb(163, 163, 163)",
            zerolinewidth: 2,
          },
          yaxis: {
            title: { text: "", font: { size: 13, color: textColor } },
            tickfont: { size: 11, color: textColor },
            gridcolor: gridColor,
            showgrid: false,
            zeroline: false,
            showticklabels: false,
            range: [-1, (chartData.features.length ?? 0) + 0.5],
          },
          margin: { l: 20, r: 100, t: 30, b: 60 },
          showlegend: false,
          hovermode: "closest",
          shapes,
          annotations,
        }}
        config={{ displayModeBar: false, responsive: true }}
        useResizeHandler
        style={{ width: "100%", height: "100%" }}
      />
    </div>
  );
}
