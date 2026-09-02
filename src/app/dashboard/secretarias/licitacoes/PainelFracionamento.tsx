import { formatarMoeda } from "@/lib/formatadores";
import {
  analisarFracionamento,
  BASE_LEGAL_FRACIONAMENTO,
  type ProcessoDispensa,
  type GrupoFracionamento,
} from "@/lib/fracionamento";

/**
 * Componente de servidor: a análise é pura e roda sobre dados já carregados,
 * então não há motivo para custar JavaScript no navegador do gestor.
 */
export default function PainelFracionamento({
  processos,
  exercicio,
}: {
  processos: ProcessoDispensa[];
  exercicio: number;
}) {
  const analise = analisarFracionamento(processos, exercicio);
  const temAchado = analise.gruposSuspeitos.length > 0 || analise.gruposEmAtencao.length > 0;

  return (
    <section className="bg-card border border-border arco-card p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-serif text-lg font-bold">Fracionamento de despesa</h2>
          <p className="text-sm text-muted mt-1.5 leading-relaxed max-w-xl">
            A lei manda somar, no exercício, as dispensas de{" "}
            <strong className="text-foreground">objetos de mesma natureza</strong> antes de
            enquadrar no limite. Dividir uma compra grande em várias pequenas para
            caber é vedado — e quase nunca é má-fé, é falta de alguém somando.
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-xs font-mono uppercase tracking-wide text-muted">
            Dispensas em {exercicio}
          </p>
          <p className="font-serif text-xl font-bold tabular-nums mt-0.5">
            {formatarMoeda(analise.totalDispensas)}
          </p>
        </div>
      </div>

      {processos.length === 0 && (
        <p className="text-sm text-muted mt-5 leading-relaxed">
          Nenhuma dispensa registrada em {exercicio}. A verificação começa a
          valer quando houver ao menos duas.
        </p>
      )}

      {processos.length > 0 && !temAchado && (
        <p
          className="text-sm rounded-lg px-4 py-3 mt-5"
          style={{ background: "var(--info-tint)", color: "var(--info)" }}
        >
          Nenhum grupo de objetos semelhantes se aproxima do limite anual.
        </p>
      )}

      {analise.gruposSuspeitos.length > 0 && (
        <div className="mt-5">
          <h3 className="text-sm font-semibold" style={{ color: "var(--urgente)" }}>
            Passou do limite anual — confira antes do próximo empenho
          </h3>
          <div className="flex flex-col gap-3 mt-3">
            {analise.gruposSuspeitos.map((g, i) => (
              <Grupo key={i} grupo={g} tom="urgente" limite={analise.limite} />
            ))}
          </div>
        </div>
      )}

      {analise.gruposEmAtencao.length > 0 && (
        <div className="mt-5">
          <h3 className="text-sm font-semibold" style={{ color: "var(--medio)" }}>
            Perto do limite — ainda dá para escolher outro caminho
          </h3>
          <div className="flex flex-col gap-3 mt-3">
            {analise.gruposEmAtencao.map((g, i) => (
              <Grupo key={i} grupo={g} tom="medio" limite={analise.limite} />
            ))}
          </div>
        </div>
      )}

      <p className="text-xs text-muted mt-5 pt-4 border-t border-border leading-relaxed">
        {BASE_LEGAL_FRACIONAMENTO} O agrupamento é por semelhança do texto do
        objeto e serve para <strong className="text-foreground">conferência humana</strong>:
        &ldquo;mesmo ramo de atividade&rdquo; é juízo, não cálculo, e só quem conhece a
        compra decide.
      </p>
    </section>
  );
}

function Grupo({
  grupo,
  tom,
  limite,
}: {
  grupo: GrupoFracionamento;
  tom: "urgente" | "medio";
  limite: number;
}) {
  const cor = tom === "urgente" ? "var(--urgente)" : "var(--medio)";
  const fundo = tom === "urgente" ? "var(--urgente-tint)" : "var(--medio-tint)";
  const borda = tom === "urgente" ? "var(--urgente-borda)" : "var(--medio-borda)";
  const proporcao = Math.min(100, (grupo.total / limite) * 100);

  return (
    <div className="border rounded-lg p-4" style={{ borderColor: borda, background: fundo }}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="font-semibold text-sm">
          {grupo.termos.length > 0 ? grupo.termos.join(" · ") : "objetos semelhantes"}
        </p>
        <p className="font-serif font-bold tabular-nums" style={{ color: cor }}>
          {formatarMoeda(grupo.total)}
        </p>
      </div>

      {/* A barra mostra o quanto do limite anual o grupo já consumiu — é a
          leitura que o gestor faz em um segundo, antes de ler os números. */}
      <div
        className="h-1.5 rounded-full mt-2.5 overflow-hidden"
        style={{ background: "color-mix(in srgb, var(--foreground) 12%, transparent)" }}
        role="img"
        aria-label={`${proporcao.toFixed(0)}% do limite anual de dispensa`}
      >
        <div className="h-full rounded-full" style={{ width: `${proporcao}%`, background: cor }} />
      </div>

      {grupo.excedente > 0 && (
        <p className="text-xs mt-2" style={{ color: cor }}>
          {formatarMoeda(grupo.excedente)} acima do limite de {formatarMoeda(limite)}
        </p>
      )}

      <ul className="mt-3 flex flex-col gap-1.5">
        {grupo.processos.map((p) => (
          <li key={p.id} className="text-sm flex flex-wrap gap-x-3">
            <span className="font-medium tabular-nums">{p.numero}</span>
            <span className="text-muted flex-1 min-w-0">{p.objeto}</span>
            <span className="tabular-nums text-muted">{formatarMoeda(p.valor)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
