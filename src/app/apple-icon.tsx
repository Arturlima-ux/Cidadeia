import { iconeDaMarca } from "@/lib/og-imagem";

// Ícone da tela inicial no iPhone (180×180 é o tamanho que o iOS pede).
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function IconeApple() {
  return iconeDaMarca(180);
}
