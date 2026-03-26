"use client";

import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useEffect, useMemo, useRef, useState } from "react";

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

type ParkingGeoJson = {
  type: "FeatureCollection";
  features: Array<{
    type: "Feature";
    geometry: { type: string; coordinates: unknown };
    properties: {
      permit_zone: string | null;
      address_desc: string | null;
      zone_type: string | null;
      enforceable_time: string | null;
      isFreeNow: boolean;
      currentPriceUsd: number | null;
    };
  }>;
};

export default function ParkingMap({
  freeOnly,
}: {
  freeOnly: boolean;
}): JSX.Element {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [geojson, setGeojson] = useState<ParkingGeoJson | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const tokenMissing = useMemo(() => {
    return !process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  }, []);

  const popupRef = useRef<mapboxgl.Popup | null>(null);

  useEffect(() => {
    const run = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/parking?freeOnly=${freeOnly ? 1 : 0}`);
        const data = (await res.json()) as ParkingGeoJson;
        setGeojson(data);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error(e);
        setGeojson(null);
      } finally {
        setIsLoading(false);
      }
    };
    run();
  }, [freeOnly]);

  useEffect(() => {
    if (!containerRef.current) return;
    if (tokenMissing) return;
    if (mapRef.current) return;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [-114.0719, 51.0447],
      zoom: 12,
      attributionControl: true,
    });

    mapRef.current = map;

    map.addControl(new mapboxgl.NavigationControl(), "top-right");

    popupRef.current = new mapboxgl.Popup({
      closeButton: true,
      closeOnClick: false,
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [tokenMissing]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !geojson) return;

    const ensureSourceAndLayer = () => {
      const sourceId = "calgary-parking";
      const layerId = "calgary-parking-lines";

      if (map.getSource(sourceId)) {
        (map.getSource(sourceId) as mapboxgl.GeoJSONSource).setData(geojson);
        return;
      }

      map.addSource(sourceId, { type: "geojson", data: geojson });

      map.addLayer({
        id: layerId,
        type: "line",
        source: sourceId,
        layout: {
          "line-join": "round",
          "line-cap": "round",
        },
        paint: {
          // The API encodes `currentPriceUsd` as 0 when free and 1 when not.
          "line-color": [
            "case",
            ["==", ["get", "currentPriceUsd"], 0],
            "#22c55e",
            "#94a3b8",
          ],
          "line-width": 3,
          "line-opacity": 0.85,
        },
      });

      map.on("mouseenter", layerId, (e) => {
        map.getCanvas().style.cursor = "pointer";
        const feat = e.features?.[0];
        if (!feat) return;
        const props = feat.properties as any;

        const popup = popupRef.current;
        if (!popup) return;

        popup
          .setLngLat(e.lngLat)
          .setHTML(
            [
              `<div style="font-weight:700;margin-bottom:6px;">${props.zone_type ?? ""}</div>`,
              `<div><b>Permit zone:</b> ${props.permit_zone ?? ""}</div>`,
              `<div style="color:#cbd5e1;"><b>Free now:</b> ${props.isFreeNow ? "Yes" : "No"}</div>`,
              props.address_desc
                ? `<div style="margin-top:6px;color:#e5e7eb;">${props.address_desc}</div>`
                : "",
            ].join("")
          )
          .addTo(map);
      });

      map.on("mouseleave", layerId, () => {
        map.getCanvas().style.cursor = "";
        popupRef.current?.remove();
      });
    };

    if (map.isStyleLoaded()) {
      ensureSourceAndLayer();
    } else {
      map.once("load", ensureSourceAndLayer);
    }
  }, [geojson]);

  return (
    <div
      ref={containerRef}
      style={{ position: "absolute", inset: 0 }}
      aria-label="Calgary free parking map"
    >
      {tokenMissing ? (
        <div
          style={{
            position: "absolute",
            inset: 16,
            padding: 16,
            background: "var(--panel)",
            border: "1px solid var(--border)",
            borderRadius: 12,
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 8 }}>
            Missing Mapbox token
          </div>
          <div style={{ color: "var(--muted)", fontSize: 13 }}>
            Set `NEXT_PUBLIC_MAPBOX_TOKEN` in your environment.
          </div>
        </div>
      ) : isLoading && !geojson ? (
        <div
          style={{
            position: "absolute",
            inset: 16,
            padding: 16,
            background: "var(--panel)",
            border: "1px solid var(--border)",
            borderRadius: 12,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          Loading Calgary parking data...
        </div>
      ) : null}
    </div>
  );
}

