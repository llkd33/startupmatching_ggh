const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Standalone output for better memory efficiency
  // Note: This reduces build memory usage but requires proper PORT handling
  output: 'standalone',
  
  // PORT는 Railway에서 자동으로 제공되므로 env에 추가할 필요 없음
  // standalone 서버가 자동으로 PORT 환경 변수를 읽음
  
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  typescript: {
    // !! WARN !!
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    ignoreBuildErrors: true,
  },
  // Optimize build performance
  // swcMinify is enabled by default in Next.js 15, no need to specify
  compress: true,
  
  webpack: (config, { isServer }) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname, './src'),
    };
    
    // Optimize memory usage during build
    if (!isServer) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            default: false,
            vendors: false,
            // Vendor chunk
            vendor: {
              name: 'vendor',
              chunks: 'all',
              test: /node_modules/,
              priority: 20,
            },
            // Common chunk
            common: {
              name: 'common',
              minChunks: 2,
              chunks: 'all',
              priority: 10,
              reuseExistingChunk: true,
              enforce: true,
            },
          },
        },
      };
    }
    
    return config;
  },
}

module.exports = nextConfig;

