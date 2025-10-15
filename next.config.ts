import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    // Temporarily disable type checking during build if memory is low
    // Run type checking separately if needed
    ignoreBuildErrors: false,
  },
  eslint: {
    // Disable ESLint during build to save memory
    // Run linting separately if needed
    ignoreDuringBuilds: true,
  },
  // Optimize bundle size
  experimental: {
    optimizePackageImports: ['lucide-react', '@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu'],
    // Enable memory optimizations
    memoryBasedWorkersCount: true,
    // Reduce memory usage during build
    webpackBuildWorker: true,
  },
  // Memory optimization settings
  webpack: (config, { dev, isServer }) => {
    // Reduce memory usage in development
    if (dev) {
      config.watchOptions = {
        poll: 1000,
        aggregateTimeout: 300,
      }
      // Limit memory usage in development
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          maxSize: 200000, // 200KB max chunk size
        },
      }
    }
    
    // Optimize for production builds
    if (!dev && !isServer) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendors',
              chunks: 'all',
            },
          },
        },
      }
    }
    
    return config
  },
  // Reduce memory usage
  swcMinify: true,
  // Enable compression
  compress: true,
};

export default nextConfig;
