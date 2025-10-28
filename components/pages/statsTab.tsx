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
import { getData } from "@/lib/getData";
import { Button } from "../ui/button";
import { useTravelStats } from "@/hooks/useTravelStats";

// ⬇️ Importa tus fuentes reales
import {
  PORTS,
  DEFAULT_ROUTES,
  type PortName,
  type RouteSpec,
} from "@/data/ports-and-routes";

// ─────────────────── Utilidades ───────────────────
type Mode = "DEPARTURES" | "ARRIVALS";
type NamedRoute = { from: PortName; to: PortName; dashed?: boolean };

const isNamedRoute = (r: RouteSpec): r is NamedRoute =>
  typeof (r as any)?.from === "string" && typeof (r as any)?.to === "string";

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

// Para el backend: quitar acentos y upper
const toBackend = (name: string) =>
  name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .trim();

// ─────────────────── Componente ───────────────────
export default function StatsTab() {
  const { progress, routeDate } = useProgress();
  const { currentMeanData, gaugePercentage, gaugeColor, historicalData, trends } =
    useTravelStats(progress);

  // Filtramos solo rutas con nombres de puerto
  const namedRoutes = useMemo(
    () => DEFAULT_ROUTES.filter(isNamedRoute),
    []
  );

  // Mapas direccionales
  const byOrigin = useMemo(() => {
    const m = new Map<PortName, PortName[]>();
    for (const r of namedRoutes) {
      if (!m.has(r.from)) m.set(r.from, []);
      if (!m.get(r.from)!.includes(r.to)) m.get(r.from)!.push(r.to);
    }
    // ordenamos destinos de cada origen
    for (const [k, arr] of m) m.set(k, [...arr].sort());
    return m;
  }, [namedRoutes]);

  const byDestination = useMemo(() => {
    const m = new Map<PortName, PortName[]>();
    for (const r of namedRoutes) {
      if (!m.has(r.to)) m.set(r.to, []);
      if (!m.get(r.to)!.includes(r.from)) m.get(r.to)!.push(r.from);
    }
    for (const [k, arr] of m) m.set(k, [...arr].sort());
    return m;
  }, [namedRoutes]);

  const ORIGINS = useMemo(() => [...byOrigin.keys()].sort(), [byOrigin]);
  const DESTINATIONS = useMemo(() => [...byDestination.keys()].sort(), [byDestination]);

  // Estado de modo y selección válida según modo
  const [mode, setMode] = useState<Mode>("DEPARTURES");

  // Inicializamos a la primera ruta disponible (si existe)
  const initialFrom = namedRoutes[0]?.from ?? ("València" as PortName);
  const initialTo = namedRoutes[0]?.to ?? ("Palma" as PortName);

  const [origin, setOrigin] = useState<PortName>(initialFrom);
  const [destination, setDestination] = useState<PortName>(initialTo);

  // Asegurar combinaciones válidas al cambiar modo/origen/destino
  useEffect(() => {
    if (mode === "DEPARTURES") {
      const dests = byOrigin.get(origin) ?? [];
      if (!dests.includes(destination)) {
        // fuerza a un destino válido para ese origen
        const fallback = dests[0] ?? null;
        if (fallback) setDestination(fallback);
        else {
          // si el origen no tiene salidas, escogemos el primero válido
          const o = ORIGINS[0];
          setOrigin(o);
          setDestination(byOrigin.get(o)![0]);
        }
      }
    } else {
      // ARRIVALS
      const origins = byDestination.get(destination) ?? [];
      if (!origins.includes(origin)) {
        const fallback = origins[0] ?? null;
        if (fallback) setOrigin(fallback);
        else {
          const d = DESTINATIONS[0];
          setDestination(d);
          setOrigin(byDestination.get(d)![0]);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, origin, destination, byOrigin, byDestination]);

  // Predicciones
  const [predPrice, setPredPrice] = useState<number | null>(null);
  const [predDemand, setPredDemand] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const price = await getData(routeDate, toBackend(origin), toBackend(destination));
        if (!cancelled) {
          setPredPrice(typeof price === "number" ? price : null);
          setPredDemand(null); // placeholder si aún no devuelves demanda
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [routeDate, origin, destination]);

  // Gauges
  const pricePercentage = predPrice != null ? Math.max(0, Math.min(100, Math.round(predPrice))) : 0;
  const demandPercentage = predDemand != null ? Math.max(0, Math.min(100, Math.round(predDemand))) : 0;

  const priceColor =
    predPrice == null ? "#6b7280" : predPrice < 50 ? "#16a34a" : predPrice < 80 ? "#f59e0b" : "#dc2626";
  const demandColor = "#2563eb";

  const currentModelWeights =
    modelWeightsData.find((item: any) => item.progress === Math.floor(progress)) ?? modelWeightsData[0];

  // Swap solo si existe la inversa definida en DEFAULT_ROUTES
  const swapIfExists = () => {
    const hasInverse = namedRoutes.some((r) => r.from === destination && r.to === origin);
    if (hasInverse) {
      const o = origin;
      setOrigin(destination);
      setDestination(o);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <Card className="border-neutral-200 dark:border-neutral-700 bg-white dark:bg-black overflow-hidden">
        {/* Header: modo + selectores */}
        <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/60 dark:bg-neutral-900/40 space-y-3">

          {/* Toggle modo */}
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
          </div>

          {/* Selectores según modo — en una fila */}
<div className="flex flex-col md:flex-row gap-6 md:items-start">
  {mode === "DEPARTURES" ? (
    <>
      {/* Columna izquierda: Origen (salidas) */}
      <div className="flex-1 min-w-0">
        <div className="text-xs mb-1 text-neutral-700 dark:text-neutral-300">Origen (salida)</div>
        <div className="flex flex-wrap gap-2">
          {ORIGINS.map((o) => (
            <Button
              key={`o-${o}`}
              size="sm"
              variant={origin === o ? "default" : "secondary"}
              onClick={() => {
                setOrigin(o);
                const firstDest = (byOrigin.get(o) ?? [])[0];
                if (firstDest) setDestination(firstDest);
              }}
              className="rounded-full"
            >
              {toTitle(o)}
            </Button>
          ))}
        </div>
      </div>

      {/* Columna derecha: Destino (llegadas) */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <div className="text-xs text-neutral-700 dark:text-neutral-300">Destino (llegada)</div>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={swapIfExists} title="Invertir ruta">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
        <div className="mt-1 flex flex-wrap gap-2">
          {(byOrigin.get(origin) ?? []).map((d) => (
            <Button
              key={`d-${origin}-${d}`}
              size="sm"
              variant={destination === d ? "default" : "secondary"}
              onClick={() => setDestination(d)}
              className="rounded-full"
            >
              {toTitle(d)}
            </Button>
          ))}
        </div>
      </div>
    </>
  ) : (
    <>
      {/* Columna izquierda: Destino (llegadas) */}
      <div className="flex-1 min-w-0">
        <div className="text-xs mb-1 text-neutral-700 dark:text-neutral-300">Destino (llegada)</div>
        <div className="flex flex-wrap gap-2">
          {DESTINATIONS.map((d) => (
            <Button
              key={`dest-${d}`}
              size="sm"
              variant={destination === d ? "default" : "secondary"}
              onClick={() => {
                setDestination(d);
                const firstOrigin = (byDestination.get(d) ?? [])[0];
                if (firstOrigin) setOrigin(firstOrigin);
              }}
              className="rounded-full"
            >
              {toTitle(d)}
            </Button>
          ))}
        </div>
      </div>

      {/* Columna derecha: Orígenes válidos */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <div className="text-xs text-neutral-700 dark:text-neutral-300">Origen (salida)</div>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={swapIfExists} title="Invertir ruta">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
        <div className="mt-1 flex flex-wrap gap-2">
          {(byDestination.get(destination) ?? []).map((o) => (
            <Button
              key={`orig-${o}-${destination}`}
              size="sm"
              variant={origin === o ? "default" : "secondary"}
              onClick={() => setOrigin(o)}
              className="rounded-full"
            >
              {toTitle(o)}
            </Button>
          ))}
        </div>
      </div>
    </>
  )}
</div>

          {/* Resumen selección */}
          <div className="text-xs text-neutral-600 dark:text-neutral-400">
            {mode === "DEPARTURES" ? "Salida" : "Llegada"} · {origin} → {destination} · {routeDate}
          </div>
        </div>

        {/* Gauges */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-0">
          <div className="flex flex-col items-center justify-center px-6 py-4">
            <h3 className="text-sm font-medium text-black dark:text-white">Predicted Price</h3>
            <p className="text-xs text-neutral-600 dark:text-neutral-400">
              {toTitle(origin)} → {toTitle(destination)} · {routeDate}
            </p>
            <div className="mt-2">
              <Gauge percentage={pricePercentage} color={priceColor} value={predPrice ?? 0} label="$ per person" />
            </div>
          </div>

          <div className="flex flex-col items-center justify-center px-6 py-4">
            <h3 className="text-sm font-medium text-black dark:text-white">Predicted Demand</h3>
            <p className="text-xs text-neutral-600 dark:text-neutral-400">
              {toTitle(origin)} → {toTitle(destination)} · {routeDate}
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
                {predPrice != null ? `$${predPrice.toFixed(2)}` : "—"}
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
          <Explanations />
          <SHAPChart
            key={`shap-${Math.floor(progress)}`}
            data={{ nodes: currentModelWeights.nodes, links: currentModelWeights.links }}
            className="h-[400px] w-full"
          />
          <InsightCards />
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
              data={historicalData}
              actualDataKey="profit"
              predictedDataKey="predictedProfit"
              errorDataKey="profitError"
              actualColor={trends.profit.color}
              label="Profit"
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
              data={historicalData}
              actualDataKey="people"
              predictedDataKey="predictedPeople"
              errorDataKey="peopleError"
              actualColor={trends.people.color}
              label="People"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
