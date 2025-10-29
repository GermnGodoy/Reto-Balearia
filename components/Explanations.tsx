"use client";

import { useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Sparkles,
  RotateCcw,
  Lightbulb,
  ListChecks,
  ShieldAlert,
  Activity,
  CircleDot,
} from "lucide-react";
import { getPast15DaysTravels, getPast15DaysWeights } from "@/functions/db";
import { useTravels } from "@/contexts/travelsContext";
import { useProgress } from "@/contexts/ProgressContext";
import { Children } from "react";

/** ========= NEW: tipos para inyectar la predicción ========= */
export type PredictionProps = {
  price: number | null;
  demand: number | null;
  /** pesos: {feature: weight} tal cual devuelve timeline[0].weights */
  weights?: Record<string, number> | null;
  meta?: {
    origin?: string;            // ej. OO04
    destination?: string;       // ej. DD07
    originLabel?: string;       // ej. València
    destinationLabel?: string;  // ej. Mallorca
    date?: string;              // YYYY-MM-DD
    codigo_buque?: string;      // ej. SCA
    params?: {
      base_price?: number;
      min_price?: number;
      max_price?: number;
      capacity?: number;
      elasticity?: number;
    };
  };
} | undefined;

/** ========= helpers ========= */
const textFrom = (node: React.ReactNode) =>
  Children.toArray(node)
    .map((c) => (typeof c === "string" || typeof c === "number" ? String(c) : ""))
    .join("")
    .trim();

function safeStringify(obj: any, limit = 6000) {
  try {
    const s = JSON.stringify(obj);
    return s.length > limit ? s.slice(0, limit) + " …(truncado)" : s;
  } catch {
    return "[contexto no serializable]";
  }
}

/** --- MarkdownRenderer: adds icons & styling --- */
function MarkdownRenderer({ markdown }: { markdown: string }) {
  const iconForHeading = (text: string) => {
    const t = text.toLowerCase();
    if (t.includes("hallazgos clave")) return <Lightbulb className="h-4 w-4" />;
    if (t.includes("acciones priorizadas")) return <ListChecks className="h-4 w-4" />;
    if (t.includes("riesgos")) return <ShieldAlert className="h-4 w-4" />;
    if (t.includes("kpis")) return <Activity className="h-4 w-4" />;
    return null;
  };

  return (
    <div className="text-base leading-relaxed text-neutral-800 dark:text-neutral-100">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h2: ({ children }) => {
            const text = textFrom(children).toLowerCase();
            return (
              <h2 className="mt-4 mb-2 flex items-center gap-2 text-lg font-semibold">
                {iconForHeading(text)}
                <span>{children}</span>
              </h2>
            );
          },
          h3: ({ children }) => (
            <h3 className="mt-3 mb-1 text-base font-semibold">{children}</h3>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold text-black dark:text-white">
              {children}
            </strong>
          ),
          ul: ({ children }) => (
            <ul className="my-2 ms-1 space-y-2">{children}</ul>
          ),
          li: ({ children }) => (
            <li className="flex gap-2">
              <CircleDot className="h-4 w-4 mt-1.5 flex-shrink-0" />
              <div className="[&>p]:m-0">{children}</div>
            </li>
          ),
          table: ({ children }) => (
            <div className="my-3 overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-700">
              <table className="min-w-[560px] w-full border-collapse">{children}</table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-neutral-100/70 dark:bg-neutral-800/60">{children}</thead>
          ),
          th: ({ children }) => (
            <th className="px-3 py-2 text-left text-sm font-semibold border-b border-neutral-200 dark:border-neutral-700">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-3 py-2 text-sm border-b border-neutral-200 dark:border-neutral-700">
              {children}
            </td>
          ),
          p: ({ children }) => <p className="my-2 text-[0.975rem]">{children}</p>,
        }}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  );
}

/** --- COMPONENTE --- 
 * Ahora acepta props opcionales con la predicción en vivo.
 */
export default function Explanations({ prediction }: { prediction?: PredictionProps }) {
  const { travels } = useTravels();
  const { progress } = useProgress();

  const past15DaysTravels = useMemo(
    () => getPast15DaysTravels(travels, progress),
    [travels, progress]
  );
  const past15DaysWeights = useMemo(
    () => getPast15DaysWeights(progress),
    [progress]
  );

  const [insights, setInsights] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** ======== PROMPTS (ajustados para usar la predicción si existe) ======== */
  const systemPrompt = `
Eres BALEITO, analista senior de redes de ferris. Escribe en español (España), claro y accionable.
Si te doy precio, demanda y pesos PREDICHOS, ÚSALOS como fuente principal.
Reglas:
- No inventes datos; usa solo el contexto.
- Cita unidades (€, pax, %).
- Prioriza los 3–4 factores con mayor peso (del objeto "weights").
- Cierra con 1 recomendación operativa coherente con min/max si están en el contexto.
Output: Markdown con estas secciones:
## Hallazgos clave
## Acciones priorizadas (RICE)
## Riesgos y mitigaciones
## KPIs a vigilar (próximas 2 semanas)
`.trim();

  function buildUserMessage() {
    // Compactamos solo lo útil; la predicción manda si está presente
    const predBlock = prediction
      ? {
          predicted: {
            price: prediction.price,
            demand: prediction.demand,
            weights: prediction.weights ?? null,
          },
          meta: prediction.meta ?? null,
        }
      : null;

    const context = {
      predBlock, // ← si existe, la IA debe usarlo como fuente principal
      past15DaysTravels,
      past15DaysWeights,
      meta: { note: "Datos resumidos de los últimos 15 días" },
    };

    // Instrucción explícita
    const task = `
Tarea:
1) Si "predBlock" existe, resume en 1 frase el resultado del modelo (precio y demanda) y úsalo como base del análisis.
2) Explica por qué, ordenando factores por peso descendente (del objeto weights si existe).
3) Menciona riesgos/incertidumbres si aplican (p.ej., demanda cercana a capacidad).
4) Da 1 recomendación operativa concreta (subir/bajar/mantener precio), respetando límites si están definidos en meta.params.
`.trim();

    return `CONTEXT JSON (compacto):\n${safeStringify(context)}\n\n${task}\n\nDevuelve SOLO el Markdown en el formato requerido.`;
  }

  async function generate() {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/gemini-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemPrompt,
          messages: [{ role: "user", content: buildUserMessage() }],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Error desconocido");
      setInsights(data.reply);
    } catch (e: any) {
      setError(e?.message || "Fallo al generar con Gemini.");
      setInsights("");
    } finally {
      setLoading(false);
    }
  }

  // Vuelve a generar si cambian la predicción o los datos base
  useEffect(() => {
    generate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prediction?.price, prediction?.demand, JSON.stringify(prediction?.weights), past15DaysTravels, past15DaysWeights]);

  return (
    <div className="mt-10 mb-7">
      <div className="relative rounded-xl border border-black dark:border-white bg-neutral-50 dark:bg-neutral-900/30 p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-lg bg-neutral-100 dark:bg-neutral-800 flex-shrink-0">
            <Sparkles className="h-6 w-6 text-black dark:text-white" />
          </div>

          <div className="flex-1">
            <div className="mb-2 flex items-center justify-between">
              <h4 className="text-base font-semibold text-black dark:text-white">Estrategia</h4>
              <button
                onClick={generate}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-md border border-neutral-300 dark:border-neutral-700 px-3 py-1.5 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-60"
                aria-busy={loading}
              >
                <RotateCcw className="h-4 w-4" />
                {loading ? "Generando…" : "Regenerar"}
              </button>
            </div>

            {error ? (
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            ) : insights ? (
              <MarkdownRenderer markdown={insights} />
            ) : (
              <p className="text-base text-neutral-700 dark:text-neutral-200 leading-relaxed">
                {loading
                  ? "Generando recomendaciones…"
                  : "Estas recomendaciones se basan en la predicción y en los últimos 15 días. Pulsa “Regenerar” para actualizar."}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
