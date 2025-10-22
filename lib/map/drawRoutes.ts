// "@/lib/map/drawRoutes.ts"
import type { MutableRefObject } from "react";
import { PORTS, type LatLng, type PortName, type RouteSpec } from "@/data/ports-and-routes";
import type { RouteId } from "@/data/heat-signatures";

// Stored in React state
export type DrawnRoute = { path: LatLng[]; dashed?: boolean; id?: RouteId };

/**
 * Default dashed polyline style.
 * NOTE: We explicitly set strokeColor on the dash symbol to avoid invisible dashes.
 * You can still override color/weight per-Polyline via `options` when rendering.
 */
export const dashedPolylineOptions: google.maps.PolylineOptions = {
  strokeOpacity: 0, // hide the solid stroke—render using icons
  icons: [
    {
      icon: {
        path: "M 0,-1 0,1",
        strokeOpacity: 1,
        strokeWeight: 3,
        strokeColor: "#0052ff", // explicit color so dashes are visible
        scale: 3,
      },
      offset: "0",
      repeat: "14px",
    },
  ],
};

// ---- helpers ---------------------------------------------------------------

const isLatLng = (p: unknown): p is LatLng =>
  !!p && typeof (p as any).lat === "number" && typeof (p as any).lng === "number";

/** Produce a stable route id for named or coordinate routes */
function makeRouteId(from: PortName | LatLng, to: PortName | LatLng): RouteId {
  if (!isLatLng(from) && !isLatLng(to)) {
    // both are named ports → order-insensitive key (A|B)
    const [a, b] = [from as PortName, to as PortName].sort((m, n) => (m < n ? -1 : 1));
    return `${a}|${b}`;
  }
  // coordinates (or mixed) → literal key (rounded to 3 decimals to keep it readable)
  const toKey = (p: PortName | LatLng) =>
    isLatLng(p) ? `${p.lat.toFixed(3)},${p.lng.toFixed(3)}` : String(p);
  return `${toKey(from)}|${toKey(to)}`;
}

// ---- main -----------------------------------------------------------------

/**
 * drawRoutes
 * - converts RouteSpec[] to {path, dashed, id}[] and appends to state
 * - validates that ports exist and skips bad segments (with console warnings)
 * - fits bounds to all existing + new routes (configurable)
 */
export function drawRoutes(opts: {
  segments: RouteSpec[];
  setPolylines: React.Dispatch<React.SetStateAction<DrawnRoute[]>>;
  mapRef: MutableRefObject<google.maps.Map | null>;
  fitBounds?: boolean; // default true
  existing?: DrawnRoute[];
}) {
  const { segments, setPolylines, mapRef, fitBounds = true, existing = [] } = opts;

  const toLatLng = (p: PortName | LatLng): LatLng | undefined =>
    isLatLng(p) ? p : PORTS[p as PortName];

  const built: DrawnRoute[] = [];

  for (const s of segments) {
    // tolerate partial/legacy shapes but expect from/to
    const from = (s as any).from as PortName | LatLng;
    const to = (s as any).to as PortName | LatLng;

    const a = toLatLng(from);
    const b = toLatLng(to);

    if (!a || !b) {
      console.warn(
        "[drawRoutes] Skipping segment; port not found in PORTS:",
        { from, to, resolvedFrom: a, resolvedTo: b }
      );
      continue;
    }

    built.push({
      path: [a, b],
      dashed: (s as any).dashed,
      id: makeRouteId(from, to),
    });
  }

  if (!built.length) {
    console.warn("[drawRoutes] No valid segments to draw.");
    return;
  }

  setPolylines((prev) => [...prev, ...built]);

  if (fitBounds && mapRef.current) {
    const b = new google.maps.LatLngBounds();
    // include pre-existing routes + the new ones
    [...existing, ...built].forEach((r) => r.path.forEach((pt) => b.extend(pt as any)));
    if (!b.isEmpty()) {
      // padding helps keep endpoints visible under UI
      try {
        mapRef.current.fitBounds(b, 64);
      } catch (err) {
        console.warn("[drawRoutes] fitBounds failed:", err);
        mapRef.current.fitBounds(b);
      }
    }
  }
}
