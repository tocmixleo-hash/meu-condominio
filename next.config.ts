import type { NextConfig } from "next";

// (comentário de rebuild: invalida cache de build da Vercel após rota removida)
const nextConfig: NextConfig = {
  output: "standalone",
  // Garante que o banco de demonstração entre no bundle serverless do Vercel.
  outputFileTracingIncludes: {
    "/**": ["./db/custom.db"],
  },
  // Fotografias enviadas pela Identidade visual vão para o Vercel Blob
  // (URL remota) — autorizamos o host do Blob para o next/image otimizar.
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**.public.blob.vercel-storage.com" }],
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
};

export default nextConfig;
