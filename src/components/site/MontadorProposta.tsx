"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { PLANOS_ADDON, type PlanoAddon } from "@/lib/planos";
import { PORTES, type PorteMunicipio } from "@/lib/precos";
import { IconCheck } from "@/components/icons";
import { ESTADOS } from "@/lib/estados";
import { sugerirPorte } from "@/app/solucoes/actions";

const RESUMO_MODULO: Record<PlanoAddon, string> = {
  essencial: "Protocolo, ouvidoria e portal",
  gestao: "Visão geral do prefeito",
  saude: "UBS, indicadores e mapa",
  educacao: "Escolas, notas e frequência",
  obras: "Progresso e mapa das obras",
  licitacoes: "Processos e riscos",
};

export default function MontadorProposta({
  modulosIniciais = ["essencial", "gestao"],
}: {
  /** Vindo da página de um módulo ("Adicionar à minha proposta"). */
  modulosIniciais?: PlanoAddon[];
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
  const [municipio, setMunicipio] = useState("");
  const [uf, setUf] = useState("");
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

  function limparMunicipio() {
    setMunicipio("");
    setCodigoIbge(null);
    setAchado(null);
    setErroPorte(null);
    setPorte(null);
  }

  function descobrirPorte() {
    setErroPorte(null);
    setAchado(null);
    setCodigoIbge(null);
    consultar(async () => {
      const r = await sugerirPorte({ municipio, uf });
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

  return (
    <div className="montador-vivo border rounded-[28px] overflow-hidden grid lg:grid-cols-[1fr_380px]">
      {/* ── escolhas ── */}
      <div className="p-6 sm:p-9 flex flex-col gap-9">
        <fieldset className="flex flex-col gap-3">
          <legend className="flex items-center gap-2.5 mb-3">
            <span className="montador-numero tabular-nums">1</span>
            <span className="text-lg font-semibold tracking-[-0.02em]">Seu município</span>
          </legend>
          <div className="flex flex-wrap items-end gap-2 mb-1">
            <label className="flex-1 min-w-[160px]">
              <span className="block text-xs text-muted mb-1">Município</span>
              <input
                id="proposta-municipio"
                value={municipio}
                onChange={(e) => setMunicipio(e.target.value)}
                placeholder="Ex.: Teresina"
                className="montador-campo w-full rounded-xl border px-3.5 py-2.5 text-sm outline-none"
              />
            </label>
            <label className="w-24">
              <span className="block text-xs text-muted mb-1">UF</span>
              <select
                id="proposta-uf"
                value={uf}
                onChange={(e) => setUf(e.target.value)}
                className="montador-campo w-full rounded-xl border px-2.5 py-2.5 text-sm outline-none"
              >
                <option value="">—</option>
                {ESTADOS.map((e) => (
                  <option key={e} value={e}>
                    {e}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={descobrirPorte}
              disabled={consultando || municipio.trim().length < 2 || !uf}
              className="montador-campo text-sm font-medium rounded-full border px-4 py-2.5 hover:border-brand hover:text-brand-claro disabled:opacity-60"
            >
              {consultando ? "Consultando o IBGE…" : "Descobrir o porte"}
            </button>
          </div>
          {achado && (
            <p className="text-xs leading-relaxed" style={{ color: "var(--accent-claro)" }}>
              {achado}{" "}
              <button type="button" onClick={limparMunicipio} className="underline hover:no-underline">
                Trocar município
              </button>
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
            <span className="montador-numero tabular-nums">2</span>
            <span className="text-lg font-semibold tracking-[-0.02em]">Módulos que a prefeitura vai usar</span>
          </legend>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {PLANOS_ADDON.map((p) => {
              const ativo = modulos.includes(p.chave);
              return (
                <button
                  key={p.chave}
                  type="button"
                  onClick={() => alternar(p.chave)}
                  aria-pressed={ativo}
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
