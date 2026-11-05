import PorteDaTabela from "@/components/site/nova/PorteDaTabela";
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import "./nova.css";
import SiteHeader from "@/components/site/SiteHeader";
import SiteFooter from "@/components/site/SiteFooter";
import BrasilRelevo from "@/components/site/inicio/BrasilRelevo";
import { ESTILO_TOPO3D } from "@/components/site/inicio/TopoBrasil";
import VideoExplicativo from "@/components/site/VideoExplicativo";
import MontadorDaEdicao from "@/components/site/nova/MontadorDaEdicao";
import BuscaDaEdicao from "@/components/site/nova/BuscaDaEdicao";
import EdicaoDeHoje from "@/components/site/nova/EdicaoDeHoje";
import AoChegar from "@/components/site/nova/AoChegar";
import { edicaoDoBrasil } from "@/lib/boletim-da-cidade";
import { hojeEmBrasilia } from "@/lib/cobranca";
import { LIMITE_DISPENSA } from "@/lib/contratacao";
import { PRECO_MENSAL, PORTES, type PorteMunicipio } from "@/lib/precos";
import { PLANOS_ADDON } from "@/lib/planos";
import { modulosNaOrdemDaHome } from "@/lib/modulos-detalhe";

// ── A LANDING NOVA, EM PRÉVIA (novembro de 2026) ──
//
// Pedido do fundador: uma landing fora do padrão de agora, sofisticada, com o
// mapa em relevo, o vídeo e a proposta, e um motivo para a pessoa voltar todo
// dia. A direção é a de um relatório impresso (taste-skill, "The printed
// annual"): um eixo vertical a 42% da largura, títulos grandes, páginas
// inteiras de cor, nada de cartões em fileira. A ideia: a edição do dia de
// cada prefeitura (EdicaoDeHoje.tsx), que a página lembra e abre na cidade
// da pessoa amanhã.
//
// Fica em /nova, fora do índice de busca, até o fundador aprovar. A home de
// hoje não muda. O estilo é só desta página (nova.css): o CSS global está no
// limite em que o Turbopack divide a folha (CLAUDE.md, armadilhas).

export const metadata: Metadata = {
  title: "CidadeIA: a prefeitura em dia, todo dia",
  description: "A edição de cada dia da sua prefeitura: os prazos da LRF, a despesa com pessoal e o que o Tesouro Nacional publicou.",
  robots: { index: false, follow: false },
};

const PORTES_COM_PRECO: PorteMunicipio[] = ["ate10k", "de10a50k", "de50a100k"];

// Três termos por módulo: o que a secretaria reconhece no nome.
const TERMOS: Record<string, string[]> = {
  essencial: ["Lei de Acesso à Informação", "Lei 13.460", "Carta de Serviços"],
  gestao: ["RREO e RGF", "mínimos de 25% e 15%", "despesa com pessoal"],
  saude: ["CNES", "estoque das unidades", "Atenção Primária"],
  educacao: ["Censo Escolar", "dias letivos", "Fundeb"],
  obras: ["contratos", "medição", "Transferegov"],
  licitacoes: ["PNCP", "contratos", "plano de contratações"],
};

const inteiro = (n: number) => n.toLocaleString("pt-BR");
const reais = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

export default function LandingNova() {
  const hoje = hojeEmBrasilia();
  const brasil = edicaoDoBrasil(hoje);
  const modulos = modulosNaOrdemDaHome();
  const gestaoAno = (PRECO_MENSAL.gestao.ate10k ?? 0) * 12;
  const totalAno = (porte: PorteMunicipio) => PLANOS_ADDON.reduce((s, p) => s + (PRECO_MENSAL[p.chave][porte] ?? 0), 0) * 12;
  const nomePorte = (p: PorteMunicipio) => PORTES.find((x) => x.chave === p)!.rotulo;

  return (
    <div className="tema-noite nova">
      <style href="cidadeia-topo3d" precedence="medium">{ESTILO_TOPO3D}</style>
      <SiteHeader />
      <AoChegar />
      <main id="conteudo">
        {/* ═══ O MASTRO: o Brasil em relevo e o título ═══ */}
        <section className="nv-mastro" aria-labelledby="nv-titulo">
          <div className="nv-mastro-mapa">
            <BrasilRelevo pilula={false} edicao />
          </div>
          <div className="nv-mastro-texto">
            <h1 id="nv-titulo" className="nv-h1">
              A prefeitura em dia,
              <br />
              todo dia.
            </h1>
            <p className="nv-lead">
              O CidadeIA lê o que a sua prefeitura publica no Tesouro Nacional, confere com a Lei de Responsabilidade Fiscal e avisa antes de cada
              prazo.
            </p>
            <div className="nv-busca">
              <label htmlFor="cidade-da-edicao" className="nv-busca-rotulo">
                Abra a edição de hoje da sua cidade
              </label>
              <BuscaDaEdicao />
            </div>
          </div>
          <div className="nv-cartoes">
            <a className="nv-cartao" href="#video">
              <Image src="/video/cidadeia-gestao-capa.jpg" alt="Cena do vídeo do CidadeIA: a visão do prefeito" width={428} height={285} sizes="214px" />
              <span>
                Vídeo de 30 segundos <i aria-hidden>→</i>
              </span>
            </a>
            <a className="nv-cartao" href="#proposta">
              <div className="nv-cartao-ui" data-ui aria-hidden>
                <p>Exemplo · cidade de 10 a 50 mil habitantes</p>
                <p>
                  Gestão <b>{reais(PRECO_MENSAL.gestao.de10a50k ?? 0)}</b>
                </p>
                <p>
                  Essencial <b>{reais(PRECO_MENSAL.essencial.de10a50k ?? 0)}</b>
                </p>
                <p className="nv-cartao-total">
                  por mês <b>{reais((PRECO_MENSAL.gestao.de10a50k ?? 0) + (PRECO_MENSAL.essencial.de10a50k ?? 0))}</b>
                </p>
              </div>
              <span>
                Proposta em um dia útil <i aria-hidden>→</i>
              </span>
            </a>
          </div>
        </section>

        {/* ═══ A EDIÇÃO DE HOJE: a coisa viva da página ═══ */}
        <section id="edicao" className="nv-secao nv-margem scroll-mt-16" aria-label="A edição de hoje" data-surge>
          <EdicaoDeHoje brasil={brasil} />
        </section>

        {/* ═══ CABE NA DISPENSA: dois números, lado a lado ═══ */}
        <section className="nv-dispensa" aria-labelledby="nv-dispensa">
          <div className="nv-margem nv-dispensa-cab" data-surge>
            <h2 id="nv-dispensa" className="nv-h3">
              Cabe na dispensa.
            </h2>
            <p>
              A Lei 14.133 permite contratar sem licitação até {reais(Math.floor(LIMITE_DISPENSA.valor))} por ano em serviços como este (art. 75, II). O módulo
              Gestão, numa cidade de até 10 mil habitantes, custa {reais(gestaoAno)} no ano. Pode caber: depende do que a prefeitura já contratou no ano, e o kit
              de contratação mostra como conferir.
            </p>
          </div>
          <div className="nv-dispensa-numeros nv-margem" aria-hidden>
            <figure>
              <figcaption>Limite da dispensa por valor em {LIMITE_DISPENSA.ano}, em reais</figcaption>
              <span>{inteiro(Math.floor(LIMITE_DISPENSA.valor))}</span>
            </figure>
            <figure>
              <figcaption>O Gestão por um ano, cidade de até 10 mil habitantes, em reais</figcaption>
              <span>{inteiro(gestaoAno)}</span>
            </figure>
          </div>
        </section>

        {/* ═══ COMO A EDIÇÃO É FEITA: uma coluna de leitura ═══ */}
        <section className="nv-secao nv-margem" aria-labelledby="nv-como">
          <div className="nv-coluna">
            <h2 id="nv-como" className="nv-h3" data-surge>
              Como a edição é feita
            </h2>
            <div className="nv-passo" data-surge>
              <p>
                <b>Todo dia,</b> o sistema confere no Tesouro Nacional se o RREO e o RGF da prefeitura já foram entregues, comum ou simplificado.
              </p>
              <div className="nv-prova" data-ui aria-hidden>
                <span>RREO · 5º bimestre de 2026</span>
                <span>aguardando entrega</span>
                <span>prazo 30 de novembro</span>
              </div>
            </div>
            <div className="nv-passo" data-surge>
              <p>
                <b>Toda segunda e quinta,</b> relê o RGF de todas as prefeituras do país e refaz a conta da despesa com pessoal contra os limites de 48,6%,
                51,3% e 54% da receita corrente líquida.
              </p>
              <div className="nv-prova nv-prova-regua" data-ui aria-hidden>
                <i style={{ width: "64.8%" }} />
                <span>45,3%</span>
              </div>
            </div>
            <div className="nv-passo" data-surge>
              <p>
                <b>Quinze dias antes do prazo,</b> o prefeito recebe um e-mail com o que falta entregar. No dia em que atrasar, recebe outro.
              </p>
              <div className="nv-prova nv-prova-email" data-ui aria-hidden>
                <span>Para: gabinete do prefeito</span>
                <b>RREO do 5º bimestre vence em 15 dias</b>
                <span>Ainda não aparece no Tesouro Nacional. Prazo: 30 de novembro.</span>
              </div>
            </div>
            <div className="nv-passo" data-surge>
              <p>
                <b>Quando a entrega aparece no Tesouro,</b> o alerta some sozinho. Ninguém precisa dar baixa em nada.
              </p>
            </div>
          </div>
        </section>

        {/* ═══ O VÍDEO: uma página inteira de cor ═══ */}
        <section id="video" className="nv-video" aria-labelledby="nv-video-titulo">
          <div className="nv-margem nv-video-dentro">
            <h2 id="nv-video-titulo" className="nv-h2" data-surge>
              O CidadeIA em 30 segundos.
            </h2>
            <div className="nv-video-quadro" data-surge>
              <VideoExplicativo
                src="/video/cidadeia-gestao.mp4"
                srcWebm="/video/cidadeia-gestao.webm"
                capa="/video/cidadeia-gestao-capa.jpg"
                titulo="O CidadeIA em 30 segundos: a gestão municipal inteira num lugar só, do gabinete ao celular do morador."
              />
            </div>
          </div>
        </section>

        {/* ═══ OS MÓDULOS: a célula clara e as linhas escuras ═══ */}
        <section className="nv-modulos" aria-labelledby="nv-modulos">
          <div className="nv-modulos-claro">
            <h2 id="nv-modulos" className="nv-zigue" data-surge>
              <span>Um módulo</span>
              <span>para cada</span>
              <span>secretaria.</span>
            </h2>
            <div className="nv-modulos-pe">
              <p>A prefeitura contrata só o que usa. Cada módulo funciona sozinho e lê a base oficial da sua área.</p>
              <a className="nv-botao nv-botao-escuro" href="#proposta">
                Montar a proposta
              </a>
            </div>
          </div>
          <ol className="nv-modulos-linhas">
            {modulos.map((m) => (
              <li key={m.chave} data-surge>
                <h3>
                  <Link href={`/modulos/${m.chave}`}>{m.nome}</Link>
                </h3>
                <p>{m.detalhe.resumo}</p>
                <p className="nv-termos">{(TERMOS[m.chave] ?? []).join(", ")}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* ═══ O PREÇO: uma tabela grande ═══ */}
        <section className="nv-secao nv-margem" aria-labelledby="nv-precos">
          <PorteDaTabela />
          <div className="nv-tabela-rolagem" data-surge>
            <table className="nv-precos" data-tabela-precos data-ver="ate10k">
              <caption className="sr-only">Preço por mês de cada módulo, por número de habitantes da cidade</caption>
              <thead>
                <tr>
                  <th scope="col">
                    <h2 id="nv-precos" className="nv-h3">
                      Preço por mês
                    </h2>
                  </th>
                  {PORTES_COM_PRECO.map((p) => (
                    <th key={p} scope="col" data-col={p}>
                      <span className="nv-porte">{nomePorte(p)}</span>
                      <span className="nv-porte-det">habitantes</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {modulos.map((m) => (
                  <tr key={m.chave}>
                    <th scope="row">{m.nome}</th>
                    {PORTES_COM_PRECO.map((p) => (
                      <td key={p} data-col={p}>
                        {reais(PRECO_MENSAL[m.chave][p] ?? 0)}
                      </td>
                    ))}
                  </tr>
                ))}
                <tr className="nv-total">
                  <th scope="row">Os seis, por ano</th>
                  {PORTES_COM_PRECO.map((p) => (
                    <td key={p} data-col={p}>
                      {reais(totalAno(p))}
                    </td>
                  ))}
                </tr>
                <tr>
                  <th scope="row">Abaixo do limite da dispensa</th>
                  {PORTES_COM_PRECO.map((p) => (
                    <td key={p} data-col={p}>
                      Sim, com {reais(Math.floor(LIMITE_DISPENSA.valor) - totalAno(p))} de folga
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
          <p className="nv-nota">
            Acima de 100 mil habitantes, o preço é sob consulta. A folga é sobre o limite de {reais(Math.floor(LIMITE_DISPENSA.valor))}; o que a prefeitura já
            contratou no ano em serviço parecido entra na mesma soma.
          </p>
        </section>

        {/* ═══ A PROPOSTA: o montador ═══ */}
        <section id="proposta" className="nv-secao nv-margem nv-proposta" aria-labelledby="nv-proposta">
          <div className="nv-eixo">
            <div className="nv-notas">
              <p>Valor, termo de referência e minuta de contrato chegam no mesmo e-mail, sem reunião antes.</p>
              <p>
                <Link href="/kit" className="nv-link">
                  Baixar o kit de contratação
                </Link>
              </p>
            </div>
            <div>
              <h2 id="nv-proposta" className="nv-h2" data-surge>
                Proposta pronta em um dia útil.
              </h2>
            </div>
          </div>
          <div className="nv-montador" data-surge>
            <MontadorDaEdicao />
          </div>
        </section>

        {/* ═══ O FECHO: a ideia de novo, invertida ═══ */}
        <section className="nv-fecho" aria-labelledby="nv-fecho">
          <div className="nv-margem nv-fecho-dentro">
            <h2 id="nv-fecho" className="nv-fecho-titulo" data-surge>
              Amanhã, a edição
              <br />
              abre na sua cidade.
            </h2>
            <div className="nv-fecho-pe">
              <p>Escolha a cidade uma vez. Cada dia, esta página abre nela, com o próximo prazo e o número que o Tesouro publicou.</p>
              <a className="nv-botao" href="#nv-titulo">
                Escolher a minha cidade
              </a>
            </div>
          </div>
        </section>

        <div className="nv-marca nv-margem" aria-hidden>
          <svg viewBox="0 0 640 112" role="presentation">
            <text x="0" y="98" textLength="636" lengthAdjust="spacingAndGlyphs">
              cidadeia
            </text>
          </svg>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
