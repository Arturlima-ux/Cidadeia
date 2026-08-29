"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { TABELAS_IMPORTAVEIS, tabelaImportavel } from "@/lib/importacao";
import type { ResultadoImportacao } from "@/lib/importacao";
import { previaImportacao, confirmarImportacao } from "./actions";
import { IconCheck, IconAlertas, IconDownload } from "@/components/icons";

type Etapa =
  | { nome: "escolha" }
  | { nome: "previa"; tabela: string; resultado: ResultadoImportacao }
  | { nome: "pronto"; tabela: string; gravadas: number };

export default function FormularioImportacao() {
  const [etapa, setEtapa] = useState<Etapa>({ nome: "escolha" });
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();

  function enviar(formData: FormData) {
    setErro(null);
    iniciar(async () => {
      const resposta = await previaImportacao(formData);
      if (!resposta.ok) {
        setErro(resposta.erro);
        return;
      }
      setEtapa({ nome: "previa", tabela: resposta.tabela, resultado: resposta.resultado });
    });
  }

  function gravar(tabela: string, linhas: Record<string, unknown>[]) {
    setErro(null);
    iniciar(async () => {
      const resposta = await confirmarImportacao({ tabela, linhas });
      if (!resposta.ok) {
        setErro(resposta.erro);
        return;
      }
      setEtapa({ nome: "pronto", tabela, gravadas: resposta.gravadas });
    });
  }

  if (etapa.nome === "pronto") {
    const tabela = tabelaImportavel(etapa.tabela);
    return (
      <div className="bg-card border border-border rounded-2xl p-8 text-center">
        <div
          className="w-12 h-12 rounded-2xl mx-auto flex items-center justify-center mb-4"
          style={{ background: "var(--accent-tint)", color: "var(--accent)" }}
        >
          <IconCheck className="w-6 h-6" />
        </div>
        <h2 className="font-serif text-xl font-bold">
          {etapa.gravadas.toLocaleString("pt-BR")}{" "}
          {etapa.gravadas === 1 ? "registro importado" : "registros importados"}
        </h2>
        <p className="text-sm text-muted mt-2 leading-relaxed">
          {tabela?.rotulo} já aparece no painel da secretaria.
        </p>
        <div className="flex items-center justify-center gap-3 mt-6 flex-wrap">
          <button
            type="button"
            onClick={() => setEtapa({ nome: "escolha" })}
            className="border border-border rounded-full px-5 py-2.5 text-sm font-semibold hover:border-brand hover:text-brand transition"
          >
            Importar outra planilha
          </button>
          <Link
            href="/dashboard/dados"
            className="bg-brand hover:bg-brand-dark text-white rounded-full px-5 py-2.5 text-sm font-semibold transition"
          >
            Ver meus dados
          </Link>
        </div>
      </div>
    );
  }

  if (etapa.nome === "previa") {
    const tabela = tabelaImportavel(etapa.tabela)!;
    const r = etapa.resultado;
    const bloqueado = r.camposFaltando.length > 0 || r.linhas.length === 0;

    return (
      <div className="space-y-5">
        {erro && <Aviso tom="erro">{erro}</Aviso>}

        {/* Resumo do que vai acontecer */}
        <div className="bg-card border border-border rounded-2xl p-5">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h2 className="font-semibold">Prévia — {tabela.rotulo}</h2>
              <p className="text-sm text-muted mt-1">
                {r.totalLidas.toLocaleString("pt-BR")} linhas lidas ·{" "}
                <strong className="text-foreground">
                  {r.linhas.length.toLocaleString("pt-BR")} prontas para importar
                </strong>
                {r.erros.length > 0 && ` · ${r.erros.length} com problema`}
              </p>
            </div>
            <span className="text-xs text-muted">
              separador detectado: <code className="font-mono">{r.separador}</code>
            </span>
          </div>
        </div>

        {r.camposFaltando.length > 0 && (
          <Aviso tom="erro">
            A planilha não tem coluna para: <strong>{r.camposFaltando.join(", ")}</strong>. Sem
            isso não dá para importar — renomeie a coluna na planilha e envie de novo.
          </Aviso>
        )}

        {/* Mapeamento das colunas */}
        <div className="bg-card border border-border rounded-2xl p-5">
          <h3 className="font-semibold text-sm mb-1">Como as colunas foram entendidas</h3>
          <p className="text-xs text-muted mb-4 leading-relaxed">
            Confira antes de gravar. Se alguma coluna casou errado, renomeie o
            cabeçalho na planilha e envie de novo.
          </p>
          <div className="divide-y divide-border border-t border-border">
            {tabela.campos.map((campo) => {
              const indice = r.mapeamento[campo.chave];
              const origem = indice === null ? null : r.cabecalhos[indice];
              return (
                <div key={campo.chave} className="flex items-center justify-between gap-4 py-2.5">
                  <span className="text-sm">
                    {campo.rotulo}
                    {campo.obrigatorio && <span className="text-xs text-muted ml-1.5">obrigatório</span>}
                  </span>
                  {origem ? (
                    <span className="text-sm font-medium text-right">
                      <span className="text-muted mr-2">←</span>
                      {origem}
                    </span>
                  ) : (
                    <span className="text-xs text-muted">sem coluna</span>
                  )}
                </div>
              );
            })}
          </div>

          {r.colunasIgnoradas.length > 0 && (
            <p className="text-xs mt-4 leading-relaxed" style={{ color: "var(--medio)" }}>
              Colunas da planilha que <strong>não</strong> serão importadas:{" "}
              {r.colunasIgnoradas.join(", ")}.
            </p>
          )}
        </div>

        {/* Primeiras linhas */}
        {r.linhas.length > 0 && (
          <div className="bg-card border border-border rounded-2xl p-5">
            <h3 className="font-semibold text-sm mb-3">
              Primeiras linhas, já convertidas
            </h3>
            <div className="overflow-x-auto">
              <table className="text-sm min-w-full">
                <thead>
                  <tr className="border-b border-border">
                    {tabela.campos.map((c) => (
                      <th key={c.chave} className="text-left font-medium text-xs text-muted px-3 py-2 whitespace-nowrap">
                        {c.rotulo}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {r.linhas.slice(0, 5).map((linha, i) => (
                    <tr key={i} className="border-b border-border last:border-0">
                      {tabela.campos.map((c) => (
                        <td key={c.chave} className="px-3 py-2 whitespace-nowrap">
                          {linha[c.chave] === undefined ? (
                            <span className="text-muted">—</span>
                          ) : (
                            String(linha[c.chave])
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Erros */}
        {r.erros.length > 0 && (
          <div
            className="rounded-2xl p-5 border"
            style={{ borderColor: "var(--medio-borda)", background: "var(--medio-tint)" }}
          >
            <h3 className="font-semibold text-sm flex items-center gap-2" style={{ color: "var(--medio)" }}>
              <IconAlertas className="w-4 h-4" />
              {r.erros.length} {r.erros.length === 1 ? "problema" : "problemas"} na planilha
            </h3>
            <p className="text-xs mt-1.5 mb-3 leading-relaxed" style={{ color: "var(--medio)" }}>
              O número da linha é o mesmo que aparece no Excel. As demais linhas
              podem ser importadas normalmente.
            </p>
            <ul className="space-y-1.5 max-h-56 overflow-y-auto">
              {r.erros.slice(0, 50).map((e, i) => (
                <li key={i} className="text-xs leading-relaxed" style={{ color: "var(--medio)" }}>
                  <strong>Linha {e.linha}</strong> · {e.campo}
                  {e.valor && <> · &ldquo;{e.valor}&rdquo;</>} — {e.motivo}
                </li>
              ))}
              {r.erros.length > 50 && (
                <li className="text-xs" style={{ color: "var(--medio)" }}>
                  … e mais {r.erros.length - 50}.
                </li>
              )}
            </ul>
          </div>
        )}

        <div className="flex items-center gap-3 flex-wrap">
          <button
            type="button"
            disabled={bloqueado || pendente}
            onClick={() => gravar(etapa.tabela, r.linhas)}
            className="bg-brand hover:bg-brand-dark text-white rounded-full px-6 py-3 text-sm font-bold transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {pendente
              ? "Importando…"
              : `Importar ${r.linhas.length.toLocaleString("pt-BR")} ${r.linhas.length === 1 ? "registro" : "registros"}`}
          </button>
          <button
            type="button"
            onClick={() => setEtapa({ nome: "escolha" })}
            className="border border-border rounded-full px-5 py-2.5 text-sm font-semibold hover:border-brand hover:text-brand transition"
          >
            Escolher outro arquivo
          </button>
        </div>
      </div>
    );
  }

  // ── etapa de escolha ──
  return (
    <form action={enviar} className="space-y-5">
      {erro && <Aviso tom="erro">{erro}</Aviso>}

      <div className="bg-card border border-border rounded-2xl p-5">
        <label htmlFor="tabela" className="block font-semibold text-sm mb-1">
          O que você vai importar
        </label>
        <p className="text-xs text-muted mb-3 leading-relaxed">
          Uma planilha por vez. Os registros são adicionados aos que já existem —
          nada é apagado.
        </p>
        <select
          id="tabela"
          name="tabela"
          required
          defaultValue=""
          className="w-full border border-border rounded-xl px-3.5 py-2.5 text-sm bg-background"
        >
          <option value="" disabled>
            Escolha…
          </option>
          {TABELAS_IMPORTAVEIS.map((t) => (
            <option key={t.chave} value={t.chave}>
              {t.rotulo} — {t.descricao}
            </option>
          ))}
        </select>
      </div>

      <div className="bg-card border border-border rounded-2xl p-5">
        <label htmlFor="arquivo" className="block font-semibold text-sm mb-1">
          Arquivo CSV
        </label>
        <p className="text-xs text-muted mb-3 leading-relaxed">
          Exporte do sistema atual como CSV. Vírgula ou ponto e vírgula, tanto
          faz — o separador é detectado. Valores em real no formato brasileiro
          (1.234,56) são entendidos. Até 4 MB.
        </p>
        <input
          id="arquivo"
          name="arquivo"
          type="file"
          accept=".csv,text/csv"
          required
          className="w-full text-sm file:mr-3 file:rounded-full file:border-0 file:bg-brand-tint file:px-4 file:py-2 file:text-sm file:font-semibold file:text-brand hover:file:opacity-80"
        />
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <button
          type="submit"
          disabled={pendente}
          className="bg-brand hover:bg-brand-dark text-white rounded-full px-6 py-3 text-sm font-bold transition disabled:opacity-40 inline-flex items-center gap-2"
        >
          <IconDownload className="w-4 h-4 rotate-180" />
          {pendente ? "Lendo a planilha…" : "Conferir antes de importar"}
        </button>
        <span className="text-xs text-muted">Nada é gravado nesta etapa.</span>
      </div>
    </form>
  );
}

function Aviso({ tom, children }: { tom: "erro"; children: React.ReactNode }) {
  return (
    <div
      className="rounded-xl border px-4 py-3 text-sm leading-relaxed"
      style={{
        borderColor: tom === "erro" ? "var(--urgente-borda)" : "var(--border)",
        background: tom === "erro" ? "var(--urgente-tint)" : "transparent",
        color: tom === "erro" ? "var(--urgente)" : "inherit",
      }}
    >
      {children}
    </div>
  );
}
