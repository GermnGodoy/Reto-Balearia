"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { DollarSign, Users, RefreshCw } from "lucide-react";
import { useProgress } from "@/contexts/ProgressContext";
import { TrendChart } from "@/components/charts/TrendChart";
import Gauge from "@/components/ui/gauge";
import { SHAPChart, type SHAPData } from "@/components/charts/SHAPChart";
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

// ⬇️ helper API completo
import { getData, type ModelWeights, type TimelineItem } from "@/lib/getData";

type Mode = "DEPARTURES" | "ARRIVALS";

type AggKey =
  | "BARCELONA"
  | "VALÈNCIA"
  | "DÉNIA"
  | "IBIZA"
  | "FORMENTERA"
  | "MALLORCA"
  | "MENORCA";

const LOCATIONS: Record<AggKey, { label: string; origin: string; destination: string }> = {
  BARCELONA: { label: "Barcelona", origin: "OO01", destination: "DD09" },
  "VALÈNCIA": { label: "València", origin: "OO04", destination: "DD06" },
  "DÉNIA": { label: "Dénia", origin: "OO06", destination: "DD08" },
  IBIZA: { label: "Ibiza", origin: "OO05", destination: "DD07" },
  FORMENTERA: { label: "Formentera", origin: "OO11", destination: "DD13" },
  MALLORCA: { label: "Mallorca", origin: "OO07", destination: "DD01" },
  MENORCA: { label: "Menorca", origin: "OO10", destination: "DD12" },
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

/* ───────────────────────────── SHAP helpers ───────────────────────────── */

const FEATURE_LABELS: Record<string, string> = {
  capacity: "Capacidad",
  competition: "Competencia",
  events: "Eventos",
  lead_time: "Ventana de reserva",
  other: "Otros",
  weather: "Meteo",
};

/**
 * Convierte los `weights` de la API (magnitudes) en un SHAPData {nodes,links}.
 * - Normaliza por la suma de pesos (por si no suma 1).
 * - Escala por la predicción (demanda) para que la magnitud sea informativa.
 * - Ojo: los pesos actuales NO traen signo; el SHAPChart alterna signos visualmente.
 */
function buildShapFromApi(
  weights: ModelWeights | null,
  predicted: number | null,
  label = "Predicción (demanda)",
  normalize = true
): SHAPData {
  if (!weights || predicted == null || !Number.isFinite(predicted)) {
    return { nodes: [], links: [] };
  }

  const entries = Object.entries(weights)
    .map(([k, v]) => ({ name: FEATURE_LABELS[k] ?? k, value: Number(v) }))
    .filter(e => Number.isFinite(e.value));

  let total = normalize ? entries.reduce((s, e) => s + Math.abs(e.value), 0) : 1;
  if (!total || !Number.isFinite(total)) total = 1;

  const nodes = [...entries.map(e => ({ name: e.name })), { name: label }];
  const target = nodes.length - 1;

  const links = entries.map((e, idx) => ({
    source: idx,
    target,
    value: (Math.abs(e.value) / total) * Math.abs(predicted),
  }));

  return { nodes, links };
}

/* -------------------- Tipos de parámetros de API -----------------*/

type ApiReasoning = Partial<{
  base_price: number;
  elasticity: number;
  dynamic_factor: number;
  competitive_factor: number;
}>;
type ApiParams = Partial<{
  min_price: number;
  max_price: number;
  base_price: number;
  capacity: number;
  elasticity: number;
}>;

/* ───────────────────────────── Componente ───────────────────────────── */

export default function StatsTab() {
  const { progress } = useProgress();

  // Selectores
  const [selectedDate, setSelectedDate] = useState<string>(DEFAULTS.date);
  const [shipCode, setShipCode] = useState<string>(DEFAULTS.shipCode);
  const [originKey, setOriginKey] = useState<AggKey>(DEFAULTS.originKey);
  const [destinationKey, setDestinationKey] = useState<AggKey>(DEFAULTS.destinationKey);
  const [mode, setMode] = useState<Mode>("DEPARTURES");

  // Estado API
  const [predPrice, setPredPrice] = useState<number | null>(null);
  const [predDemand, setPredDemand] = useState<number | null>(null);
  const [apiWeights, setApiWeights] = useState<ModelWeights | null>(null);
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [apiReasoning, setApiReasoning] = useState<ApiReasoning | null>(null); // ← DENTRO del componente
  const [apiParams, setApiParams] = useState<ApiParams | null>(null);           // ← DENTRO del componente
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // ───────────────────────── Llamada API ─────────────────────────
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
      const priceNum = Number(first?.data?.pred_price);
      const demandNum = Number(first?.data?.pred_demand);

      setPredPrice(Number.isFinite(priceNum) ? priceNum : null);
      setPredDemand(Number.isFinite(demandNum) ? demandNum : null);
      setApiWeights(first?.weights ?? null);
      setTimeline(full.timeline ?? []);

      // ⬇️ parámetros reales que vienen de la API
      setApiReasoning((first as any)?.reasoning ?? null);
      setApiParams(((full as any)?.metadata?.parametros) ?? null);
    } catch (err) {
      setPredPrice(null);
      setPredDemand(null);
      setApiWeights(null);
      setTimeline([]);
      setApiReasoning(null);
      setApiParams(null);
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrediction();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, shipCode, originKey, destinationKey]);

  // ───────────────────────── Gauges ─────────────────────────
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

  // ───────────────────────── TrendCharts (ARREGLO) ─────────────────────────
  const { priceHistoricalData, demandHistoricalData } = useMemo(() => {
    if (!timeline?.length) return { priceHistoricalData: [], demandHistoricalData: [] };

    const rows = timeline
      .map((it, idx) => {
        const p =
          typeof it.progress === "number" && Number.isFinite(it.progress) ? it.progress : idx;
        const price = Number(it?.data?.pred_price);
        const demand = Number(it?.data?.pred_demand);
        return {
          progress: p,
          price: Number.isFinite(price) ? price : null,
          demand: Number.isFinite(demand) ? demand : null,
        };
      })
      .filter(r => r.price !== null || r.demand !== null)
      .sort((a, b) => a.progress - b.progress);

    const rp = Math.round(progress);

    let upto = rows.filter(r => r.progress <= rp);
    if (upto.length === 0) {
      upto = rows.slice(0, Math.min(10, rows.length));
    }

    const window10 = upto.slice(-10);

    const priceOut = window10.map(r => ({
      progress: r.progress,
      Precio: r.price ?? 0,
      predictedProfit: r.price ?? 0,
      profitError: 0,
    }));

    const demandOut = window10.map(r => ({
      progress: r.progress,
      Demanda: r.demand ?? 0,
      predictedPeople: r.demand ?? 0,
      peopleError: 0,
    }));

    return { priceHistoricalData: priceOut, demandHistoricalData: demandOut };
  }, [timeline, progress]);

  // ───────────────────────── SHAP (API → Chart) ─────────────────────────
  const shapData = useMemo<SHAPData>(
    () => buildShapFromApi(apiWeights, predDemand),
    [apiWeights, predDemand]
  );

  // ───────────────────────── UI ─────────────────────────
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

          {/* Selectores */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="flex flex-col">
              <label className="text-xs text-neutral-700 dark:text-neutral-300 mb-1">Fecha de salida</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-400"
              />
            </div>

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
              <Gauge percentage={pricePercentage} color={priceColor} value={predPrice ?? 0} label="€ per person" />
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

          {shapData.nodes.length > 1 ? (
            <SHAPChart
              key={`shap-${Math.floor(progress)}`}
              data={shapData}
              baseValue={0}
              className="h-[400px] w-full"
            />
          ) : (
            <div className="text-sm text-neutral-500 px-2">
              Sin datos de explicabilidad para esta predicción.
            </div>
          )}

          {/* Ahora las tarjetas analíticas usan SOLO lo que llega por API */}
          <InsightCards
            price={predPrice}
            demand={predDemand}
            weights={apiWeights}
            reasoning={apiReasoning}
            params={apiParams}
          />
        </CollapsibleCardContent>
      </CollapsibleCard>

      {/* Tendencias */}
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
