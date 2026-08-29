"use client";

import { useState } from "react";
import Link from "next/link";
import { PLANOS_ADDON, type PlanoAddon } from "@/lib/planos";
import { PORTES, montarProposta, type PorteMunicipio } from "@/lib/precos";
import { LIMITE_DISPENSA, cabeNaDispensa } from "@/lib/contratacao";
import { formatarMoeda, formatarMoedaExata } from "@/lib/formatadores";
import { IconCheck } from "@/components/icons";

const RESUMO_MODULO: Record<PlanoAddon, string> = {
  essencial: "Protocolo, ouvidoria e portal",
  gestao: "Visão geral do prefeito",
  saude: "UBS, indicadores e mapa",
  educacao: "Escolas, notas e frequência",
  obras: "Progresso e mapa das obras",
  licitacoes: "Processos e riscos",
};

export default function MontadorProposta() {
  const [porte, setPorte] = useState<PorteMunicipio>("de10a50k");
  const [modulos, setModulos] = useState<PlanoAddon[]>(["essencial", "gestao"]);

  const proposta = montarProposta({ porte, modulos });
  const cabe = cabeNaDispensa(proposta.anual);

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
            <span className="font-semibold text-base">Porte do município</span>
          </legend>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {PORTES.map((p) => {
              const ativo = porte === p.chave;
              return (
                <button
                  key={p.chave}
                  type="button"
                  onClick={() => setPorte(p.chave)}
                  aria-pressed={ativo}
                  className={`relative text-left rounded-xl border-[1.5px] px-4 py-3.5 transition ${
                    ativo
                      ? "border-brand bg-brand-tint"
                      : "border-border hover:border-brand/40"
                  }`}
                >
                  <span className={`block text-sm font-bold ${ativo ? "text-brand-dark" : ""}`}>
                    {p.rotulo}
                  </span>
                  <span className="block text-xs text-muted mt-0.5">{p.detalhe}</span>
                  {ativo && (
                    <span className="absolute top-3 right-3 w-4 h-4 rounded-full bg-brand flex items-center justify-center">
                      <IconCheck className="w-2.5 h-2.5 text-white" strokeWidth={3.5} />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
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

        {proposta.itens.length === 0 ? (
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

        {proposta.incompleta ? (
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
          <Link
            href="/suporte?assunto=proposta"
            className="bg-white text-[color:var(--brand-profundo)] font-bold text-sm rounded-xl px-4 py-3 text-center hover:opacity-90 transition"
          >
            Receber proposta e termo de referência
          </Link>
          <Link
            href="/cadastro"
            className="border border-white/25 font-semibold text-sm rounded-xl px-4 py-3 text-center hover:bg-white/10 transition"
          >
            Criar conta e testar grátis
          </Link>
        </div>
      </div>
    </div>
  );
}
