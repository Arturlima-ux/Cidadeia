"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  BLOCOS,
  EXIGENCIAS,
  NOME_BLOCO,
  NOME_NIVEL,
  avaliar,
  exigenciasDoBloco,
  type Exigencia,
  type Nivel,
  type Resposta,
} from "@/lib/diagnostico";
import { IconCheck, IconAlertas, IconDownload } from "@/components/icons";

// Um bloco por vez, e o resultado só no fim. Mostrar a nota subindo a cada
// clique convida a voltar e "melhorar" a resposta — o diagnóstico deixaria
// de medir a prefeitura e passaria a medir a vontade do gestor.

const OPCOES: { valor: Resposta; rotulo: string }[] = [
  { valor: "sim", rotulo: "Sim" },
  { valor: "nao", rotulo: "Não" },
  { valor: "nao_sei", rotulo: "Não sei" },
];

const COR_NIVEL: Record<Nivel, { texto: string; fundo: string; borda: string }> = {
  critico: { texto: "var(--urgente)", fundo: "var(--urgente-tint)", borda: "var(--urgente-borda)" },
  atencao: { texto: "var(--medio)", fundo: "var(--medio-tint)", borda: "var(--medio-borda)" },
  adequado: { texto: "var(--accent-claro)", fundo: "var(--accent-tint)", borda: "var(--info-borda)" },
};

export default function Diagnostico() {
  const [respostas, setRespostas] = useState<Record<string, Resposta>>({});
  const [etapa, setEtapa] = useState(0);
  const [concluido, setConcluido] = useState(false);

  const resultado = useMemo(() => avaliar(respostas), [respostas]);
  const ultimaEtapa = etapa === BLOCOS.length - 1;

  const blocoAtual = BLOCOS[etapa];
  const perguntasDaEtapa = exigenciasDoBloco(blocoAtual);
  const etapaCompleta = perguntasDaEtapa.every((e) => respostas[e.id]);

  const respondidas = EXIGENCIAS.filter((e) => respostas[e.id]).length;

  function responder(id: string, valor: Resposta) {
    setRespostas((atual) => ({ ...atual, [id]: valor }));
  }

  function recomecar() {
    setRespostas({});
    setEtapa(0);
    setConcluido(false);
  }

  if (concluido) {
    return (
      <ResultadoDiagnostico
        resultado={resultado}
        aoRecomecar={recomecar}
        aoRevisar={() => {
          setConcluido(false);
          setEtapa(0);
        }}
      />
    );
  }

  return (
    <div
      className="border border-border rounded-2xl overflow-hidden shadow-[var(--shadow-lg)]"
      style={{ background: "var(--card)" }}
    >
      {/* progresso */}
      <div className="border-b border-border px-6 sm:px-8 py-5">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-[11px] font-mono uppercase tracking-[0.14em] text-muted">
              Etapa {etapa + 1} de {BLOCOS.length}
            </p>
            <h2 className="font-serif text-xl sm:text-2xl font-bold mt-1">
              {NOME_BLOCO[blocoAtual]}
            </h2>
          </div>
          <p className="text-xs text-muted tabular-nums">
            {respondidas} de {EXIGENCIAS.length} respondidas
          </p>
        </div>

        <div className="flex gap-1.5 mt-4" aria-hidden>
          {BLOCOS.map((b, i) => (
            <span
              key={b}
              className="h-1 flex-1 rounded-full transition-colors"
              style={{ background: i <= etapa ? "var(--brand)" : "var(--border)" }}
            />
          ))}
        </div>
      </div>

      {/* perguntas do bloco */}
      <div className="px-6 sm:px-8 py-6 flex flex-col gap-5">
        {perguntasDaEtapa.map((e) => (
          <fieldset key={e.id} className="border-b border-border last:border-b-0 pb-5 last:pb-0">
            <legend className="sr-only">{e.pergunta}</legend>

            <p className="font-semibold leading-snug">{e.pergunta}</p>
            <p className="text-xs text-muted font-mono mt-1.5">
              {e.lei} · {e.artigo}
            </p>

            <div className="flex flex-wrap gap-2 mt-3.5">
              {OPCOES.map((o) => {
                const ativo = respostas[e.id] === o.valor;
                return (
                  <button
                    key={o.valor}
                    type="button"
                    onClick={() => responder(e.id, o.valor)}
                    aria-pressed={ativo}
                    className={`text-sm font-semibold rounded-xl px-5 py-2.5 border transition ${
                      ativo ? "text-white border-transparent" : "text-muted hover:text-foreground"
                    }`}
                    style={{
                      background: ativo ? "var(--brand)" : "transparent",
                      borderColor: ativo ? "transparent" : "var(--border)",
                    }}
                  >
                    {o.rotulo}
                  </button>
                );
              })}
            </div>
          </fieldset>
        ))}
      </div>

      {/* navegação */}
      <div
        className="border-t border-border px-6 sm:px-8 py-5 flex items-center justify-between gap-4"
        style={{ background: "var(--superficie)" }}
      >
        <button
          type="button"
          onClick={() => setEtapa((n) => Math.max(0, n - 1))}
          disabled={etapa === 0}
          className="text-sm font-semibold text-muted hover:text-foreground transition disabled:opacity-0"
        >
          ← Voltar
        </button>

        <button
          type="button"
          onClick={() => (ultimaEtapa ? setConcluido(true) : setEtapa((n) => n + 1))}
          disabled={!etapaCompleta}
          className="text-sm font-bold text-white bg-brand hover:bg-brand-dark rounded-xl px-6 py-3 transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {ultimaEtapa ? "Ver o resultado" : "Continuar"}&nbsp;&nbsp;→
        </button>
      </div>
    </div>
  );
}

function ResultadoDiagnostico({
  resultado,
  aoRecomecar,
  aoRevisar,
}: {
  resultado: ReturnType<typeof avaliar>;
  aoRecomecar: () => void;
  aoRevisar: () => void;
}) {
  const cor = COR_NIVEL[resultado.nivel];
  const abertas = resultado.conformes < resultado.total;

  return (
    <div className="flex flex-col gap-4">
      {/* placar */}
      <div
        className="border rounded-2xl p-7 sm:p-9 text-center"
        style={{ background: cor.fundo, borderColor: cor.borda }}
      >
        <p className="text-[11px] font-mono uppercase tracking-[0.14em]" style={{ color: cor.texto }}>
          {NOME_NIVEL[resultado.nivel]}
        </p>
        <p
          className="font-serif text-[3.4rem] leading-none font-extrabold tracking-[-0.05em] mt-3 tabular-nums"
          style={{ color: cor.texto }}
        >
          {resultado.conformes}
          <span className="text-2xl text-muted">/{resultado.total}</span>
        </p>
        <p className="text-sm text-muted mt-3 max-w-[42ch] mx-auto leading-relaxed">
          exigências legais atendidas, segundo as suas próprias respostas. Nada
          aqui foi verificado no site do município — o diagnóstico vale o que
          vale a resposta.
        </p>
      </div>

      {resultado.incertas.length > 0 && (
        <div
          className="border rounded-2xl p-6"
          style={{ background: "var(--medio-tint)", borderColor: "var(--medio-borda)" }}
        >
          <p className="font-semibold text-sm flex items-center gap-2">
            <IconAlertas className="w-4 h-4 shrink-0" style={{ color: "var(--medio)" }} />
            {resultado.incertas.length} {resultado.incertas.length === 1 ? "resposta" : "respostas"} “não sei”
          </p>
          <p className="text-sm text-muted mt-2 leading-relaxed">
            Contam como não atendidas. Num questionamento do Tribunal de
            Contas, “eu achava que sim” tem o mesmo peso que “não” — a
            prefeitura precisa conseguir demonstrar o cumprimento.
          </p>
        </div>
      )}

      {abertas && (
        <>
          {resultado.cobertas.length > 0 && (
            <ListaExigencias
              titulo="O que o CidadeIA resolve"
              subtitulo="Passa a ser atendido a partir da implantação, sem trabalho adicional da prefeitura."
              itens={resultado.cobertas}
              tom="brand"
            />
          )}

          {resultado.descobertas.length > 0 && (
            <ListaExigencias
              titulo="O que continua com a prefeitura"
              subtitulo="Contratar o CidadeIA não resolve estes pontos. Estão aqui para você não descobrir depois."
              itens={resultado.descobertas}
              tom="neutro"
            />
          )}
        </>
      )}

      {!abertas && (
        <div
          className="border rounded-2xl p-6"
          style={{ background: "var(--accent-tint)", borderColor: "var(--info-borda)" }}
        >
          <p className="font-semibold text-sm flex items-center gap-2">
            <IconCheck className="w-4 h-4 shrink-0" style={{ color: "var(--accent)" }} />
            Nenhuma pendência declarada
          </p>
          <p className="text-sm text-muted mt-2 leading-relaxed">
            Se o município já cumpre tudo isso, a conversa deixa de ser sobre
            conformidade e passa a ser sobre custo e trabalho de manter. Vale
            comparar o valor do que está contratado hoje.
          </p>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 mt-2">
        <Link
          href="/#proposta"
          className="bg-brand hover:bg-brand-dark text-white font-bold text-sm rounded-xl px-6 py-3.5 transition shadow-elevated"
        >
          Ver quanto custa resolver&nbsp;&nbsp;→
        </Link>
        <Link
          href="/kit"
          className="inline-flex items-center gap-2 border border-border font-semibold text-sm rounded-xl px-5 py-3.5 transition hover:bg-white/[0.05]"
        >
          <IconDownload className="w-4 h-4" />
          Baixar o processo de contratação
        </Link>
        <button
          type="button"
          onClick={aoRevisar}
          className="text-sm font-semibold text-muted hover:text-foreground transition"
        >
          Revisar respostas
        </button>
        <button
          type="button"
          onClick={aoRecomecar}
          className="text-sm font-semibold text-muted hover:text-foreground transition"
        >
          Começar de novo
        </button>
      </div>
    </div>
  );
}

function ListaExigencias({
  titulo,
  subtitulo,
  itens,
  tom,
}: {
  titulo: string;
  subtitulo: string;
  itens: Exigencia[];
  tom: "brand" | "neutro";
}) {
  return (
    <div className="border border-border rounded-2xl overflow-hidden" style={{ background: "var(--card)" }}>
      <div className="px-6 py-5 border-b border-border">
        <h3 className="font-serif text-lg font-bold">
          {titulo}{" "}
          <span className="text-muted font-sans font-semibold text-sm tabular-nums">
            ({itens.length})
          </span>
        </h3>
        <p className="text-sm text-muted mt-1.5 leading-relaxed">{subtitulo}</p>
      </div>

      <ul>
        {itens.map((e) => (
          <li key={e.id} className="px-6 py-5 border-b border-border last:border-b-0">
            <p className="font-semibold text-sm leading-snug">{e.pergunta}</p>
            <p className="text-xs font-mono text-muted mt-1.5">
              {e.lei} · {e.artigo}
            </p>
            <p className="text-sm text-muted mt-3 leading-relaxed">{e.risco}</p>
            <p
              className="text-sm mt-2.5 leading-relaxed border-l-2 pl-3"
              style={{
                borderColor: tom === "brand" ? "var(--brand)" : "var(--border)",
                color: tom === "brand" ? "var(--foreground)" : "var(--muted)",
              }}
            >
              {e.comoResolve}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
