/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  compress: true,
  async redirects() {
    return [
      // Browsers probe these by convention; map to generated App Router icons.
      { source: '/favicon.ico', destination: '/icon.svg', permanent: false },
      { source: '/apple-touch-icon.png', destination: '/apple-icon', permanent: false },
      { source: '/apple-touch-icon-precomposed.png', destination: '/apple-icon', permanent: false },
    ];
  },
};

export default nextConfig;
