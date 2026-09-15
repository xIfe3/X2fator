/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Produces .next/standalone — a self-contained server bundle with
  // only the node_modules files actually used, so it can be deployed
  // outside the pnpm workspace (e.g. shared cPanel hosting) without a
  // `workspace:*` resolution problem. See scripts/build-cpanel.sh.
  output: "standalone",
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
