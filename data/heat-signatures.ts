import type { PortName } from "@/data/ports-and-routes";

/**
 * RouteId is a simple string key. For named-port routes we use
 * a canonical, order-insensitive key: "Alcúdia|Barcelona" (sorted A–Z).
 * For coordinate routes we’ll generate a "lat,lng|lat,lng" key—see drawRoutes.ts.
 */
export type RouteId = string;

/**
 * HEAT_SIGNATURES: relative intensities per route.
 * Replace numbers with your real metrics (e.g., frequency, passengers, revenue).
 * Values are relative (1 = baseline). Higher number ⇒ hotter.
 */
export const HEAT_SIGNATURES: Record<RouteId, number> = {
  "Alcúdia|Barcelona": 0.5,
  "Barcelona|Ciutadella": 0.8,
  "Barcelona|Palma": 0.2,
  "Dénia|Formentera": 0.3,
  "Dénia|Ibiza": 0.5,
  "Formentera|València": 0.2,
  "Ibiza|València": 0.9,
  "Palma|València": 0.2,
  // Add more as needed…
};

/**
 * Optional helper if you need to build a canonical id elsewhere.
 * For named-port routes, always sort A–Z so A|B === B|A.
 */
export function buildNamedRouteId(a: PortName, b: PortName): RouteId {
  const [x, y] = [a, b].sort((m, n) => (m < n ? -1 : 1));
  return `${x}|${y}`;
}
