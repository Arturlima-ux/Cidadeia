import {
  montarPainelPrazos,
  descreverPrazo,
  NOME_SITUACAO_PRAZO,
  type EntradaPrazo,
} from "@/lib/prazo-atendimento";
import { NOME_TIPO, type TipoAtendimento, type StatusAtendimento } from "@/lib/atendimento";
import BotaoProrrogar from "./BotaoProrrogar";

type Atendimento = EntradaPrazo & {
  id: string;
  protocolo: string;
  assunto: string;
  tipo: TipoAtendimento;
  status: StatusAtendimento;
};

/**
 * Componente de servidor: a avaliação de prazo é pura e roda sobre dados já
 * carregados, então não custa JavaScript no navegador do servidor público.
 */
export default function PainelPrazos({ atendimentos }: { atendimentos: Atendimento[] }) {
  const painel = montarPainelPrazos(atendimentos);
  const precisaAcao = painel.vencidos.length + painel.vencendo.length;

  return (
    <section className="bg-card border border-border arco-card p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-serif text-lg font-bold">Prazo de resposta</h2>
          <p className="text-sm text-muted mt-1.5 leading-relaxed max-w-xl">
            Pedido de informação tem{" "}
            <strong className="text-foreground">20 dias</strong> pela Lei de Acesso à
            Informação; as demais manifestações têm{" "}
            <strong className="text-foreground">30 dias</strong> pela Lei 13.460. A
            contagem é em dias corridos, a partir da abertura.
          </p>
        </div>
        <div className="flex gap-5 shrink-0 text-center">
          <Contador n={painel.vencidos.length} rotulo="vencidos" tom="urgente" />
          <Contador n={painel.vencendo.length} rotulo="vencendo" tom="medio" />
          <Contador n={painel.noPrazo} rotulo="no prazo" tom="neutro" />
        </div>
      </div>

      {painel.total === 0 && (
        <p className="text-sm text-muted mt-5">Nenhuma manifestação registrada ainda.</p>
      )}

      {painel.total > 0 && precisaAcao === 0 && (
        <p
          className="text-sm rounded-lg px-4 py-3 mt-5"
          style={{ background: "var(--info-tint)", color: "var(--info)" }}
        >
          Nenhuma manifestação com prazo vencido ou perto de vencer.
        </p>
      )}

      {painel.vencidos.length > 0 && (
        <Bloco titulo="Prazo vencido" tom="urgente" itens={painel.vencidos} />
      )}
      {painel.vencendo.length > 0 && (
        <Bloco titulo="Vence nos próximos dias" tom="medio" itens={painel.vencendo} />
      )}

      <p className="text-xs text-muted mt-5 pt-4 border-t border-border leading-relaxed">
        A prorrogação existe em lei — 10 dias na LAI, 30 na Lei 13.460 —, mas
        exige justificativa expressa comunicada ao cidadão. Por isso ela é
        marcada aqui como um ato seu, e não concedida sozinha quando o prazo
        aperta.
      </p>
    </section>
  );
}

function Contador({
  n,
  rotulo,
  tom,
}: {
  n: number;
  rotulo: string;
  tom: "urgente" | "medio" | "neutro";
}) {
  const cor =
    tom === "urgente" ? "var(--urgente)" : tom === "medio" ? "var(--medio)" : "var(--muted)";
  return (
    <div>
      <p className="font-serif text-2xl font-extrabold tabular-nums leading-none" style={{ color: cor }}>
        {n}
      </p>
      <p className="text-[11px] uppercase tracking-wide text-muted mt-1">{rotulo}</p>
    </div>
  );
}

function Bloco({
  titulo,
  tom,
  itens,
}: {
  titulo: string;
  tom: "urgente" | "medio";
  itens: ReturnType<typeof montarPainelPrazos<Atendimento>>["vencidos"];
}) {
  const cor = tom === "urgente" ? "var(--urgente)" : "var(--medio)";
  const fundo = tom === "urgente" ? "var(--urgente-tint)" : "var(--medio-tint)";
  const borda = tom === "urgente" ? "var(--urgente-borda)" : "var(--medio-borda)";

  return (
    <div className="mt-5">
      <h3 className="text-sm font-semibold" style={{ color: cor }}>
        {titulo}
      </h3>
      <ul className="flex flex-col gap-2.5 mt-3">
        {itens.map(({ atendimento, avaliacao }) => (
          <li
            key={atendimento.id}
            className="border rounded-lg px-4 py-3 flex flex-wrap items-start justify-between gap-x-4 gap-y-2"
            style={{ borderColor: borda, background: fundo }}
          >
            <div className="min-w-0">
              <p className="text-sm font-semibold">
                <span className="font-mono">{atendimento.protocolo}</span>
                <span className="font-normal text-muted"> · {NOME_TIPO[atendimento.tipo]}</span>
              </p>
              <p className="text-sm text-muted mt-0.5 leading-relaxed">{atendimento.assunto}</p>
              <p className="text-xs mt-1.5 font-mono text-muted">
                {avaliacao.prazo.lei}, {avaliacao.prazo.artigo} · prazo de{" "}
                {avaliacao.prazoDias} dias
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-sm font-semibold" style={{ color: cor }}>
                {descreverPrazo(avaliacao)}
              </p>
              <p className="text-[11px] uppercase tracking-wide text-muted mt-0.5">
                {NOME_SITUACAO_PRAZO[avaliacao.situacao]}
              </p>
              {avaliacao.podeProrrogar && (
                <BotaoProrrogar
                  id={atendimento.id}
                  diasExtras={avaliacao.prazo.prorrogacao ?? 0}
                />
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
