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
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
