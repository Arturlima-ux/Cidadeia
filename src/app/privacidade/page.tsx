import { compartilhamento } from "@/lib/seo";
import PaginaLegal from "@/components/site/PaginaLegal";
import { politicaDePrivacidade } from "@/lib/documentos-legais";

export const metadata = compartilhamento({
  titulo: "Política de privacidade",
  descricao:
    "O que o CidadeIA coleta, com que base legal, com quem compartilha, onde fica e por quanto tempo guarda.",
  caminho: "/privacidade",
});

export default function PrivacidadePage() {
  return (
    <PaginaLegal
      titulo="Política de privacidade"
      chamada="Cada afirmação aqui corresponde a algo que dá para conferir no sistema: o que é coletado, por quê, com quem é compartilhado e por quanto tempo."
      secoes={politicaDePrivacidade()}
      outroDocumento={{ href: "/termos", rotulo: "Termos de uso" }}
    />
  );
}
