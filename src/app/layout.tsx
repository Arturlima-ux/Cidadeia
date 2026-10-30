import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import MovimentoLeve from "@/components/movimento/MovimentoLeve";
import { URL_BASE, NOME_DO_SITE, TITULO_DO_SITE, DESCRICAO_PADRAO, JsonLdScript, ldOrganizacao } from "@/lib/seo";

// Geist, a família do site inteiro, servida do próprio projeto (licença OFL
// em app/fontes). Ver a nota de tipografia em globals.css.
const geist = localFont({
  src: "./fontes/Geist.woff2",
  variable: "--font-geist",
  weight: "100 900",
  display: "swap",
});

// ── metadataBase ──
// Sem ela, og:image sai como caminho relativo e nenhum aplicativo de
// mensagem consegue buscar a imagem: o link chega sem nada. É a linha que
// faz todo o resto funcionar. Ver lib/seo.ts.
export const metadata: Metadata = {
  metadataBase: new URL(URL_BASE),
  title: {
    default: TITULO_DO_SITE,
    template: "%s — CidadeIA",
  },
  // Até ~155 caracteres: o Google corta o resto. Era de 268.
  description: DESCRICAO_PADRAO,
  openGraph: {
    type: "website",
    siteName: NOME_DO_SITE,
    locale: "pt_BR",
    title: TITULO_DO_SITE,
    description: DESCRICAO_PADRAO,
  },
  twitter: { card: "summary_large_image" },
  // Search Console: a tag de verificação vem da Vercel (GOOGLE_SITE_VERIFICATION).
  // Sem a variável, nada é emitido.
  ...(process.env.GOOGLE_SITE_VERIFICATION
    ? { verification: { google: process.env.GOOGLE_SITE_VERIFICATION } }
    : {}),
};

const SCRIPT_INICIAL = `(function(){var d=document.documentElement;d.classList.add("com-js");try{var q=/[?&]leve=([01])/.exec(location.search);if(q)localStorage.setItem("cidadeia-leve",q[1]);var g=localStorage.getItem("cidadeia-leve");var n=navigator;if(g==="1"||(g!=="0"&&((n.hardwareConcurrency&&n.hardwareConcurrency<=4)||(n.deviceMemory&&n.deviceMemory<=4))))d.setAttribute("data-leve","")}catch(e){}})()`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`h-full antialiased ${geist.variable}`}
      // O script abaixo acrescenta "com-js" antes de o React assumir: diferença esperada.
      suppressHydrationWarning
    >
      <head>
        {/* ── MARCA QUE O JAVASCRIPT EXISTE ──
            As animações de entrada escondiam o conteúdo até o script revelar:
            40 elementos da home saíam com `opacity:0` no HTML. Sem JavaScript
            — buscador que não executa script, pré-visualização de link no
            WhatsApp, leitor de texto — a página inteira ficava em branco.
            Não era lista incompleta: era nada.

            Agora quem esconde é o CSS, e só depois desta linha marcar o
            documento. Sem script a classe nunca chega e tudo aparece; com
            script a animação roda igual, e ela roda ANTES da primeira pintura
            porque está no <head>, então ninguém vê o conteúdo piscar.

            `dangerouslySetInnerHTML` é a única forma de emitir script inline
            aqui, e o conteúdo é uma constante escrita à mão — não há entrada
            de usuário envolvida. */}
        {/* ── E SE O COMPUTADOR É FRACO ──
            Na mesma linha, antes da primeira pintura: com até 4 núcleos ou
            até 4 GB de memória, liga o modo leve (globals.css, data-leve),
            para nenhuma animação de entrada começar. Uma escolha guardada
            (localStorage "cidadeia-leve", "1" ou "0", que ModoLeve.tsx grava —
            ele vem dentro de MovimentoLeve, para o layout não ganhar mais um
            componente de cliente, o que separava a fonte num CSS à parte e
            atrasava a primeira pintura —
            quando mede quadros lentos, ou ?leve=1 / ?leve=0 no endereço)
            vale mais que o palpite. */}
        <script
          dangerouslySetInnerHTML={{
            __html: SCRIPT_INICIAL,
          }}
        />
        <JsonLdScript dados={ldOrganizacao()} />
      </head>
      <body className="min-h-full flex flex-col">
        <MovimentoLeve>{children}</MovimentoLeve>
        {/* Medição de visitas sem cookie e sem identificar pessoa (Vercel
            Web Analytics). Só liga em produção; precisa estar ativado no
            painel da Vercel (aba Analytics) para começar a contar. */}
        <Analytics />
        {/* Quanto tempo a página leva para abrir e responder no aparelho de
            quem visita (Vercel Speed Insights): mostra se o site está lento
            nos computadores das prefeituras, o que o Lighthouse daqui não
            mede. Sem cookie e sem identificar pessoa; também precisa estar
            ativado no painel da Vercel (aba Speed Insights). */}
        <SpeedInsights />
      </body>
    </html>
  );
}
