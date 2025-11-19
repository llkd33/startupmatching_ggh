const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Standalone 모드는 Railway에서 502 에러를 발생시킬 수 있으므로 비활성화
  // 메모리 최적화는 webpack 설정으로 처리
  // output: 'standalone',
  
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
    
    // Optimize memory usage during build - 더 보수적인 설정
    if (!isServer) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          maxInitialRequests: 25,
          minSize: 20000,
          cacheGroups: {
            default: {
              minChunks: 2,
              priority: -20,
              reuseExistingChunk: true,
            },
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendors',
              priority: -10,
              chunks: 'all',
            },
          },
        },
      };
    }
    
    return config;
  },
}

module.exports = nextConfig;

