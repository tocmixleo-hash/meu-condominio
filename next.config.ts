import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Garante que o banco de demonstração entre no bundle serverless do Vercel.
  outputFileTracingIncludes: {
    "/**": ["./db/custom.db"],
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
};

export default nextConfig;
