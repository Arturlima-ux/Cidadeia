import Link from "next/link";
import GuiaArtigo from "@/components/site/GuiaArtigo";
import { guiaPor } from "@/lib/guias";
import { LEIS, SICONFI } from "@/lib/links-oficiais";
import { MINIMOS } from "@/lib/minimos-constitucionais";
import { metadadosDoGuia } from "../metadados";

const SLUG = "minimo-saude-educacao";
export const metadata = metadadosDoGuia(SLUG);

export default function GuiaMinimoSaudeEducacao() {
  const guia = guiaPor(SLUG)!;
  const saude = MINIMOS.saude.percentual;
  const educacao = MINIMOS.educacao.percentual;
  return (
    <GuiaArtigo
      guia={guia}
      fontes={[
        { rotulo: `${LEIS.constituicao.nome}, arts. 35, III, e 212`, href: LEIS.constituicao.url },
        { rotulo: `${LEIS.lc141.numero}, arts. 7º e 25`, href: LEIS.lc141.url },
        { rotulo: `${LEIS.lrf.nome} (${LEIS.lrf.numero}), art. 25, § 1º, IV, “b”`, href: LEIS.lrf.url },
        { rotulo: "SICONFI, Tesouro Nacional: o RREO de cada prefeitura", href: SICONFI },
      ]}
    >
      <p>
        O município tem dois pisos de gasto fixados fora da própria vontade: <strong>{saude}% em saúde</strong> e{" "}
        <strong>{educacao}% em educação</strong>. Os dois incidem sobre a mesma família de receita, a dos impostos e
        das transferências de impostos, e não sobre a receita total. É por isso que o percentual que aparece em
        qualquer relatório de &ldquo;quanto da receita foi para a saúde&rdquo; não serve para dizer se o mínimo foi
        cumprido.
      </p>

      <h2>Os dois mínimos</h2>
      <ul>
        <li>
          <strong>Saúde: {saude}%</strong> em ações e serviços públicos de saúde (LC 141/2012, art. 7º), sobre os
          impostos do próprio município (IPTU, ISS e ITBI) e as transferências dos arts. 158 e 159, I, &ldquo;b&rdquo;,
          e § 3º da Constituição: cota-parte do ICMS, do IPVA e do ITR, o imposto de renda retido pela prefeitura, o FPM
          e a cota do IPI-exportação.
        </li>
        <li>
          <strong>Educação: {educacao}%</strong> em manutenção e desenvolvimento do ensino (Constituição, art. 212),
          sobre a receita resultante de impostos, compreendida a proveniente de transferências.
        </li>
      </ul>
      <p>
        Nem todo gasto da secretaria entra na conta. Em educação, a Lei de Diretrizes e Bases separa o que é
        manutenção e desenvolvimento do ensino (arts. 70 e 71 da Lei 9.394/1996): merenda e assistência social ao
        aluno, por exemplo, ficam de fora. Em saúde, a LC 141 faz a mesma separação nos arts. 3º e 4º. Quem fecha o
        número oficial é o contador da prefeitura, com essas inclusões e exclusões.
      </p>

      <h2>Onde o número é apurado</h2>
      <p>
        No <strong>RREO</strong>, a cada bimestre: o Anexo 8 traz a educação e o Anexo 12 traz a saúde. A prefeitura
        também declara os dados ao SIOPE (educação) e ao SIOPS (saúde). O que conta para o Tribunal de Contas é a
        apuração do ano inteiro, mas o RREO do meio do ano já mostra para onde o exercício está indo (veja os{" "}
        <Link href="/guias/prazos-rreo-rgf">prazos do RREO e do RGF</Link>).
      </p>
      <p>
        Uma conta simples ajuda a não se enganar: se a base e o gasto crescem no mesmo ritmo, o percentual de junho é
        o de dezembro. Ficar abaixo do mínimo no meio do ano já é ficar abaixo no fim, a menos que o gasto acelere.
      </p>

      <h2>O que acontece abaixo do mínimo</h2>
      <ul>
        <li>
          <strong>Transferências voluntárias:</strong> para receber convênio, o município precisa comprovar que cumpriu
          os limites constitucionais de educação e saúde (LRF, art. 25, § 1º, IV, &ldquo;b&rdquo;).
        </li>
        <li>
          <strong>Diferença no ano seguinte (saúde):</strong> o que faltou tem de ser acrescido ao mínimo do exercício
          seguinte, sem prejuízo das sanções (LC 141, art. 25).
        </li>
        <li>
          <strong>Intervenção:</strong> a Constituição admite intervenção do estado no município que não aplicar o
          mínimo em ensino e em saúde (art. 35, III).
        </li>
        <li>
          <strong>Contas do prefeito:</strong> o descumprimento costuma levar o Tribunal de Contas a recomendar a
          rejeição das contas, e a rejeição por irregularidade insanável pode gerar inelegibilidade (LC 64/1990, art.
          1º, I, &ldquo;g&rdquo;).
        </li>
      </ul>
      <p>
        Dentro da educação há ainda um terceiro piso, o dos{" "}
        <Link href="/guias/fundeb-70-por-cento">70% do Fundeb para os profissionais da educação</Link>, que pode
        falhar mesmo com os {educacao}% cumpridos.
      </p>

      <h2>Acompanhar durante o ano</h2>
      <p>
        O <Link href="/raio-x">Raio-X</Link> mostra o que a prefeitura declarou ao Tesouro em saúde e educação e se o
        RREO foi entregue. No sistema, o módulo <Link href="/modulos/gestao">Gestão</Link> acompanha os dois mínimos
        com a base informada pelo contador: quanto falta aplicar para fechar o ano e quantas vezes o ritmo mensal
        precisa subir para chegar lá. É acompanhamento, não o demonstrativo oficial, que continua sendo do contador.
      </p>
    </GuiaArtigo>
  );
}
