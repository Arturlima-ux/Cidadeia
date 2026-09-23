"use client";

import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { abrirCasoBuscaAtiva, registrarEtapaBuscaAtiva, encerrarCasoBuscaAtiva, removerCasoBuscaAtiva } from "../busca-ativa-actions";
import {
  lerCaso,
  etapas,
  emAndamento,
  rotuloSituacaoBusca,
  SITUACOES_BUSCA,
  faltasQueAindaCabem,
  FREQUENCIA_MINIMA_LDB,
  type CasoBuscaAtiva,
} from "@/lib/busca-ativa";

// ── A BUSCA ATIVA, NA PORTA DA ESCOLA ──
// Quem abre o caso é quem viu a cadeira vazia. Cada etapa registrada vira
// a prova de que a escola tentou antes de acionar o Conselho Tutelar.

type Caso = CasoBuscaAtiva & { id: string; escolaId: string; observacao: string | null };

const COR_FREQ = {
  ok: "var(--accent)",
  atencao: "var(--medio)",
  reprovacao: "var(--urgente)",
  sem_dado: "var(--muted)",
} as const;

export default function BuscaAtivaEscola({ escolaId, casos }: { escolaId: string; casos: Caso[] }) {
  const [pendente, iniciar] = useTransition();
  const [msg, setMsg] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);
  const [aberto, setAberto] = useState(false);
  const form = useRef<HTMLFormElement>(null);
  const campo = "w-full rounded-lg border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-brand";

  const comLeitura = casos
    .map((c) => ({ c, l: lerCaso(c) }))
    .sort((a, b) => b.l.peso - a.l.peso || a.c.alunoNome.localeCompare(b.c.alunoNome, "pt-BR"));
  const correndo = comLeitura.filter((x) => emAndamento(x.c.situacao));
  const fechados = comLeitura.filter((x) => !emAndamento(x.c.situacao));

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-semibold text-sm text-muted uppercase tracking-wide">Busca ativa</h2>
          <p className="text-sm text-muted mt-1 leading-relaxed max-w-2xl">
            O aluno que parou de vir. A LDB exige {FREQUENCIA_MINIMA_LDB}% de frequência (art. 24, VI) e o
            ECA manda comunicar o Conselho Tutelar depois de esgotados os recursos escolares (art. 56, II)
            — cada tentativa registrada aqui é a prova de que eles foram esgotados.
            {correndo.length > 0 && (
              <span className="font-semibold" style={{ color: "var(--medio)" }}> {correndo.length} caso(s) em andamento.</span>
            )}
          </p>
        </div>
        {!aberto && (
          <button
            type="button"
            onClick={() => setAberto(true)}
            className="text-sm font-semibold border border-border rounded-full px-4 py-2 hover:border-brand hover:text-brand transition whitespace-nowrap"
          >
            Abrir caso
          </button>
        )}
      </div>

      {aberto && (
        <form
          ref={form}
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            setMsg(null);
            iniciar(async () => {
              const r = await abrirCasoBuscaAtiva(fd);
              if (r.ok) {
                setMsg({ tipo: "ok", texto: "Caso aberto. Comece pelo contato com a família." });
                form.current?.reset();
                setAberto(false);
              } else setMsg({ tipo: "erro", texto: r.erro });
            });
          }}
          className="bg-card border border-border rounded-2xl p-4 grid gap-3 sm:grid-cols-2"
        >
          <input type="hidden" name="escolaId" value={escolaId} />
          <div>
            <label htmlFor="ba-nome" className="block text-xs font-medium mb-1">Nome do aluno</label>
            <input id="ba-nome" name="alunoNome" required minLength={3} maxLength={120} className={campo} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="ba-turma" className="block text-xs font-medium mb-1">Turma</label>
              <input id="ba-turma" name="alunoTurma" maxLength={40} className={campo} placeholder="5º ano B" />
            </div>
            <div>
              <label htmlFor="ba-idade" className="block text-xs font-medium mb-1">Idade</label>
              <input id="ba-idade" name="idade" type="number" min={3} max={25} inputMode="numeric" className={campo} />
            </div>
          </div>
          <div>
            <label htmlFor="ba-periodo" className="block text-xs font-medium mb-1">Período de referência</label>
            <input id="ba-periodo" name="periodo" required maxLength={60} className={campo} placeholder="2º bimestre de 2026" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="ba-faltas" className="block text-xs font-medium mb-1">Faltas</label>
              <input id="ba-faltas" name="faltas" type="number" min={0} required inputMode="numeric" className={campo} />
            </div>
            <div>
              <label htmlFor="ba-aulas" className="block text-xs font-medium mb-1">Aulas no período</label>
              <input id="ba-aulas" name="aulasPeriodo" type="number" min={1} required inputMode="numeric" className={campo} />
            </div>
          </div>
          <div>
            <label htmlFor="ba-ultima" className="block text-xs font-medium mb-1">Última presença</label>
            <input id="ba-ultima" name="ultimaPresenca" type="date" className={campo} />
          </div>
          <label className="flex items-center gap-2 text-sm rounded-xl border border-border px-3 py-2.5">
            <input type="checkbox" name="bolsaFamilia" className="accent-[var(--brand)]" />
            <span>
              Família recebe Bolsa Família
              <span className="block text-xs text-muted">Frequência abaixo do mínimo suspende o benefício.</span>
            </span>
          </label>
          <div className="sm:col-span-2 flex flex-wrap items-center gap-3">
            <button type="submit" disabled={pendente} className="bg-brand hover:bg-brand-dark text-white text-sm font-semibold rounded-xl px-5 py-2.5 transition disabled:opacity-60">
              {pendente ? "Abrindo…" : "Abrir caso"}
            </button>
            <button type="button" onClick={() => setAberto(false)} className="text-sm text-muted hover:text-foreground">
              Cancelar
            </button>
            <p className="text-[11px] text-muted">
              Só nome e turma: sem CPF, sem NIS, sem endereço. O que não é necessário não se coleta.
            </p>
          </div>
        </form>
      )}
      {msg && (
        <p role={msg.tipo === "erro" ? "alert" : "status"} className="text-sm" style={{ color: msg.tipo === "erro" ? "var(--urgente)" : "var(--accent)" }}>
          {msg.texto}
        </p>
      )}

      {correndo.map(({ c, l }) => (
        <article key={c.id} className="rounded-2xl border p-4 space-y-3" style={{ borderColor: COR_FREQ[l.situacaoFrequencia] }}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-semibold">
                {c.alunoNome}
                {c.alunoTurma && <span className="text-sm font-normal text-muted"> · {c.alunoTurma}</span>}
              </p>
              <p className="text-xs text-muted mt-0.5">
                {c.faltas} falta(s) em {c.aulasPeriodo} aula(s) · {c.periodo}
                {l.diasFora !== null && ` · ${l.diasFora} dia(s) sem aparecer`}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="font-serif text-xl font-bold tabular-nums" style={{ color: COR_FREQ[l.situacaoFrequencia] }}>
                {l.frequencia === null ? "—" : `${l.frequencia.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`}
              </p>
              <p className="text-[11px] text-muted">frequência</p>
            </div>
          </div>

          {l.situacaoFrequencia === "reprovacao" ? (
            <p className="text-sm" style={{ color: "var(--urgente)" }}>
              Abaixo dos {FREQUENCIA_MINIMA_LDB}% que a LDB exige para aprovação — já é caso de reprovação por falta.
            </p>
          ) : (
            faltasQueAindaCabem(c.faltas, c.aulasPeriodo) !== null && (
              <p className="text-sm text-muted">
                Ainda cabem {faltasQueAindaCabem(c.faltas, c.aulasPeriodo)} falta(s) antes de cair abaixo dos{" "}
                {FREQUENCIA_MINIMA_LDB}%.
              </p>
            )
          )}
          {l.riscoBolsaFamilia && <p className="text-sm leading-relaxed">{l.riscoBolsaFamilia}</p>}

          <p className="text-sm leading-relaxed rounded-xl px-3 py-2.5" style={{ background: "var(--medio-tint)" }}>
            <span className="text-[11px] font-bold uppercase tracking-wider mr-1.5" style={{ color: "var(--medio)" }}>
              Agora
            </span>
            {l.proximaAcao}
          </p>

          {/* as etapas — o que a lei chama de recursos escolares */}
          <ol className="grid sm:grid-cols-2 gap-2">
            {etapas(c).map((et) => (
              <li key={et.chave} className="rounded-xl border border-border px-3 py-2 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{et.rotulo}</p>
                  <p className="text-[11px] text-muted leading-snug">
                    {et.feitaEm ? `feito em ${et.feitaEm.split("-").reverse().join("/")}` : et.explicacao}
                  </p>
                </div>
                {et.feitaEm ? (
                  <span className="text-xs font-bold shrink-0" style={{ color: "var(--accent)" }} aria-label="feito">
                    ✓
                  </span>
                ) : (
                  <button
                    type="button"
                    disabled={pendente}
                    onClick={() =>
                      iniciar(async () => {
                        const r = await registrarEtapaBuscaAtiva(c.id, et.chave);
                        if (!r.ok) setMsg({ tipo: "erro", texto: r.erro });
                      })
                    }
                    className="text-[11px] font-semibold border border-border rounded-full px-2.5 py-1 hover:border-brand hover:text-brand transition shrink-0 disabled:opacity-60"
                  >
                    marcar
                  </button>
                )}
              </li>
            ))}
          </ol>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/dashboard/secretarias/educacao/busca-ativa/${c.id}/oficio`}
              className="text-sm font-semibold border border-border rounded-full px-4 py-2 hover:border-brand hover:text-brand transition"
            >
              Ofício ao Conselho Tutelar →
            </Link>
            <FormularioDesfecho id={c.id} onErro={(e) => setMsg({ tipo: "erro", texto: e })} />
            <button
              type="button"
              disabled={pendente}
              onClick={() => {
                if (!confirm("Remover este caso? A trilha de auditoria guarda o registro.")) return;
                iniciar(async () => {
                  const r = await removerCasoBuscaAtiva(c.id);
                  if (!r.ok) setMsg({ tipo: "erro", texto: r.erro });
                });
              }}
              className="text-xs text-muted hover:text-[color:var(--urgente)] transition ml-auto"
            >
              remover
            </button>
          </div>
        </article>
      ))}

      {fechados.length > 0 && (
        <details>
          <summary className="text-xs font-semibold text-muted cursor-pointer">{fechados.length} caso(s) encerrado(s)</summary>
          <ul className="mt-2 rounded-2xl border border-border divide-y divide-border opacity-80">
            {fechados.map(({ c, l }) => (
              <li key={c.id} className="px-4 py-2.5 text-sm">
                <span className="font-medium">{c.alunoNome}</span>
                <span className="text-muted">
                  {" "}— {rotuloSituacaoBusca(c.situacao)} · {c.periodo}
                  {l.frequencia !== null && ` · ${l.frequencia.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}% de frequência`}
                </span>
                {c.observacao && <span className="block text-xs text-muted">{c.observacao}</span>}
              </li>
            ))}
          </ul>
        </details>
      )}

      {casos.length === 0 && !aberto && (
        <p className="text-sm text-muted border border-dashed border-border rounded-2xl p-6 text-center">
          Nenhum caso de busca ativa nesta escola. Abra um quando um aluno parar de vir — quanto antes, mais
          fácil é trazer de volta.
        </p>
      )}
    </section>
  );
}

function FormularioDesfecho({ id, onErro }: { id: string; onErro: (e: string) => void }) {
  const [pendente, iniciar] = useTransition();
  const [aberto, setAberto] = useState(false);

  if (!aberto) {
    return (
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="text-sm font-semibold border border-border rounded-full px-4 py-2 hover:border-brand hover:text-brand transition"
      >
        Encerrar caso
      </button>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        iniciar(async () => {
          const r = await encerrarCasoBuscaAtiva(fd);
          if (r.ok) setAberto(false);
          else onErro(r.erro);
        });
      }}
      className="flex flex-wrap items-center gap-2"
    >
      <input type="hidden" name="id" value={id} />
      <select name="situacao" required defaultValue="retornou" className="rounded-lg border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-brand">
        {SITUACOES_BUSCA.filter((s) => s.chave !== "aberta" && s.chave !== "conselho_tutelar").map((s) => (
          <option key={s.chave} value={s.chave}>
            {s.rotulo}
          </option>
        ))}
      </select>
      <input name="observacao" maxLength={300} placeholder="Como terminou" className="rounded-lg border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-brand min-w-[180px]" />
      <button type="submit" disabled={pendente} className="bg-brand hover:bg-brand-dark text-white text-sm font-semibold rounded-xl px-4 py-2 transition disabled:opacity-60">
        {pendente ? "…" : "Salvar"}
      </button>
      <button type="button" onClick={() => setAberto(false)} className="text-sm text-muted hover:text-foreground">
        Cancelar
      </button>
    </form>
  );
}
