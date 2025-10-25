"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { DollarSign, Users } from "lucide-react";
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
import { useTravels } from "@/contexts/travelsContext";
import { useTravelStats } from "@/hooks/useTravelStats";

// Defaults
const ORIGIN = "VALENCIA";
const DESTINATION = "PALMA";

const ROUTES = [
  { label: "Valencia — Palma", origin: "VALENCIA", destination: "PALMA" },
  { label: "Denia — Formentera", origin: "DENIA", destination: "FORMENTERA" }
] as const;

export default function StatsTab() {
  const { progress, routeDate } = useProgress();
    const {
    currentMeanData,
    gaugePercentage,
    gaugeColor,
    historicalData,
    trends
  } = useTravelStats(progress)
  // route selection state
  const [origin, setOrigin] = useState<string>(ORIGIN);
  const [destination, setDestination] = useState<string>(DESTINATION);

  // predicted values
  const [predPrice, setPredPrice] = useState<number | null>(null);
  const [predDemand, setPredDemand] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [predSeries, setPredSeries] = useState<any[]>([]);
  const [predSeriesPrices, setPredSeriesPrices] = useState<number[]>([]);

useEffect(() => {
  let cancelled = false;
  setLoading(true);
  setError(null);

  (async () => {
    try {
      const json = await getData(routeDate, origin, destination);
      const row = Array.isArray(json?.data) && json.data.length ? json.data[0] : null;

      const priceRaw =
        row?.["pred_price"] ??
        row?.pred_price ??
        row?.predPrice ??
        row?.pre_price ??
        null;

      const demandRaw =
        row?.["pred_demand"] ??
        row?.pred_demand ??
        row?.predDemand ??
        null;

      // ⬇️ NEW: try pred_data first; fall back to prev_data (based on your earlier sample)
      const predDataRaw =
        row?.pred_data ??
        row?.predData ??
        row?.prev_data ??
        row?.prevData ??
        null;

      const series = Array.isArray(predDataRaw) ? predDataRaw : [];

      // ⬇️ NEW: collect every numeric price we can find
      const seriesPrices: number[] = series.flatMap((d: any) => {
        const out: number[] = [];
        if (typeof d?.price === "number") out.push(d.price);
        if (typeof d?.pred_price === "number") out.push(d.pred_price);
        if (Array.isArray(d?.prices)) {
          out.push(...d.prices.filter((x: any) => typeof x === "number"));
        }
        return out;
      });

      if (!cancelled) {
        setPredPrice(typeof priceRaw === "number" ? priceRaw : null);
        setPredDemand(typeof demandRaw === "number" ? demandRaw : null);

        // ⬇️ NEW: expose arrays
        setPredSeries(series);
        setPredSeriesPrices(seriesPrices);

        
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

  // Gauge cosmetics
  const pricePercentage =
    predPrice != null ? Math.max(0, Math.min(100, Math.round(predPrice))) : 0;
  const demandPercentage =
    predDemand != null ? Math.max(0, Math.min(100, Math.round(predDemand))) : 0;

  const priceColor =
    predPrice == null ? "#6b7280" : predPrice < 50 ? "#16a34a" : predPrice < 80 ? "#f59e0b" : "#dc2626";
  const demandColor = "#2563eb";

  // Keep model weights & the rest of your page working
  const currentModelWeights =
    modelWeightsData.find((item: any) => item.progress === Math.floor(progress)) ||
    modelWeightsData[0];

  // const historicalData: any[] = [];
  // const trends = { profit: { color: "#16a34a" }, people: { color: "#2563eb" } };

  const isSelected = (o: string, d: string) => origin === o && destination === d;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <Card className="border-neutral-200 dark:border-neutral-700 bg-white dark:bg-black overflow-hidden">
        {/* ⬇️ Route buttons only */}
        <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/60 dark:bg-neutral-900/40">
          <div className="flex flex-wrap gap-2">
            {ROUTES.map((r) => (
              <Button
                key={r.label}
                size="sm"
                variant={isSelected(r.origin, r.destination) ? "default" : "secondary"}
                onClick={() => {
                  setOrigin(r.origin);
                  setDestination(r.destination);
                }}
                className="rounded-full"
              >
                {r.label}
              </Button>
            ))}
          </div>

          {/* Current selection summary */}
          <div className="mt-2 text-xs text-neutral-600 dark:text-neutral-400">
            {origin} → {destination} · {routeDate}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-0">
          {/* Predicted Price */}
          <div className="flex flex-col items-center justify-center px-6 py-4">
            <h3 className="text-sm font-medium text-black dark:text-white">Predicted Price</h3>
            <p className="text-xs text-neutral-600 dark:text-neutral-400">
              From model output for {origin} - {destination} on {routeDate}
            </p>
            <div className="mt-2">
              <Gauge
                percentage={pricePercentage}
                color={priceColor}
                value={predPrice ?? 0}
                label="$ per person"
              />
            </div>
          </div>

          {/* Predicted Demand */}
          <div className="flex flex-col items-center justify-center px-6 py-4">
            <h3 className="text-sm font-medium text-black dark:text-white">Predicted Demand</h3>
            <p className="text-xs text-neutral-600 dark:text-neutral-400">
              From model output for {origin} - {destination} on {routeDate}
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

        {/* Single centered extra info */}
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

        {loading && (
          <div className="px-6 pb-4 text-sm text-neutral-500">Loading predictions…</div>
        )}
        {error && (
          <div className="px-6 pb-4 text-sm text-red-600">
            Error loading prediction: {error}
          </div>
        )}
      </Card>

      {/* Model Feature Weights */}
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
            data={{
              nodes: currentModelWeights.nodes,
              links: currentModelWeights.links,
            }}
            className="h-[400px] w-full"
          />
          <InsightCards />
        </CollapsibleCardContent>
      </CollapsibleCard>

      {/* Area Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-neutral-200 dark:border-neutral-700 bg-white dark:bg-black">
          <CardHeader>
            <CardTitle className="text-black dark:text-white">Total Profit Trend</CardTitle>
            <CardDescription className="text-neutral-600 dark:text-neutral-400">
              Last 10 progress points
            </CardDescription>
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
            <CardDescription className="text-neutral-600 dark:text-neutral-400">
              Last 10 progress points
            </CardDescription>
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
