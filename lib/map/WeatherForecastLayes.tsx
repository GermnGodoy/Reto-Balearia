// lib/map/WeatherForecastLayer.tsx
"use client";

import { useEffect, useMemo, useRef } from "react";

type WeatherForecastLayerProps = {
  map: google.maps.Map | null;

  /** Must include {z}, {x}, {y}. */
  tileUrlTemplate: string;
  enabled: boolean;
  opacity?: number;           // 0..1
  flipY?: boolean;            // TMS providers => true
  tileSizePx?: 256 | 512;
  minZoom?: number;           // default 0
  maxZoom?: number;           // default 19
  name?: string;
  zIndex?: number;            // insert position in overlayMapTypes
};

export default function WeatherForecastLayer({
  map,
  tileUrlTemplate,
  enabled,
  opacity = 0.75,
  flipY = false,
  tileSizePx = 256,
  minZoom = 0,
  maxZoom = 19,
  name = "Weather",
  zIndex,
}: WeatherForecastLayerProps) {
  const layerRef = useRef<google.maps.ImageMapType | null>(null);
  const styleElRef = useRef<HTMLStyleElement | null>(null);

  const { hasPlaceholders, srcPrefix } = useMemo(() => {
    const has =
      /\{z\}/.test(tileUrlTemplate) &&
      /\{x\}/.test(tileUrlTemplate) &&
      /\{y\}/.test(tileUrlTemplate);
    const i = tileUrlTemplate.indexOf("{z}");
    const prefix = i > 0 ? tileUrlTemplate.slice(0, i) : tileUrlTemplate;
    return { hasPlaceholders: has, srcPrefix: prefix };
  }, [tileUrlTemplate]);

  const getWrappedX = (x: number, z: number) => {
    const max = 1 << z;
    return ((x % max) + max) % max;
  };
  const getClampedY = (y: number, z: number) => {
    const max = 1 << z;
    if (y < 0 || y >= max) return null;
    return y;
  };

  useEffect(() => {
    if (!map) return;

    const overlays = map.overlayMapTypes;

    const remove = () => {
      // FIX: remove by reference (robust to index shifts)
      if (layerRef.current) {
        const len = overlays.getLength();
        for (let i = 0; i < len; i++) {
          if (overlays.getAt(i) === layerRef.current) {
            try { overlays.removeAt(i); } catch {}
            break;
          }
        }
      }
      layerRef.current = null;
      if (styleElRef.current) {
        styleElRef.current.remove();
        styleElRef.current = null;
      }
    };

    if (!enabled) {
      remove();
      return;
    }

    if (!hasPlaceholders) {
      console.warn(
        "[WeatherForecastLayer] tileUrlTemplate must include {z}, {x}, {y}. Received:",
        tileUrlTemplate
      );
      remove();
      return;
    }

    // Build the provider
    const imageMapType = new google.maps.ImageMapType({
      name,
      minZoom,
      maxZoom,
      tileSize: new google.maps.Size(tileSizePx, tileSizePx),
      getTileUrl: (coord, zoom) => {
        if (zoom < minZoom || zoom > maxZoom) return "";

        const x = getWrappedX(coord.x, zoom);
        const yRaw = flipY ? ( (1 << zoom) - coord.y - 1 ) : coord.y;
        const y = getClampedY(yRaw, zoom);
        if (y == null) return "";

        return tileUrlTemplate
          .replace("{x}", String(x))
          .replace("{y}", String(y))
          .replace("{z}", String(zoom));
      },
    });

    // FIX: ensure no duplicate instance is present before inserting
    remove();

    if (typeof zIndex === "number") {
      const idx = Math.max(0, Math.min(zIndex, overlays.getLength()));
      overlays.insertAt(idx, imageMapType);
    } else {
      overlays.push(imageMapType);
    }
    layerRef.current = imageMapType;

    // Try native opacity if available; else CSS fallback
    const anyLayer = imageMapType as unknown as { setOpacity?: (v: number) => void };
    if (typeof anyLayer.setOpacity === "function") {
      anyLayer.setOpacity(opacity);
    } else {
      try {
        const style = document.createElement("style");
        style.setAttribute("data-weather-opacity", "true");
        style.textContent = `
          .gm-style img[src^="${CSS.escape(srcPrefix)}"] {
            opacity: ${opacity} !important;
            pointer-events: none;
          }
        `;
        document.head.appendChild(style);
        styleElRef.current = style;
      } catch (e) {
        console.warn("[WeatherForecastLayer] CSS opacity fallback failed:", e);
      }
    }

    return () => remove();
    // FIX: do NOT depend on `opacity` here — it is handled by the small effect below
  }, [
    map,
    enabled,
    tileUrlTemplate,
    minZoom,
    maxZoom,
    tileSizePx,
    flipY,
    name,
    zIndex,
    hasPlaceholders,
    srcPrefix,
  ]);

  // Live-update opacity only (no full rebuild)
  useEffect(() => {
    if (!enabled) return;
    const layer = layerRef.current as unknown as { setOpacity?: (v: number) => void } | null;
    if (layer && typeof layer.setOpacity === "function") {
      layer.setOpacity!(opacity);
    } else if (styleElRef.current) {
      styleElRef.current.textContent = styleElRef.current.textContent?.replace(
        /opacity:\s*[\d.]+/g,
        `opacity: ${opacity}`
      )!;
    }
  }, [opacity, enabled]);

  return null;
}
