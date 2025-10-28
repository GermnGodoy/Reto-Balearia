// src/data/heat-signatures.ts
import { useMemo } from "react";
import type { PortName } from "@/data/ports-and-routes";
import { useProgress } from "@/contexts/ProgressContext";

/**
 * RouteId es una clave string. Para rutas con nombre usamos "Alcúdia|Barcelona"
 * (ordenadas A–Z para que A|B === B|A).
 */
export type RouteId = string;

/** ---------- BASE ESTÁTICA (como la tenías) ---------- */
export const BASE_HEAT_SIGNATURES: Record<RouteId, number> = {
  "Alcúdia|Barcelona": 1,
  "Barcelona|Ciutadella": 1,
  "Barcelona|Palma": 0.2,
  "Dénia|Formentera": 0.3,
  "Dénia|Ibiza": 0.5,
  "Formentera|València": 0.2,
  "Ibiza|València": 0.9,
  "Palma|València": 3,
};

/** Mantengo el export original por compatibilidad (estático). */
export const HEAT_SIGNATURES = BASE_HEAT_SIGNATURES;

/** Helper para construir ids canónicos A|B */
export function buildNamedRouteId(a: PortName, b: PortName): RouteId {
  const [x, y] = [a, b].sort((m, n) => (m < n ? -1 : 1));
  return `${x}|${y}`;
}

/* ===========================
   DINÁMICO LIGADO A PROGRESS
   =========================== */

/**
 * Pequeño hash determinista por ruta para variar fase/amplitud sin estado global.
 */
function hash32(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function clamp(x: number, min = 0.05, max = 5): number {
  return Math.max(min, Math.min(max, x));
}

/**
 * Calcula el “calor” de una ruta en el día `progress`.
 * Fórmula suave con componentes semanal y “mensual” (30 días), con fase por ruta.
 * Sustituye esta función por tus series reales si las tienes.
 */
export function calcHeatForRoute(
  routeId: RouteId,
  progress: number,
  overrides?: Partial<Record<RouteId, number>>
): number {
  const base =
    overrides?.[routeId] ??
    BASE_HEAT_SIGNATURES[routeId] ??
    0.2; // fallback

  const seed = hash32(routeId);
  const phase = (seed % 360) * (Math.PI / 180);
  const amp = 0.40 + ((seed >>> 5) % 50) / 200; // 0.15..0.40
  const weekly = Math.sin((2 * Math.PI * (progress % 7)) / 7 + phase); // [-1,1]
  const monthly = Math.sin((2 * Math.PI * (progress % 30)) / 30 + phase / 2);

  // Variación: 1) modula base, 2) añade un pequeño término aditivo
  const value = base * (1 + amp * 0.5 * weekly + amp * 0.25 * monthly) + 0.03 * weekly;

  // Redondeo y límites razonables
  return Number(clamp(value, 0.35, 3).toFixed(3));
}

/**
 * Devuelve el mapa completo de firmas para un `progress` dado (función pura).
 */
export function getDynamicHeatSignatures(
  progress: number,
  overrides?: Partial<Record<RouteId, number>>
): Record<RouteId, number> {
  const out: Record<RouteId, number> = {};
  const keys = Object.keys({ ...BASE_HEAT_SIGNATURES, ...(overrides ?? {}) });
  for (const k of keys) out[k] = calcHeatForRoute(k, progress, overrides);
  return out;
}

/**
 * Hook: usa el progress del provider correspondiente y entrega TODO el mapa dinámico.
 * Ideal si pintas todas las rutas de golpe.
 */
export function useHeatSignatures(
  overrides?: Partial<Record<RouteId, number>>
): Record<RouteId, number> {
  const { progress = 0 } = useProgress?.() ?? ({ progress: 0 } as any);
  return useMemo(() => getDynamicHeatSignatures(progress, overrides), [progress, overrides]);
}

/**
 * Hook fino para una sola ruta. Úsalo si calculas por-ruta en render.
 */
export function useRouteHeatSignature(
  routeId: RouteId,
  overrides?: Partial<Record<RouteId, number>>
): number {
  const { progress = 0 } = useProgress?.() ?? ({ progress: 0 } as any);
  return useMemo(() => calcHeatForRoute(routeId, progress, overrides), [routeId, progress, overrides]);
}
