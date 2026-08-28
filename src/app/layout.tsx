import type { Metadata } from "next";
import { Fraunces, Public_Sans, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

// Tipografia do sistema "Brasília Cívica": Fraunces nos títulos (serifada,
// peso escultural) e Public Sans na UI (desenhada para uso governamental).
const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
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
      className={`h-full antialiased ${fraunces.variable} ${publicSans.variable} ${inter.variable} ${jetbrainsMono.variable}`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
