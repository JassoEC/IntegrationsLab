/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Disable client-side router cache for dynamic routes.
    // Without this, navigating back to a page serves a stale in-memory snapshot
    // and useEffect polling doesn't re-run until a hard refresh.
    staleTimes: { dynamic: 0, static: 0 },
  },
}

module.exports = nextConfig
