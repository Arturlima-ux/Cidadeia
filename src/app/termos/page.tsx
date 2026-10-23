import { compartilhamento } from "@/lib/seo";
import PaginaLegal from "@/components/site/PaginaLegal";
import { TERMOS_DE_USO } from "@/lib/documentos-legais";

export const metadata = compartilhamento({
  titulo: "Termos de uso",
  descricao:
    "O que o CidadeIA é e não é, as regras da conta, da contratação e do encerramento.",
  caminho: "/termos",
});

export default function TermosPage() {
  return (
    <PaginaLegal
      titulo="Termos de uso"
      chamada="Inclui a parte que costuma faltar: o que o sistema NÃO é. Os cálculos de mínimos, teto de pessoal e prazos são acompanhamento — o número oficial é sempre o do demonstrativo que o contador publica."
      secoes={TERMOS_DE_USO}
      outroDocumento={{ href: "/privacidade", rotulo: "Política de privacidade" }}
    />
  );
}
