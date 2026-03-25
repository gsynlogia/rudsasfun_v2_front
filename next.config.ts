import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Usuwanie console.log z produkcyjnego builda (bezpieczeństwo)
  // Zostawia console.error i console.warn
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? { exclude: ['error', 'warn'] } : false,
  },
};

export default nextConfig;