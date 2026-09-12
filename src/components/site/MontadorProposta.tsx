"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { PLANOS_ADDON, type PlanoAddon } from "@/lib/planos";
import { PORTES, montarProposta, type PorteMunicipio } from "@/lib/precos";
import { LIMITE_DISPENSA, cabeNaDispensa } from "@/lib/contratacao";
import { formatarMoeda, formatarMoedaExata } from "@/lib/formatadores";
import { IconCheck } from "@/components/icons";
import { ESTADOS } from "@/lib/estados";
import { sugerirPorte } from "@/app/precos/actions";

const RESUMO_MODULO: Record<PlanoAddon, string> = {
  essencial: "Protocolo, ouvidoria e portal",
  gestao: "Visão geral do prefeito",
  saude: "UBS, indicadores e mapa",
  educacao: "Escolas, notas e frequência",
  obras: "Progresso e mapa das obras",
  licitacoes: "Processos e riscos",
};

export default function MontadorProposta() {
  // ── O PORTE NÃO É ESCOLHA ──
  // Era um botão com três faixas e "Município (opcional)" ao lado. Quem
  // quisesse o preço de cidade de 10 mil habitantes para uma capital
  // clicava. Agora não existe botão: o município é obrigatório, o porte é
  // o que a tabela do IBGE diz, e o preço só aparece depois disso.
  const [porte, setPorte] = useState<PorteMunicipio | null>(null);
  const [modulos, setModulos] = useState<PlanoAddon[]>(["essencial", "gestao"]);

  const identificado = porte !== null;
  const proposta = montarProposta({ porte: porte ?? "de10a50k", modulos });
  const cabe = cabeNaDispensa(proposta.anual);

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
    <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-[var(--shadow-lg)] grid lg:grid-cols-[1fr_360px]">
      {/* ── escolhas ── */}
      <div className="p-6 sm:p-7 flex flex-col gap-7">
        <fieldset className="flex flex-col gap-3">
          <legend className="flex items-center gap-2.5 mb-3">
            <span className="w-6 h-6 rounded-lg bg-brand text-white text-xs font-extrabold font-serif flex items-center justify-center">
              1
            </span>
            <span className="font-semibold text-base">Seu município</span>
          </legend>
          <div className="flex flex-wrap items-end gap-2 mb-1">
            <label className="flex-1 min-w-[160px]">
              <span className="block text-xs text-muted mb-1">Município</span>
              <input
                id="proposta-municipio"
                value={municipio}
                onChange={(e) => setMunicipio(e.target.value)}
                placeholder="Ex.: Teresina"
                className="w-full rounded-lg border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-brand"
              />
            </label>
            <label className="w-24">
              <span className="block text-xs text-muted mb-1">UF</span>
              <select
                id="proposta-uf"
                value={uf}
                onChange={(e) => setUf(e.target.value)}
                className="w-full rounded-lg border border-border bg-transparent px-2 py-2 text-sm outline-none focus:border-brand"
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
              className="text-sm font-semibold rounded-lg border border-border px-3 py-2 hover:border-brand hover:text-brand transition disabled:opacity-50"
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
                <span className="block text-sm font-bold text-brand-dark">
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
            <span className="w-6 h-6 rounded-lg bg-brand text-white text-xs font-extrabold font-serif flex items-center justify-center">
              2
            </span>
            <span className="font-semibold text-base">Módulos que a prefeitura vai usar</span>
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
                  className={`flex items-center gap-3 text-left rounded-xl border-[1.5px] px-4 py-3 transition ${
                    ativo ? "border-brand bg-brand-tint" : "border-border hover:border-brand/40"
                  }`}
                >
                  <span
                    className={`w-[18px] h-[18px] rounded-[5px] shrink-0 flex items-center justify-center border-[1.5px] transition ${
                      ativo ? "bg-brand border-brand" : "border-border"
                    }`}
                  >
                    {ativo && <IconCheck className="w-2.5 h-2.5 text-white" strokeWidth={3.5} />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={`block text-sm font-bold ${ativo ? "text-brand-dark" : ""}`}>
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

      {/* ── resumo ── */}
      <div
        className="p-6 sm:p-7 flex flex-col gap-4 text-white"
        style={{ background: "var(--brand-profundo)" }}
      >
        <h3 className="font-serif font-bold text-base">Sua proposta</h3>

        {!identificado ? (
          <p className="text-sm text-white/70 leading-relaxed">
            Informe o município para ver o valor — é a população dele que define a
            tabela.
          </p>
        ) : proposta.itens.length === 0 ? (
          <p className="text-sm text-white/70 leading-relaxed">
            Escolha ao menos um módulo para ver o valor.
          </p>
        ) : (
          <ul className="flex flex-col gap-2.5">
            {proposta.itens.map((item) => (
              <li key={item.modulo} className="flex justify-between gap-3 text-sm text-white/75">
                <span>{item.nome}</span>
                <span className="font-semibold text-white shrink-0">
                  {item.mensal === null ? "sob consulta" : formatarMoeda(item.mensal)}
                </span>
              </li>
            ))}
          </ul>
        )}

        <div className="h-px bg-white/15" />

        {!identificado ? null : proposta.incompleta ? (
          // Preço ainda não definido: dizer "sob consulta" é honesto. Mostrar
          // R$ 0,00 daria a entender que os módulos escolhidos são de graça.
          <div className="rounded-xl border border-white/20 bg-white/[0.06] p-4">
            <p className="text-sm font-semibold">Valor sob consulta</p>
            <p className="text-xs text-white/70 leading-relaxed mt-1.5">
              A tabela deste porte ainda não está publicada. Peça a proposta e ela
              volta com o valor fechado e o termo de referência.
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-white/75">Mensal</span>
              <span className="font-serif text-xl font-extrabold tracking-tight">
                {formatarMoeda(proposta.mensal)}
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-white/75">Total em 12 meses</span>
              <span className="font-serif text-2xl font-extrabold tracking-tight">
                {formatarMoeda(proposta.anual)}
              </span>
            </div>

            {/* O selo que fecha contrato: responde "posso comprar?" antes de
                "quanto custa?". Compara o total ANUAL — comparar o mensal
                seria o fracionamento que o art. 75 veda. */}
            {proposta.anual > 0 &&
              (cabe ? (
                <div className="rounded-xl border border-[color:var(--accent)]/40 bg-[color:var(--accent)]/15 p-4">
                  <p className="text-sm font-bold flex items-center gap-2">
                    <IconCheck className="w-4 h-4 shrink-0" strokeWidth={3} />
                    Cabe na dispensa de licitação
                  </p>
                  <p className="text-xs text-white/75 leading-relaxed mt-1.5">
                    O total anual fica abaixo de {formatarMoedaExata(LIMITE_DISPENSA.valor)} (
                    {LIMITE_DISPENSA.base}). A prefeitura pode contratar direto, sem edital.
                  </p>
                </div>
              ) : (
                <div className="rounded-xl border border-white/25 bg-white/[0.06] p-4">
                  <p className="text-sm font-bold">Acima do limite de dispensa</p>
                  <p className="text-xs text-white/75 leading-relaxed mt-1.5">
                    O caminho aqui é o pregão eletrônico — e o termo de referência
                    vai pronto no kit. Dividir o contrato para caber no limite é
                    vedado pelo {LIMITE_DISPENSA.base}.
                  </p>
                </div>
              ))}
          </>
        )}

        <div className="flex flex-col gap-2.5 mt-auto pt-2">
          {identificado ? (
            <Link
              href={linkProposta}
              className="bg-white text-[color:var(--brand-profundo)] font-bold text-sm rounded-xl px-4 py-3 text-center hover:opacity-90 transition"
            >
              Receber esta proposta e o termo de referência
            </Link>
          ) : (
            <span
              aria-disabled
              className="bg-white/40 text-[color:var(--brand-profundo)] font-bold text-sm rounded-xl px-4 py-3 text-center cursor-not-allowed"
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
            className="border border-white/25 font-semibold text-sm rounded-xl px-4 py-3 text-center hover:bg-white/10 transition"
          >
            Baixar o kit de contratação
          </Link>
        </div>
      </div>
    </div>
  );
}
