"use client";

import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Area, ComposedChart, Line, XAxis, YAxis, ErrorBar, ResponsiveContainer } from "recharts";

type TrendChartProps = {
  data: any[];
  actualDataKey: string;       // clave deseada (p.ej. "Precio" / "Demanda") → si no existe, hace fallback
  predictedDataKey: string;
  errorDataKey: string;
  actualColor: string;
  predictedColor?: string;
  label: string;               // usado para inferir alias (Precio/Demanda)
  xAxisKey?: string;
  className?: string;
};

export function TrendChart({
  data,
  actualDataKey,
  predictedDataKey,
  errorDataKey,
  actualColor,
  predictedColor = "black",
  label,
  xAxisKey = "progress",
  className = "h-[250px] w-full",
}: TrendChartProps) {
  // Helpers
  const isNum = (v: any) => typeof v === "number" && Number.isFinite(v);
  const getNum = (o: any, k?: string | null) => (k && o && isNum(o[k]) ? (o[k] as number) : null);

  // Inferencia de alias por etiqueta si las claves no existen
  const lowerLabel = (label || "").toLowerCase();
  const isPrice = lowerLabel.includes("precio") || lowerLabel.includes("price");
  const isDemand = lowerLabel.includes("demanda") || lowerLabel.includes("demand");

  const actualFallback   = isPrice ? "profit"         : isDemand ? "people"          : actualDataKey;
  const predictedFallback= isPrice ? "predictedProfit": isDemand ? "predictedPeople" : predictedDataKey;
  const errorFallback    = isPrice ? "profitError"    : isDemand ? "peopleError"     : errorDataKey;

  // Gradient id único por serie para evitar colisiones
  const gradId = `fill_actual_${(label || "series").replace(/\W+/g, "_")}`;

  // Normalización de datos: crea claves internas estables
  const prepared = Array.isArray(data)
    ? data
        .map((row, idx) => {
          const x = isNum(row?.[xAxisKey]) ? row[xAxisKey] : idx;

          // Actual
          const aFromKey = getNum(row, actualDataKey);
          const aFromAlias = aFromKey ?? getNum(row, actualFallback);
          const actual = aFromAlias ?? null;

          // Predicho
          const pFromKey = getNum(row, predictedDataKey);
          const pFromAlias = pFromKey ?? getNum(row, predictedFallback) ?? actual;
          const predicted = pFromAlias ?? null;

          // Error → rango
          const eFromKey = getNum(row, errorDataKey);
          const eFromAlias = eFromKey ?? getNum(row, errorFallback) ?? 0;
          const err = Math.abs(eFromAlias || 0);

          const baseForErr = isNum(predicted) ? (predicted as number) : (isNum(actual) ? (actual as number) : 0);
          const errRange: [number, number] = [baseForErr - err, baseForErr + err];

          return {
            ...row,
            __x: x,
            __actual: isNum(actual) ? (actual as number) : null,
            __pred: isNum(predicted) ? (predicted as number) : null,
            __errRange: err ? errRange : [baseForErr, baseForErr],
          };
        })
        // Mantén puntos donde haya algo que pintar
        .filter((r) => r.__actual != null || r.__pred != null)
    : [];

  // Si no hay nada renderizable, evita gráfico vacío
  if (!prepared.length) {
    return (
      <div className={`${className} flex items-center justify-center text-xs text-neutral-500`}>
        Sin datos para {label}.
      </div>
    );
  }

  // Claves internas usadas por el ChartContainer/config
  const AKEY = "__actual";
  const PKEY = "__pred";

  return (
    <ChartContainer
      config={{
        [AKEY]: { label: `Actual ${label}`, color: actualColor },
        [PKEY]: { label: `Predicted ${label}`, color: predictedColor },
      }}
      className={className}
    >
      <ResponsiveContainer>
        <ComposedChart data={prepared}>
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={actualColor} stopOpacity={0.8} />
              <stop offset="95%" stopColor={actualColor} stopOpacity={0.1} />
            </linearGradient>
          </defs>

          <XAxis
            dataKey="__x"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            className="fill-neutral-600 dark:fill-neutral-400"
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={48}
            tickMargin={8}
            className="fill-neutral-600 dark:fill-neutral-400"
          />

          <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />

          {/* Actual (Area) */}
          <Area
            type="monotone"
            dataKey={AKEY}
            stroke={actualColor}
            fill={`url(#${gradId})`}
            strokeWidth={2}
            isAnimationActive={false}
            connectNulls
          />

          {/* Predicho (Line + ErrorBar) */}
          <Line
            type="monotone"
            dataKey={PKEY}
            stroke={predictedColor}
            strokeWidth={3}
            strokeDasharray="5 5"
            strokeOpacity={0.9}
            dot={{ fill: predictedColor, r: 4, strokeWidth: 0 }}
            isAnimationActive={false}
            connectNulls
          >
            {/* Error como rango [lo, hi] calculado internamente */}
            <ErrorBar
              dataKey="__errRange"
              width={8}
              strokeWidth={1.5}
              stroke={predictedColor}
              opacity={0.35}
              direction="y"
            />
          </Line>
        </ComposedChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}
