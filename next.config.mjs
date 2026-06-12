// Conditionally import bundle analyzer only when needed
const bundleAnalyzer =
  process.env.ANALYZE === 'true'
    ? (await import('@next/bundle-analyzer')).default({
        enabled: true,
      })
    : config => config

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Both gates are real now: tsc --noEmit and eslint --quiet are at 0 errors
  // on the maintained surface, so builds enforce them instead of masking them.
  eslint: {
    ignoreDuringBuilds: false,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  images: {
    unoptimized: true,
  },
  // Disable source maps completely to avoid Next.js internal source-map module issues
  productionBrowserSourceMaps: false,
  // Docker optimization - standalone output (only for production builds)
  ...(process.env.NODE_ENV === 'production' && process.env.DOCKER_BUILD
    ? {
        output: 'standalone',
      }
    : {}),

  // Transpile packages that need special handling
  transpilePackages: [
    'form-data-encoder',
    'formdata-node',
    'galileo',
    'openai',
    'react-remove-scroll-bar',
  ],

  experimental: {
    // Note: entries match import specifiers literally — globs are not expanded.
    optimizePackageImports: ['lucide-react', 'recharts', 'react-hook-form', 'd3', '@ai-sdk/openai'],
    // Server actions configuration
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },

  // Turbopack configuration (top-level since Next 15.3; experimental.turbo is
  // deprecated and its shim is removed in Next 16).
  turbopack: {
    resolveAlias: {
      // Fix react-remove-scroll module resolution issue
      'react-remove-scroll-bar/constants': 'react-remove-scroll-bar/dist/es2015/constants',
    },
    resolveExtensions: ['.js', '.jsx', '.ts', '.tsx', '.json'],
  },

  async redirects() {
    return [
      {
        source: '/login',
        destination: '/auth/signin',
        permanent: true,
      },
    ]
  },

  // Code splitting optimization
  webpack: (config, { dev, isServer }) => {
    // Only apply webpack config when not using turbopack
    if (process.env.TURBOPACK) {
      return config
    }

    // Basic fallbacks for browser environment
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        path: false,
        os: false,
      }
    }

    // Note: productionBrowserSourceMaps: false above disables client source maps
    // Server source maps are handled automatically by Next.js
    // DO NOT set config.devtool = false as it breaks Next.js internal modules

    // Configure externals for serverless functions
    if (isServer) {
      config.externals = config.externals || []

      // Externalize native modules from ChromaDB to prevent bundling issues
      // pdf-parse is optional for LangChain PDF loading
      // ws (WebSocket) is needed by chromadb and must be external
      config.externals.push({
        'onnxruntime-node': 'commonjs onnxruntime-node',
        '@chroma-core/default-embed': 'commonjs @chroma-core/default-embed',
        chromadb: 'commonjs chromadb',
        'pdf-parse': 'commonjs pdf-parse',
        'pdf-parse/lib/pdf.js/v1.10.100/build/pdf.js': 'commonjs pdf-parse',
        ws: 'commonjs ws',
      })
    }

    // Fix react-remove-scroll module resolution issue
    config.resolve.alias = {
      ...config.resolve.alias,
      'react-remove-scroll-bar/constants': 'react-remove-scroll-bar/dist/es2015/constants',
    }

    // Code splitting for large libraries
    if (!dev && !isServer) {
      config.optimization.splitChunks.cacheGroups = {
        ...config.optimization.splitChunks.cacheGroups,

        // Separate chunk for heavy AI/ML libraries
        ai: {
          test: /[\\/]node_modules[\\/](@ai-sdk|@anthropic-ai|openai|galileo)[\\/]/,
          name: 'ai-vendors',
          chunks: 'all',
          priority: 10,
        },

        // Separate chunk for chart libraries
        charts: {
          test: /[\\/]node_modules[\\/](recharts|d3|victory)[\\/]/,
          name: 'chart-vendors',
          chunks: 'all',
          priority: 10,
        },

        // Separate chunk for UI libraries
        ui: {
          test: /[\\/]node_modules[\\/](@radix-ui|lucide-react|tailwindcss)[\\/]/,
          name: 'ui-vendors',
          chunks: 'all',
          priority: 5,
        },

        // Separate chunk for large utility libraries
        utils: {
          test: /[\\/]node_modules[\\/](date-fns|suncalc|@prisma)[\\/]/,
          name: 'utils-vendors',
          chunks: 'all',
          priority: 5,
        },
      }
    }

    return config
  },
}

export default bundleAnalyzer(nextConfig)
