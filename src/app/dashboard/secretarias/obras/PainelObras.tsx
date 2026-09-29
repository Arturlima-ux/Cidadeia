"use client";

import { useState, useTransition } from "react";
import { importarObrasDeContratos, type ResultadoImportacaoObras } from "./actions";
import MarcadorSituacao, { type SituacaoMarcador } from "@/components/MarcadorSituacao";
import type { LeituraObra, SituacaoObra } from "@/lib/obra-prazo";

/**
 * ── O PRAZO DA OBRA, VINDO DO CONTRATO ──
 *
 * A lista de obras da página continua abaixo, com o cadastro e o progresso que
 * a prefeitura informa. Esta seção é a leitura: o que o prazo do contrato diz
 * sobre cada obra que pede decisão.
 *
 * A diferença com o que havia antes é a fonte. O alerta de atraso comparava
 * progressoAtual com progressoEsperado — os dois digitados à mão, e o segundo
 * um número que alguém inventou. Aqui a régua é a vigência do contrato, que
 * existe independentemente de quem cadastrou.
 *
 * ── O QUE A TELA NÃO FAZ ──
 *
 * Transformar prazo em progresso esperado. Uma obra pode gastar 80% do prazo e
 * estar em 95% ou em 10% — as duas são possíveis e o software não sabe qual é.
 * Por isso a frase mostra os dois números crus, lado a lado, e quem conclui é
 * quem tem a medição na mão.
 */

export type ObraNaTela = {
  id: string;
  nome: string;
  fornecedorNome: string | null;
  valorContrato: number | null;
  origem: string;
  leitura: LeituraObra;
};

const MARCADOR: Record<SituacaoObra, SituacaoMarcador> = {
  contrato_encerrado_sem_conclusao: "urgente",
  atras_do_prazo: "urgente",
  sem_noticia: "atencao",
  sem_prazo: "atencao",
  em_dia: "normal",
  nao_comecou: "normal",
};

const moeda = (v: number | null) =>
  v === null ? null : v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function PainelObras({
  obras,
  total,
  temContratosDeObra,
  prefeituraId,
}: {
  /** Só as que pedem decisão, já ordenadas. */
  obras: ObraNaTela[];
  total: number;
  /** Quantos contratos de obra existem no cadastro de Licitações. */
  temContratosDeObra: number;
  prefeituraId: string;
}) {
  const [importando, iniciar] = useTransition();
  const [resultado, setResultado] = useState<ResultadoImportacaoObras | null>(null);

  function importar() {
    iniciar(async () => setResultado(await importarObrasDeContratos(prefeituraId)));
  }

  const vencidas = obras.filter((o) => o.leitura.situacao === "contrato_encerrado_sem_conclusao");
  const semMedicao = obras.filter((o) => o.leitura.situacao === "sem_noticia");

  return (
    <section className="bg-card border border-border arco-card p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-xl">
          <h2 className="font-serif text-lg font-bold">Prazo das obras</h2>
          <p className="text-sm text-muted mt-1.5 leading-relaxed">
            O atraso deixou de ser medido contra um percentual digitado à mão. A régua agora é a
            vigência do contrato, que existe independentemente de quem cadastrou a obra — e é a
            primeira coisa que quem fiscaliza confere.
          </p>
        </div>
        {temContratosDeObra > 0 && (
          <button
            type="button"
            onClick={importar}
            disabled={importando}
            className="shrink-0 bg-brand hover:bg-brand-dark text-white font-semibold text-sm rounded-lg px-5 py-2.5 transition disabled:opacity-50"
          >
            {importando ? "Importando…" : `Trazer ${temContratosDeObra} do contrato`}
          </button>
        )}
      </div>

      {resultado && (
        <p
          className="text-sm rounded-lg px-4 py-3 mt-5 leading-relaxed"
          style={
            resultado.ok
              ? { background: "var(--accent-tint)", color: "var(--accent)" }
              : { background: "var(--urgente-tint)", color: "var(--urgente)" }
          }
        >
          {resultado.ok
            ? resultado.importados === 0 && resultado.atualizados === 0
              ? "Nada novo: todas as obras dos contratos já estão no cadastro, com o mesmo prazo."
              : [
                  resultado.importados > 0 &&
                    `${resultado.importados} ${resultado.importados === 1 ? "obra importada" : "obras importadas"}`,
                  resultado.atualizados > 0 &&
                    `${resultado.atualizados} com prazo atualizado pelo contrato`,
                ]
                  .filter(Boolean)
                  .join(" e ") + ". Recarregue a página para ver a leitura."
            : resultado.erro}
        </p>
      )}

      {total === 0 ? (
        <p className="text-sm text-muted mt-5 leading-relaxed">
          Nenhuma obra no cadastro.{" "}
          {temContratosDeObra > 0
            ? `Há ${temContratosDeObra} ${temContratosDeObra === 1 ? "contrato" : "contratos"} de obra ou engenharia em Licitações — importar traz objeto, contratado, valor e, principalmente, o prazo.`
            : "Cadastre abaixo, ou importe os contratos do PNCP em Licitações: obra municipal é contratada, e contrato de obra é publicação obrigatória desde abril de 2024."}
        </p>
      ) : (
        <>
          <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2 mt-5 pb-4 border-b border-border">
            <span className="text-sm">
              <strong className="tabular-nums">{total}</strong>{" "}
              {total === 1 ? "obra no cadastro" : "obras no cadastro"}
            </span>
            {vencidas.length > 0 && (
              <span className="text-sm font-semibold" style={{ color: "var(--urgente)" }}>
                {vencidas.length} com contrato encerrado sem conclusão
              </span>
            )}
            {semMedicao.length > 0 && (
              <span className="text-sm font-semibold" style={{ color: "var(--medio)" }}>
                {semMedicao.length} sem medição em dia
              </span>
            )}
          </div>

          {obras.length === 0 ? (
            <p
              className="text-sm rounded-lg px-4 py-3 mt-4"
              style={{ background: "var(--accent-tint)", color: "var(--accent)" }}
            >
              Nenhuma obra pede decisão agora: as {total} estão dentro do prazo do contrato, com
              medição em dia.
            </p>
          ) : (
            <ul className="mt-4 flex flex-col gap-3">
              {obras.map((o) => (
                <li key={o.id} className="border border-border rounded-lg px-4 py-3.5">
                  <div className="flex items-start gap-2.5">
                    <MarcadorSituacao situacao={MARCADOR[o.leitura.situacao]} className="mt-1" />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-sm">{o.nome}</p>
                      {o.fornecedorNome && (
                        <p className="text-xs text-muted mt-0.5">{o.fornecedorNome}</p>
                      )}

                      <p className="text-sm mt-2 leading-relaxed">{o.leitura.texto}</p>
                      {o.leitura.acao && (
                        <p className="text-sm text-muted mt-1.5 leading-relaxed">{o.leitura.acao}</p>
                      )}

                      {/* As duas barras lado a lado: progresso medido e prazo
                          consumido. Ver a diferença é mais direto que ler a
                          frase, e a frase continua para quem usa leitor de
                          tela ou não distingue as cores. */}
                      {o.leitura.prazoConsumido !== null && (
                        <div className="mt-3 flex flex-col gap-1.5" aria-hidden="true">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted w-20 shrink-0">progresso</span>
                            <div className="flex-1 h-1.5 bg-sutil rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: `${o.leitura.progressoInformado ?? 0}%`,
                                  background: "var(--brand)",
                                }}
                              />
                            </div>
                            <span className="text-xs tabular-nums w-16 text-right shrink-0">
                              {o.leitura.progressoInformado === null
                                ? "—"
                                : `${Math.round(o.leitura.progressoInformado)}%`}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted w-20 shrink-0">prazo</span>
                            <div className="flex-1 h-1.5 bg-sutil rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: `${o.leitura.prazoConsumido}%`,
                                  background: "var(--muted)",
                                }}
                              />
                            </div>
                            <span className="text-xs tabular-nums w-16 text-right shrink-0">
                              {Math.round(o.leitura.prazoConsumido)}%
                            </span>
                          </div>
                        </div>
                      )}

                      <p className="text-xs text-muted mt-2 flex flex-wrap gap-x-3 gap-y-1">
                        {moeda(o.valorContrato) && <span>{moeda(o.valorContrato)}</span>}
                        {o.origem === "pncp" && <span>veio do contrato no PNCP</span>}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      <p className="text-xs text-muted mt-5 pt-4 border-t border-border leading-relaxed">
        Prazo consumido não é progresso esperado: uma obra pode gastar 80% do prazo e estar em 95%
        ou em 10%. A tela mostra os dois números para que a comparação seja sua, e nunca preenche o
        progresso sozinha — obra sem medição aparece como sem medição, não como 0%. Obra municipal
        não tem cadastro nacional obrigatório; o Obrasgov traz percentual aferido, mas a adesão do
        município é facultativa e poucos aderiram. O contrato, esse é obrigatório no PNCP.
      </p>
    </section>
  );
}
