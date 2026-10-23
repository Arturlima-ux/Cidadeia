import Link from "next/link";
import GuiaArtigo from "@/components/site/GuiaArtigo";
import { guiaPor } from "@/lib/guias";
import { LEIS, SICONFI } from "@/lib/links-oficiais";
import { LIMITE_ALERTA, LIMITE_PESSOAL, LIMITE_PRUDENCIAL } from "@/lib/despesa-pessoal";
import { PANORAMA, dataDoPanorama, numeroBr, passaramDoAlerta } from "@/lib/panorama";
import { metadadosDoGuia } from "../metadados";

const SLUG = "despesa-com-pessoal-lrf";
export const metadata = metadadosDoGuia(SLUG);

const pct = (v: number) => `${v.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;

export default function GuiaDespesaComPessoal() {
  const guia = guiaPor(SLUG)!;
  const b = PANORAMA.brasil;
  return (
    <GuiaArtigo
      guia={guia}
      fontes={[
        { rotulo: `${LEIS.lrf.nome} (${LEIS.lrf.numero}), arts. 18 a 23 e 59`, href: LEIS.lrf.url },
        { rotulo: "SICONFI, Tesouro Nacional: o RGF de cada prefeitura, Anexo 1", href: SICONFI },
      ]}
    >
      <p>
        A Lei de Responsabilidade Fiscal limita quanto o município gasta com pessoal em relação ao que arrecada. Para
        o <strong>Poder Executivo municipal</strong>, o teto é de <strong>{pct(LIMITE_PESSOAL)} da receita corrente
        líquida</strong> (LRF, art. 20, III, &ldquo;b&rdquo;); somado aos 6% da Câmara, o município inteiro fica em
        60% (art. 19, III). Antes do teto há dois sinais: o alerta e o limite prudencial.
      </p>

      <h2>Os três patamares</h2>
      <div className="guia-tabela">
        <table>
          <thead>
            <tr>
              <th scope="col">Patamar</th>
              <th scope="col">Executivo municipal</th>
              <th scope="col">O que acontece</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Alerta (90% do limite)</td>
              <td>{pct(LIMITE_ALERTA)}</td>
              <td>O Tribunal de Contas alerta o município (art. 59, § 1º, II).</td>
            </tr>
            <tr>
              <td>Prudencial (95% do limite)</td>
              <td>{pct(LIMITE_PRUDENCIAL)}</td>
              <td>
                Ficam vedados aumento, reajuste ou vantagem (salvo os vindos de sentença, lei ou contrato e a revisão
                geral anual), criação de cargo, mudança de carreira que aumente despesa, nomeação ou contratação (salvo
                a reposição de aposentadoria ou falecimento em educação, saúde e segurança) e hora extra (art. 22,
                parágrafo único).
              </td>
            </tr>
            <tr>
              <td>Limite máximo</td>
              <td>{pct(LIMITE_PESSOAL)}</td>
              <td>
                O excedente tem de ser eliminado nos dois quadrimestres seguintes, pelo menos um terço no primeiro (art.
                23). Se não reduzir no prazo, e enquanto o excesso durar, o município não recebe transferências
                voluntárias, não obtém garantia e não contrata operações de crédito (art. 23, § 3º).
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2>Como o percentual é calculado</h2>
      <p>
        É a <strong>despesa total com pessoal dos últimos doze meses</strong> (o mês de referência e os onze
        anteriores) dividida pela <strong>receita corrente líquida</strong> do mesmo período (LRF, art. 18, § 2º, e
        art. 2º, § 3º). Entram ativos, inativos e pensionistas, encargos e as contribuições da prefeitura à
        previdência (art. 18). O demonstrativo usa a receita corrente líquida <strong>ajustada</strong>, que tira da
        base algumas transferências que a lei manda excluir.
      </p>
      <p>
        O número oficial é o que a prefeitura declara no <strong>Anexo 1 do RGF</strong>, entregue ao Tesouro a cada
        quadrimestre (ou semestre, para quem optou; veja os{" "}
        <Link href="/guias/prazos-rreo-rgf">prazos do RREO e do RGF</Link>).
      </p>

      <h2>Quantas prefeituras já passaram do alerta</h2>
      <p>
        Na conferência de {dataDoPanorama()}, <strong>{numeroBr(passaramDoAlerta(b))}</strong> das{" "}
        {numeroBr(b.comNumero)} prefeituras com RGF publicado estavam acima de {pct(LIMITE_ALERTA)}. O{" "}
        <Link href="/panorama">Panorama da despesa com pessoal</Link> mostra a conta por estado, refeita toda semana.
      </p>

      <h2>Ver o número da sua prefeitura</h2>
      <p>
        O <Link href="/raio-x">Raio-X</Link> mostra o percentual que a prefeitura declarou no último RGF, na régua dos
        três patamares, e quanto ainda cabe em reais até o prudencial. Dentro do sistema, o módulo{" "}
        <Link href="/modulos/gestao">Gestão</Link> acompanha cada relatório e avisa quando os números do RGF não
        fecham com a receita.
      </p>
    </GuiaArtigo>
  );
}
