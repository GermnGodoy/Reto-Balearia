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
//Little helper from gpt
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
  // Map section titles → icons
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
            const text = textFrom(children).toLowerCase(); // <- simple + robust enough
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
              {/* Remove default <p> margin inside list items */}
              <div className="[&>p]:m-0">{children}</div>
            </li>
          ),
          table: ({ children }) => (
            <div className="my-3 overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-700">
              <table className="min-w-[560px] w-full border-collapse">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-neutral-100/70 dark:bg-neutral-800/60">
              {children}
            </thead>
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
          p: ({ children }) => (
            <p className="my-2 text-[0.975rem]">{children}</p>
          ),
        }}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  );
}

/** --- Your original component, now using MarkdownRenderer --- */
export default function Explanations() {
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

const systemPrompt = `
Eres un analista senior de redes de ferris. Escribe en español de España, claro y accionable.
Usa el contexto para dar recomendaciones y DEVUELVE SIEMPRE MARKDOWN con esta estructura:

## Hallazgos clave
- **Titular en negrita (≤6 palabras)**. 1–2 frases explicativas.
- **Otro titular**. 1–2 frases.
- **Otro titular**. 1–2 frases.

## Acciones priorizadas (RICE)
| **Acción** | **Impacto (1–5)** | **Confianza (0–1)** | **Esfuerzo (1–5)** | **RICE (I*C/E)** |
| --- | ---: | ---: | ---: | ---: |
| Ajustar horarios en ruta X | 4 | 0.7 | 2 | 1.40 |
| … | … | … | … | … |

## Riesgos y mitigaciones
- **Riesgo**: descripción breve. **Mitigación**: acción concreta.
- **Riesgo**: … **Mitigación**: …

## KPIs a vigilar (próximas 2 semanas)
- **Ocupación media**, **Ingresos por salida**, **No-show**, **Puntualidad**, **Meteo crítica**.

No saludos ni preámbulos; SOLO el contenido. Usa negritas en los títulos de viñetas. 
`.trim();


  function buildUserMessage() {
    const context = {
      past15DaysTravels,
      past15DaysWeights,
      meta: { note: "Datos resumidos de los últimos 15 días" },
    };
    return `CONTEXT JSON (compacto):\n${safeStringify(context)}\n\nGenera las recomendaciones siguiendo estrictamente el formato pedido.`;
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

  useEffect(() => {
    generate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [past15DaysTravels, past15DaysWeights]);

  return (
    <div className="mt-10 mb-7">
      <div className="relative rounded-xl border border-black dark:border-white bg-neutral-50 dark:bg-neutral-900/30 p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-lg bg-neutral-100 dark:bg-neutral-800 flex-shrink-0">
            <Sparkles className="h-6 w-6 text-black dark:text-white" />
          </div>

          <div className="flex-1">
            <div className="mb-2 flex items-center justify-between">
              <h4 className="text-base font-semibold text-black dark:text-white">
                Estrategia
              </h4>
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
                  ? "Generando recomendaciones con Gemini…"
                  : "Estas recomendaciones se basan en los últimos 15 días de datos. Pulsa “Regenerar” para actualizar."}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
