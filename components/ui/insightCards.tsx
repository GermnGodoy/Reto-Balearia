"use client";

import { useMemo } from "react";
import { TrendingDown, TrendingUp, DollarSign, Users, Cloud, Calendar } from "lucide-react";

type ModelWeights = Partial<{
  capacity: number;
  competition: number;
  events: number;
  lead_time: number;
  other: number;
  weather: number;
}>;

type Reasoning = Partial<{
  base_price: number;
  elasticity: number;
  dynamic_factor: number;
  competitive_factor: number;
}>;

type Params = Partial<{
  min_price: number;
  max_price: number;
  base_price: number;
  capacity: number;
  elasticity: number;
}>;

type InsightCardsProps = {
  price: number | null;
  demand: number | null;
  weights: ModelWeights | null;
  reasoning?: Reasoning | null;
  params?: Params | null;
};

const FEATURE_LABELS: Record<string, string> = {
  capacity: "Capacidad",
  competition: "Competencia",
  events: "Eventos",
  lead_time: "Ventana de reserva",
  other: "Otros",
  weather: "Meteo",
};

const ICON_BY_FEATURE: Partial<Record<keyof ModelWeights, any>> = {
  lead_time: Calendar,
  competition: TrendingDown,
  weather: Cloud,
  capacity: Users,
  events: Calendar,
  other: DollarSign,
};

const color = "text-black dark:text-white";
const bgColor = "bg-neutral-50 dark:bg-neutral-900/30";
const borderColor = "border-black dark:border-white";

export default function InsightCards({ price, demand, weights, reasoning, params }: InsightCardsProps) {
  const insights = useMemo(() => {
    const out: Array<{
      id: string;
      title: string;
      description: string;
      icon: any;
      color: string;
      bgColor: string;
      borderColor: string;
    }> = [];

    // ───────────────────────── Pesos (top drivers) ─────────────────────────
    const entries = Object.entries(weights ?? {})
      .filter(([, v]) => Number.isFinite(Number(v)))
      .map(([k, v]) => [k, Number(v)] as [keyof ModelWeights, number])
      .sort((a, b) => b[1] - a[1]);

    const total = entries.reduce((s, [, v]) => s + Math.abs(v), 0) || 1;

    // Top 3 factores (si existen)
    entries.slice(0, 3).forEach(([key, val], i) => {
      const pct = (val / total) * 100;
      const Icon = ICON_BY_FEATURE[key] ?? DollarSign;
      out.push({
        id: `top-${i}-${String(key)}`,
        title: `Factor clave: ${FEATURE_LABELS[String(key)] ?? String(key)}`,
        description: `Contribución relativa ≈ ${pct.toFixed(1)}%. Este factor es de los más influyentes en la predicción actual.`,
        icon: Icon,
        color,
        bgColor,
        borderColor,
      });
    });

    // ───────────────────────── Precio vs base ─────────────────────────
    const baseFromReasoning = reasoning?.base_price;
    const baseFromParams = params?.base_price;
    const baseRef = [baseFromReasoning, baseFromParams].find((v) => Number.isFinite(Number(v)));

    if (price != null && Number.isFinite(price) && baseRef != null && Number.isFinite(Number(baseRef))) {
      const base = Number(baseRef);
      const deltaPct = base ? ((price - base) / base) * 100 : 0;

      out.push({
        id: "price-vs-base",
        title:
          deltaPct > 8
            ? `Precio sobre base (+${deltaPct.toFixed(1)}%)`
            : deltaPct < -8
            ? `Precio bajo base (${deltaPct.toFixed(1)}%)`
            : `Precio alineado con base (${deltaPct.toFixed(1)}%)`,
        description:
          deltaPct > 8
            ? "El precio está sensiblemente por encima de la base. Si la elasticidad es alta, un ajuste a la baja podría impulsar demanda."
            : deltaPct < -8
            ? "El precio está notablemente por debajo de la base. Si hay presión competitiva, puede ayudar a capturar cuota; vigila el margen."
            : "El precio está muy próximo a la base; moverlo poco probablemente no altere en exceso la demanda si no cambian otros factores.",
        icon: DollarSign,
        color,
        bgColor,
        borderColor,
      });
    }

    // ───────────────────────── Elasticidad (si viene de la API) ─────────────────────────
    if (Number.isFinite(Number(reasoning?.elasticity))) {
      const E = Number(reasoning!.elasticity);
      let qual = "media";
      if (E >= 15) qual = "alta";
      else if (E <= 7) qual = "baja";

      out.push({
        id: "elasticity",
        title: `Sensibilidad al precio ${qual}`,
        description:
          qual === "alta"
            ? `Elasticidad ≈ ${E}. Cambios pequeños de precio pueden provocar variaciones grandes de demanda.`
            : qual === "baja"
            ? `Elasticidad ≈ ${E}. La demanda responde poco a cambios de precio; revisa otros impulsores.`
            : `Elasticidad ≈ ${E}. Impacto moderado del precio en la demanda; coordina con competencia y ventana de reserva.`,
        icon: TrendingUp,
        color,
        bgColor,
        borderColor,
      });
    }

    // ───────────────────────── Ocupación estimada (si API trae capacidad) ─────────────────────────
    if (Number.isFinite(Number(params?.capacity)) && Number.isFinite(Number(demand))) {
      const cap = Number(params!.capacity);
      const occ = cap > 0 ? (Number(demand) / cap) * 100 : 0;
      out.push({
        id: "load-factor",
        title: `Ocupación estimada ≈ ${occ.toFixed(0)}%`,
        description:
          occ >= 90
            ? "Muy alta. Revisa disponibilidad y considera optimizar precio para margen."
            : occ >= 70
            ? "Alta. Mantén vigilancia en precio/competencia y posibles picos por eventos."
            : "Media/Baja. Puedes explorar incentivos o ajustar precio si la elasticidad lo permite.",
        icon: Users,
        color,
        bgColor,
        borderColor,
      });
    }

    // ───────────────────────── Lecturas específicas por feature (si existen) ─────────────────────────
    const w = (k: keyof ModelWeights) => (weights && Number.isFinite(Number(weights[k])) ? Number(weights[k]) : null);
    const asPct = (x: number | null) => (x == null ? null : (x / total) * 100);

    const leadPct = asPct(w("lead_time"));
    if (leadPct != null) {
      out.push({
        id: "lead-time",
        title: "Ventana de reserva influyente",
        description:
          leadPct >= 20
            ? `La proximidad a la salida pesa ≈ ${leadPct.toFixed(1)}%. Movimientos de precio tardíos serán particularly efectivos.`
            : `La ventana de reserva influye ≈ ${leadPct.toFixed(1)}%. Efecto relevante pero no dominante.`,
        icon: Calendar,
        color,
        bgColor,
        borderColor,
      });
    }

    const compPct = asPct(w("competition"));
    if (compPct != null) {
      out.push({
        id: "competition",
        title: compPct >= 8 ? "Presión competitiva notable" : "Presión competitiva moderada",
        description:
          compPct >= 8
            ? `La competencia contribuye ≈ ${compPct.toFixed(1)}%. Evita sobreprecio sostenido si la elasticidad es alta.`
            : `La competencia pesa ≈ ${compPct.toFixed(1)}%. Aún así, monitoriza reacciones de mercado.`,
        icon: TrendingDown,
        color,
        bgColor,
        borderColor,
      });
    }

    const weatherPct = asPct(w("weather"));
    if (weatherPct != null) {
      out.push({
        id: "weather",
        title: weatherPct >= 10 ? "Impacto meteo relevante" : "Impacto meteo moderado",
        description:
          weatherPct >= 10
            ? `La meteo aporta ≈ ${weatherPct.toFixed(1)}% a la predicción. Revisa pronósticos para evitar sorpresas.`
            : `La meteo pesa ≈ ${weatherPct.toFixed(1)}%. Efecto no despreciable.`,
        icon: Cloud,
        color,
        bgColor,
        borderColor,
      });
    }

    const eventsPct = asPct(w("events"));
    if (eventsPct != null) {
      out.push({
        id: "events",
        title: eventsPct >= 8 ? "Eventos con efecto" : "Eventos con efecto moderado",
        description:
          eventsPct >= 8
            ? `Eventos/temporadas suman ≈ ${eventsPct.toFixed(1)}%. Coordina disponibilidad y pricing.`
            : `Eventos influyen ≈ ${eventsPct.toFixed(1)}%.`,
        icon: Calendar,
        color,
        bgColor,
        borderColor,
      });
    }

    // Si no hay nada que mostrar, lo indicamos claramente
    if (out.length === 0) {
      out.push({
        id: "no-data",
        title: "Sin datos suficientes",
        description: "No hay parámetros de la API suficientes para generar insights ahora.",
        icon: TrendingDown,
        color,
        bgColor,
        borderColor,
      });
    }

    return out;
  }, [price, demand, weights, reasoning, params]);

  return (
    <div className="flex gap-6 overflow-x-auto pb-2 mt-9">
      {insights.map((insight) => {
        const Icon = insight.icon;
        return (
          <div
            key={insight.id}
            className={`border rounded-lg p-4 ${insight.bgColor} ${insight.borderColor} transition-all hover:shadow-md flex-shrink-0 w-64`}
          >
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-lg ${insight.bgColor}`}>
                <Icon className={`h-5 w-5 ${insight.color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className={`font-semibold text-sm mb-1 ${insight.color}`}>{insight.title}</h3>
                <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                  {insight.description}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
