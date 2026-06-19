import Supercluster from "supercluster";
import * as turf from "@turf/turf";
import { HK_LOCATIONS, type HKLocation, type Category } from "@/data/locations";

export interface PointProps {
  id: number;
  name: string;
  category: Category;
  priority: string;
}

export type PointFeature = GeoJSON.Feature<GeoJSON.Point, PointProps>;

/** Convert the seed dataset into GeoJSON point features. */
export function toFeatures(locations: HKLocation[] = HK_LOCATIONS): PointFeature[] {
  return locations.map((l) => ({
    type: "Feature",
    properties: { id: l.id, name: l.name, category: l.category, priority: l.priority },
    geometry: { type: "Point", coordinates: [l.lng, l.lat] },
  }));
}

/** Build a Supercluster index loaded with all seed points. */
export function buildIndex(features: PointFeature[] = toFeatures()): Supercluster<PointProps> {
  const index = new Supercluster<PointProps>({ radius: 60, maxZoom: 16 });
  index.load(features as Supercluster.PointFeature<PointProps>[]);
  return index;
}

// --- District clustering for the analytics panel -------------------------

export const DISTRICTS = [
  { key: "central", label: "Central Cluster", seed: { lng: 114.1571, lat: 22.2803 } },
  { key: "wanchai", label: "Wan Chai Cluster", seed: { lng: 114.1732, lat: 22.2754 } },
  { key: "causeway", label: "Causeway Bay Cluster", seed: { lng: 114.1858, lat: 22.2807 } },
] as const;

export type DistrictKey = (typeof DISTRICTS)[number]["key"];

export interface DistrictStats {
  key: DistrictKey;
  label: string;
  count: number;
  categories: Record<string, number>;
  centroid: [number, number]; // [lng, lat]
}

export interface SpatialInsights {
  centerOfMass: [number, number]; // [lng, lat]
  districts: DistrictStats[];
  pairwiseKm: { from: string; to: string; km: number }[];
  baseCamp: { label: string; key: DistrictKey; avgKm: number };
}

/** Assign a point to the nearest district seed (deterministic). */
function nearestDistrict(lng: number, lat: number): DistrictKey {
  let best: (typeof DISTRICTS)[number] = DISTRICTS[0];
  let bestD = Infinity;
  for (const d of DISTRICTS) {
    const dist = turf.distance([lng, lat], [d.seed.lng, d.seed.lat], { units: "kilometers" });
    if (dist < bestD) {
      bestD = dist;
      best = d;
    }
  }
  return best.key;
}

/** Compute center of mass, per-district breakdowns, inter-cluster distances,
 *  and a recommended base camp (district closest to all others on average). */
export function computeInsights(locations: HKLocation[] = HK_LOCATIONS): SpatialInsights {
  const features = toFeatures(locations);
  const fc = turf.featureCollection(features);
  const com = turf.centerOfMass(fc).geometry.coordinates as [number, number];

  const buckets: Record<DistrictKey, HKLocation[]> = {
    central: [],
    wanchai: [],
    causeway: [],
  };
  for (const l of locations) buckets[nearestDistrict(l.lng, l.lat)].push(l);

  const districts: DistrictStats[] = DISTRICTS.map((d) => {
    const pts = buckets[d.key];
    const categories: Record<string, number> = {};
    for (const p of pts) categories[p.category] = (categories[p.category] ?? 0) + 1;
    const centroid =
      pts.length > 0
        ? (turf.centerOfMass(turf.featureCollection(toFeatures(pts))).geometry
            .coordinates as [number, number])
        : ([d.seed.lng, d.seed.lat] as [number, number]);
    return { key: d.key, label: d.label, count: pts.length, categories, centroid };
  });

  const pairwiseKm: SpatialInsights["pairwiseKm"] = [];
  for (let i = 0; i < districts.length; i++) {
    for (let j = i + 1; j < districts.length; j++) {
      const km = turf.distance(districts[i].centroid, districts[j].centroid, {
        units: "kilometers",
      });
      pairwiseKm.push({
        from: districts[i].label,
        to: districts[j].label,
        km: Math.round(km * 100) / 100,
      });
    }
  }

  // Base camp: district whose centroid minimizes mean distance to the others.
  let baseCamp = { label: districts[0].label, key: districts[0].key, avgKm: Infinity };
  for (const d of districts) {
    const others = districts.filter((o) => o.key !== d.key);
    const avg =
      others.reduce(
        (s, o) => s + turf.distance(d.centroid, o.centroid, { units: "kilometers" }),
        0
      ) / Math.max(others.length, 1);
    if (avg < baseCamp.avgKm) baseCamp = { label: d.label, key: d.key, avgKm: Math.round(avg * 100) / 100 };
  }

  return { centerOfMass: com, districts, pairwiseKm, baseCamp };
}
