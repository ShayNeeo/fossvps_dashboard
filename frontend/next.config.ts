import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',

  // Transpile the noVNC package to handle CommonJS modules
  transpilePackages: ['@novnc/novnc'],

  // Turbopack configuration (Next.js 16+ uses Turbopack by default)
  turbopack: {
    resolveAlias: {
      // Force noVNC to use browser-compatible build
    },
    resolveExtensions: ['.mjs', '.js', '.mts', '.ts', '.jsx', '.tsx', '.json'],
  },

  // Experimental settings
  experimental: {
    // Enable optimizePackageImports for better tree shaking
    optimizePackageImports: ['lucide-react', '@tabler/icons-react'],
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

      // Add rule for noVNC to handle CJS/ESM mixed modules
      config.module.rules.push({
        test: /node_modules\/@novnc\/novnc\/.*\.js$/,
        type: 'javascript/auto',
      });

      // Handle noVNC as external when it causes issues
      config.externals = config.externals || [];
    }

    return config;
  },
};

export default nextConfig;
