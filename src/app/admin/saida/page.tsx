import NavAdmin from "../NavAdmin";
import { notFound, redirect } from "next/navigation";
import { lerSessao } from "@/lib/sessao";
import { emailDaEquipe } from "@/lib/equipe";
import { linkRascunhoGmail, pendentesDaCaixaDeSaida } from "@/lib/caixa-de-saida";
import { marcarEnviado } from "./actions";
import TesteDeEnvio from "./TesteDeEnvio";

export const dynamic = "force-dynamic";

// ── CAIXA DE SAÍDA ──
// Os e-mails para clientes que nenhum dos dois caminhos de envio conseguiu
// entregar (lib/email.ts). Cada um com o rascunho pronto no Gmail e, quando
// é proposta, o PDF para anexar. Ver lib/caixa-de-saida.ts.

function quando(iso: string): string {
  const h = Math.round((Date.now() - Date.parse(iso)) / 3_600_000);
  if (h < 1) return "agora há pouco";
  if (h < 24) return `há ${h} h`;
  const d = Math.round(h / 24);
  return `há ${d} ${d === 1 ? "dia" : "dias"}`;
}

export default async function SaidaPage() {
  if (!(await lerSessao())) redirect("/login");
  if (!(await emailDaEquipe())) notFound();
  const pendentes = await pendentesDaCaixaDeSaida();

  return (
    <div className="tema-noite min-h-screen bg-background px-4 sm:px-8 py-10">
      <div className="max-w-[1000px] mx-auto space-y-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-semibold tracking-[-0.04em]">Caixa de saída</h1>
            <p className="text-sm text-muted mt-2 max-w-[60ch]">
              E-mails para clientes que o sistema não conseguiu entregar. Abra o rascunho, confira e envie pelo seu
              e-mail; depois marque como enviado.
            </p>
          </div>
          <NavAdmin atual="/admin/saida" />
        </div>

        <TesteDeEnvio />

        {pendentes.length === 0 ? (
          <p className="text-muted rounded-2xl border border-border p-6" style={{ background: "var(--card)" }}>
            Nada esperando. Todos os e-mails para clientes saíram.
          </p>
        ) : (
          <ul className="space-y-3">
            {pendentes.map((e) => (
              <li key={e.id} className="rounded-2xl border border-border p-5" style={{ background: "var(--card)" }}>
                <p className="text-xs text-muted">
                  {quando(e.criadoEm)} · para <span className="text-foreground">{e.para}</span>
                </p>
                <p className="font-semibold text-lg mt-1">{e.assunto}</p>
                <details className="mt-2">
                  <summary className="text-sm text-muted cursor-pointer">Ver o texto</summary>
                  <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed mt-3 text-muted">{e.texto}</pre>
                </details>
                {e.anexos.length > 0 && (
                  <p className="text-sm mt-2" style={{ color: "var(--medio)" }}>
                    Anexo: {e.anexos.join(", ")}. Baixe e anexe no rascunho.
                  </p>
                )}
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <a
                    href={linkRascunhoGmail(e)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-full px-5 py-2.5 text-sm font-semibold"
                    style={{ background: "var(--brand)", color: "var(--sobre-forte)" }}
                  >
                    Abrir rascunho no Gmail
                  </a>
                  {e.pedidoId && (
                    <a href={`/admin/pedidos/${e.pedidoId}/proposta`} className="rounded-full border border-border hover:border-brand px-5 py-2.5 text-sm transition">
                      Baixar o PDF da proposta
                    </a>
                  )}
                  <form
                    action={async () => {
                      "use server";
                      await marcarEnviado(e.id);
                    }}
                  >
                    <button type="submit" className="rounded-full border border-border hover:border-brand px-5 py-2.5 text-sm transition">
                      Já mandei
                    </button>
                  </form>
                </div>
                <p className="text-xs text-muted mt-3">Por que não saiu: {e.motivo}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
