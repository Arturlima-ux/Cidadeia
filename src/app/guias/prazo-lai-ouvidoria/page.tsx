import Link from "next/link";
import GuiaArtigo from "@/components/site/GuiaArtigo";
import { guiaPor } from "@/lib/guias";
import { LEIS } from "@/lib/links-oficiais";
import { metadadosDoGuia } from "../metadados";

const SLUG = "prazo-lai-ouvidoria";
export const metadata = metadadosDoGuia(SLUG);

export default function GuiaPrazoLai() {
  const guia = guiaPor(SLUG)!;
  return (
    <GuiaArtigo
      guia={guia}
      fontes={[
        { rotulo: `${LEIS.lai.nome} (${LEIS.lai.numero}), arts. 10, 11 e 15`, href: LEIS.lai.url },
        { rotulo: `${LEIS.lei13460.nome} (${LEIS.lei13460.numero}), arts. 10 e 16`, href: LEIS.lei13460.url },
      ]}
    >
      <p>
        O cidadão chega à prefeitura por dois caminhos com prazos diferentes. O <strong>pedido de informação</strong>{" "}
        segue a Lei de Acesso à Informação (LAI). A <strong>manifestação na ouvidoria</strong> (reclamação, denúncia,
        sugestão, elogio) segue a Lei 13.460/2017. Os dois prazos correm sozinhos, com ou sem sistema.
      </p>

      <h2>Pedido de informação (LAI): 20 dias, mais 10</h2>
      <ul>
        <li>
          A regra é dar acesso <strong>imediato</strong>. Não sendo possível, a resposta sai em até{" "}
          <strong>20 dias</strong> (LAI, art. 11, § 1º).
        </li>
        <li>
          O prazo pode ser prorrogado por mais <strong>10 dias</strong>, com justificativa expressa comunicada a quem
          pediu (art. 11, § 2º).
        </li>
        <li>
          Negado o acesso, a pessoa pode recorrer em 10 dias, e a autoridade superior decide em 5 (art. 15).
        </li>
        <li>
          O pedido precisa identificar quem pede e o que se pede, mas a prefeitura não pode exigir o motivo (art. 10,
          § 3º).
        </li>
      </ul>

      <h2>Manifestação na ouvidoria (Lei 13.460): 30 dias, mais 30</h2>
      <ul>
        <li>
          A ouvidoria encaminha a decisão final em até <strong>30 dias</strong>, prorrogáveis uma única vez, de forma
          justificada, por igual período (Lei 13.460, art. 16).
        </li>
        <li>
          Dentro desse prazo, a ouvidoria pode pedir informações às secretarias, que respondem em 20 dias,
          prorrogáveis uma vez (art. 16, parágrafo único).
        </li>
        <li>
          A identificação de quem se manifesta é informação pessoal protegida (art. 10, § 7º): o nome não circula
          pela prefeitura junto com a reclamação.
        </li>
      </ul>

      <h2>Como contar</h2>
      <p>
        As duas leis falam em dias, sem dizer se são úteis. A contagem segue o regulamento do município; o Executivo
        federal conta em dias corridos. O mais seguro é registrar a data de entrada no protocolo e contar a partir
        dela, com a prorrogação decidida antes de o prazo acabar, nunca depois.
      </p>

      <h2>O que costuma dar errado</h2>
      <p>
        Ninguém perde prazo por decisão: perde porque o pedido ficou parado numa secretaria e ninguém sabia quantos
        dias faltavam. O módulo <Link href="/modulos/essencial">Essencial</Link> do CidadeIA dá número e chave de
        consulta a cada pedido, conta os 20 dias da LAI e os 30 da Lei 13.460 por manifestação e avisa cinco dias
        antes de vencer. A <Link href="/conformidade">página de conformidade</Link> mostra as demais exigências da
        LAI e da Lei 13.460 e o que o sistema entrega para cada uma.
      </p>
    </GuiaArtigo>
  );
}
