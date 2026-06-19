"use client";

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { buildIndex, toFeatures, type PointProps } from "@/lib/geo";
import { CATEGORY_COLORS, HK_CENTER } from "@/data/locations";

// OpenFreeMap "liberty" gives real HK street tiles. Swap to
// "https://demotiles.maplibre.org/style.json" for a fully offline-ish fallback.
const MAP_STYLE = "https://tiles.openfreemap.org/styles/liberty";

export interface MapStats {
  visiblePoints: number;
  clusterCount: number;
}

interface Props {
  view: "cluster" | "heatmap";
  onStats?: (stats: MapStats) => void;
}

export default function MapView({ view, onStats }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const indexRef = useRef(buildIndex());
  const loadedRef = useRef(false);
  const onStatsRef = useRef(onStats);
  onStatsRef.current = onStats;

  // Initialize map once.
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: MAP_STYLE,
      center: [HK_CENTER.lng, HK_CENTER.lat],
      zoom: HK_CENTER.zoom,
      attributionControl: { compact: true },
    });
    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");

    const updateClusters = () => {
      if (!loadedRef.current) return;
      const b = map.getBounds();
      const bbox: [number, number, number, number] = [
        b.getWest(),
        b.getSouth(),
        b.getEast(),
        b.getNorth(),
      ];
      const zoom = Math.floor(map.getZoom());
      const clusters = indexRef.current.getClusters(bbox, zoom);
      const src = map.getSource("points") as maplibregl.GeoJSONSource | undefined;
      src?.setData({ type: "FeatureCollection", features: clusters as GeoJSON.Feature[] });

      const clusterCount = clusters.filter(
        (c) => (c.properties as { cluster?: boolean }).cluster
      ).length;
      onStatsRef.current?.({ visiblePoints: clusters.length, clusterCount });
    };

    map.on("load", () => {
      const colorMatch: maplibregl.ExpressionSpecification = [
        "match",
        ["get", "category"],
        "Landmark", CATEGORY_COLORS.Landmark,
        "Cafe", CATEGORY_COLORS.Cafe,
        "Park", CATEGORY_COLORS.Park,
        "Transit", CATEGORY_COLORS.Transit,
        "Shopping", CATEGORY_COLORS.Shopping,
        "#94a3b8",
      ];

      // Clustered source (data filled by updateClusters).
      map.addSource("points", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      // Raw source for the heatmap view.
      map.addSource("points-raw", {
        type: "geojson",
        data: { type: "FeatureCollection", features: toFeatures() as GeoJSON.Feature[] },
      });

      map.addLayer({
        id: "clusters",
        type: "circle",
        source: "points",
        filter: ["has", "point_count"],
        paint: {
          "circle-color": "#0d9488", // teal
          "circle-opacity": 0.85,
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 2,
          "circle-radius": ["step", ["get", "point_count"], 16, 3, 22, 6, 30],
        },
      });
      map.addLayer({
        id: "cluster-count",
        type: "symbol",
        source: "points",
        filter: ["has", "point_count"],
        layout: {
          "text-field": ["get", "point_count_abbreviated"],
          "text-font": ["Noto Sans Regular"],
          "text-size": 13,
        },
        paint: { "text-color": "#ffffff" },
      });
      map.addLayer({
        id: "unclustered-point",
        type: "circle",
        source: "points",
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-color": colorMatch,
          "circle-radius": 7,
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 2,
        },
      });

      // Heatmap layer (hidden by default).
      map.addLayer({
        id: "heat",
        type: "heatmap",
        source: "points-raw",
        layout: { visibility: "none" },
        paint: {
          "heatmap-radius": 40,
          "heatmap-intensity": 1.2,
          "heatmap-opacity": 0.85,
          "heatmap-color": [
            "interpolate", ["linear"], ["heatmap-density"],
            0, "rgba(13,148,136,0)",
            0.3, "rgba(13,148,136,0.5)",
            0.6, "rgba(234,179,8,0.7)",
            1, "rgba(239,68,68,0.9)",
          ],
        },
      });

      loadedRef.current = true;
      updateClusters();
    });

    map.on("moveend", updateClusters);
    map.on("zoomend", updateClusters);

    // Cluster click → expand & fly in.
    map.on("click", "clusters", (e) => {
      const feat = e.features?.[0];
      if (!feat) return;
      const clusterId = (feat.properties as { cluster_id: number }).cluster_id;
      const zoom = indexRef.current.getClusterExpansionZoom(clusterId);
      const coords = (feat.geometry as GeoJSON.Point).coordinates as [number, number];
      map.easeTo({ center: coords, zoom: Math.min(zoom, 18) });
    });

    // Point popup.
    map.on("click", "unclustered-point", (e) => {
      const feat = e.features?.[0];
      if (!feat) return;
      const p = feat.properties as PointProps;
      const coords = (feat.geometry as GeoJSON.Point).coordinates as [number, number];
      new maplibregl.Popup({ offset: 12 })
        .setLngLat(coords)
        .setHTML(
          `<strong>${p.name}</strong><br/><span style="color:#64748b">${p.category} · ${p.priority} priority</span>`
        )
        .addTo(map);
    });

    for (const id of ["clusters", "unclustered-point"]) {
      map.on("mouseenter", id, () => (map.getCanvas().style.cursor = "pointer"));
      map.on("mouseleave", id, () => (map.getCanvas().style.cursor = ""));
    }

    return () => {
      map.remove();
      mapRef.current = null;
      loadedRef.current = false;
    };
  }, []);

  // Toggle cluster vs heatmap view.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loadedRef.current) return;
    const apply = () => {
      const clusterVisible = view === "cluster" ? "visible" : "none";
      const heatVisible = view === "heatmap" ? "visible" : "none";
      for (const id of ["clusters", "cluster-count", "unclustered-point"]) {
        if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", clusterVisible);
      }
      if (map.getLayer("heat")) map.setLayoutProperty("heat", "visibility", heatVisible);
    };
    if (map.isStyleLoaded()) apply();
    else map.once("idle", apply);
  }, [view]);

  return <div ref={containerRef} className="h-full w-full" />;
}
