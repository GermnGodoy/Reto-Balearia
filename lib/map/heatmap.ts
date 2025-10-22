import type { DrawnRoute } from "@/lib/map/drawRoutes";
import type { LatLng } from "@/data/ports-and-routes";
import type { RouteId } from "@/data/heat-signatures";

/**
 * Densify each route so the heatmap looks continuous.
 * Weight per route comes from `signatures[route.id]` (default 1).
 */
export function buildHeatDataFromRoutes(
  routes: DrawnRoute[],
  signatures?: Record<RouteId, number>,
  stepMeters = 1500
): Array<google.maps.visualization.WeightedLocation> {
  const out: Array<google.maps.visualization.WeightedLocation> = [];
  const spherical = google.maps.geometry?.spherical;
  if (!spherical) return out;

  for (const r of routes) {
    const base = r.id ? signatures?.[r.id] ?? 1 : 1;
    // Optional: nudge dashed routes a bit (comment out if you don't want it)
    const weight = base * (r.dashed ? 1.0 : 1.0);

    const path = r.path;
    for (let i = 0; i < path.length - 1; i++) {
      const a = path[i];
      const b = path[i + 1];

      const pa = new google.maps.LatLng(a.lat, a.lng);
      const pb = new google.maps.LatLng(b.lat, b.lng);

      const dist = spherical.computeDistanceBetween(pa, pb);
      const n = Math.max(1, Math.floor(dist / stepMeters));

      for (let k = 0; k <= n; k++) {
        const frac = k / n;
        const p = spherical.interpolate(pa, pb, frac);
        out.push({ location: p, weight });
      }
    }
  }

  return out;
}

/** Vivid gradient for sea routes */
export const SEA_ROUTE_GRADIENT: string[] = [
  "rgba(0, 0, 0, 0)",
  "rgba(0, 176, 255, 0.2)",
  "rgba(0, 176, 255, 0.6)",
  "rgba(0, 148, 255, 0.9)",
  "rgba(0, 122, 255, 1)",
  "rgba(0, 96, 255, 1)",
  "rgba(0, 64, 240, 1)",
  "rgba(0, 32, 220, 1)",
  "rgba(255, 165, 0, 1)",
  "rgba(255, 77, 0, 1)",
  "rgba(255, 0, 0, 1)",
];
