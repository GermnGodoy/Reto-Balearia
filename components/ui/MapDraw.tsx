"use client";

import { useMemo, useState, useCallback, useRef, useEffect } from "react";
import {
  GoogleMap,
  useLoadScript,
  DrawingManager,
  Marker,
  Polyline,
  HeatmapLayer,
} from "@react-google-maps/api";

import {
  PORTS,
  DEFAULT_ROUTES,
  type LatLng,
} from "@/data/ports-and-routes";
import {
  drawRoutes,
  dashedPolylineOptions,
  type DrawnRoute,
} from "@/lib/map/drawRoutes";
import {
  buildHeatDataFromRoutes, // your densify+weights function
  SEA_ROUTE_GRADIENT,
} from "@/lib/map/heatmap";
import { HEAT_SIGNATURES } from "@/data/heat-signatures";

// Use the public env var for client components
const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!;

// Valencia
const center: LatLng = { lat: 39.4699, lng: -0.3763 };

// Greyscale basemap (only in heat-mode)
const GREYSCALE_STYLE: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ saturation: -100 }, { lightness: 10 }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#616161" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#f5f5f5" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "road", stylers: [{ saturation: -100 }] },
  { featureType: "water", stylers: [{ color: "#d9d9d9" }] },
];

export default function DrawMap() {
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries: ["drawing", "geometry", "places", "visualization"], // REQUIRED
  });

  const mapRef = useRef<google.maps.Map | null>(null);

  const [markers, setMarkers] = useState<LatLng[]>([]);
  const [polylines, setPolylines] = useState<DrawnRoute[]>([]);
  const [heatMode, setHeatMode] = useState(false);

  // Heat data + layer ref
  const [heatPoints, setHeatPoints] =
    useState<google.maps.MVCArray<google.maps.visualization.WeightedLocation> | null>(null);
  const heatLayerRef = useRef<google.maps.visualization.HeatmapLayer | null>(null);

  const clearHeatLayer = useCallback(() => {
    try {
      if (heatLayerRef.current) {
        try { heatLayerRef.current.setData([]); } catch {}
        heatLayerRef.current.set("gradient", null);
        heatLayerRef.current.setMap(null);
        heatLayerRef.current = null;
      }
      setHeatPoints((prev) => {
        if (prev) {
          try { prev.clear(); } catch {}
        }
        return null;
      });
    } catch {}
  }, []);

  const onMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
    // Force ROADMAP and remove Satellite option
    map.setMapTypeId(google.maps.MapTypeId.ROADMAP);
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
          const path = pl.getPath().getArray().map((p) => ({ lat: p.lat(), lng: p.lng() }));
          setPolylines((prev) => [...prev, { path }]); // ad-hoc polyline (no id)
          break;
        }
      }
      e.overlay.setMap(null);
    },
    []
  );

  const baseMapOptions = useMemo<google.maps.MapOptions>(
    () => ({
      mapTypeId: "roadmap",//google.maps.MapTypeId.ROADMAP
      mapTypeControl: false,        // hide Satellite
      streetViewControl: false,
      fullscreenControl: true,
      zoomControl: true,
      disableDefaultUI: false,
      clickableIcons: true,
      gestureHandling: "greedy",
    }),
    []
  );

  // Draw default routes once
  useEffect(() => {
    if (!isLoaded) return;
    drawRoutes({
      segments: DEFAULT_ROUTES,
      setPolylines,
      mapRef,
      fitBounds: true,
      existing: [], // we pass [] so bounds are computed on actual new routes
    });
  }, [isLoaded, setPolylines]);

  // Build heat points whenever heatMode or routes change
  useEffect(() => {
    if (!isLoaded || !heatMode) {
      clearHeatLayer();
      return;
    }

    // Check libs
    if (!google.maps.geometry?.spherical || !google.maps.visualization?.HeatmapLayer) {
      console.warn("[heat] Required libraries missing (geometry/visualization).");
      clearHeatLayer();
      return;
    }

    if (!polylines.length) {
      console.warn("[heat] No routes to build heat from.");
      clearHeatLayer();
      return;
    }

    // Log missing signatures (useful to ensure correct RouteId keys)
    const missing: string[] = [];
    for (const r of polylines) {
      if (r.id && HEAT_SIGNATURES && !(r.id in HEAT_SIGNATURES)) {
        missing.push(r.id);
      }
    }
    if (missing.length) {
      console.warn(
        "[heat] Some route IDs do not have signatures (defaulting to 1). " +
        "Ensure HEAT_SIGNATURES uses the same id format (named ports are sorted as A|B):",
        missing
      );
    }

    // Build weighted points (densified). Lower step for denser map if you wish.
      const weighted = buildHeatDataFromRoutes(polylines, HEAT_SIGNATURES, 800);

    if (!weighted.length) {
      console.warn("[heat] buildHeatDataFromRoutes returned 0 points.");
      clearHeatLayer();
      return;
    }

    const mvc = new google.maps.MVCArray<google.maps.visualization.WeightedLocation>(weighted);
    setHeatPoints(mvc);

    return () => clearHeatLayer();
  }, [isLoaded, heatMode, polylines, clearHeatLayer]);

  // Ensure native layer receives latest data/gradient/map
  useEffect(() => {
    if (!heatMode) return;
    const map = mapRef.current;
    const layer = heatLayerRef.current;
    if (map && layer && heatPoints) {
      try {
        layer.setData(heatPoints);
        layer.set("gradient", SEA_ROUTE_GRADIENT);
        layer.set("radius", 30);
        layer.set("opacity", 0.9);
        if (!layer.getMap()) layer.setMap(map);
        // Debug info
        const len = (heatPoints.getLength && heatPoints.getLength()) || 0;
        if (len === 0) console.warn("[heat] Layer received 0 points.");
      } catch (e) {
        console.warn("[heat] Failed to apply data to heat layer:", e);
      }
    }
  }, [heatMode, heatPoints]);

  // Friendly error states
  if (!GOOGLE_MAPS_API_KEY) {
    return <div>Missing NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in your env.</div>;
  }
  if (loadError) {
    return (
      <div>
        Error loading Google Maps: {String(loadError)}<br />
        (Check key, billing, domain restrictions, and that the Visualization, Drawing & Places libraries are enabled.)
      </div>
    );
  }
  if (!isLoaded) return <div>Loading map…</div>;

  const canRenderHeat =
    heatMode &&
    !!heatPoints &&
    (heatPoints.getLength ? heatPoints.getLength() > 0 : true) &&
    !!google.maps.visualization?.HeatmapLayer;

  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      {/* Heat-mode toggle */}
      <button
        onClick={() =>
          setHeatMode((prev) => {
            if (prev) clearHeatLayer(); // hard reset when leaving
            return !prev;
          })
        }
        style={{
          position: "absolute",
          zIndex: 2,
          top: 12,
          left: 12,
          padding: "8px 12px",
          borderRadius: 8,
          border: "1px solid #ddd",
          background: heatMode ? "#222" : "#fff",
          color: heatMode ? "#fff" : "#111",
          boxShadow: "0 2px 8px rgba(0,0,0,.2)",
          cursor: "pointer",
        }}
        title="Toggle heat-mode"
      >
        {heatMode ? "Exit Heat Mode" : "Heat Mode"}
      </button>

      <GoogleMap
        onLoad={onMapLoad}
        center={center}
        zoom={6}
        options={{
          ...baseMapOptions,
          styles: heatMode ? GREYSCALE_STYLE : undefined,
        }}
        mapContainerStyle={{ width: "100%", height: "100%" }}
      >
        <DrawingManager
          onOverlayComplete={onOverlayComplete}
          options={{
            drawingControl: true,
            drawingControlOptions: {
              position: google.maps.ControlPosition.TOP_CENTER,
              drawingModes: [
                google.maps.drawing.OverlayType.MARKER,
                google.maps.drawing.OverlayType.POLYLINE,
              ],
            },
            markerOptions: { draggable: true },
            polylineOptions: { strokeWeight: 3, clickable: true, editable: false },
          }}
        />

        {/* Ports */}
        {Object.entries(PORTS).map(([name, pos]) => (
          <Marker key={name} position={pos} label={name} />
        ))}

        {/* Routes (hidden in heat mode) */}
        {!heatMode &&
          polylines.map((route, i) => (
            <Polyline
              key={`r-${i}`}
              path={route.path}
              options={{
                strokeWeight: 3,
                strokeColor: "#0052ff",
                zIndex: 2,
                ...(route.dashed ? dashedPolylineOptions : {}),
              }}
              onRightClick={() =>
                setPolylines((prev) => prev.filter((_, idx) => idx !== i))
              }
            />
          ))}

        {/* Heat layer */}
        {canRenderHeat && (
          <HeatmapLayer
            // Changing key when length changes forces remount if needed
            key={`routes-heatmap-${heatPoints?.getLength?.() ?? 0}`}
            data={heatPoints!}
            options={{
              dissipating: true,
              radius: 30,
              opacity: 0.9,
              gradient: SEA_ROUTE_GRADIENT,
            }}
            onLoad={(layer) => {
              heatLayerRef.current = layer;
              // Apply immediately in case props race with onLoad
              try {
                if (heatPoints) {
                  layer.setData(heatPoints);
                  layer.set("gradient", SEA_ROUTE_GRADIENT);
                  layer.set("radius", 30);
                  layer.set("opacity", 0.9);
                }
                if (mapRef.current) layer.setMap(mapRef.current);
              } catch (e) {
                console.warn("[heat] onLoad apply failed:", e);
              }
            }}
            onUnmount={() => {
              if (heatLayerRef.current) {
                try { heatLayerRef.current.setData([]); } catch {}
                heatLayerRef.current.set("gradient", null);
                heatLayerRef.current.setMap(null);
                heatLayerRef.current = null;
              }
            }}
          />
        )}
      </GoogleMap>
    </div>
  );
}
