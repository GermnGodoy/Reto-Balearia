// lib/getData.ts

/** ================== tipos del API ================== **/

export type PredictMetadata = {
  codigo_buque: string;
  destino: string;                 // "DD07"
  fecha_inicio: string;            // "YYYY-MM-DD" (según backend)
  fecha_salida: string;            // "YYYY-MM-DD"
  n_days: number;
  origen: string;                  // "OO04"
  parametros: {
    base_price: number;
    capacity: number;
    elasticity: number;
    max_price: number;
    min_price: number;
  };
  timestamp: string;               // ISO
};

export type PredictSummaryItem = {
  date: string;     // "DD-MM-YYYY"
  demand: number;
  price: number;
  summary: string;
};

export type PredictReasoning = {
  base_price?: number;
  competitive_factor?: number;
  dynamic_factor?: number;
  elasticity?: number;
  [k: string]: unknown;
};

export type ModelWeights = Record<string, number>;

export type TimelineItem = {
  data: { pred_demand: number; pred_price: number };
  date: string; // "DD-MM-YYYY"
  gauge?: { demand?: number; price?: number };
  progress?: number;
  reasoning?: PredictReasoning;
  weights?: ModelWeights;
};

export type PredictAPIResponse = {
  metadata: PredictMetadata;
  summary?: Record<string, PredictSummaryItem>;
  timeline: TimelineItem[];
};

/** ================== opciones de llamada ================== **/

export type PredictOptions = {
  codigo_buque?: string;
  fecha_reserva?: string; // YYYY-MM-DD
  n_days?: number;
  tabla?: string;
  get_input?: boolean;
  base_price?: number;
  min_price?: number;
  max_price?: number;
  capacity?: number;
  elasticity?: number;
  timeoutMs?: number;
};

const API_URL = process.env.NEXT_PUBLIC_PREDICT_API_URL || "https://predict-298899681831.europe-west1.run.app";

/** ================== utilidades ================== **/

function normalizeApiDate(input: string): string {
  if (!input) throw new Error("Fecha vacía");
  const s = String(input).trim();

  // 1) YYYY-MM-DD (con o sin hora)
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s].*)?$/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

  // 2) DATE(YYYY-MM-DD) o DATE(YYYY,MM,DD)
  const dcon = s.match(/^DATE\(\s*(\d{4})\s*[-\/,]\s*(\d{1,2})\s*[-\/,]\s*(\d{1,2})\s*\)$/i);
  if (dcon) {
    const y = dcon[1];
    const m = dcon[2].padStart(2, "0");
    const d = dcon[3].padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  // 3) DD/MM/YYYY o DD-MM-YYYY
  const dmy = s.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})$/);
  if (dmy) {
    const d = dmy[1].padStart(2, "0");
    const m = dmy[2].padStart(2, "0");
    const y = dmy[3];
    return `${y}-${m}-${d}`;
  }

  // 4) YYYYMMDD
  const ymd = s.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (ymd) return `${ymd[1]}-${ymd[2]}-${ymd[3]}`;

  // 5) Fallback: Date()
  const dt = new Date(s);
  if (!Number.isNaN(dt.getTime())) {
    const y = dt.getUTCFullYear();
    const m = String(dt.getUTCMonth() + 1).padStart(2, "0");
    const d = String(dt.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  throw new Error(`Formato de fecha no válido: "${input}"`);
}

function toIsoDate(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function ensureNumber(n: any): number | null {
  if (typeof n === "number" && Number.isFinite(n)) return n;
  if (typeof n === "string") {
    const v = parseFloat(n.replace(",", "."));
    return Number.isFinite(v) ? v : null;
  }
  return null;
}

/** ================== FUNCIÓN PRINCIPAL ================== **/

/**
 * getData: ahora devuelve TODO el objeto de predicción:
 *   - metadata
 *   - summary (si viene)
 *   - timeline completo (con pred_price, pred_demand, weights, reasoning, etc.)
 */
export async function getData(
  date: string,
  origin: string,
  destination: string,
  opts: PredictOptions = {}
): Promise<PredictAPIResponse> {
  if (!API_URL) {
    throw new Error("Falta NEXT_PUBLIC_PREDICT_API_URL en variables de entorno");
  }

  const now = new Date();
  const payload = {
    origen: origin.toUpperCase(),
    destino: destination.toUpperCase(),
    fecha_salida_base: normalizeApiDate(date),
    codigo_buque: (opts.codigo_buque ?? "SCA").toUpperCase(),
    fecha_reserva: opts.fecha_reserva ? normalizeApiDate(opts.fecha_reserva) : toIsoDate(now),
    n_days: typeof opts.n_days === "number" ? opts.n_days : 7,
    tabla: opts.tabla ?? "balearia_dataset_nuevo.LIMPIO_SINCOS",
    get_input: opts.get_input ?? true,
    base_price: opts.base_price ?? 80,
    min_price: opts.min_price ?? 20,
    max_price: opts.max_price ?? 200,
    capacity: opts.capacity ?? 80,
    elasticity: opts.elasticity ?? 20,
  };

  const timeoutMs = typeof opts.timeoutMs === "number" ? opts.timeoutMs : 60000;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    const text = await res.text();
    if (!res.ok) {
      throw new Error(`API ${res.status} :: ${text}`);
    }

    // Parseo robusto
    let json: any;
    try {
      json = JSON.parse(text);
    } catch {
      throw new Error("Respuesta del backend no es JSON válido");
    }

    // Validación mínima de forma
    if (!json || typeof json !== "object" || !json.metadata || !Array.isArray(json.timeline)) {
      throw new Error("Formato inesperado de respuesta (faltan metadata/timeline)");
    }

    // Coerciones suaves
    const cleanTimeline: TimelineItem[] = json.timeline.map((t: any) => ({
      data: {
        pred_demand: ensureNumber(t?.data?.pred_demand) ?? null,
        pred_price:  ensureNumber(t?.data?.pred_price)  ?? null,
      },
      date: String(t?.date ?? ""),
      gauge: t?.gauge ?? undefined,
      progress: typeof t?.progress === "number" ? t.progress : undefined,
      reasoning: t?.reasoning ?? undefined,
      weights: t?.weights ?? undefined,
    }));


    const result: PredictAPIResponse = {
      metadata: json.metadata as PredictMetadata,
      summary: json.summary ?? undefined,
      timeline: cleanTimeline,
    };

    return result;
  } catch (err) {
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

/** ================== helpers de compatibilidad ================== **/

/**
 * Devuelve { price, demand, weights } del primer elemento del timeline.
 * Útil cuando solo necesitas alimentar gauges/SHAP rápido.
 */
// export async function getPredictedNumbers(
//   date: string,
//   origin: string,
//   destination: string,
//   opts: PredictOptions = {}
// ): Promise<{ price: number | null; demand: number | null; weights: ModelWeights | null }> {
//   const full = await getData(date, origin, destination, opts);
//   const first = full.timeline?.[0];

//   const price = ensureNumber(first?.data?.pred_price);
//   const demand = ensureNumber(first?.data?.pred_demand);
//   const weights = (first?.weights && typeof first.weights === "object") ? (first.weights as ModelWeights) : null;
//   return { price, demand, weights };
// }
