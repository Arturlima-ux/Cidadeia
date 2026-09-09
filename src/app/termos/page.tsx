import PaginaLegal from "@/components/site/PaginaLegal";
import { TERMOS_DE_USO } from "@/lib/documentos-legais";

export const metadata = {
  title: "Termos de uso — CidadeIA",
  description:
    "O que o CidadeIA é, o que ele não é, e as regras de uso do sistema e do site.",
};

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
