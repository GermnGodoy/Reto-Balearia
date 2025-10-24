// Typed lat/lng for Google Maps
export type LatLng = google.maps.LatLngLiteral;

export const PORTS = {
  "València": { lat: 39.4702, lng: -0.3768 },
  "Dénia": { lat: 38.8400, lng: 0.1057 },
  "Barcelona": { lat: 41.355, lng: 2.158 },
  "Palma": { lat: 39.5696, lng: 2.6502 },
  "Alcúdia": { lat: 39.853, lng: 3.121 },
  "Ibiza": { lat: 38.9089, lng: 1.4329 },
  "Formentera": { lat: 38.738, lng: 1.416 },
  "Ciutadella": { lat: 40.003, lng: 3.841 },
} as const;

export type PortName = keyof typeof PORTS;

export type RouteSpec =
  | { from: PortName; to: PortName; dashed?: boolean }
  | { from: LatLng; to: LatLng; dashed?: boolean };

// Optional: a default bundle of routes you can render on mount
export const DEFAULT_ROUTES: RouteSpec[] = [
  { from: "València", to: "Ibiza", dashed: true },
  { from: "València", to: "Palma", dashed: true },
  { from: "València", to: "Formentera", dashed: true },
  { from: "Dénia", to: "Ibiza", dashed: true },
  { from: "Dénia", to: "Formentera", dashed: true },
  { from: "Barcelona", to: "Palma", dashed: true },
  { from: "Barcelona", to: "Alcúdia", dashed: true },
  { from: "Barcelona", to: "Ciutadella", dashed: true },
];
