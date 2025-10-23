"use client";

/**

 * Asegurarse de que tienes instalado esto:
 *    npm i @react-google-maps/api
 *    npm i -D @types/google.maps
 */

import { useMemo, useState, useCallback, useRef } from "react";
import {
  GoogleMap,
  useLoadScript,
  DrawingManager,
  Marker,
  Polyline,
} from "@react-google-maps/api";

// Paste your key here
const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!;

type LatLng = google.maps.LatLngLiteral;

const center: LatLng = { lat: 39.4699, lng: -0.3763 }; // Valencia

export default function MapDraw() {
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    // type the list so TS knows these are valid library names
    libraries: ["drawing", "geometry", "places"] as (
      | "drawing"
      | "geometry"
      | "places"
    )[],
  });

  const mapRef = useRef<google.maps.Map | null>(null);

  const [markers, setMarkers] = useState<LatLng[]>([]);
  const [polylines, setPolylines] = useState<LatLng[][]>([]);

  const onMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
  }, []);

  const onOverlayComplete = useCallback(
    (e: google.maps.drawing.OverlayCompleteEvent) => {
      switch (e.type) {
        case google.maps.drawing.OverlayType.MARKER: {
          const marker = e.overlay as google.maps.Marker;
          const pos = marker.getPosition()!;
          setMarkers((prev) => [...prev, { lat: pos.lat(), lng: pos.lng() }]);
          break;
        }
        case google.maps.drawing.OverlayType.POLYLINE: {
          const pl = e.overlay as google.maps.Polyline;
          const path = pl
            .getPath()
            .getArray()
            .map((p) => ({ lat: p.lat(), lng: p.lng() }));
          setPolylines((prev) => [...prev, path]);
          break;
        }
        default:
          // ignore other overlay types for now
          break;
      }

      // keep shapes only in React state
      e.overlay.setMap(null);
    },
    []
  );

  const mapOptions = useMemo<google.maps.MapOptions>(
    () => ({
      mapId: undefined,
      disableDefaultUI: false,
      clickableIcons: true,
      gestureHandling: "greedy",
    }),
    []
  );
  // Esto es en caso de que no tengas la API puesta - Poner API en el data/.env.local
  if (GOOGLE_MAPS_API_KEY === "GOOGLE_MAPS_API_KEY") {
    return (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "grid",
          placeItems: "center",
          padding: 16,
          textAlign: "center",
          border: "1px dashed #ccc",
          borderRadius: 8,
        }}
      >
        <div>
          <strong>Google Maps API key missing.</strong>
          <br />
          Set <code>GOOGLE_MAPS_API_KEY</code> at the top of this file.
        </div>
      </div>
    );
  }

  if (loadError) return <div>Error loading Google Maps</div>;
  if (!isLoaded) return <div>Loading map…</div>;

  return (
    <div style={{ width: "100%", height: "100%" }}>
      <GoogleMap
        onLoad={onMapLoad}
        center={center}
        zoom={12}
        options={mapOptions}
        mapContainerStyle={{ width: "100%", height: "100%" }}
      >
        <DrawingManager
          onOverlayComplete={onOverlayComplete}
          options={{
            drawingControl: true,
            drawingControlOptions: {
              position: google.maps.ControlPosition.TOP_CENTER,
              // ✅ Use enum values, not strings
              drawingModes: [
                google.maps.drawing.OverlayType.MARKER,
                google.maps.drawing.OverlayType.POLYLINE,
              ],
            },
            markerOptions: { draggable: true },
            polylineOptions: {
              strokeWeight: 3,
              clickable: true,
              editable: false,
            },
          }}
        />

        {/* React-controlled render */}
        {markers.map((m, i) => (
          <Marker
            key={`m-${i}`}
            position={m}
            draggable
            onDragEnd={(ev) => {
              const pos = ev.latLng!;
              setMarkers((prev) =>
                prev.map((p, idx) =>
                  idx === i ? { lat: pos.lat(), lng: pos.lng() } : p
                )
              );
            }}
            onRightClick={() =>
              setMarkers((prev) => prev.filter((_, idx) => idx !== i))
            }
          />
        ))}

        {polylines.map((path, i) => (
          <Polyline
            key={`l-${i}`}
            path={path}
            options={{ strokeWeight: 3 }}
            onRightClick={() =>
              setPolylines((prev) => prev.filter((_, idx) => idx !== i))
            }
          />
        ))}
      </GoogleMap>
    </div>
  );
}