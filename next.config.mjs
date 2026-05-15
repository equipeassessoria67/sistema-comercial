/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/brasilapi/:path*',
        destination: 'https://brasilapi.com.br/api/:path*',
      },
    ];
  },
};

export default nextConfig;
