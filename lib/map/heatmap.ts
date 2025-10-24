import type { DrawnRoute } from "@/lib/map/drawRoutes";
import type { LatLng } from "@/data/ports-and-routes";
import type { RouteId } from "@/data/heat-signatures";

/**
 * Densify each route so the heatmap looks continuous,
 * but avoid over-sampling long segments (which causes "thick bands" when zoomed out).
 * Signature unchanged.
 */
export function buildHeatDataFromRoutes(
  routes: DrawnRoute[],
  signatures?: Record<RouteId, number>,
  stepMeters = 1500 // treated as "base" step for energy conservation
): Array<google.maps.visualization.WeightedLocation> {
  const out: Array<google.maps.visualization.WeightedLocation> = [];
  const spherical = google.maps.geometry?.spherical;
  if (!spherical) return out;

  const MIN_STEP_METERS = 400; // avoid ultra-dense sampling at close zooms

  for (const r of routes) {
    const base = r.id ? signatures?.[r.id] ?? 1 : 1;
    const path = r.path as LatLng[];

    for (let i = 0; i < path.length - 1; i++) {
      const a = path[i], b = path[i + 1];

      const pa = new google.maps.LatLng(a.lat, a.lng);
      const pb = new google.maps.LatLng(b.lat, b.lng);

      const dist = spherical.computeDistanceBetween(pa, pb);

      // Raw desired samples based on (clamped) step
      const step = Math.max(MIN_STEP_METERS, stepMeters);
      const nRaw = Math.max(1, Math.floor(dist / step));

      // Soft cap: long segments get at most ~6..32 samples (smooth but thin at world view)
      // Increases gently with segment length, independent of zoom.
      const softCap = Math.round(
        6 + 26 * (1 - Math.exp(-dist / 200_000)) // 200 km scale
      );
      const n = Math.min(nRaw, softCap);

      // Effective step actually used and weight scale to conserve intensity
      const effectiveStep = dist / n; // meters per emitted point on this segment
      const weightScale = step / effectiveStep; // fewer points => heavier each

      const weight = Math.max(0, base) * weightScale;

      // Sample interior points only to avoid double-counting shared endpoints
      for (let k = 0; k < n; k++) {
        const frac = (k + 0.5) / n; // center-in-cell sampling
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
