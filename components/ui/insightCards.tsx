"use client";

import React, { useMemo } from "react";
import {
  TrendingDown,
  TrendingUp,
  DollarSign,
  Users,
  Cloud,
  Calendar,
} from "lucide-react";

// ───────────────── Types ─────────────────
type ModelWeights = Record<string, number>;
type WeightsPoint = { progress: number; weights: ModelWeights | null | undefined };

type InsightCardsProps = {
  /** Opción A: pesos ya filtrados fuera (fallback si no se pasan timeline/progress) */
  weights?: ModelWeights | null;
  /** Opción B (recomendada): timeline de pesos con su progress */
  weightsTimeline?: WeightsPoint[];
  /** progress actual (0..100). Si está, se usa para seleccionar el punto de timeline */
  progress?: number;
  /** límite de nº de cards a mostrar */
  maxCards?: number;
};

// ─────────────── Helpers de copy/UI ───────────────
type Insight = {
  id: string;
  title: string;
  description: string;
  icon:
    | typeof TrendingDown
    | typeof TrendingUp
    | typeof DollarSign
    | typeof Users
    | typeof Cloud
    | typeof Calendar;
  weight: number;
};

const LABELS: Record<string, string> = {
  capacity: "Capacidad",
  competition: "Competencia",
  events: "Eventos",
  lead_time: "Ventana de reserva",
  weather: "Meteorología",
  other: "Otras señales",
};

const ICON_BY_FACTOR: Record<string, Insight["icon"]> = {
  capacity: Users,
  competition: TrendingDown,
  events: Calendar,
  lead_time: Calendar,
  weather: Cloud,
  other: DollarSign,
};

function intensityTag(w: number) {
  if (w >= 0.25) return "muy alto";
  if (w >= 0.15) return "alto";
  if (w >= 0.08) return "moderado";
  return "bajo";
}
function toPct(part: number, total: number) {
  const pct = total > 0 ? (part / total) * 100 : 0;
  return Math.round(pct * 10) / 10;
}

// ─────────────── Selección por progress ───────────────
// Normaliza >100 (o inválidos) a 0,10,20,... por índice y elige el último ≤ progress (floor).
function selectWeightsForProgress(
  weightsTimeline: WeightsPoint[] | undefined,
  progress: number | undefined
): ModelWeights | null {
  if (!weightsTimeline?.length || typeof progress !== "number" || !Number.isFinite(progress)) {
    return null;
  }

  // 1) Normalización de progress: si viene >100, lo mapeamos por índice (i*10).
  const normalized = weightsTimeline
    .map((p, i) => {
      const raw = Number.isFinite(p.progress) ? p.progress : NaN;
      const norm =
        Number.isFinite(raw) && raw <= 100
          ? Math.max(0, Math.min(100, Math.round(raw)))
          : i * 10; // ← clave: rebase para 100,101,102…
      return { progress: norm, weights: p.weights ?? null };
    })
    .filter((p) => p.weights && Object.keys(p.weights!).length > 0)
    .sort((a, b) => a.progress - b.progress);

  if (!normalized.length) return null;

  // 2) Floor por progress UI (0..100)
  const p = Math.max(0, Math.min(100, Math.floor(progress)));
  const candidate =
    [...normalized].reverse().find((pt) => pt.progress <= p) ?? normalized[0];

  return candidate.weights as ModelWeights;
}

function buildFactorInsight(key: string, weight: number, total: number): Insight {
  const label =
    LABELS[key] ?? key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  const Icon = ICON_BY_FACTOR[key] ?? DollarSign;
  const pct = toPct(weight, total);
  const level = intensityTag(weight);

  let title = `${label}: impacto ${level}`;
  let description = `Este factor pesa un ${pct}% en la predicción.`;

  switch (key) {
    case "capacity":
      description +=
        " La gestión de cupos/ocupación condiciona el resultado. Ajusta asignación de buque/frecuencia y alinea precios con utilización.";
      break;
    case "lead_time":
      description +=
        " La ventana de reserva influye notablemente. Activa tácticas por tramo temporal (early-bird/last-minute) y revisa anticipación de aperturas/cierres.";
      break;
    case "competition":
      description +=
        " El entorno competitivo es relevante. Vigila paridades y elasticidad relativa; pequeños ajustes de precio/paquetes pueden tener impacto sensible.";
      break;
    case "events":
      description +=
        " Hay efecto de calendario/eventos. Coordina refuerzos y campañas alrededor de picos esperados (conciertos, ferias, festivos).";
      break;
    case "weather":
      description +=
        " La meteo aporta señal. Prevé escenarios adversos y comunica con antelación; ajusta campaña y operativa según pronósticos.";
      break;
    case "other":
      description +=
        " Señales no categorizadas relevantes. Revisa features agregadas/logs para identificar palancas adicionales (canales, microtemporadas).";
      break;
    default:
      description += " Factor específico del modelo con contribución significativa.";
  }

  return { id: `insight-${key}`, title, description, icon: Icon, weight };
}

function buildTopSummary(sortedPairs: Array<[string, number]>, total: number): Insight | null {
  if (!sortedPairs.length) return null;
  const top3 = sortedPairs.slice(0, 3);
  const bullets = top3
    .map(([k, v]) => `${LABELS[k] ?? k}: ${toPct(v, total)}%`)
    .join(" · ");

  return {
    id: "summary-top",
    title: "Principales ‘drivers’ del modelo",
    description: `Predicción dominada por: ${bullets}. Prioriza decisiones sobre estos factores para maximizar impacto.`,
    icon: TrendingUp,
    weight: top3.reduce((acc, [, v]) => acc + v, 0),
  };
}

// ─────────────── Componente ───────────────
export default function InsightCards({
  weights,
  weightsTimeline,
  progress,
  maxCards = 5,
}: InsightCardsProps) {
  // 1) Elegimos pesos efectivos: prioridad a timeline+progress
  const effectiveWeights: ModelWeights | null = useMemo(() => {
    const byProgress = selectWeightsForProgress(weightsTimeline, progress);
    if (byProgress) return byProgress;
    return weights ?? null;
  }, [weightsTimeline, progress, weights]);

  // 2) Generamos las cards en función de esos pesos
  const cards = useMemo<Insight[]>(() => {
    if (!effectiveWeights || Object.keys(effectiveWeights).length === 0) {
      return [
        {
          id: "no-weights",
          title: "A la espera de explicabilidad",
          description:
            "Aún no hay pesos disponibles para este punto de la línea temporal. Avanza el progreso o verifica la respuesta del endpoint.",
          icon: TrendingUp,
          weight: 0,
        },
      ];
    }

    const entries = Object.entries(effectiveWeights).filter(
      ([, v]) => typeof v === "number" && Number.isFinite(v)
    );
    const total = entries.reduce((acc, [, v]) => acc + (v as number), 0) || 1;
    const sorted = entries.sort((a, b) => (b[1] as number) - (a[1] as number));

    const out: Insight[] = [];
    const summary = buildTopSummary(sorted, total);
    if (summary) out.push(summary);

    for (const [k, v] of sorted) {
      out.push(buildFactorInsight(k, v as number, total));
    }
    return out.slice(0, maxCards);
  }, [effectiveWeights, maxCards]);

  return (
    <div className="flex gap-6 overflow-x-auto pb-2 mt-9">
      {cards.map((c) => {
        const Icon = c.icon;
        const color = "text-black dark:text-white";
        const bg = "bg-neutral-50 dark:bg-neutral-900/30";
        const border = "border-black/70 dark:border-white/50";
        return (
          <div
            key={c.id}
            className={`border rounded-lg p-4 ${bg} ${border} transition-all hover:shadow-md flex-shrink-0 w-64`}
          >
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-lg ${bg}`}>
                <Icon className={`h-5 w-5 ${color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className={`font-semibold text-sm mb-1 ${color}`}>{c.title}</h3>
                <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                  {c.description}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
