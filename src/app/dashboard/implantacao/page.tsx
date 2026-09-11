import Link from "next/link";
import { contextoDashboard } from "@/lib/contexto-dashboard";
import { levantarFatos } from "@/lib/implantacao-fatos";
import {
  avaliarImplantacao,
  resumirImplantacao,
  fraseDeProgresso,
} from "@/lib/implantacao";
import { IconCheck } from "@/components/icons";
import PassoComAcao from "./PassoComAcao";
import BotaoConcluir from "./BotaoConcluir";

export const metadata = { title: "Implantação — CidadeIA" };

// ── A PRIMEIRA TELA DE UMA PREFEITURA NOVA ──
//
// Não é bloqueada por plano, de propósito. É a única tela que uma prefeitura
// sem módulo contratado consegue usar de verdade — e é justamente ela que
// diz o que fazer para as outras passarem a existir.
//
// Quem cadastrou chega aqui direto do cadastro. Quem entra pelo login cai
// na Visão Geral, e encontra esta tela como primeiro item do menu enquanto
// a lista estiver aberta. Nenhuma tela redireciona para cá.

export default async function ImplantacaoPage() {
  const { sessao, prefeitura } = await contextoDashboard();
  const fatos = await levantarFatos(sessao.prefeituraId);
  const passos = avaliarImplantacao(fatos);
  const resumo = resumirImplantacao(passos);
  const podeAgir = sessao.cargo !== "secretario";

  // O passo do Tesouro depende do município reconhecido: sem código IBGE a
  // busca no SICONFI não tem como começar. O botão fica visível, mas
  // desabilitado, com a razão escrita — melhor que sumir sem explicar.
  const municipioReconhecido = passos.find((p) => p.chave === "municipio")?.feito ?? false;

  return (
    <div className="max-w-3xl space-y-8">
      {/* Sem saudação: quem recebe é a Visão Geral. Esta é uma tela de
          trabalho, e abre pelo nome da tarefa. */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted mb-2">
          {prefeitura.nome}
        </p>
        <h1 className="font-serif text-2xl font-bold">Implantação</h1>
        <p className="text-muted text-sm mt-1.5 leading-relaxed max-w-xl">
          {fraseDeProgresso(resumo)} Cada passo destrava uma parte do painel. Os que
          dependem de contratação ou de decisão da prefeitura ficam marcados — não
          prendem o resto.
        </p>
      </div>

      <ol className="space-y-3">
        {passos.map((passo, i) => (
          <li
            key={passo.chave}
            className="rounded-xl border p-5 flex gap-4"
            style={{
              borderColor: passo.feito ? "var(--info-borda)" : "var(--border)",
              background: passo.feito ? "var(--info-tint)" : "var(--card)",
            }}
          >
            {/* Círculo numerado que vira check. A numeração existe porque a
                ordem importa: o Tesouro depende do IBGE, e acessos vêm
                antes de importar dados que os secretários vão manter. */}
            <span
              className="shrink-0 w-8 h-8 rounded-full grid place-items-center text-sm font-bold border-2"
              style={{
                borderColor: passo.feito ? "var(--info)" : "var(--border)",
                color: passo.feito ? "var(--info)" : "var(--muted)",
                background: passo.feito ? "var(--info-tint)" : "transparent",
              }}
              aria-label={passo.feito ? "Concluído" : `Passo ${i + 1}`}
            >
              {passo.feito ? <IconCheck className="w-4 h-4" /> : i + 1}
            </span>

            <div className="flex-1 min-w-0 space-y-3">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <h3 className="font-semibold text-base leading-snug">{passo.titulo}</h3>
                {passo.externo && !passo.feito && (
                  <span
                    className="text-[11px] font-semibold rounded-full px-2 py-0.5 shrink-0"
                    style={{ color: "var(--medio)", background: "var(--medio-tint)" }}
                  >
                    {passo.chave === "modulos" ? "Contratação" : "Decisão da prefeitura"}
                  </span>
                )}
              </div>
              <p className="text-sm text-muted leading-relaxed max-w-xl">{passo.porque}</p>

              {!passo.feito && podeAgir && (
                passo.chave === "municipio" || passo.chave === "tesouro" ? (
                  <div className="space-y-1.5">
                    <PassoComAcao
                      chave={passo.chave}
                      rotulo={passo.rotulo}
                      desabilitado={passo.chave === "tesouro" && !municipioReconhecido}
                    />
                    {passo.chave === "tesouro" && !municipioReconhecido && (
                      <p className="text-xs text-muted">
                        Depende do passo 1: sem o código IBGE, não há como buscar no Tesouro.
                      </p>
                    )}
                  </div>
                ) : (
                  <Link
                    href={passo.href ?? "/dashboard"}
                    className="inline-block text-sm font-semibold text-brand hover:underline"
                  >
                    {passo.rotulo} →
                  </Link>
                )
              )}
            </div>
          </li>
        ))}
      </ol>

      {podeAgir && (
        <div
          className="rounded-xl border p-5 flex items-center justify-between gap-4 flex-wrap"
          style={{ borderColor: "var(--border)" }}
        >
          <div>
            <p className="font-semibold text-sm">
              {resumo.prontoParaEncerrar
                ? "Seu ambiente está pronto."
                : `Ainda ${resumo.pendentesInternos.length === 1 ? "falta" : "faltam"} ${resumo.pendentesInternos.length} ${resumo.pendentesInternos.length === 1 ? "passo" : "passos"} que só dependem de você.`}
            </p>
            <p className="text-xs text-muted mt-1 leading-relaxed">
              {resumo.prontoParaEncerrar
                ? "O que depende de contratação ou decisão continua listado aqui, no menu."
                : "Dá para abrir o painel agora; esta lista continua no menu até você encerrá-la."}
            </p>
          </div>
          <BotaoConcluir tudoPronto={resumo.prontoParaEncerrar} />
        </div>
      )}

      {!podeAgir && (
        <p className="text-sm text-muted">
          Os passos da implantação são feitos pelo prefeito ou por um administrador.
        </p>
      )}
    </div>
  );
}
