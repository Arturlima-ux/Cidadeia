"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { PLANOS_ADDON, type PlanoAddon } from "@/lib/planos";
import { PORTES, type PorteMunicipio } from "@/lib/precos";
import { IconCheck } from "@/components/icons";
import AcheSuaCidade from "@/components/morador/AcheSuaCidade";
import { sugerirPorte } from "@/app/solucoes/actions";

// Cada linha diz o mesmo que a página do módulo (lib/modulos-detalhe.ts),
// em poucas palavras. Educação dizia "notas e frequência" e Licitações
// "processos e riscos", que nenhuma das duas páginas promete (revisão de
// outubro de 2026).
const RESUMO_MODULO: Record<PlanoAddon, string> = {
  essencial: "Portal do cidadão, protocolo e ouvidoria",
  gestao: "Visão do prefeito e prazos da LRF",
  saude: "Rede do CNES, unidades e estoque",
  educacao: "Rede do INEP, dias letivos e busca ativa",
  obras: "Contratos, medição e obras federais",
  licitacoes: "Compras e contratos do PNCP",
};

export default function MontadorProposta({
  modulosIniciais = ["essencial", "gestao"],
  municipioInicial,
  campoNoTopo = false,
}: {
  /** Vindo da página de um módulo ("Adicionar à minha proposta"). */
  modulosIniciais?: PlanoAddon[];
  /** O município que a pessoa já escolheu no topo da home: não se pergunta
   *  de novo (revisão de outubro de 2026). */
  municipioInicial?: { nome: string; uf: string };
  /** Na home, o município se escolhe só no campo do topo: um campo por
   *  página. Aqui fica o nome escolhido, ou o caminho até o campo. */
  campoNoTopo?: boolean;
}) {
  // ── O PORTE NÃO É ESCOLHA ──
  // Era um botão com três faixas e "Município (opcional)" ao lado. Quem
  // quisesse o preço de cidade de 10 mil habitantes para uma capital
  // clicava. Agora não existe botão: o município é obrigatório, o porte é
  // o que a tabela do IBGE diz, e o preço só aparece depois disso.
  const [porte, setPorte] = useState<PorteMunicipio | null>(null);
  const [modulos, setModulos] = useState<PlanoAddon[]>(modulosIniciais);

  const identificado = porte !== null;

  // ── Porte pelo município, em vez de cabeça ──
  // "Até 10 mil / 10 a 50 mil / acima" exigia saber a população. O IBGE
  // sabe: nome + UF → estimativa do ano → faixa. A escolha manual continua
  // logo abaixo, para quem prefere ou para quando o IBGE não responde.
  const [municipio, setMunicipio] = useState(municipioInicial?.nome ?? "");
  const [achado, setAchado] = useState<string | null>(null);
  // Código IBGE do município identificado. Enquanto existir, o porte é o
  // do IBGE e os botões ficam travados: a tela marcava "acima de 50 mil" e
  // deixava a pessoa clicar em "0 a 10 mil" logo abaixo — simulava o preço
  // de cidade pequena para uma capital. Para simular outra faixa, limpa o
  // município. E o pedido de proposta leva o CÓDIGO, não a faixa: o
  // servidor pergunta ao IBGE de novo.
  const [codigoIbge, setCodigoIbge] = useState<string | null>(null);
  const [erroPorte, setErroPorte] = useState<string | null>(null);
  const [consultando, consultar] = useTransition();

  // Muda a cada "Trocar município", para o campo de busca voltar vazio.
  const [rodada, setRodada] = useState(0);
  function limparMunicipio() {
    setRodada((r) => r + 1);
    setMunicipio("");
    setCodigoIbge(null);
    setAchado(null);
    setErroPorte(null);
    setPorte(null);
  }

  function buscarPorte(nome: string, sigla: string) {
    consultar(async () => {
      const r = await sugerirPorte({ municipio: nome, uf: sigla });
      if (!r.ok) {
        setErroPorte(r.erro);
        return;
      }
      setPorte(r.porte);
      setCodigoIbge(r.codigoIbge);
      setAchado(
        `${r.municipio}/${r.uf}: ${new Intl.NumberFormat("pt-BR").format(r.populacao)} habitantes (IBGE).`
      );
    });
  }

  function escolherMunicipio(nome: string, sigla: string) {
    setMunicipio(nome);
    setErroPorte(null);
    setAchado(null);
    setCodigoIbge(null);
    buscarPorte(nome, sigla);
  }

  // Com o município vindo do topo da página, a faixa é buscada uma vez, ao
  // abrir: o estado já nasceu com o nome, só falta a população do IBGE.
  const jaBuscou = useRef(false);
  useEffect(() => {
    if (!municipioInicial || jaBuscou.current) return;
    jaBuscou.current = true;
    buscarPorte(municipioInicial.nome, municipioInicial.uf);
  }, [municipioInicial]);

  // O pedido de proposta leva porte e módulos na URL — validados do outro
  // lado contra a tabela, nunca interpolados como texto — para o formulário
  // não perguntar de novo o que a pessoa acabou de escolher.
  // Sem código IBGE não há pedido: o servidor só monta proposta com município.
  const linkProposta = `/proposta?ibge=${codigoIbge ?? ""}&modulos=${modulos.join(",")}`;

  function alternar(chave: PlanoAddon) {
    setModulos((atual) =>
      atual.includes(chave) ? atual.filter((m) => m !== chave) : [...atual, chave]
    );
  }

  // ── ACENDE QUANDO CHEGA ──
  // O quadro entra apagado e acende assim que o topo dele aparece na tela,
  // logo depois do subtítulo. Uma vez só: depois fica aceso.
  const quadro = useRef<HTMLDivElement>(null);
  const [aceso, setAceso] = useState(false);
  const [ligando, setLigando] = useState(false);
  useEffect(() => {
    const el = quadro.current;
    if (!el) return;
    let espera: number | undefined;
    const obs = new IntersectionObserver(
      (entradas) => {
        if (entradas.some((e) => e.isIntersecting)) {
          setAceso(true);
          setLigando(true);
          espera = window.setTimeout(() => setLigando(false), 2400);
          obs.disconnect();
        }
      },
      { rootMargin: "0px 0px -10% 0px" }
    );
    obs.observe(el);
    return () => {
      obs.disconnect();
      window.clearTimeout(espera);
    };
  }, []);

  return (
    <div ref={quadro} data-aceso={aceso ? "1" : "0"}
      data-ligando={ligando ? "1" : "0"} className="montador-vivo border rounded-[28px] overflow-hidden grid lg:grid-cols-[1fr_380px]">
      {/* ── escolhas ── */}
      <div className="p-6 sm:p-9 flex flex-col gap-9">
        <fieldset className="flex flex-col gap-3">
          <legend className="flex items-center gap-2.5 mb-3">
            <span className="montador-numero tabular-nums">1</span>
            <span className="text-lg font-semibold tracking-[-0.02em]">Seu município</span>
          </legend>
          {/* ── O MESMO CAMPO DO TOPO DA HOME ──
              Eram três controles: nome, UF e "Descobrir o porte". Agora a
              pessoa digita o nome (ou usa a localização) e escolhe na lista;
              o porte sai do IBGE na hora. */}
          {campoNoTopo ? (
            // Um campo de município por página (revisão de outubro de 2026):
            // na home ele mora no topo, e daqui se volta até ele.
            !achado && !consultando && (
              <a
                href="#municipio-topo"
                onClick={() => setTimeout(() => document.getElementById("municipio-topo")?.focus(), 400)}
                className="inline-flex min-h-11 items-center rounded-full border border-border px-5 text-sm font-medium hover:border-brand transition"
              >
                Escolher o município no topo da página&nbsp;↑
              </a>
            )
          ) : (
            <AcheSuaCidade
              key={rodada}
              compacto
              empilhado
              placeholder="Digite o nome do município"
              aoEscolher={(c) => escolherMunicipio(c.nome, c.uf)}
            />
          )}
          {consultando && <p className="text-xs text-muted">Consultando o IBGE…</p>}
          {achado && (
            <p className="text-xs leading-relaxed" style={{ color: "var(--accent-claro)" }}>
              {achado}{" "}
              {campoNoTopo ? (
                <a
                  href="#municipio-topo"
                  onClick={() => setTimeout(() => document.getElementById("municipio-topo")?.focus(), 400)}
                  className="underline hover:no-underline"
                >
                  Trocar município
                </a>
              ) : (
                <button type="button" onClick={limparMunicipio} className="underline hover:no-underline">
                  Trocar município
                </button>
              )}
            </p>
          )}
          {erroPorte && (
            <p className="text-xs leading-relaxed" style={{ color: "var(--urgente)" }}>
              {erroPorte}
            </p>
          )}
          {/* O porte é resultado, não escolha. Aparece só depois de o
              município ser identificado, e não tem clique. */}
          {identificado ? (
            <div className="rounded-xl border-[1.5px] border-brand bg-brand-tint px-4 py-3.5 flex items-center justify-between gap-3">
              <div>
                <span className="block text-xs text-muted">Porte pela população do IBGE</span>
                <span className="block text-sm font-semibold text-brand-claro">
                  {PORTES.find((p) => p.chave === porte)?.rotulo} habitantes
                </span>
              </div>
              <span className="w-5 h-5 rounded-full bg-brand flex items-center justify-center shrink-0">
                <IconCheck className="w-3 h-3 text-white" strokeWidth={3.5} />
              </span>
            </div>
          ) : (
            <p className="text-xs text-muted leading-relaxed">
              O porte (0 a 10 mil, 10 a 50 mil, acima de 50 mil) sai da população do
              IBGE para o município informado — é ele que define a tabela.
            </p>
          )}
        </fieldset>

        <fieldset className="flex flex-col gap-3">
          <legend className="flex items-center gap-2.5 mb-3">
            <span className="montador-numero tabular-nums" style={{ "--atraso": "0.25s" } as React.CSSProperties}>2</span>
            <span className="text-lg font-semibold tracking-[-0.02em]">Módulos que a prefeitura vai usar</span>
          </legend>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {PLANOS_ADDON.map((p, i) => {
              const ativo = modulos.includes(p.chave);
              return (
                <button
                  key={p.chave}
                  type="button"
                  onClick={() => alternar(p.chave)}
                  aria-pressed={ativo}
                  style={{ "--atraso": `${0.3 + i * 0.08}s` } as React.CSSProperties}
                  className="montador-modulo flex items-center gap-3 text-left rounded-xl border-[1.5px] border-border px-4 py-3"
                >
                  <span
                    className={`montador-check w-[18px] h-[18px] rounded-[5px] shrink-0 flex items-center justify-center border-[1.5px] transition ${
                      ativo ? "bg-brand border-brand" : "border-border"
                    }`}
                  >
                    {ativo && <IconCheck className="w-2.5 h-2.5 text-white" strokeWidth={3.5} />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={`block text-sm font-semibold ${ativo ? "text-brand-claro" : ""}`}>
                      {p.nome}
                    </span>
                    <span className="block text-xs text-muted mt-0.5">
                      {RESUMO_MODULO[p.chave]}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </fieldset>
      </div>

      {/* ── resumo ──
          Sem valores, de propósito: a tabela de preços é interna. O que a
          pessoa vê aqui é o que ela montou — município, porte, módulos — e
          a promessa que substitui a tabela: proposta em um dia útil, sem
          reunião obrigatória, com o termo de referência pronto. */}
      <div
        className="montador-resumo p-6 sm:p-9 flex flex-col gap-4 text-white border-t lg:border-t-0 lg:border-l border-white/10"
      >
        <h3 className="text-lg font-semibold tracking-[-0.02em]">Sua proposta</h3>

        {!identificado ? (
          <p className="text-sm text-white/70 leading-relaxed">
            Informe o município para montar a proposta — é a população dele que
            define a faixa.
          </p>
        ) : (
          <>
            <div className="rounded-xl border border-white/20 bg-white/[0.08] p-4 backdrop-blur-sm">
              <p className="text-xs text-white/60">Município</p>
              <p className="font-semibold mt-0.5">{achado?.split(":")[0] ?? municipio}</p>
              <p className="text-xs text-white/70 mt-1">
                Porte: <strong className="text-white">{PORTES.find((p) => p.chave === porte)?.rotulo} habitantes</strong> (IBGE)
              </p>
            </div>
            {modulos.length === 0 ? (
              <p className="text-sm text-white/70 leading-relaxed">Marque ao menos um módulo.</p>
            ) : (
              <ul className="flex flex-col gap-2 text-sm text-white/80">
                {PLANOS_ADDON.filter((p) => modulos.includes(p.chave)).map((p) => (
                  <li key={p.chave} className="flex items-center gap-2">
                    <IconCheck className="w-3.5 h-3.5 shrink-0" strokeWidth={3} style={{ color: "var(--accent)" }} />
                    {p.nome}
                  </li>
                ))}
              </ul>
            )}
            <div className="h-px bg-white/15" />
            <p className="text-xs text-white/70 leading-relaxed">
              O valor vem na proposta, por módulo e pela faixa do seu município, com o
              termo de referência pronto para o jurídico — em até um dia útil, sem
              reunião obrigatória.
            </p>
          </>
        )}

        <div className="flex flex-col gap-2.5 mt-auto pt-2">
          {identificado ? (
            <Link
              href={linkProposta}
              className="montador-cta font-semibold text-sm rounded-full px-5 py-3.5 text-center"
            >
              Receber esta proposta e o termo de referência
            </Link>
          ) : (
            <span
              aria-disabled
              className="montador-cta-espera font-semibold text-sm rounded-full px-5 py-3.5 text-center cursor-not-allowed"
            >
              Informe o município para pedir a proposta
            </span>
          )}
          {/* Era "Criar conta e testar grátis". A conta é criada, mas nasce
              sem módulo nenhum e o botão de ativar leva a um checkout que
              ainda não existe — ou seja, prometia um teste que não acontece.
              O kit é a segunda ação real: baixa na hora, sem cadastro. */}
          <Link
            href="/kit"
            className="border border-white/25 font-medium text-sm rounded-full px-5 py-3.5 text-center hover:bg-white/10 transition"
          >
            Baixar o kit de contratação
          </Link>
        </div>
      </div>
    </div>
  );
}
