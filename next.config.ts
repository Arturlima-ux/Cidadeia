import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "localhost",
    "127.0.0.1",
    "192.168.100.15",
    "192.168.*.*",
    "10.*.*.*",
    "*.trycloudflare.com", // túnel temporário de preview — remover se não usar mais
  ],
  experimental: {
    serverActions: {
      allowedOrigins: [
        "localhost",
        "127.0.0.1",
        ".vercel.app",
        ".localhost",
        "192.168.100.15",
        ".trycloudflare.com", // túnel temporário de preview — remover se não usar mais
      ],
    },
  },
  // Headers de segurança
  headers: async () => {
    // CSP com 'unsafe-inline' em script/style: o app usa muito style inline
    // (React style={{}}) e o Next injeta script inline pro streaming de RSC —
    // uma CSP com nonce eliminaria isso, mas exige reescrever o middleware e
    // todo layout pra propagar o nonce. Mesmo com 'unsafe-inline', a CSP
    // abaixo já bloqueia scripts/estilos/frames de origem externa.
    const ehDev = process.env.NODE_ENV !== "production";

    // 'unsafe-eval' SÓ em desenvolvimento: o React usa eval() em dev para
    // reconstruir stack traces e o Turbopack para hot reload. Em produção o
    // React nunca usa eval(), então liberar isso lá só abriria brecha de XSS.
    const scriptSrc = ehDev
      ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
      : "script-src 'self' 'unsafe-inline'";

    // Em dev o Turbopack abre WebSocket pro hot reload; o túnel de preview
    // (trycloudflare) usa wss:// no domínio público, não 'self'.
    const connectSrc = ehDev
      ? "connect-src 'self' ws: wss:"
      : "connect-src 'self'";

    const csp = [
      "default-src 'self'",
      scriptSrc,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      connectSrc,
      "frame-ancestors 'self'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
    ].join("; ");

    // HSTS só onde existe HTTPS de verdade.
    //
    // Mandar HSTS a partir de localhost ENVENENA o cache do navegador para o
    // host `localhost` inteiro. Não é só este projeto: todo outro app que você
    // rodar em http://localhost passa a ser forçado para https, por dois anos,
    // sem servidor para atender. E não some sozinho — a única saída é limpar a
    // lista de HSTS do navegador na mão.
    //
    // (O 308 que deixava o localhost inacessível vinha de outro lugar, da nossa
    // regra em lib/forcar-https.ts, e foi corrigido lá. Esta guarda continua
    // valendo por si.)
    //
    // `VERCEL` é definida pela plataforma no build e em runtime.
    const emProducaoReal = process.env.VERCEL === "1";

    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Content-Security-Policy",
            value: csp,
          },
          ...(emProducaoReal
            ? [
                {
                  key: "Strict-Transport-Security",
                  value: "max-age=63072000; includeSubDomains; preload",
                },
              ]
            : []),
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
          },
        ],
      },
    ];
  },
  // Compressão e otimizações
  compress: true,
  // Otimizar imagens
  images: {
    unoptimized: false,
    formats: ["image/webp", "image/avif"],
  },
};

export default nextConfig;
