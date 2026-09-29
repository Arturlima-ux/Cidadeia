"use client";

import { useState, useTransition } from "react";
import { importarContratosDoPncp, type ResultadoImportacaoContratos } from "./contratos-actions";
import MarcadorSituacao, { type SituacaoMarcador } from "@/components/MarcadorSituacao";
import { documentoExibivel } from "@/lib/contratos-pncp";
import type { LeituraVigencia, SituacaoVigencia } from "@/lib/vigencia";
import type { LeituraAditivo } from "@/lib/aditivos";

/**
 * ── O RADAR DE VENCIMENTO ──
 *
 * A sequência que este painel interrompe começa muito antes do fracionamento:
 * o contrato vence, ninguém viu, o serviço não pode parar, entra dispensa
 * emergencial, a emergencial vira duas, e a soma passa do limite do art. 75.
 *
 * O painel de fracionamento mostra o fim dessa história. Este mostra o começo,
 * que é onde ainda dá para agir sem custo.
 *
 * ── SOBRE O QUE A TELA AFIRMA ──
 *
 * Nenhum número aqui é inventado. "Quanto tempo leva uma licitação" não tem
 * resposta legal — depende do termo de referência, da pesquisa de preços e do
 * parecer jurídico, que a lei não cronometra. O que a lei fixa é o prazo mínimo
 * entre publicar o edital e receber propostas (art. 55), e é só sobre esse piso
 * que a tela conclui: "restam N dias úteis e o edital sozinho exige X".
 */

export type ContratoNaTela = {
  id: string;
  objeto: string;
  numeroContrato: string | null;
  fornecedorNome: string | null;
  fornecedorDocumento: string | null;
  fornecedorTipoPessoa: string | null;
  vigenciaFim: string | null;
  valorGlobal: number | null;
  frutoAdesao: boolean;
  vigencia: LeituraVigencia;
  aditivo: LeituraAditivo;
};

const MARCADOR: Record<SituacaoVigencia, SituacaoMarcador> = {
  vencido: "urgente",
  sem_tempo_de_licitar: "urgente",
  apertado: "atencao",
  atencao: "atencao",
  sem_data: "atencao",
  ok: "normal",
};

const moeda = (v: number | null) =>
  v === null ? null : v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function PainelContratos({
  contratos,
  ano,
  total,
}: {
  /** Só os que pedem decisão, já ordenados. */
  contratos: ContratoNaTela[];
  ano: number;
  /** Quantos contratos existem no cadastro, inclusive os em dia. */
  total: number;
}) {
  const [importando, iniciar] = useTransition();
  const [resultado, setResultado] = useState<ResultadoImportacaoContratos | null>(null);

  function importar() {
    iniciar(async () => setResultado(await importarContratosDoPncp(ano)));
  }

  const vencidos = contratos.filter((c) => c.vigencia.situacao === "vencido");
  const semTempo = contratos.filter((c) => c.vigencia.situacao === "sem_tempo_de_licitar");
  const comAditivo = contratos.filter((c) => c.aditivo.situacao === "acima_se_for_acrescimo");

  return (
    <section className="bg-card border border-border arco-card p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-xl">
          <h2 className="font-serif text-lg font-bold">Contratos e vigência</h2>
          <p className="text-sm text-muted mt-1.5 leading-relaxed">
            Contrato que vence sem ninguém ver é o começo de uma sequência conhecida: o serviço
            não pode parar, entra dispensa emergencial, a emergencial vira duas, e a soma passa
            do limite. Aqui o aviso chega enquanto ainda cabe decidir.
          </p>
        </div>
        <button
          type="button"
          onClick={importar}
          disabled={importando}
          className="shrink-0 bg-brand hover:bg-brand-dark text-white font-semibold text-sm rounded-lg px-5 py-2.5 transition disabled:opacity-50"
        >
          {importando ? "Importando…" : "Importar contratos do PNCP"}
        </button>
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
            ? resultado.importados === 0
              ? `Nada novo: o cadastro já tem todos os contratos que o PNCP publicou em ${resultado.anos.join(" e ")}.`
              : `${resultado.importados} ${
                  resultado.importados === 1 ? "contrato importado" : "contratos importados"
                } (${resultado.anos.join(" e ")}). Recarregue a página para ver o radar de vencimento.` +
                (resultado.completa ? "" : " A varredura não terminou; rode de novo em alguns minutos.")
            : resultado.erro}
        </p>
      )}

      {total === 0 ? (
        <p className="text-sm text-muted mt-5 leading-relaxed">
          Nenhum contrato no cadastro ainda. A importação traz do PNCP quem venceu cada processo,
          por quanto e até quando — três coisas que a consulta de editais não informa e que são as
          que carregam risco.
        </p>
      ) : (
        <>
          <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2 mt-5 pb-4 border-b border-border">
            <span className="text-sm">
              <strong className="tabular-nums">{total}</strong>{" "}
              {total === 1 ? "contrato no cadastro" : "contratos no cadastro"}
            </span>
            {vencidos.length > 0 && (
              <span className="text-sm font-semibold" style={{ color: "var(--urgente)" }}>
                {vencidos.length} com vigência encerrada
              </span>
            )}
            {semTempo.length > 0 && (
              <span className="text-sm font-semibold" style={{ color: "var(--urgente)" }}>
                {semTempo.length} sem tempo para nova licitação
              </span>
            )}
            {comAditivo.length > 0 && (
              <span className="text-sm font-semibold" style={{ color: "var(--medio)" }}>
                {comAditivo.length} com valor global bem acima do inicial
              </span>
            )}
          </div>

          {contratos.length === 0 ? (
            <p
              className="text-sm rounded-lg px-4 py-3 mt-4"
              style={{ background: "var(--accent-tint)", color: "var(--accent)" }}
            >
              Nenhum contrato pede decisão agora: todos os {total} estão vigentes com folga.
            </p>
          ) : (
            <ul className="mt-4 flex flex-col gap-3">
              {contratos.map((c) => (
                <li key={c.id} className="border border-border rounded-lg px-4 py-3.5">
                  <div className="flex items-start gap-2.5">
                    <MarcadorSituacao situacao={MARCADOR[c.vigencia.situacao]} className="mt-1" />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-sm">
                        {c.fornecedorNome ?? "Contratado não informado"}
                        {c.numeroContrato && (
                          <span className="font-normal text-muted"> — contrato {c.numeroContrato}</span>
                        )}
                      </p>
                      <p className="text-sm text-muted mt-0.5 leading-relaxed">{c.objeto}</p>

                      <p className="text-sm mt-2 leading-relaxed">{c.vigencia.texto}</p>
                      {c.vigencia.acao && (
                        <p className="text-sm text-muted mt-1.5 leading-relaxed">{c.vigencia.acao}</p>
                      )}

                      {c.aditivo.situacao === "acima_se_for_acrescimo" && (
                        <div
                          className="mt-2.5 rounded-lg px-3 py-2.5"
                          style={{ background: "var(--medio-tint)" }}
                        >
                          <p className="text-sm leading-relaxed" style={{ color: "var(--medio)" }}>
                            {c.aditivo.texto}
                          </p>
                          <p className="text-sm text-muted mt-1 leading-relaxed">{c.aditivo.acao}</p>
                        </div>
                      )}

                      <p className="text-xs text-muted mt-2 flex flex-wrap gap-x-3 gap-y-1">
                        {c.fornecedorDocumento && (
                          <span className="tabular-nums">
                            {documentoExibivel(c.fornecedorDocumento, c.fornecedorTipoPessoa)}
                          </span>
                        )}
                        {moeda(c.valorGlobal) && <span>{moeda(c.valorGlobal)}</span>}
                        {c.frutoAdesao && <span>adesão a ata</span>}
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
        Os prazos citados são os do art. 55 da Lei 14.133/2021, que fixa o mínimo entre publicar o
        edital e receber propostas. Quanto tempo leva o processo interno — termo de referência,
        pesquisa de preços, parecer jurídico — a lei não fixa, e esta tela não inventa. A contagem
        de dias úteis desconta sábados e domingos, mas não feriados municipais: o aperto real é
        sempre igual ou maior do que o mostrado aqui, nunca menor.
      </p>
    </section>
  );
}
