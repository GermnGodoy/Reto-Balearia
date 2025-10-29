// lib/getData.ts
/**
 * Llama a tu endpoint de Cloud Run /predict (el del script Python) y
 * devuelve únicamente el número pred_price del primer elemento de timeline.
 *
 * - Firma compatible: getData(date, origin, destination)
 * - 4º parámetro opcional para tunear payload y timeout.
 */

type PredictOptions = {
  codigo_buque?: string;          // obligatorio para el backend, default "SCA"
  fecha_reserva?: string;         // YYYY-MM-DD (por defecto: hoy)
  n_days?: number;                // default 1
  tabla?: string;                 // default "balearia_dataset_nuevo.LIMPIO_SINCOS"
  get_input?: boolean;            // default true
  base_price?: number;            // default 50
  min_price?: number;             // default 40
  max_price?: number;             // default 60
  capacity?: number;              // default 80
  elasticity?: number;            // default 20
  timeoutMs?: number;             // default 60000 (1 min)
};

type PredictAPIResponse = {
  metadata?: Record<string, unknown>;
  timeline?: Array<{
    date?: string;
    data?: { pred_price?: number; pred_demand?: number; [k: string]: unknown };
    gauge?: Record<string, unknown>;
    progress?: number;
    reasoning?: Record<string, unknown>;
    weights?: Record<string, unknown>;
  }>;
  // Para tolerar respuestas antiguas o alternativas:
  data?: Array<{ predicted_price?: number }>;
};

const API_URL = "https://predict-298899681831.europe-west1.run.app/predict";

// Para poder meter fechas como texto...
function normalizeApiDate(input: string): string {
  if (!input) throw new Error('Fecha vacía');

  const s = String(input).trim();

  // 1) ISO con o sin hora → YYYY-MM-DD
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s].*)?$/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

  // 2) DATE(YYYY-MM-DD) o DATE(YYYY,MM,DD) (con espacios/guiones/comas)
  const dcon = s.match(/^DATE\(\s*(\d{4})\s*[-\/,]\s*(\d{1,2})\s*[-\/,]\s*(\d{1,2})\s*\)$/i);
  if (dcon) {
    const y = dcon[1];
    const m = dcon[2].padStart(2, '0');
    const d = dcon[3].padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // 3) DD/MM/YYYY o DD-MM-YYYY
  const dmy = s.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})$/);
  if (dmy) {
    const d = dmy[1].padStart(2, '0');
    const m = dmy[2].padStart(2, '0');
    const y = dmy[3];
    return `${y}-${m}-${d}`;
  }

  // 4) YYYYMMDD
  const ymd = s.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (ymd) return `${ymd[1]}-${ymd[2]}-${ymd[3]}`;

  // 5) Último recurso: Date()
  const dt = new Date(s);
  if (!Number.isNaN(dt.getTime())) {
    const y = dt.getUTCFullYear();
    const m = String(dt.getUTCMonth() + 1).padStart(2, '0');
    const d = String(dt.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  throw new Error(`Formato de fecha no válido: "${input}"`);
}


function toIsoDate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * @param date YYYY-MM-DD (fecha de servicio)
 * @param origin código origen esperado por el backend (p.ej. "OO04")
 * @param destination código destino esperado por el backend (p.ej. "DD07")
 * @param opts (opcional) para ajustar payload y timeout
 * @returns Promise<number> con el pred_price
 */
export async function getData(
  date: string,
  origin: string,
  destination: string,
  opts: PredictOptions = {}
): Promise<number> {
  if (!API_URL) {
    throw new Error(
      "Falta la variable de entorno NEXT_PUBLIC_PREDICT_API_URL (p.ej. https://.../predict)"
    );
  }

  // Defaults sensatos
  const now = new Date();
  const payload = {
    // OBLIGATORIAS
    origen: origin.toUpperCase(),         // ej. "OO04"
    destino: destination.toUpperCase(),   // ej. "DD07"
    fecha_salida_base: normalizeApiDate(date),              // "YYYY-MM-DD" - 2025-01-26
    codigo_buque: opts.codigo_buque,      // Trataría SCA

    // OPCIONALES (alineadas con el script Python)
    fecha_reserva: opts.fecha_reserva ?? toIsoDate(now),
    n_days: opts.n_days ?? 1,
    tabla: opts.tabla ?? "balearia_dataset_nuevo.LIMPIO_SINCOS",
    get_input: opts.get_input ?? true,
    base_price: opts.base_price ?? 50,
    min_price: opts.min_price ?? 40,
    max_price: opts.max_price ?? 60,
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

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`API ${res.status} ${res.statusText} :: ${text}`);
    }

    const json = (await res.json()) as PredictAPIResponse;

    // 1) Forma nueva: timeline[0].data.pred_price
    const predFromTimeline =
      json?.timeline &&
      Array.isArray(json.timeline) &&
      json.timeline.length > 0 &&
      typeof json.timeline[0]?.data?.pred_price === "number"
        ? json.timeline[0]!.data!.pred_price!
        : undefined;

    if (typeof predFromTimeline === "number" && !Number.isNaN(predFromTimeline)) {
      return predFromTimeline;
    }

    // 2) Forma antigua de tu stub: { data: [ { predicted_price } ] }
    const fallback =
      Array.isArray(json?.data) && json.data.length
        ? json.data[0]?.predicted_price
        : undefined;

    if (typeof fallback === "number" && !Number.isNaN(fallback)) {
      return fallback;
    }

    throw new Error(
      "Respuesta sin 'timeline[0].data.pred_price' ni 'data[0].predicted_price'"
    );
  } catch (err) {
    console.error("Error getData(/predict):", err);
    throw err;
  } finally {
    clearTimeout(timer);
  }
}
// ⬇️ tipos a añadir cerca de PredictOptions/PredictAPIResponse
export type ModelWeights = Record<string, number>;
export type PredictOut = { price: number | null; demand: number | null; weights: ModelWeights | null };

// ⬇️ REPLACE getPrediction con esta versión que también saca weights
export async function getPrediction(
  date: string,
  origin: string,
  destination: string,
  opts: PredictOptions = {}
): Promise<PredictOut> {
  if (!API_URL) {
    throw new Error(
      "Falta la variable de entorno NEXT_PUBLIC_PREDICT_API_URL (p.ej. https://.../predict)"
    );
  }

  const now = new Date();
  const payload = {
    origen: origin.toUpperCase(),
    destino: destination.toUpperCase(),
    fecha_salida_base: normalizeApiDate(date),
    codigo_buque: opts.codigo_buque ?? "SCA",
    fecha_reserva: opts.fecha_reserva ?? toIsoDate(now),
    n_days: opts.n_days ?? 1,
    tabla: opts.tabla ?? "balearia_dataset_nuevo.LIMPIO_SINCOS",
    get_input: opts.get_input ?? true,
    base_price: opts.base_price ?? 50,
    min_price: opts.min_price ?? 40,
    max_price: opts.max_price ?? 60,
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

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`API ${res.status} ${res.statusText} :: ${text}`);
    }

    const json = (await res.json()) as PredictAPIResponse;
    const tl0 = Array.isArray(json?.timeline) && json.timeline.length ? json.timeline[0] : undefined;

    const price =
      typeof tl0?.data?.pred_price === "number" && !Number.isNaN(tl0.data.pred_price)
        ? tl0.data.pred_price
        : Array.isArray(json?.data) && typeof json.data[0]?.predicted_price === "number"
        ? (json.data[0]!.predicted_price as number)
        : null;

    const demand =
      typeof tl0?.data?.pred_demand === "number" && !Number.isNaN(tl0.data.pred_demand)
        ? tl0.data.pred_demand
        : null;

    // weights del backend (timeline[0].weights)
    let weights: ModelWeights | null = null;
    if (tl0 && tl0.weights && typeof tl0.weights === "object") {
      const entries = Object.entries(tl0.weights).filter(
        ([, v]) => typeof v === "number" && Number.isFinite(v as number)
      ) as Array<[string, number]>;
      if (entries.length) {
        weights = Object.fromEntries(entries);
      }
    }

    return { price, demand, weights };
  } finally {
    clearTimeout(timer);
  }
}
