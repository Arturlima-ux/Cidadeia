"use client";

import { useState, useTransition } from "react";
import {
  conferirNoPncp,
  importarDoPncp,
  type ResultadoConferencia,
  type ResultadoImportacao,
} from "./pncp-actions";
import { linkPncp } from "@/lib/pncp";

/**
 * Conferência sob demanda, nunca automática ao abrir a tela.
 *
 * Cada conferência dispara uma chamada por página e por modalidade ao PNCP, que
 * limita requisições com facilidade. Rodar sozinho a cada visita levaria a
 * consulta ao limite e a tela passaria a dizer "não consta" para processo que
 * está lá — o pior erro possível numa tela cujo propósito é apontar ausência.
 *
 * ── AS DUAS DIREÇÕES ──
 *
 * O painel fazia uma pergunta só: "o que eu cadastrei está no PNCP?". A de trás
 * para frente é mais forte, porque o PNCP tem TUDO desde abril de 2024: num
 * município de verdade são centenas de processos, e o cadastro local tem os que
 * alguém teve paciência de digitar. Quem escolheu quais digitar escolheu, sem
 * querer, o que o detector de fracionamento olha.
 *
 * ── E O TERCEIRO ESTADO ──
 *
 * "Não consta no PNCP" significa contrato sem eficácia (art. 94) e pagamento
 * irregular na conta do gestor. É pesado, e por isso só aparece quando a
 * varredura foi completa. Consulta que ficou pela metade mostra "não deu para
 * confirmar", em tom de aviso e sem cobrança — a tela prefere admitir limite a
 * acusar por falta de dado.
 */
export default function PainelPncp({ ano }: { ano: number }) {
  const [pendente, iniciar] = useTransition();
  const [importando, iniciarImportacao] = useTransition();
  const [resultado, setResultado] = useState<ResultadoConferencia | null>(null);
  const [importacao, setImportacao] = useState<ResultadoImportacao | null>(null);

  function conferir() {
    setImportacao(null);
    iniciar(async () => setResultado(await conferirNoPncp(ano)));
  }

  function importar() {
    iniciarImportacao(async () => {
      const r = await importarDoPncp(ano);
      setImportacao(r);
      // Depois de importar, o cadastro mudou: reconferir é o que mantém os dois
      // números da tela coerentes entre si.
      if (r.ok && r.importados > 0) setResultado(await conferirNoPncp(ano));
    });
  }

  const ausentes = resultado?.ok ? resultado.conferencias.filter((c) => c.situacao === "ausente") : [];
  const indeterminadas = resultado?.ok
    ? resultado.conferencias.filter((c) => c.situacao === "indeterminada")
    : [];
  // Dois motivos, dois desfechos diferentes para quem lê: um se resolve
  // tentando de novo, o outro se resolve importando do portal.
  const ambiguas = indeterminadas.filter((c) => c.motivo === "numero_ambiguo");
  const naoVarridas = indeterminadas.filter((c) => c.motivo !== "numero_ambiguo");

  return (
    <section className="bg-card border border-border arco-card p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold tracking-[-0.02em]">Processos no PNCP</h2>
          <p className="text-sm text-muted mt-1.5 leading-relaxed max-w-xl">
            A divulgação no Portal Nacional de Contratações Públicas é{" "}
            <strong className="text-foreground">condição de eficácia do contrato</strong> —
            processo não publicado não produz efeito. Como todo município é obrigado a
            publicar lá desde abril de 2024, o portal também serve de espelho: ele mostra
            os processos de {ano} que o cadastro daqui ainda não tem.
          </p>
        </div>
        <button
          type="button"
          onClick={conferir}
          disabled={pendente || importando}
          className="shrink-0 bg-brand hover:bg-brand-dark text-white font-semibold text-sm rounded-lg px-5 py-2.5 transition disabled:opacity-50"
        >
          {pendente ? "Consultando…" : "Consultar o PNCP"}
        </button>
      </div>

      {resultado && !resultado.ok && (
        <p
          className="text-sm rounded-lg px-4 py-3 mt-5 leading-relaxed"
          style={{
            background: resultado.limiteExcedido ? "var(--medio-tint)" : "var(--urgente-tint)",
            color: resultado.limiteExcedido ? "var(--medio)" : "var(--urgente)",
          }}
        >
          {resultado.erro}
        </p>
      )}

      {resultado?.ok && (
        <div className="mt-5">
          {/* As duas contagens lado a lado. É a comparação que dá o susto útil:
              o portal tem centenas, a tela tem as que alguém digitou. */}
          <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2 pb-4 border-b border-border">
            <span className="text-sm">
              O PNCP tem <strong className="tabular-nums">{resultado.totalNoPncp}</strong>{" "}
              {resultado.totalNoPncp === 1 ? "contratação" : "contratações"} deste CNPJ em {ano}
            </span>
            <span className="text-sm">
              <strong className="tabular-nums">{resultado.publicadas}</strong> de{" "}
              <strong className="tabular-nums">{resultado.total}</strong> do cadastro daqui
              constam lá
            </span>
            {ausentes.length > 0 && (
              <span className="text-sm font-semibold" style={{ color: "var(--urgente)" }}>
                {ausentes.length} sem publicação
              </span>
            )}
          </div>

          {!resultado.completa && (
            <p
              className="text-sm rounded-lg px-4 py-3 mt-4 leading-relaxed"
              style={{ background: "var(--medio-tint)", color: "var(--medio)" }}
            >
              A consulta não terminou de varrer {resultado.modalidadesIncompletas.join(", ")}. Os
              processos encontrados valem — achar é prova. O que não foi encontrado fica como{" "}
              <strong>não confirmado</strong>, e não como ausente: com varredura pela metade,
              dizer &ldquo;não está no PNCP&rdquo; seria acusar sem ter olhado.
            </p>
          )}

          {/* ── A OFERTA DE IMPORTAÇÃO ── */}
          {resultado.soNoPncp.length > 0 && (
            <div
              className="mt-4 rounded-lg border px-4 py-4"
              style={{ borderColor: "var(--info-borda)", background: "var(--info-tint)" }}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="max-w-xl">
                  <p className="font-semibold text-sm">
                    {resultado.soNoPncp.length}{" "}
                    {resultado.soNoPncp.length === 1
                      ? "processo está no PNCP e não no cadastro"
                      : "processos estão no PNCP e não no cadastro"}
                  </p>
                  <p className="text-sm text-muted mt-1.5 leading-relaxed">
                    Enquanto eles não entram, a verificação de fracionamento e a de
                    concentração de fornecedor rodam só sobre o que foi digitado à mão — e
                    ninguém digita centenas de dispensas. Importar traz número, objeto,
                    modalidade, valor estimado e a data de publicação do próprio portal.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={importar}
                  disabled={importando || pendente}
                  className="shrink-0 bg-brand hover:bg-brand-dark text-white font-semibold text-sm rounded-lg px-4 py-2.5 transition disabled:opacity-50"
                >
                  {importando ? "Importando…" : `Importar os ${resultado.soNoPncp.length}`}
                </button>
              </div>

              <details className="mt-3">
                <summary className="text-sm font-semibold cursor-pointer text-muted hover:text-foreground transition">
                  Ver o que entraria
                </summary>
                <ul className="mt-2 flex flex-col gap-1.5">
                  {resultado.soNoPncp.slice(0, 25).map((c) => (
                    <li key={c.numeroControlePncp} className="text-sm flex flex-wrap gap-x-2">
                      <span className="font-medium tabular-nums">
                        {c.numeroCompra}/{c.anoCompra}
                      </span>
                      <span className="text-muted">{c.modalidade}</span>
                      <span className="text-muted">— {c.objeto.slice(0, 90)}</span>
                    </li>
                  ))}
                </ul>
                {resultado.soNoPncp.length > 25 && (
                  <p className="text-xs text-muted mt-2">
                    e outros {resultado.soNoPncp.length - 25}.
                  </p>
                )}
              </details>

              <p className="text-xs text-muted mt-3 leading-relaxed">
                Entram como <strong>publicados</strong>, não como homologados: o portal informa
                que a contratação foi divulgada, e quem venceu é dado de contrato, num outro
                endereço. Por isso o fornecedor fica em branco até a etapa dos contratos.
              </p>
            </div>
          )}

          {importacao && (
            <p
              className="text-sm rounded-lg px-4 py-3 mt-4 leading-relaxed"
              style={
                importacao.ok
                  ? { background: "var(--accent-tint)", color: "var(--accent)" }
                  : { background: "var(--urgente-tint)", color: "var(--urgente)" }
              }
            >
              {importacao.ok
                ? importacao.importados === 0
                  ? "Nada novo para importar — o cadastro já tem tudo que o PNCP publicou neste ano."
                  : `${importacao.importados} ${
                      importacao.importados === 1 ? "processo importado" : "processos importados"
                    }. Recarregue a página para ver a verificação de fracionamento sobre eles.`
                : importacao.erro}
            </p>
          )}

          {resultado.total === 0 && resultado.soNoPncp.length === 0 && (
            <p className="text-sm text-muted mt-4 leading-relaxed">
              Nenhum processo publicado ou em disputa foi cadastrado ainda, e o PNCP também não
              tem contratação deste CNPJ em {ano}. Os que estão em planejamento não entram na
              conferência — ainda não deveriam estar no portal.
            </p>
          )}

          {ausentes.length > 0 && (
            <ul className="mt-4 flex flex-col gap-3">
              {ausentes.map((c) => (
                <li
                  key={c.licitacao.id}
                  className="border rounded-lg px-4 py-3"
                  style={{ borderColor: "var(--urgente-borda)", background: "var(--urgente-tint)" }}
                >
                  <p className="font-semibold text-sm">
                    {c.licitacao.numero}{" "}
                    <span className="font-normal text-muted">— não consta no PNCP</span>
                  </p>
                  <p className="text-sm text-muted mt-1 leading-relaxed">{c.licitacao.objeto}</p>
                </li>
              ))}
            </ul>
          )}

          {ambiguas.length > 0 && (
            <details className="mt-4">
              <summary className="text-sm font-semibold cursor-pointer text-muted hover:text-foreground transition">
                {ambiguas.length} em que o número não identifica o processo
              </summary>
              <ul className="mt-3 flex flex-col gap-2">
                {ambiguas.map((c) => (
                  <li key={c.licitacao.id} className="text-sm">
                    <span className="font-medium">{c.licitacao.numero}</span>{" "}
                    <span className="text-muted">— {c.licitacao.objeto}</span>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-muted mt-2 leading-relaxed">
                O PNCP tem mais de uma contratação com este número e ano, porque a numeração
                dele reinicia por modalidade — num município medido, o número 1 do ano aparece
                nove vezes. Escolher uma seria chutar, e chutar aqui significa dizer
                &ldquo;publicado&rdquo; sobre o processo errado. Informar a modalidade no cadastro
                resolve parte; o vínculo exato vem de importar do portal, que traz o
                identificador nacional do processo.
              </p>
            </details>
          )}

          {naoVarridas.length > 0 && (
            <details className="mt-4">
              <summary className="text-sm font-semibold cursor-pointer text-muted hover:text-foreground transition">
                {naoVarridas.length} que a consulta não alcançou
              </summary>
              <ul className="mt-3 flex flex-col gap-2">
                {naoVarridas.map((c) => (
                  <li key={c.licitacao.id} className="text-sm">
                    <span className="font-medium">{c.licitacao.numero}</span>{" "}
                    <span className="text-muted">— {c.licitacao.objeto}</span>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-muted mt-2 leading-relaxed">
                Não é o mesmo que ausente. A consulta ficou pela metade, então não dá para
                afirmar nada sobre estes. Tente de novo em alguns minutos.
              </p>
            </details>
          )}

          {resultado.total > 0 && ausentes.length === 0 && indeterminadas.length === 0 && (
            <p
              className="text-sm rounded-lg px-4 py-3 mt-4"
              style={{ background: "var(--accent-tint)", color: "var(--accent)" }}
            >
              Todos os {resultado.total} processos conferidos constam no PNCP.
            </p>
          )}

          {resultado.publicadas > 0 && (
            <details className="mt-4">
              <summary className="text-sm font-semibold cursor-pointer text-muted hover:text-foreground transition">
                Ver os {resultado.publicadas} que estão publicados
              </summary>
              <ul className="mt-3 flex flex-col gap-2">
                {resultado.conferencias
                  .filter((c) => c.situacao === "publicada" && c.correspondente)
                  .map((c) => {
                    const link = linkPncp(c.correspondente!);
                    return (
                      <li key={c.licitacao.id} className="text-sm flex flex-wrap gap-x-3 gap-y-1">
                        <span className="font-medium">{c.licitacao.numero}</span>
                        <span className="text-muted">{c.correspondente!.modalidade}</span>
                        {link && (
                          <a
                            href={link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-brand font-semibold hover:underline"
                          >
                            abrir no PNCP →
                          </a>
                        )}
                      </li>
                    );
                  })}
              </ul>
            </details>
          )}
        </div>
      )}

      <p className="text-xs text-muted mt-5 pt-4 border-t border-border leading-relaxed">
        Conferimos e importamos, não publicamos: publicar exige credenciamento da plataforma
        junto ao Ministério da Gestão para representar o CNPJ do município. Enquanto isso,
        apontar o que falta já evita o contrato sem eficácia.
      </p>
    </section>
  );
}
