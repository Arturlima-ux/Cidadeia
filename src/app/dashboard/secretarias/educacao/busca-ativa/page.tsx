import Link from "next/link";
import { contextoDashboard } from "@/lib/contexto-dashboard";
import BloqueioPlano from "@/components/BloqueioPlano";
import { buscarCasosDaRede } from "../busca-ativa-actions";
import { buscarRedeDeEscolas } from "../rede-actions";
import {
  lerCaso,
  emAndamento,
  rotuloSituacaoBusca,
  FREQUENCIA_MINIMA_LDB,
  DIAS_PARA_CONSELHO,
} from "@/lib/busca-ativa";

// ── A BUSCA ATIVA DA REDE ──
//
// A escola cuida do caso dela; a secretaria precisa ver a fila inteira, na
// ordem em que ela queima: quem está fora há mais tempo, quem já perdeu o
// ano por falta, quem devia ter ido para o Conselho Tutelar e não foi.

export const metadata = { title: "Busca ativa escolar" };
export const dynamic = "force-dynamic";

const COR_FREQ = {
  ok: "var(--accent)",
  atencao: "var(--medio)",
  reprovacao: "var(--urgente)",
  sem_dado: "var(--muted)",
} as const;

export default async function BuscaAtivaRedePage() {
  const ctx = await contextoDashboard();
  if (!ctx.temPlano("educacao")) return <BloqueioPlano plano="educacao" />;

  const [casos, escolas] = await Promise.all([
    buscarCasosDaRede(ctx.sessao.prefeituraId),
    buscarRedeDeEscolas(ctx.sessao.prefeituraId),
  ]);
  const nomeDe = new Map(escolas.map((e) => [e.id, e.nome]));

  const comLeitura = casos
    .map((c) => ({ c, l: lerCaso(c) }))
    .sort((a, b) => b.l.peso - a.l.peso || a.c.alunoNome.localeCompare(b.c.alunoNome, "pt-BR"));
  const correndo = comLeitura.filter((x) => emAndamento(x.c.situacao));
  const fechados = comLeitura.filter((x) => !emAndamento(x.c.situacao));

  const abaixoDoMinimo = correndo.filter((x) => x.l.situacaoFrequencia === "reprovacao").length;
  const conselhoAtrasado = correndo.filter(
    (x) => x.c.conselhoTutelarEm === null && x.l.diasFora !== null && x.l.diasFora >= DIAS_PARA_CONSELHO
  );
  const comBolsaEmRisco = correndo.filter((x) => x.c.bolsaFamilia && x.l.riscoBolsaFamilia?.includes("abaixo")).length;
  const voltaram = fechados.filter((x) => x.c.situacao === "retornou").length;

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <Link href="/dashboard/secretarias/educacao" className="text-xs font-semibold text-muted hover:text-brand transition">
          ← Secretaria da Educação
        </Link>
        <h1 className="font-serif text-2xl font-bold mt-2">Busca ativa escolar</h1>
        <p className="text-muted text-sm mt-1.5 leading-relaxed max-w-2xl">
          Todo aluno que parou de vir, na ordem em que o problema queima. A LDB exige{" "}
          {FREQUENCIA_MINIMA_LDB}% de frequência para aprovação (art. 24, VI) e o ECA manda comunicar o
          Conselho Tutelar esgotados os recursos escolares (art. 56, II). O que a escola registrou vira a
          prova — e o ofício.
        </p>
      </div>

      {conselhoAtrasado.length > 0 && (
        <p className="text-sm leading-relaxed rounded-xl px-4 py-3 border" style={{ color: "var(--urgente)", background: "var(--urgente-tint)", borderColor: "var(--urgente)" }}>
          <strong>
            {conselhoAtrasado.length} aluno(s) há mais de {DIAS_PARA_CONSELHO} dias fora sem comunicação ao
            Conselho Tutelar.
          </strong>{" "}
          É a omissão que o Ministério Público cobra do município, não da família.
        </p>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Numero rotulo="Em busca ativa" valor={String(correndo.length)} />
        <Numero rotulo={`Abaixo de ${FREQUENCIA_MINIMA_LDB}%`} valor={String(abaixoDoMinimo)} cor={abaixoDoMinimo > 0 ? "var(--urgente)" : undefined} />
        <Numero rotulo="Bolsa Família em risco" valor={String(comBolsaEmRisco)} cor={comBolsaEmRisco > 0 ? "var(--medio)" : undefined} />
        <Numero rotulo="Voltaram para a sala" valor={String(voltaram)} cor={voltaram > 0 ? "var(--accent)" : undefined} />
      </div>

      {correndo.length === 0 ? (
        <p className="text-sm text-muted border border-dashed border-border rounded-2xl p-8 text-center">
          Nenhum caso em andamento. Os casos nascem na ficha de cada escola — é a direção que vê a cadeira
          vazia primeiro.
        </p>
      ) : (
        <div className="overflow-x-auto rolagem-discreta rounded-2xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] font-mono uppercase tracking-[0.12em] text-muted border-b border-border">
                <th className="px-4 py-2.5 font-medium">Aluno</th>
                <th className="px-4 py-2.5 font-medium hidden sm:table-cell">Escola</th>
                <th className="px-4 py-2.5 font-medium text-right">Frequência</th>
                <th className="px-4 py-2.5 font-medium text-right">Fora há</th>
                <th className="px-4 py-2.5 font-medium">Próxima ação</th>
              </tr>
            </thead>
            <tbody>
              {correndo.map(({ c, l }) => (
                <tr key={c.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-2.5">
                    <Link href={`/dashboard/secretarias/educacao/escolas/${c.escolaId}`} className="font-medium hover:text-brand transition">
                      {c.alunoNome}
                    </Link>
                    <span className="block text-xs text-muted">
                      {c.alunoTurma ? `${c.alunoTurma} · ` : ""}
                      {c.periodo}
                      {c.bolsaFamilia ? " · Bolsa Família" : ""}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-muted hidden sm:table-cell">{nomeDe.get(c.escolaId) ?? "—"}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums font-semibold" style={{ color: COR_FREQ[l.situacaoFrequencia] }}>
                    {l.frequencia === null ? "—" : `${l.frequencia.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-muted">{l.diasFora === null ? "—" : `${l.diasFora} d`}</td>
                  <td className="px-4 py-2.5">
                    <span className="text-xs leading-snug">{l.proximaAcao}</span>
                    {l.etapaPendente === "conselho_tutelar" && (
                      <Link
                        href={`/dashboard/secretarias/educacao/busca-ativa/${c.id}/oficio`}
                        className="block text-xs font-semibold text-brand hover:underline mt-1"
                      >
                        gerar o ofício →
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {fechados.length > 0 && (
        <details>
          <summary className="text-xs font-semibold text-muted cursor-pointer">{fechados.length} caso(s) encerrado(s)</summary>
          <ul className="mt-2 rounded-2xl border border-border divide-y divide-border opacity-80">
            {fechados.map(({ c }) => (
              <li key={c.id} className="px-4 py-2.5 text-sm">
                <span className="font-medium">{c.alunoNome}</span>
                <span className="text-muted">
                  {" "}— {rotuloSituacaoBusca(c.situacao)} · {nomeDe.get(c.escolaId) ?? "—"} · {c.periodo}
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}

      <p className="text-xs text-muted leading-relaxed">
        Esta tela guarda nome e turma, e nada além: sem CPF, sem NIS, sem endereço. O município é o
        controlador e a base legal é obrigação própria dele (LGPD, art. 7º, II e art. 23) — mas o que não é
        necessário não se coleta.
      </p>
    </div>
  );
}

function Numero({ rotulo, valor, cor }: { rotulo: string; valor: string; cor?: string }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <p className="text-2xl font-serif font-bold tabular-nums" style={cor ? { color: cor } : undefined}>
        {valor}
      </p>
      <p className="text-xs text-muted mt-1">{rotulo}</p>
    </div>
  );
}
