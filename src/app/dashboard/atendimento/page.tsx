import Link from "next/link";
import { contextoDashboard } from "@/lib/contexto-dashboard";
import BloqueioPlano from "@/components/BloqueioPlano";
import EstadoVazio from "@/components/EstadoVazio";
import PilulaStatus, { type TomStatus } from "@/components/PilulaStatus";
import { buscarAtendimentos, buscarConfigPublica, responderAtendimento, salvarConfigPublica } from "./actions";
import PainelResposta from "./PainelResposta";
import ConfigPortal from "./ConfigPortal";
import PainelPrazos from "./PainelPrazos";
import { fusoDoEstado, dataCurta } from "@/lib/horario";
import { NOME_TIPO, NOME_STATUS, type TipoAtendimento } from "@/lib/atendimento";

const TOM_STATUS: Record<string, TomStatus> = {
  aberto: "atencao",
  em_analise: "andamento",
  respondido: "positivo",
  encerrado: "neutro",
};

// A data sai de lib/horario.ts, no fuso do estado da prefeitura. Formatar
// no servidor sem fuso mostrava o dia em UTC: uma manifestação registrada
// às 21h aparecia com a data do dia seguinte, e o cidadão que anotou o dia
// não reconhecia o próprio protocolo.

export default async function AtendimentoPage() {
  const ctx = await contextoDashboard();
  if (!ctx.temPlano("essencial")) return <BloqueioPlano plano="essencial" />;

  const [lista, config] = await Promise.all([
    buscarAtendimentos(ctx.sessao.prefeituraId),
    buscarConfigPublica(ctx.sessao.prefeituraId),
  ]);

  const abertos = lista.filter((a) => a.status === "aberto" || a.status === "em_analise");
  const fechados = lista.filter((a) => a.status === "respondido" || a.status === "encerrado");

  // O painel de prazos olha a lista inteira, inclusive respondidos: é assim
  // que ele sabe distinguir "cumpriu" de "ninguém abriu ainda".
  const paraPrazo = lista.map((a) => ({
    id: a.id,
    protocolo: a.protocolo,
    assunto: a.assunto,
    tipo: a.tipo,
    status: a.status,
    abertoEm: a.createdAt,
    respondidoEm: a.respondidoEm,
    prorrogado: a.prazoProrrogado,
  }));

  const fuso = fusoDoEstado(ctx.prefeitura?.estado);

  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <h1 className="font-serif text-2xl sm:text-3xl font-bold">Atendimento ao cidadão</h1>
        <p className="text-muted text-sm mt-2 max-w-2xl leading-relaxed">
          Protocolo, Ouvidoria e Portal da Transparência. O cidadão abre a
          manifestação pelo portal público do município e acompanha pelo número
          de protocolo; você responde aqui.
        </p>
      </div>

      <PainelPrazos atendimentos={paraPrazo} />

      <ConfigPortal
        acao={salvarConfigPublica}
        config={
          config
            ? {
                slug: config.slug,
                portalAtivo: config.portalAtivo,
                whatsappNumero: config.whatsappNumero,
                mostrarFinanceiro: config.mostrarFinanceiro,
                mostrarObras: config.mostrarObras,
                mostrarLicitacoes: config.mostrarLicitacoes,
              }
            : null
        }
      />

      {/* EM ABERTO */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-sm text-muted uppercase tracking-wide">
            Aguardando resposta ({abertos.length})
          </h2>
        </div>

        {abertos.length === 0 ? (
          <EstadoVazio
            icone="alertas"
            titulo="Nenhuma manifestação aguardando."
            descricao={
              config?.portalAtivo
                ? "Quando um cidadão abrir uma manifestação no portal, ela aparece aqui."
                : "Ative o portal público acima para começar a receber manifestações."
            }
          />
        ) : (
          <div className="space-y-3">
            {abertos.map((a) => (
              <div key={a.id} className="card-interactive bg-card border border-border arco-card-sm p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-semibold">{a.protocolo}</span>
                      <span className="text-[11px] text-muted">
                        {NOME_TIPO[a.tipo as TipoAtendimento] ?? a.tipo} · {dataCurta(a.createdAt, fuso)}
                      </span>
                      {a.anonimo && (
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted bg-sutil rounded-full px-2 py-0.5">
                          Anônimo
                        </span>
                      )}
                    </div>
                    <p className="font-medium text-sm mt-1.5 break-words">{a.assunto}</p>
                    <p className="text-sm text-muted mt-1 leading-relaxed whitespace-pre-line">
                      {a.mensagem}
                    </p>
                    {!a.anonimo && (a.nome || a.email || a.telefone) && (
                      <p className="text-xs text-muted mt-2">
                        {[a.nome, a.email, a.telefone].filter(Boolean).join(" · ")}
                      </p>
                    )}
                  </div>
                  <PilulaStatus
                    label={NOME_STATUS[a.status as keyof typeof NOME_STATUS] ?? a.status}
                    tom={TOM_STATUS[a.status] ?? "neutro"}
                    className="self-start shrink-0"
                  />
                </div>

                <PainelResposta acao={responderAtendimento} id={a.id} statusAtual={a.status} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* RESPONDIDOS */}
      {fechados.length > 0 && (
        <div>
          <h2 className="font-semibold text-sm text-muted uppercase tracking-wide mb-3">
            Respondidas ({fechados.length})
          </h2>
          <div className="space-y-2">
            {fechados.map((a) => (
              <div key={a.id} className="bg-card border border-border arco-card-sm p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <span className="font-mono text-xs font-semibold">{a.protocolo}</span>
                    <p className="font-medium text-sm mt-1 break-words">{a.assunto}</p>
                    {a.resposta && (
                      <p className="text-sm text-muted mt-2 leading-relaxed whitespace-pre-line border-l-2 border-border pl-3">
                        {a.resposta}
                      </p>
                    )}
                  </div>
                  <PilulaStatus
                    label={NOME_STATUS[a.status as keyof typeof NOME_STATUS] ?? a.status}
                    tom={TOM_STATUS[a.status] ?? "neutro"}
                    className="self-start shrink-0"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <Link
        href="/dashboard/central"
        className="group inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:text-brand-dark transition"
      >
        Ver a Central Inteligente
        <span className="inline-block transition-transform duration-200 group-hover:translate-x-1">
          →
        </span>
      </Link>
    </div>
  );
}
