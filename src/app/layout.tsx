import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Public_Sans, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

// Tipografia do sistema "Quadra": Plus Jakarta Sans nos títulos (geométrica,
// contemporânea) e Public Sans na UI (desenhada para uso governamental).
// Substituiu a serifada Fraunces, que dava ao site ar de documento impresso.
const fonteTitulo = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-titulo-familia",
  display: "swap",
});
const publicSans = Public_Sans({
  subsets: ["latin"],
  variable: "--font-public-sans",
  display: "swap",
});
// Usadas só no PainelExecutivo (mockup em frame escuro).
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter-real",
  display: "swap",
});
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "CidadeIA — Sistema Operacional Inteligente para Gestão Municipal",
  description:
    "Plataforma de gestão pública com IA: dashboards por secretaria, alertas, análises e relatórios automáticos.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`h-full antialiased ${fonteTitulo.variable} ${publicSans.variable} ${inter.variable} ${jetbrainsMono.variable}`}
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
        <script
          dangerouslySetInnerHTML={{
            __html: `document.documentElement.classList.add("com-js")`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
