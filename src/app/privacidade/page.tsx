import PaginaLegal from "@/components/site/PaginaLegal";
import { POLITICA_PRIVACIDADE } from "@/lib/documentos-legais";

export const metadata = {
  title: "Política de privacidade — CidadeIA",
  description:
    "O que o CidadeIA coleta, com que base legal, com quem compartilha e por quanto tempo guarda.",
};

export default function PrivacidadePage() {
  return (
    <PaginaLegal
      titulo="Política de privacidade"
      chamada="Curta porque o produto coleta pouco. Cada afirmação aqui corresponde a algo que dá para conferir no sistema — não é modelo genérico descrevendo rastreadores que não existem."
      secoes={POLITICA_PRIVACIDADE}
      outroDocumento={{ href: "/termos", rotulo: "Termos de uso" }}
    />
  );
}
