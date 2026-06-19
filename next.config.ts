import type { NextConfig } from "next";

// Next.js 16 uses Turbopack by default, which resolves `maplibre-gl`
// correctly without the legacy webpack alias workaround. MapLibre's
// `window` access is handled by importing MapView via `next/dynamic`
// with `{ ssr: false }` (see src/app/page.tsx).
const nextConfig: NextConfig = {
  turbopack: {},
};

export default nextConfig;
