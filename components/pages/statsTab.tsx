"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { DollarSign, Users, RefreshCw } from "lucide-react";
import { useProgress } from "@/contexts/ProgressContext";
import { TrendChart } from "@/components/charts/TrendChart";
import Gauge from "@/components/ui/gauge";
import { SHAPChart } from "@/components/charts/SHAPChart";
import modelWeightsData from "@/data/model-weights.json";
import InsightCards from "../ui/insightCards";
import {
  CollapsibleCard,
  CollapsibleCardContent,
  CollapsibleCardHeader,
  CollapsibleCardTitle,
  CollapsibleCardDescription,
} from "../ui/collapsible-card";
import Explanations from "../Explanations";
import { Button } from "../ui/button";
import { useTravelStats } from "@/hooks/useTravelStats";

// ⬇️ usamos tu helper que ya devuelve precio, demanda y weights
import { getData, type ModelWeights, type TimelineItem } from "@/lib/getData";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { ComposedChart, Line, XAxis, YAxis, ReferenceLine } from "recharts";

import type { Travel, TimelineEntry } from "@/contexts/travelsContext";

// ─────────────────── Utilidades ───────────────────
type Mode = "DEPARTURES" | "ARRIVALS";

// Título con capitalización amable
const toTitle = (s: string) =>
  s
    .toUpperCase()
    .split(/\s+/)
    .map((w) =>
      ["DE", "DEL", "LA", "EL", "LOS", "LAS", "Y"].includes(w)
        ? w.toLowerCase()
        : w[0] + w.slice(1).toLowerCase()
    )
    .join(" ");

// ─────────────────── Localizaciones agregadas → códigos ───────────────────
type AggKey =
  | "BARCELONA"
  | "VALÈNCIA"
  | "DÉNIA"
  | "IBIZA"
  | "FORMENTERA"
  | "MALLORCA"
  | "MENORCA";

const LOCATIONS: Record<AggKey, { label: string; origin: string; destination: string }> = {
  BARCELONA:  { label: "Barcelona",  origin: "OO01", destination: "DD09" },
  "VALÈNCIA": { label: "València",   origin: "OO04", destination: "DD06" },
  "DÉNIA":    { label: "Dénia",      origin: "OO06", destination: "DD08" },
  IBIZA:      { label: "Ibiza",      origin: "OO05", destination: "DD07" }, // Eivissa/Botafoc
  FORMENTERA: { label: "Formentera", origin: "OO11", destination: "DD13" },
  MALLORCA:   { label: "Mallorca",   origin: "OO07", destination: "DD01" }, // Palma
  MENORCA:    { label: "Menorca",    origin: "OO10", destination: "DD12" }, // Maó
};

const LOCATION_ORDER: AggKey[] = [
  "BARCELONA",
  "VALÈNCIA",
  "DÉNIA",
  "IBIZA",
  "FORMENTERA",
  "MALLORCA",
  "MENORCA",
];

// ─────────────────── Parámetros por defecto ───────────────────
const DEFAULTS = {
  date: "2023-01-26",
  shipCode: "SCA",
  base_price: 80,
  min_price: 40,
  max_price: 200,
  capacity: 900,
  elasticity: 100,
  timeoutMs: 120000,
  originKey: "VALÈNCIA" as AggKey,
  destinationKey: "IBIZA" as AggKey,
};


// ─────────────────── Componente ───────────────────
export default function StatsTab() {

  

  const { progress } = useProgress();


  // Selecciones controladas (fecha, buque, origen/destino agregados)
  const [selectedDate, setSelectedDate] = useState<string>(DEFAULTS.date);
  const [shipCode, setShipCode] = useState<string>(DEFAULTS.shipCode);
  const [originKey, setOriginKey] = useState<AggKey>(DEFAULTS.originKey);
  const [destinationKey, setDestinationKey] = useState<AggKey>(DEFAULTS.destinationKey);

  // Modo UI (no afecta a la llamada, puedes quitarlo si quieres)
  const [mode, setMode] = useState<Mode>("DEPARTURES");

  // ── Estado de predicción ──
  const [predPrice, setPredPrice] = useState<number | null>(null);
  const [predDemand, setPredDemand] = useState<number | null>(null);
  const [apiWeights, setApiWeights] = useState<ModelWeights | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);

  // Adaptador API → travels.json para useTravelStats (sin normalizar progress)
// - Solo incluimos progress ≤ 100 (lo >100 es futuro y no afecta al hook)
// - Si faltan puntos en la ventana [progress-9, progress], rellenamos
//   clonando el último valor disponible ≤ i (LOCF) para que el gráfico se actualice.
const apiTravels: Travel[] | undefined = useMemo(() => {
  if (!timeline?.length) return undefined;

  // 1) Mapeo base con progress tal cual (sin normalizar) y filtrado a ≤ 100
  const baseEntries: TimelineEntry[] = timeline
    .filter((it) => typeof it.progress === "number" && Number.isFinite(it.progress) && it.progress <= 100)
    .map((it) => {
      const price  = typeof it.data?.pred_price  === "number" ? it.data.pred_price  : 0;
      const demand = typeof it.data?.pred_demand === "number" ? it.data.pred_demand : 0;
      const profit = price * demand; // proxy si no hay profit real
      const p = Math.round(it.progress as number);

      return {
        progress: Math.max(0, Math.min(100, p)), // SIN normalizar; solo clamp por seguridad
        isActive: true,
        profit,
        people: demand,
        predictedProfit: profit,
        profitError: 0,
        predictedPeople: demand,
        peopleError: 0,
      };
    });

  // Si no hay ningún punto ≤ 100, no podemos alimentar el hook: volvemos undefined
  if (baseEntries.length === 0) return undefined;

  // 2) Índice por progress y conjunto disponibles
  const byProgress = new Map<number, TimelineEntry>();
  for (const e of baseEntries) byProgress.set(e.progress, e);
  const available = Array.from(byProgress.keys()).sort((a, b) => a - b);

  // Helper: último progress ≤ i (si no hay, el menor disponible)
  const lastLE = (i: number) => {
    // búsqueda binaria simple
    let lo = 0, hi = available.length - 1, ans = available[0];
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      const v = available[mid];
      if (v <= i) { ans = v; lo = mid + 1; } else { hi = mid - 1; }
    }
    return ans;
  };

  // 3) Relleno ventana de 10 puntos [max(0, rp-9) .. min(100, rp)]
  const rp = Math.round(progress);
  const start = Math.max(0, rp - 9);
  const end   = Math.min(100, rp);

  for (let i = start; i <= end; i++) {
    if (!byProgress.has(i)) {
      const refP = lastLE(i);
      const refE = byProgress.get(refP)!;
      byProgress.set(i, {
        ...refE,
        progress: i,
        isActive: i <= rp,
      });
    } else {
      // Marca activo según rp
      const cur = byProgress.get(i)!;
      byProgress.set(i, { ...cur, isActive: i <= rp });
    }
  }

  // 4) Dedupe + orden ascendente (solo progress ≤ 100)
  const deduped = Array.from(byProgress.values()).sort((a, b) => a.progress - b.progress);

  return [
    {
      name: `${LOCATIONS[originKey].label} → ${LOCATIONS[destinationKey].label}`,
      description: `${selectedDate} · Buque ${shipCode}`,
      timeline: deduped,
    },
  ];
}, [timeline, originKey, destinationKey, selectedDate, shipCode, progress]);

// ⬇️ HistoricalData de PRECIO y DEMANDA: usa SOLO timeline API (≤100)
const { priceHistoricalData, demandHistoricalData } = useMemo(() => {
  if (!timeline?.length) return { priceHistoricalData: [], demandHistoricalData: [] };

  // Mapas progress -> precio/demanda usando EXACTAMENTE la API y SOLO progress ≤ 100
  const priceByProgress = new Map<number, number>();
  const demandByProgress = new Map<number, number>();
  
  for (const it of timeline) {
    if (typeof it.progress !== "number" || !Number.isFinite(it.progress)) continue;
    if (it.progress > 100) continue; // los >100 son futuro, no entran aquí
    const p = Math.max(0, Math.min(100, Math.round(it.progress)));
    
    const price = typeof it.data?.pred_price === "number" ? it.data.pred_price : null;
    const demand = typeof it.data?.pred_demand === "number" ? it.data.pred_demand : null;
    
    if (price !== null) priceByProgress.set(p, price);
    if (demand !== null) demandByProgress.set(p, demand);
  }

  // Ventana de 10 puntos [progress-9, progress] clamp a [0,100]
  const rp = Math.round(progress);
  const start = Math.max(0, rp - 9);
  const end   = Math.min(100, rp);

  // Helper LOCF: último valor disponible ≤ i
  const lastLE = (map: Map<number, number>, i: number): number | null => {
    const available = Array.from(map.keys()).sort((a, b) => a - b);
    if (!available.length) return null;
    
    let lo = 0, hi = available.length - 1, ans = available[0];
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      const v = available[mid];
      if (v <= i) { ans = v; lo = mid + 1; } else { hi = mid - 1; }
    }
    return ans <= i ? map.get(ans)! : null;
  };

  const priceOut: Array<{ progress: number; profit: number; predictedProfit: number; profitError: number; }> = [];
  const demandOut: Array<{ progress: number; people: number; predictedPeople: number; peopleError: number; }> = [];
  
  for (let i = start; i <= end; i++) {
    // Para precio: LOCF si no existe el punto exacto
    const priceVal = priceByProgress.has(i) ? priceByProgress.get(i)! : (lastLE(priceByProgress, i) ?? 0);
    priceOut.push({
      progress: i,
      profit: priceVal,
      predictedProfit: priceVal,
      profitError: 0,
    });

    // Para demanda: LOCF si no existe el punto exacto
    const demandVal = demandByProgress.has(i) ? demandByProgress.get(i)! : (lastLE(demandByProgress, i) ?? 0);
    demandOut.push({
      progress: i,
      people: demandVal,
      predictedPeople: demandVal,
      peopleError: 0,
    });
  }

  return { priceHistoricalData: priceOut, demandHistoricalData: demandOut };
}, [timeline, progress]);


  
const { currentMeanData } = useTravelStats(progress, apiTravels);
  const timelineThreshold = 100;

  

  // Llamada al endpoint con lo seleccionado
  const fetchPrediction = async () => {
    const originCode = LOCATIONS[originKey].origin;
    const destinationCode = LOCATIONS[destinationKey].destination;

    setLoading(true);
    setError(null);
    try {
      const full = await getData(selectedDate, originCode, destinationCode, {
        codigo_buque: shipCode,
        base_price: DEFAULTS.base_price,
        min_price: DEFAULTS.min_price,
        max_price: DEFAULTS.max_price,
        capacity: DEFAULTS.capacity,
        elasticity: DEFAULTS.elasticity,
        timeoutMs: DEFAULTS.timeoutMs,
      });

      const first = full.timeline?.[0];
      setPredPrice(
        first && typeof first.data?.pred_price === "number" ? first.data.pred_price : null
      );
      setPredDemand(
        first && typeof first.data?.pred_demand === "number" ? first.data.pred_demand : null
      );
      setApiWeights(first?.weights ?? null);
      setTimeline(full.timeline ?? []);
    } catch (err) {
      setPredPrice(null);
      setPredDemand(null);
      setApiWeights(null);
      setTimeline([]);
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  // Dispara cuando cambie cualquiera de los selectores
  useEffect(() => {
    fetchPrediction();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, shipCode, originKey, destinationKey]);

  // ── Gauges ──
  const normPercent = (v: number | null, min: number, max: number) => {
    if (v == null || !Number.isFinite(v)) return 0;
    if (max <= min) return 0;
    const p = ((v - min) / (max - min)) * 100;
    return Math.max(0, Math.min(100, Math.round(p)));
  };

  const pricePercentage = normPercent(predPrice, DEFAULTS.min_price, DEFAULTS.max_price);
  const demandPercentage =
    predDemand != null ? Math.max(0, Math.min(100, Math.round(predDemand))) : 0;

  const priceColor =
    predPrice == null
      ? "#6b7280"
      : predPrice < DEFAULTS.base_price
      ? "#16a34a"
      : predPrice < DEFAULTS.max_price
      ? "#f59e0b"
      : "#dc2626";
  const demandColor = "#2563eb";
  const timelineChartData = useMemo(() => {
    if (!timeline.length) return [];
    const mapped = timeline.map((item, index) => {
      const progressValue =
        typeof item.progress === "number" && Number.isFinite(item.progress)
          ? item.progress
          : index;
      const priceValue =
        typeof item.data?.pred_price === "number" ? item.data.pred_price : null;
      const demandValue =
        typeof item.data?.pred_demand === "number" ? item.data.pred_demand : null;
      const isFuture = progressValue > timelineThreshold;

      return {
        progress: progressValue,
        date: item.date,
        price: priceValue,
        demand: demandValue,
        pricePast: !isFuture ? priceValue : null,
        priceFuture: isFuture ? priceValue : null,
      };
    });

    const firstFutureIndex = mapped.findIndex(
      (point) =>
        typeof point.progress === "number" &&
        Number.isFinite(point.progress) &&
        point.progress > timelineThreshold &&
        point.price != null
    );

    if (firstFutureIndex > 0) {
      const previous = mapped[firstFutureIndex - 1];
      if (previous) {
        previous.priceFuture = previous.price;
      }
    } else if (firstFutureIndex === 0 && mapped.length) {
      mapped[0].priceFuture = mapped[0].price;
    }

    return mapped;
  }, [timeline, timelineThreshold]);

  const maxTimelineProgress = useMemo(() => {
    const numericProgress = timelineChartData
      .map((point) => point.progress)
      .filter(
        (value): value is number => typeof value === "number" && Number.isFinite(value)
      );

    if (!numericProgress.length) return null;
    return Math.max(...numericProgress);
  }, [timelineChartData]);

  const timelineFutureDelta =
    maxTimelineProgress != null
      ? Math.max(0, maxTimelineProgress - timelineThreshold)
      : 0;
  const hasFutureBeyondThreshold = timelineFutureDelta > 0;
  const typedModelWeights = useMemo(
    () =>
      modelWeightsData as Array<
        { progress?: number } & Record<string, unknown>
      >,
    []
  );

  // ── Pesos → grafo para SHAPChart ──
  const weightsToGraph = (w: ModelWeights) => {
    const entries = Object.entries(w)
      .filter(([, v]) => typeof v === "number" && Number.isFinite(v))
      .sort((a, b) => (b[1] as number) - (a[1] as number));
    const total = entries.reduce((acc, [, v]) => acc + (v as number), 0) || 1;

    const nodes = [
      { id: "Prediction", label: "Prediction", group: 0, value: 1 },
      ...entries.map(([k, v]) => ({
        id: k,
        label: k.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        group: 1,
        value: Math.max(1, Math.round(((v as number) / total) * 100)),
      })),
    ];

    const links = entries.map(([k, v]) => ({
      source: k,
      target: "Prediction",
      value: v as number,
    }));

    return { nodes, links };
  };

  const currentModelWeights =
    typedModelWeights.find(
      (item) =>
        typeof item.progress === "number" &&
        item.progress === Math.floor(progress)
    ) ?? typedModelWeights[0] ?? { nodes: [], links: [] };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <Card className="border-neutral-200 dark:border-neutral-700 bg-white dark:bg-black overflow-hidden">
        {/* Controles */}
        <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/60 dark:bg-neutral-900/40 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-neutral-700 dark:text-neutral-300">Modo</span>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={mode === "DEPARTURES" ? "default" : "secondary"}
                className="rounded-full"
                onClick={() => setMode("DEPARTURES")}
              >
                Salidas
              </Button>
              <Button
                size="sm"
                variant={mode === "ARRIVALS" ? "default" : "secondary"}
                className="rounded-full"
                onClick={() => setMode("ARRIVALS")}
              >
                Llegadas
              </Button>
            </div>
            <div className="ml-auto">
              <Button size="sm" variant="outline" onClick={fetchPrediction} className="rounded-full">
                <RefreshCw className="h-4 w-4 mr-2" />
                Recalcular
              </Button>
            </div>
          </div>

          {/* Selectores principales */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {/* Fecha de salida */}
            <div className="flex flex-col">
              <label className="text-xs text-neutral-700 dark:text-neutral-300 mb-1">Fecha de salida</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-400"
              />
            </div>

            {/* Modelo de buque */}
            <div className="flex flex-col">
              <label className="text-xs text-neutral-700 dark:text-neutral-300 mb-1">Modelo de buque</label>
              <input
                type="text"
                value={shipCode}
                onChange={(e) => setShipCode(e.target.value.toUpperCase())}
                placeholder="SCA"
                className="w-full uppercase rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-400"
              />
            </div>

            {/* Origen agregado */}
            <div className="flex flex-col">
              <label className="text-xs text-neutral-700 dark:text-neutral-300 mb-1">Origen</label>
              <select
                value={originKey}
                onChange={(e) => setOriginKey(e.target.value as AggKey)}
                className="w-full rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-400"
              >
                {LOCATION_ORDER.map((k) => (
                  <option key={`o-${k}`} value={k}>
                    {LOCATIONS[k].label}
                  </option>
                ))}
              </select>
            </div>

            {/* Destino agregado */}
            <div className="flex flex-col">
              <label className="text-xs text-neutral-700 dark:text-neutral-300 mb-1">Destino</label>
              <select
                value={destinationKey}
                onChange={(e) => setDestinationKey(e.target.value as AggKey)}
                className="w-full rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-400"
              >
                {LOCATION_ORDER.map((k) => (
                  <option key={`d-${k}`} value={k}>
                    {LOCATIONS[k].label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Resumen selección */}
          <div className="text-[12px] text-neutral-600 dark:text-neutral-400">
            {LOCATIONS[originKey].label} (<code>{LOCATIONS[originKey].origin}</code>) →{" "}
            {LOCATIONS[destinationKey].label} (<code>{LOCATIONS[destinationKey].destination}</code>) ·{" "}
            {selectedDate} · Buque <code>{shipCode}</code>
          </div>
        </div>

        {/* Gauges */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-0">
          <div className="flex flex-col items-center justify-center px-6 py-4">
            <h3 className="text-sm font-medium text-black dark:text-white">Predicted Price</h3>
            <p className="text-xs text-neutral-600 dark:text-neutral-400">
              {LOCATIONS[originKey].label} → {LOCATIONS[destinationKey].label} · {selectedDate}
            </p>
            <div className="mt-2">
              <Gauge
                percentage={pricePercentage}
                color={priceColor}
                value={predPrice ?? 0}
                label="€ per person"
              />
            </div>
          </div>

          <div className="flex flex-col items-center justify-center px-6 py-4">
            <h3 className="text-sm font-medium text-black dark:text-white">Predicted Demand</h3>
            <p className="text-xs text-neutral-600 dark:text-neutral-400">
              {LOCATIONS[originKey].label} → {LOCATIONS[destinationKey].label} · {selectedDate}
            </p>
            <div className="mt-2">
              <Gauge
                percentage={demandPercentage}
                color={demandColor}
                value={predDemand != null ? Math.round(predDemand) : 0}
                label="people"
              />
            </div>
          </div>
        </div>

        {/* Extra info */}
        <div className="flex justify-center pb-4">
          <div className="mt-2 grid grid-cols-2 gap-4 w-full max-w-xs">
            <div className="flex flex-col items-center justify-center p-0 space-y-0 rounded-lg bg-neutral-50 dark:bg-black/50">
              <div className="flex items-center gap-1.5">
                <DollarSign className="h-4 w-4 text-green-600 dark:text-green-400" />
                <span className="text-xs font-medium text-neutral-600 dark:text-neutral-400">Pred. Price</span>
              </div>
              <div className="text-xl font-bold text-black dark:text-white">
                {predPrice != null ? `€${predPrice.toFixed(2)}` : "—"}
              </div>
            </div>
            <div className="flex flex-col items-center justify-center p-0 space-y-0 rounded-lg bg-neutral-50 dark:bg-black/50">
              <div className="flex items-center gap-1.5">
                <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <span className="text-xs font-medium text-neutral-600 dark:text-neutral-400">Pred. Demand</span>
              </div>
              <div className="text-2xl font-bold text-black dark:text-white">
                {predDemand != null ? Math.round(predDemand) : "—"}
              </div>
            </div>
          </div>
        </div>

        {loading && <div className="px-6 pb-4 text-sm text-neutral-500">Loading predictions…</div>}
        {error && <div className="px-6 pb-4 text-sm text-red-600">Error loading prediction: {error}</div>}
      </Card>

      {/* Explicabilidad */}
      <CollapsibleCard collapsedTitle="Explicaciones de Baleito">
        <CollapsibleCardHeader>
          <CollapsibleCardTitle>Explicaciones de Baleito</CollapsibleCardTitle>
          <CollapsibleCardDescription>
            y explicabilidad del modelo para las decisiones tomadas en {Math.floor(progress)}.
          </CollapsibleCardDescription>
        </CollapsibleCardHeader>
      <CollapsibleCardContent>
                <Explanations
        prediction={{
          price: predPrice,
          demand: predDemand,
          weights: apiWeights,
          meta: {
            origin: LOCATIONS[originKey].origin,
            destination: LOCATIONS[destinationKey].destination,
            originLabel: LOCATIONS[originKey].label,
            destinationLabel: LOCATIONS[destinationKey].label,
            date: selectedDate,
            codigo_buque: shipCode,
            params: {
              base_price: DEFAULTS.base_price,
              min_price: DEFAULTS.min_price,
              max_price: DEFAULTS.max_price,
              capacity: DEFAULTS.capacity,
              elasticity: DEFAULTS.elasticity,
            },
          },
        }}
      />

                  <SHAPChart
            key={`shap-${Math.floor(progress)}`}
            data={{ nodes: currentModelWeights.nodes, links: currentModelWeights.links }}
            className="h-[400px] w-full"
          />
          <InsightCards />
        </CollapsibleCardContent>
      </CollapsibleCard>

      {/* Tendencias (igual que antes) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-neutral-200 dark:border-neutral-700 bg-white dark:bg-black">
          <CardHeader>
            <CardTitle className="text-black dark:text-white">Total Profit Trend</CardTitle>
            <CardDescription className="text-neutral-600 dark:text-neutral-400">Last 10 progress points</CardDescription>
          </CardHeader>
          <CardContent>
            <TrendChart
              data={priceHistoricalData}
              actualDataKey="Precio"
              predictedDataKey="predictedProfit"
              errorDataKey="profitError"
              actualColor="#10b981"
              label="Precio"
            />
          </CardContent>
        </Card>

        <Card className="border-neutral-200 dark:border-neutral-700 bg-white dark:bg-black">
          <CardHeader>
            <CardTitle className="text-black dark:text-white">Total People Trend</CardTitle>
            <CardDescription className="text-neutral-600 dark:text-neutral-400">Last 10 progress points</CardDescription>
          </CardHeader>
          <CardContent>

            <TrendChart
              data={demandHistoricalData}
              actualDataKey="Demanda"
              predictedDataKey="predictedPeople"
              errorDataKey="peopleError"
              actualColor="#10b981"
              label="Demanda"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
