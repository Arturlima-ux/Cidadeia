import Link from "next/link";
import GuiaArtigo from "@/components/site/GuiaArtigo";
import { guiaPor } from "@/lib/guias";
import { LEIS } from "@/lib/links-oficiais";
import { AVISO_FRACIONAMENTO, LIMITE_DISPENSA } from "@/lib/contratacao";
import { formatarMoedaExata } from "@/lib/formatadores";
import { metadadosDoGuia } from "../metadados";

const SLUG = "dispensa-de-licitacao-software";
export const metadata = metadadosDoGuia(SLUG);

export default function GuiaDispensa() {
  const guia = guiaPor(SLUG)!;
  return (
    <GuiaArtigo
      guia={guia}
      fontes={[
        { rotulo: `${LEIS.lei14133.nome} (${LEIS.lei14133.numero}), arts. 72 e 75`, href: LEIS.lei14133.url },
      ]}
    >
      <p>
        A Lei 14.133/2021 permite contratar serviços sem licitação quando o valor é pequeno: é a{" "}
        <strong>dispensa por valor</strong> do art. 75, II. Software de gestão contratado como serviço entra nessa
        regra, com três cuidados que o jurídico da prefeitura sempre confere.
      </p>

      <h2>1. O limite do ano</h2>
      <p>
        Para {LIMITE_DISPENSA.ano}, o limite do art. 75, II, é de{" "}
        <strong>{formatarMoedaExata(LIMITE_DISPENSA.valor)}</strong>, valor atualizado pelo{" "}
        {LIMITE_DISPENSA.atualizadoPor} e vigente desde {LIMITE_DISPENSA.vigenteDesde}. O valor é reajustado todo
        ano por decreto: confirme o vigente com a assessoria jurídica antes de instruir o processo.
      </p>

      <h2>2. A soma, não o contrato</h2>
      <p>
        {AVISO_FRACIONAMENTO.completo} ({AVISO_FRACIONAMENTO.base}). É aqui que mora o fracionamento: dividir a mesma
        necessidade em contratos menores para caber no limite é vedado, e o Tribunal de Contas olha a soma do
        exercício por unidade gestora.
      </p>

      <h2>3. O aviso e o processo</h2>
      <ul>
        <li>
          A dispensa por valor é feita, de preferência, com <strong>aviso publicado por 3 dias úteis</strong> no site
          oficial, para receber outras propostas, e a prefeitura escolhe a mais vantajosa (art. 75, § 3º).
        </li>
        <li>
          O processo de contratação direta precisa ter, entre outros documentos, o documento de formalização da
          demanda, a estimativa de despesa, o parecer jurídico quando cabível, a demonstração da dotação orçamentária,
          a razão da escolha do contratado e a justificativa de preço (art. 72).
        </li>
        <li>O ato que autoriza a contratação direta é publicado em site oficial (art. 72, parágrafo único).</li>
      </ul>

      <h2>Quando não cabe</h2>
      <p>
        Acima do limite, o caminho é o pregão eletrônico, ou a adesão a uma ata de registro de preços vigente de
        outro órgão. A página <Link href="/como-contratar">Como contratar</Link> compara os três caminhos com a base
        legal de cada um, e o <Link href="/kit">Kit de contratação</Link> traz o termo de referência e a minuta de
        contrato prontos para o jurídico conferir.
      </p>
    </GuiaArtigo>
  );
}
