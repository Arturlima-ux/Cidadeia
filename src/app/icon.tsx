import { iconeDaMarca } from "@/lib/og-imagem";

// Ícone de aba e logo quadrado do schema (ver lib/og-imagem.tsx).
export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icone() {
  return iconeDaMarca(512);
}
