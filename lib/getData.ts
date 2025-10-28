// lib/getData.ts
/**
 * Llama a tu backend (Cloud Run o Cloud Functions) que expone el entry-point `predictprice`
 * y devuelve ÚNICAMENTE el número `predicted_price`.
 *
 * Requiere en tu .env: NEXT_PUBLIC_PRICE_API_URL="https://<tu-url>/"
 *  - Para Cloud Functions: suele ser la URL base tal cual.
 *  - Para Cloud Run: si montaste FastAPI en /predictprice, incluye esa ruta.
 */

type PredictResponse = {
  data: Array<{ predicted_price?: number }>;
};

const API_URL = "YOUR-API-URL"; //Eliminar antes de subir a git

/**
 * @param date YYYY-MM-DD
 * @param origin origen (texto)
 * @param destination destino (texto)
 * @returns number con el predicted_price (exp del log) o lanza error si no disponible.
 */
export const getData = async (
  date: string,
  origin: string,
  destination: string
): Promise<number> => {
  if (!API_URL) {
    throw new Error("Falta NEXT_PUBLIC_PRICE_API_URL en variables de entorno");
  }

  // ---- Derivamos features mínimas para el scenario ----
  // JS getDay(): 0=Dom...6=Sáb → modelo espera 1..7 con Sábado=7 (como tu ejemplo)
  const d = new Date(date + "T00:00:00");
  const jsDay = d.getDay(); // 0..6
  const dia_semana_servicio = jsDay + 1; // 1..7 (Dom=1, Sáb=7)
  const mes_servicio = d.getMonth() + 1; // 1..12

  // Antelación: días entre HOY y la fecha de servicio (mínimo 0)
  const now = new Date();
  const diffMs = d.getTime() - new Date(now.toDateString()).getTime();
  const dias_antelacion = Math.max(0, Math.round(diffMs / (1000 * 60 * 60 * 24)));

  // Defaults razonables (ajustaremos más adelante si lo necesitas)
  const scenario = {
    ESADUL: 1,
    ESMENO: 0,
    ESBEBE: 0,
    ESVEHI: 0,
    ESTIPC: "P",
    ESGRPS: "CPE",
    ESCLAS: "TUR",
    ESBUQE: "SIC",
    SUBZONA_ORIGEN: origin.toUpperCase(),
    SUBZONA_DESTINO: destination.toUpperCase(),
    dia_semana_servicio,
    mes_servicio,
    dias_antelacion,
  };

  // ---- Llamada HTTP con timeout (AbortController) ----
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // Tu función en CF/CR espera { scenarios: [...] }
      body: JSON.stringify({ scenarios: [scenario] }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`API ${res.status} ${res.statusText} :: ${text}`);
    }

    const json = (await res.json()) as PredictResponse;

    const val =
      Array.isArray(json?.data) && json.data.length
        ? json.data[0]?.predicted_price
        : undefined;

    if (typeof val !== "number" || Number.isNaN(val)) {
      throw new Error("Respuesta sin 'predicted_price' numérico");
    }

    return val;
  } catch (err) {
    console.error("Error getData/predictprice:", err);
    throw err;
  } finally {
    clearTimeout(id);
  }
};
