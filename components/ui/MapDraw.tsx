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

//Pretty circles
const circleIcon = (fill: string): google.maps.Icon => ({
  url:
    "data:image/svg+xml;utf-8," +
    encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
         <circle cx="12" cy="12" r="9" fill="${fill}" stroke="white" stroke-width="2"/>
       </svg>`
    ),
  scaledSize: new google.maps.Size(28, 28),
  anchor: new google.maps.Point(14, 14), // coordinate at circle center
});

// Pretty SVG pin you can recolor anytime
const makeSvgPin = ({
  fill = "#2563eb",
  border = "#ffffff",
  dot = "#ffffff",
} = {}) => {
  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 52">
    <path d="M18 1C8.06 1 0 9.22 0 19.2c0 12.2 18 31.8 18 31.8S36 31.4 36 19.2C36 9.22 27.94 1 18 1z"
          fill="${fill}" stroke="${border}" stroke-width="2"/>
    <circle cx="18" cy="18.5" r="5.5" fill="${dot}"/>
  </svg>`;
  return "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg);
};

const portIcon = (isHeatMode = false): google.maps.Icon => ({
  url: makeSvgPin({
    fill: isHeatMode ? "#111827" : "#2563eb", // darker in heat-mode
    border: "#f8fafc",
    dot: "#ffffff",
  }),
  scaledSize: new google.maps.Size(36, 52),
  anchor: new google.maps.Point(18, 52),      // tip of the pin
  labelOrigin: new google.maps.Point(18, 12), // where the label text sits
});

import {
  drawRoutes,
  dashedPolylineOptions,
  type DrawnRoute,
} from "@/lib/map/drawRoutes";
import {
  buildHeatDataFromRoutes,
  SEA_ROUTE_GRADIENT,
} from "@/lib/map/heatmap";
import { useHeatSignatures } from "@/data/heat-signatures";

// FIX: correct file name
import WeatherForecastLayer from "@/lib/map/WeatherForecastLayes";

// Use the public env var for client components
const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!;

// Valencia
const center: LatLng = { lat: 39.4699, lng: -0.3763 };

/** -------------------
 *  STYLES
 *  ------------------- */
const GREYSCALE_STYLE: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ saturation: -100 }, { lightness: 10 }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#616161" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#f5f5f5" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "road", stylers: [{ saturation: -100 }] },
  { featureType: "water", stylers: [{ color: "#d9d9d9" }] },
];

// Estilo “germánico”
const MAP_STYLE: google.maps.MapTypeStyle[] = [
  {
    featureType: "landscape.natural",
    elementType: "geometry.fill",
    stylers: [{ visibility: "on" }, { color: "#e0efef" }],
  },
  {
    featureType: "poi",
    elementType: "geometry.fill",
    stylers: [{ visibility: "on" }, { hue: "#1900ff" }, { color: "#c0e8e8" }],
  },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ lightness: 100 }, { visibility: "simplified" }],
  },
  { featureType: "road", elementType: "labels", stylers: [{ visibility: "off" }] },
  {
    featureType: "transit.line",
    elementType: "geometry",
    stylers: [{ visibility: "on" }, { lightness: 700 }],
  },
  { featureType: "water", elementType: "all", stylers: [{ color: "#7dcdcd" }] },
];

// Weather tiles (OpenWeather)
const WEATHER_TILE_URL = `https://tile.openweathermap.org/map/clouds_new/{z}/{x}/{y}.png?appid=YOUR_API_KEY`; //Please introduce your Open weather API Key

// IDs for custom map types
const MAPTYPE_IDS = {
  GERMANIC: "germanic_style",
  GREYSCALE: "greyscale_style",
} as const;

export default function DrawMap() {
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries: ["drawing", "geometry", "places", "visualization"],
  });

  const mapRef = useRef<google.maps.Map | null>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);

  const [markers, setMarkers] = useState<LatLng[]>([]);
  const [polylines, setPolylines] = useState<DrawnRoute[]>([]);
  const [heatMode, setHeatMode] = useState(false);

  // Weather overlay state
  const [showWeather, setShowWeather] = useState(false);
  const [weatherOpacity, setWeatherOpacity] = useState(0.75);

  // Heat data + layer ref
  const [heatPoints, setHeatPoints] =
    useState<google.maps.MVCArray<google.maps.visualization.WeightedLocation> | null>(null);
  const heatLayerRef = useRef<google.maps.visualization.HeatmapLayer | null>(null);

  const heatSignatures = useHeatSignatures(); // ← lee progress del provider

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

  // Register custom map types once the map is ready
  const registerMapTypes = useCallback((m: google.maps.Map) => {
    // Germanic
    const germanic = new google.maps.StyledMapType(MAP_STYLE, { name: "Germanic" });
    m.mapTypes.set(MAPTYPE_IDS.GERMANIC, germanic);

    // Greyscale
    const grey = new google.maps.StyledMapType(GREYSCALE_STYLE, { name: "Greyscale" });
    m.mapTypes.set(MAPTYPE_IDS.GREYSCALE, grey);

    // Start in germanic
    m.setMapTypeId(MAPTYPE_IDS.GERMANIC);
  }, []);

  const onMapLoad = useCallback((m: google.maps.Map) => {
    mapRef.current = m;
    setMap(m);
    registerMapTypes(m);
  }, [registerMapTypes]);

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
          setPolylines((prev) => [...prev, { path }]);
          break;
        }
      }
      e.overlay.setMap(null);
    },
    []
  );

  const baseMapOptions = useMemo<google.maps.MapOptions>(
    () => ({
      // IMPORTANT: start with the custom type; we register it in onLoad
      mapTypeId: MAPTYPE_IDS.GERMANIC as unknown as google.maps.MapTypeId,
      mapTypeControl: false,   // hide Satellite / selector (you can set true if you want to see the names)
      streetViewControl: false,
      fullscreenControl: true,
      zoomControl: true,
      disableDefaultUI: true,
      clickableIcons: true,
      gestureHandling: "greedy",
      // DO NOT set `styles` here; we now switch using map types to avoid MAP_TYPE conflicts
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
      existing: [],
    });
  }, [isLoaded, setPolylines]);

  // Build heat points whenever heatMode / routes / signatures cambian
  useEffect(() => {
    if (!isLoaded) return;
    if (!heatMode) { clearHeatLayer(); return; }

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

    const missing: string[] = [];
    for (const r of polylines) {
      if (r.id && heatSignatures && !(r.id in heatSignatures)) missing.push(r.id);
    }
    if (missing.length) {
      console.warn("[heat] Some route IDs lack signatures (defaulting to 1):", missing);
    }

    const weighted = buildHeatDataFromRoutes(polylines, heatSignatures, 800);
    if (!weighted.length) {
      console.warn("[heat] buildHeatDataFromRoutes returned 0 points.");
      clearHeatLayer();
      return;
    }

    // ⬇️ reemplazamos el array anterior sin desmontar la capa
    setHeatPoints((prev) => {
      try { prev?.clear(); } catch {}
      return new google.maps.MVCArray<google.maps.visualization.WeightedLocation>(weighted);
    });

    // ⛔️ Sin cleanup aquí: así no desmontamos la capa en cada tick
  }, [isLoaded, heatMode, polylines, heatSignatures]); // ← importante: incluye heatSignatures

  // Ensure native layer receives latest data/map (sin re-asignar gradient/radius cada tick)
  useEffect(() => {
    if (!heatMode) return;
    const m = mapRef.current;
    const layer = heatLayerRef.current;
    if (m && layer && heatPoints) {
      try {
        layer.setData(heatPoints);
        if (!layer.getMap()) layer.setMap(m);
        const len = (heatPoints.getLength && heatPoints.getLength()) || 0;
        if (len === 0) console.warn("[heat] Layer received 0 points.");
      } catch (e) {
        console.warn("[heat] Failed to apply data to heat layer:", e);
      }
    }
  }, [heatMode, heatPoints]);

  // 🔁 Switch the active MAP TYPE when toggling heat mode
  useEffect(() => {
    const m = mapRef.current;
    if (!m) return;
    m.setMapTypeId(heatMode ? MAPTYPE_IDS.GREYSCALE : MAPTYPE_IDS.GERMANIC);
  }, [heatMode]);

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
      {/* Toolbar: heat & weather */}
      <div
        style={{
          position: "absolute",
          zIndex: 2,
          top: 12,
          left: 12,
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
        }}
      >
        <button
          onClick={() =>
            setHeatMode((prev) => {
              if (prev) clearHeatLayer(); // hard reset when leaving
              return !prev;
            })
          }
          style={{
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

        <button
          onClick={() => setShowWeather((v) => !v)}
          style={{
            padding: "8px 12px",
            borderRadius: 8,
            border: "1px solid #ddd",
            background: showWeather ? "#222" : "#fff",
            color: showWeather ? "#fff" : "#111",
            boxShadow: "0 2px 8px rgba(0,0,0,.2)",
            cursor: "pointer",
          }}
          title="Toggle weather forecast overlay"
        >
          {showWeather ? "Hide Weather" : "Weather Forecast"}
        </button>

        {showWeather && (
          <label
            style={{
              padding: "8px 12px",
              borderRadius: 8,
              border: "1px solid #ddd",
              background: "#fff",
              boxShadow: "0 2px 8px rgba(0,0,0,.2)",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            Opacity
            <input
              type="range"
              min={0.2}
              max={1}
              step={0.05}
              value={weatherOpacity}
              onChange={(e) => setWeatherOpacity(parseFloat(e.target.value))}
            />
          </label>
        )}
      </div>

      <GoogleMap
        onLoad={onMapLoad}
        onUnmount={() => {
          mapRef.current = null;
          setMap(null);
        }}
        center={center}
        zoom={6}
        options={baseMapOptions} // <-- no dynamic `styles` here anymore
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
          <Marker
            key={name}
            position={pos}
            options={{ icon: circleIcon(heatMode ? "#111827" : "#2563eb") }}
            label={name}
          />
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
            key="routes-heatmap"
            data={heatPoints!}
            options={{
              dissipating: true,
              radius: 35,         // ligeramente mayor para más presencia
              opacity: 0.8,
              gradient: SEA_ROUTE_GRADIENT,
            }}
            onLoad={(layer) => {
              heatLayerRef.current = layer;
              try {
                if (heatPoints) {
                  layer.setData(heatPoints);
                  layer.set("gradient", SEA_ROUTE_GRADIENT);
                  layer.set("radius", 35);
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

        {/* Weather forecast overlay */}
        {map && (
          <WeatherForecastLayer
            map={map}
            tileUrlTemplate={WEATHER_TILE_URL}
            opacity={weatherOpacity}
            enabled={showWeather}
            name="Precipitation"
            minZoom={1}
            maxZoom={12}
          />
        )}
      </GoogleMap>
    </div>
  );
}
