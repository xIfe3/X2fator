/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      "/about",
      "/community",
      "/contact",
      "/faq",
      "/how-it-works",
      "/privacy",
      "/security",
      "/terms",
    ].map((source) => ({
      source,
      destination: "/login",
      permanent: false,
    }));
  },
};

export default nextConfig;
