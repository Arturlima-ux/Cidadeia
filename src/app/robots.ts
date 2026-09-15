import type { MetadataRoute } from "next";

// O que é de quem procura fica aberto; o que é de quem entra, fechado.
export default function robots(): MetadataRoute.Robots {
  const base = process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "https://cidadeia.vercel.app";
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/dashboard", "/api/", "/demo", "/sessao-encerrada", "/login", "/cadastro"] }],
    sitemap: `${base}/sitemap.xml`,
  };
}
