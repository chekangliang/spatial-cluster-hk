"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import AnalyticsPanel from "@/components/AnalyticsPanel";
import type { MapStats } from "@/components/MapView";

// MapLibre touches `window`, so it must be client-only.
const MapView = dynamic(() => import("@/components/MapView"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-slate-900 text-slate-400">
      Loading map…
    </div>
  ),
});

export default function Home() {
  const [view, setView] = useState<"cluster" | "heatmap">("cluster");
  const [stats, setStats] = useState<MapStats | null>(null);

  return (
    <main className="flex h-screen flex-col bg-slate-950">
      {/* Map — top 60% */}
      <div className="relative h-[60vh] w-full">
        <MapView view={view} onStats={setStats} />

        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-3">
          <div className="pointer-events-auto rounded-lg bg-slate-950/70 px-3 py-2 text-slate-100 shadow-lg backdrop-blur">
            <h1 className="text-sm font-semibold tracking-tight">Spatial Cluster · Hong Kong</h1>
            <p className="text-xs text-slate-400">Central · Wan Chai · Causeway Bay</p>
          </div>

          <div className="pointer-events-auto inline-flex rounded-lg bg-slate-950/70 p-1 shadow-lg backdrop-blur">
            {(["cluster", "heatmap"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium capitalize transition ${
                  view === v ? "bg-teal-500 text-white" : "text-slate-300 hover:text-white"
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Analytics — bottom 40% */}
      <div className="h-[40vh] w-full border-t border-slate-800">
        <AnalyticsPanel stats={stats} />
      </div>
    </main>
  );
}
