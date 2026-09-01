/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.r2.dev" },
      { protocol: "https", hostname: process.env.NEXT_PUBLIC_MEDIA_CDN_HOST || "media.naveedanjum.com" },
    ],
  },
  reactStrictMode: true,
};

module.exports = nextConfig;
