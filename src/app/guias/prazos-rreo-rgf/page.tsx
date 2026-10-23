import Link from "next/link";
import GuiaArtigo from "@/components/site/GuiaArtigo";
import { guiaPor } from "@/lib/guias";
import { LEIS, SICONFI } from "@/lib/links-oficiais";
import { periodosDoExercicio, type PeriodoObrigacao } from "@/lib/obrigacoes-fiscais";
import { hojeEmBrasilia } from "@/lib/cobranca";
import { metadadosDoGuia } from "../metadados";

const SLUG = "prazos-rreo-rgf";
export const metadata = metadadosDoGuia(SLUG);
// O calendário é do ano corrente: refeito uma vez por dia.
export const revalidate = 86400;

const DATA = new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
const d = (iso: string) => DATA.format(new Date(`${iso}T00:00:00Z`));

function Tabela({ linhas }: { linhas: PeriodoObrigacao[] }) {
  return (
    <div className="guia-tabela">
      <table>
        <thead>
          <tr>
            <th scope="col">Período</th>
            <th scope="col">Termina em</th>
            <th scope="col">Publicar até</th>
          </tr>
        </thead>
        <tbody>
          {linhas.map((p) => (
            <tr key={p.rotulo}>
              <td>{p.rotulo}</td>
              <td>{d(p.fimDoPeriodo)}</td>
              <td>{d(p.vencimento)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function GuiaPrazos() {
  const guia = guiaPor(SLUG)!;
  const ano = Number(hojeEmBrasilia().slice(0, 4));
  const de = (chave: string, semestral = false) =>
    periodosDoExercicio(ano, semestral ? { periodicidadeRgf: "semestral" } : {}).filter((p) => p.obrigacao.chave === chave);

  return (
    <GuiaArtigo
      guia={guia}
      fontes={[
        { rotulo: `${LEIS.lrf.nome} (${LEIS.lrf.numero}), arts. 52, 53, 54, 55 e 63`, href: LEIS.lrf.url },
        { rotulo: "SICONFI, Tesouro Nacional: onde o RREO e o RGF são entregues e consultados", href: SICONFI },
      ]}
    >
      <p>
        A Lei de Responsabilidade Fiscal manda a prefeitura publicar dois relatórios ao longo do ano: o{" "}
        <strong>Relatório Resumido da Execução Orçamentária (RREO)</strong>, a cada bimestre, e o{" "}
        <strong>Relatório de Gestão Fiscal (RGF)</strong>, a cada quadrimestre. Os dois vencem{" "}
        <strong>30 dias depois do fim do período</strong> (LRF, arts. 52 e 55, § 2º) e são entregues no SICONFI, do
        Tesouro Nacional, onde ficam abertos para qualquer pessoa consultar.
      </p>

      <h2>RREO: seis entregas por ano</h2>
      <p>O RREO cobre dois meses de execução do orçamento. Em {ano}, as datas são estas:</p>
      <Tabela linhas={de("rreo")} />

      <h2>RGF: três entregas, ou duas para quem optou</h2>
      <p>
        O RGF é assinado pelo prefeito e traz, entre outros números, a despesa com pessoal comparada aos limites da
        lei (veja o guia sobre{" "}
        <Link href="/guias/despesa-com-pessoal-lrf">despesa com pessoal na LRF</Link>). A regra geral é quadrimestral:
      </p>
      <Tabela linhas={de("rgf")} />
      <p>
        Município com <strong>menos de 50 mil habitantes</strong> pode optar por divulgar o RGF a cada semestre (LRF,
        art. 63, II, &ldquo;b&rdquo;). A opção é do município e precisa ter sido feita; não vale por padrão. Para quem
        optou:
      </p>
      <Tabela linhas={de("rgf", true)} />

      <h2>O que acontece quando atrasa</h2>
      <p>
        Enquanto o relatório não é publicado, o município fica impedido de receber transferências voluntárias e de
        contratar operações de crédito, salvo as destinadas ao refinanciamento da dívida mobiliária (LRF, art. 51, §
        2º, aplicado ao RREO pelo art. 52, § 2º, e ao RGF pelo art. 55, § 3º). O Tribunal de Contas também aponta o
        atraso como falha de transparência.
      </p>

      <h2>Como conferir se a sua prefeitura entregou</h2>
      <p>
        O Tesouro registra cada entrega no SICONFI. O{" "}
        <Link href="/raio-x">Raio-X do CidadeIA</Link> lê esse registro e mostra, para qualquer município, quantos
        relatórios com prazo vencido já constam como publicados, sem cadastro. Dentro do sistema, o módulo{" "}
        <Link href="/modulos/gestao">Gestão</Link> confere todo dia e avisa 15 dias antes do vencimento e no dia em
        que atrasar.
      </p>
    </GuiaArtigo>
  );
}
