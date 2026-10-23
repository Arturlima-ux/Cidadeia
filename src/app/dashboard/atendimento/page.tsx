import Link from "next/link";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { atendimentos, pedidoEventos } from "@/db/schema";
import { EVENTO_AREA_AUTOMATICA } from "@/lib/classificar-manifestacao";
import { contextoDashboard } from "@/lib/contexto-dashboard";
import { ehGestor } from "@/lib/sessao";
import { OPCOES_DE_AREA } from "@/lib/areas-da-ouvidoria";
import BloqueioPlano from "@/components/BloqueioPlano";
import { garantirEnderecoPublico } from "@/lib/endereco-publico";
import EstadoVazio from "@/components/EstadoVazio";
import PilulaStatus, { type TomStatus } from "@/components/PilulaStatus";
import { buscarAtendimentos, buscarConfigPublica, responderAtendimento, salvarConfigPublica, sugerirResposta } from "./actions";
import PainelResposta from "./PainelResposta";
import ConfigPortal from "./ConfigPortal";
import PainelPrazos from "./PainelPrazos";
import { fusoDoEstado, dataCurta } from "@/lib/horario";
import { NOME_TIPO, NOME_STATUS, textoFilaVazia, type TipoAtendimento } from "@/lib/atendimento";
import { avaliacoesDaPrefeitura } from "@/lib/avaliacao-cidadao-servidor";
import { NOTAS, resumirSatisfacao, rotuloDaNota } from "@/lib/avaliacao-cidadao";

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
  // Garante o endereço público também para contas criadas antes de ele
  // nascer com o cadastro. Idempotente.
  const slugPublico = ctx.sessao.demo ? null : await garantirEnderecoPublico(ctx.sessao.prefeituraId);
  if (!ctx.temPlano("essencial")) {
    return (
      <BloqueioPlano
        plano="essencial"
        nota={
          slugPublico ? (
            <>
              O endereço público da prefeitura já está no ar:{" "}
              <a href={`/transparencia/${slugPublico}`} target="_blank" rel="noopener noreferrer" className="font-semibold text-brand hover:underline">
                /transparencia/{slugPublico}
              </a>
              . Hoje ele mostra identificação, canais e o dado público do Tesouro. Com o Essencial, ganha
              protocolo, ouvidoria e publicações.
            </>
          ) : null
        }
      />
    );
  }

  const gestor = ehGestor(ctx.sessao);
  const [lista, config, avaliacoes, classificadas] = await Promise.all([
    buscarAtendimentos(ctx.sessao.prefeituraId),
    buscarConfigPublica(ctx.sessao.prefeituraId),
    avaliacoesDaPrefeitura(ctx.sessao.prefeituraId),
    // Área decidida pela leitura do texto (lib/classificar-manifestacao.ts).
    db
      .select({ id: pedidoEventos.pedidoId })
      .from(pedidoEventos)
      .innerJoin(atendimentos, eq(atendimentos.id, pedidoEventos.pedidoId))
      .where(and(eq(atendimentos.prefeituraId, ctx.sessao.prefeituraId), eq(pedidoEventos.tipo, EVENTO_AREA_AUTOMATICA)))
      .then((l) => new Set(l.map((x) => x.id))),
  ]);

  const abertos = lista.filter((a) => a.status === "aberto" || a.status === "em_analise");
  const respondidas = lista.filter((a) => a.status === "respondido" || a.status === "encerrado");
  // "A resposta resolveu?" (lib/avaliacao-cidadao.ts): o que o cidadão disse
  // que não resolveu sobe para o topo, com o espaço para complementar.
  const naoResolveu = respondidas.filter((a) => {
    const n = avaliacoes.get(a.id)?.nota;
    return n === "nao" || n === "parte";
  });
  const fechados = respondidas.filter((a) => !naoResolveu.includes(a));
  const satisfacao = resumirSatisfacao(respondidas.flatMap((a) => avaliacoes.get(a.id) ?? []));

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
    semEmail: !a.email,
  }));

  const fuso = fusoDoEstado(ctx.prefeitura?.estado);

  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-[-0.02em]">Atendimento ao cidadão</h1>
        <p className="text-muted text-sm mt-2 max-w-2xl leading-relaxed">
          {gestor
            ? "Protocolo, Ouvidoria e Portal do Cidadão. O cidadão abre a manifestação pelo portal público do município; quem resolve recebe um e-mail na hora, e o cidadão recebe a confirmação e, depois, a resposta no e-mail dele."
            : "As manifestações do portal que o cidadão endereçou à sua secretaria. Você recebe um e-mail quando chega uma nova; a resposta que você escrever aqui vai por e-mail ao cidadão. Denúncias ficam com o gabinete."}
        </p>
      </div>

      <PainelPrazos atendimentos={paraPrazo} />

      {gestor && <ConfigPortal
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
      />}

      {/* EM ABERTO */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-sm text-muted">
            Aguardando resposta ({abertos.length})
          </h2>
        </div>

        {abertos.length === 0 ? (
          <EstadoVazio
            icone="alertas"
            titulo="Nenhuma manifestação aguardando."
            descricao={textoFilaVazia(gestor, Boolean(config?.portalAtivo))}
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
                        {NOME_TIPO[a.tipo as TipoAtendimento] ?? a.tipo}
                        {OPCOES_DE_AREA.find((o) => o.valor === a.secretaria) && ` · ${OPCOES_DE_AREA.find((o) => o.valor === a.secretaria)!.nome}`}
                        {classificadas.has(a.id) && " (área definida pelo texto)"}
                        {" · "}{dataCurta(a.createdAt, fuso)}
                      </span>
                      {a.anonimo && (
                        <span className="text-xs font-semibold text-muted bg-sutil rounded-full px-2 py-0.5">
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

                <PainelResposta acao={responderAtendimento} id={a.id} statusAtual={a.status} sugerir={sugerirResposta} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* O CIDADÃO DISSE QUE NÃO RESOLVEU */}
      {naoResolveu.length > 0 && (
        <div>
          <h2 className="font-semibold text-sm mb-1" style={{ color: "var(--urgente)" }}>
            O cidadão disse que não resolveu ({naoResolveu.length})
          </h2>
          <p className="text-xs text-muted mb-3">
            Complemente a resposta: ela vai de novo ao cidadão, que pode avaliar outra vez. A satisfação aparece no portal público.
          </p>
          <div className="space-y-3">
            {naoResolveu.map((a) => {
              const av = avaliacoes.get(a.id)!;
              return (
                <div key={a.id} className="bg-card border arco-card-sm p-4" style={{ borderColor: "var(--urgente-borda)" }}>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-semibold">{a.protocolo}</span>
                    <span className="text-[11px] text-muted">
                      {NOME_TIPO[a.tipo as TipoAtendimento] ?? a.tipo} · respondida em {a.respondidoEm ? dataCurta(a.respondidoEm, fuso) : "—"}
                    </span>
                    <span
                      className="text-xs font-semibold rounded-full px-2 py-0.5"
                      style={{ color: NOTAS.find((n) => n.valor === av.nota)!.cor, background: av.nota === "nao" ? "var(--urgente-tint)" : "var(--medio-tint)" }}
                    >
                      {rotuloDaNota(av.nota)}
                    </span>
                  </div>
                  <p className="font-medium text-sm mt-1.5 break-words">{a.assunto}</p>
                  {av.comentario && (
                    <p className="text-sm mt-2 leading-relaxed whitespace-pre-line">
                      <span className="text-xs font-semibold text-muted block">O que faltou, nas palavras do cidadão</span>
                      {av.comentario}
                    </p>
                  )}
                  {a.resposta && (
                    <p className="text-sm text-muted mt-2 leading-relaxed whitespace-pre-line border-l-2 border-border pl-3">
                      {a.resposta}
                    </p>
                  )}
                  <PainelResposta acao={responderAtendimento} id={a.id} statusAtual={a.status} respostaAtual={a.resposta} sugerir={sugerirResposta} />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* RESPONDIDOS */}
      {fechados.length > 0 && (
        <div>
          <h2 className="font-semibold text-sm text-muted mb-3">
            Respondidas ({fechados.length})
            {satisfacao.total > 0 && (
              <span className="font-normal">
                {" · "}
                {satisfacao.percentualResolveu}% dos que avaliaram disseram que resolveu ({satisfacao.total})
              </span>
            )}
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
                    {/* A resposta sai por e-mail quando o cidadão deixou um
                        (lib/ouvidoria-avisos.ts); o que não sai fica na caixa
                        de saída da equipe. */}
                    {avaliacoes.get(a.id) && (
                      <p className="text-xs font-semibold mt-2" style={{ color: "var(--info)" }}>
                        O cidadão avaliou: {rotuloDaNota(avaliacoes.get(a.id)!.nota).toLowerCase()}
                      </p>
                    )}
                    <p className="text-xs text-muted mt-2">
                      {a.email
                        ? "Resposta enviada ao e-mail do cidadão."
                        : a.telefone
                          ? `Sem e-mail: o cidadão vê pelo protocolo. Telefone: ${a.telefone}.`
                          : "Sem e-mail: o cidadão vê pelo protocolo."}
                    </p>
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

      {/* A Central cruza a prefeitura inteira: o proxy a barra para o
          secretário, e o link o devolveria à própria secretaria. */}
      {gestor && <Link
        href="/dashboard/central"
        className="group inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:text-brand-dark transition"
      >
        Ver a Central Inteligente
        <span className="inline-block transition-transform duration-200 group-hover:translate-x-1">
          →
        </span>
      </Link>}
    </div>
  );
}
