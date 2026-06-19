export type Category = "Landmark" | "Cafe" | "Park" | "Transit" | "Shopping";
export type Priority = "High" | "Medium" | "Low";

export interface HKLocation {
  id: number;
  name: string;
  lat: number;
  lng: number;
  category: Category;
  priority: Priority;
}

export const HK_LOCATIONS: HKLocation[] = [
  { id: 1, name: "The Peak Tram Lower Terminus", lat: 22.2778, lng: 114.1592, category: "Landmark", priority: "High" },
  { id: 2, name: "Tai Kwong (Centre for Heritage and Arts)", lat: 22.2814, lng: 114.1544, category: "Landmark", priority: "High" },
  { id: 3, name: "NOC Coffee Co. (Central)", lat: 22.2831, lng: 114.1527, category: "Cafe", priority: "Medium" },
  { id: 4, name: "Hong Kong Park", lat: 22.2775, lng: 114.1614, category: "Park", priority: "Medium" },
  { id: 5, name: "Central MTR Station", lat: 22.2819, lng: 114.1581, category: "Transit", priority: "High" },
  { id: 6, name: "Blue House (Wan Chai)", lat: 22.2736, lng: 114.1744, category: "Landmark", priority: "Medium" },
  { id: 7, name: "Wan Chai Computer Centre", lat: 22.2769, lng: 114.1731, category: "Shopping", priority: "Low" },
  { id: 8, name: "Omotesando Koffee (Wan Chai)", lat: 22.2748, lng: 114.1719, category: "Cafe", priority: "Medium" },
  { id: 9, name: "Wan Chai MTR Station", lat: 22.2764, lng: 114.1735, category: "Transit", priority: "High" },
  { id: 10, name: "Hysan Place (Causeway Bay)", lat: 22.2800, lng: 114.1836, category: "Shopping", priority: "High" },
  { id: 11, name: "Victoria Park", lat: 22.2825, lng: 114.1895, category: "Park", priority: "High" },
  { id: 12, name: "Sogo Department Store", lat: 22.2803, lng: 114.1850, category: "Shopping", priority: "Medium" },
  { id: 13, name: "Causeway Bay MTR Station", lat: 22.2801, lng: 114.1851, category: "Transit", priority: "High" },
];

export const CATEGORY_COLORS: Record<Category, string> = {
  Landmark: "#f5c518", // gold
  Cafe: "#f97316", // orange
  Park: "#22c55e", // green
  Transit: "#3b82f6", // blue
  Shopping: "#a855f7", // purple
};

export const HK_CENTER = { lng: 114.17, lat: 22.28, zoom: 13 } as const;
