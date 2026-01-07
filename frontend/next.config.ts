import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',

  // Transpile the noVNC package to handle CommonJS modules
  transpilePackages: ['@novnc/novnc'],

  // Turbopack configuration (Next.js 16+ uses Turbopack by default)
  turbopack: {
    // Allow noVNC CommonJS module
    resolveAlias: {
      // No specific aliases needed, transpilePackages handles it
    },
  },

  // Webpack fallback configuration (for non-Turbopack builds)
  webpack: (config, { isServer }) => {
    // Only apply to client-side bundle
    if (!isServer) {
      // Ensure proper handling of CommonJS modules
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        os: false,
      };
    }

    return config;
  },
};

export default nextConfig;

