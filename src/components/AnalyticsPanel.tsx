"use client";

import { useEffect, useState } from "react";
import { computeInsights, type SpatialInsights } from "@/lib/geo";
import { CATEGORY_COLORS, type Category } from "@/data/locations";
import type { MapStats } from "./MapView";

interface Props {
  stats: MapStats | null;
}

export default function AnalyticsPanel({ stats }: Props) {
  // Compute on the client only — keeps turf/supercluster out of the
  // server prerender pass (the page is fully interactive client-side).
  const [insights, setInsights] = useState<SpatialInsights | null>(null);
  useEffect(() => {
    setInsights(computeInsights());
  }, []);

  if (!insights) {
    return (
      <section className="flex h-full items-center justify-center bg-slate-950 text-sm text-slate-400">
        Computing spatial insights…
      </section>
    );
  }

  return (
    <section className="h-full overflow-y-auto bg-slate-950 px-4 py-4 text-slate-100 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <header className="mb-4 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Location Intelligence</h2>
            <p className="text-sm text-slate-400">
              {insights.districts.reduce((s, d) => s + d.count, 0)} sites · center of mass{" "}
              {insights.centerOfMass[1].toFixed(4)}, {insights.centerOfMass[0].toFixed(4)}
            </p>
          </div>
          {stats && (
            <span className="rounded-full bg-slate-800/80 px-3 py-1 text-xs text-slate-300 backdrop-blur">
              {stats.clusterCount} clusters · {stats.visiblePoints} features in view
            </span>
          )}
        </header>

        <div className="grid gap-3 md:grid-cols-3">
          {insights.districts.map((d) => (
            <div
              key={d.key}
              className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 backdrop-blur"
            >
              <div className="flex items-baseline justify-between">
                <h3 className="font-medium">{d.label}</h3>
                <span className="text-2xl font-bold text-teal-400">{d.count}</span>
              </div>
              <ul className="mt-3 space-y-1.5">
                {Object.entries(d.categories)
                  .sort((a, b) => b[1] - a[1])
                  .map(([cat, n]) => (
                    <li key={cat} className="flex items-center gap-2 text-sm text-slate-300">
                      <span
                        className="inline-block h-2.5 w-2.5 rounded-full"
                        style={{ background: CATEGORY_COLORS[cat as Category] }}
                      />
                      <span className="flex-1">{cat}</span>
                      <span className="text-slate-400">{n}</span>
                    </li>
                  ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 backdrop-blur">
            <h3 className="mb-2 text-sm font-medium text-slate-300">Inter-cluster distance</h3>
            <ul className="space-y-1.5 text-sm">
              {insights.pairwiseKm.map((p) => (
                <li key={`${p.from}-${p.to}`} className="flex justify-between text-slate-300">
                  <span>
                    {p.from.replace(" Cluster", "")} ↔ {p.to.replace(" Cluster", "")}
                  </span>
                  <span className="font-mono text-slate-100">{p.km} km</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-xl border border-teal-800/60 bg-teal-950/40 p-4 backdrop-blur">
            <h3 className="mb-1 text-sm font-medium text-teal-300">Recommended base camp</h3>
            <p className="text-xl font-semibold text-teal-100">{insights.baseCamp.label}</p>
            <p className="mt-1 text-sm text-teal-300/80">
              Minimizes average travel to the other clusters
              <span className="ml-1 font-mono">({insights.baseCamp.avgKm} km avg)</span>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
