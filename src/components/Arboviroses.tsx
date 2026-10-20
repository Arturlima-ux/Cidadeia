import { lerArboviroses } from "@/lib/arboviroses-servidor";
import { NOME_DOENCA, NOME_NIVEL, type Doenca, type Semana } from "@/lib/arboviroses";
import { dataDoBanco } from "@/lib/data-do-banco";

// Dengue e chikungunya no município e nas cidades vizinhas, lidos do
// InfoDengue (Fiocruz) a cada três dias (lib/arboviroses.ts).

// Laranja não tem cor própria no tema: mistura das duas vizinhas, funciona no claro e no escuro.
const COR = ["", "var(--info)", "var(--medio)", "color-mix(in srgb, var(--urgente) 60%, var(--medio))", "var(--urgente)"];
const semana = (se: number) => `SE ${String(se).slice(4)}`;

function Doenca({ doenca, semanas }: { doenca: Doenca; semanas: Semana[] }) {
  const atual = semanas[0];
  if (!atual) {
    return (
      <div className="bg-card border border-border rounded-xl p-4">
        <p className="font-medium text-sm">{NOME_DOENCA[doenca]}</p>
        <p className="text-xs text-muted mt-1">Sem semanas publicadas para o município.</p>
      </div>
    );
  }
  // Da mais antiga para a mais recente, como se lê um gráfico.
  const serie = [...semanas].reverse();
  const maior = Math.max(1, ...serie.map((s) => s.estimados));
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="font-medium text-sm">{NOME_DOENCA[doenca]}</p>
        <span className="text-xs font-semibold inline-flex items-center gap-1.5" style={{ color: COR[atual.nivel] }}>
          <span className="w-2 h-2 rounded-full" style={{ background: COR[atual.nivel] }} />
          Alerta {NOME_NIVEL[atual.nivel]}
        </span>
      </div>
      <p className="text-2xl font-semibold mt-2 tabular-nums">{atual.estimados.toLocaleString("pt-BR")}</p>
      <p className="text-xs text-muted">
        caso(s) estimado(s) na {semana(atual.se)} · {atual.incidencia.toLocaleString("pt-BR")} por 100 mil
        {atual.rt ? ` · Rt ${atual.rt.toLocaleString("pt-BR")}` : ""}
      </p>
      <div className="flex items-end gap-1 h-12 mt-3" aria-label={`Casos estimados nas últimas ${serie.length} semanas`}>
        {serie.map((s) => (
          <div
            key={s.se}
            title={`${semana(s.se)}: ${s.estimados} caso(s) estimado(s), alerta ${NOME_NIVEL[s.nivel]}`}
            className="flex-1 rounded-sm"
            style={{ height: `${Math.max(6, (s.estimados / maior) * 100)}%`, background: COR[s.nivel], opacity: s === atual ? 1 : 0.55 }}
          />
        ))}
      </div>
      <div className="flex justify-between text-[11px] text-muted mt-1">
        <span>{semana(serie[0].se)}</span>
        <span>{semana(atual.se)}</span>
      </div>
    </div>
  );
}

export default async function Arboviroses({ prefeituraId }: { prefeituraId: string }) {
  const lido = await lerArboviroses(prefeituraId);
  if (!lido) {
    return (
      <section>
        <h2 className="font-semibold text-sm text-muted mb-3">Dengue e chikungunya</h2>
        <p className="text-sm text-muted bg-card border border-border rounded-xl p-4">
          A leitura do InfoDengue (Fiocruz) acontece sozinha na madrugada. Na primeira vez, a situação do município e das cidades vizinhas aparece aqui no dia seguinte.
        </p>
      </section>
    );
  }
  const { foto } = lido;
  return (
    <section>
      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
        <h2 className="font-semibold text-sm text-muted">Dengue e chikungunya</h2>
        <p className="text-xs text-muted">
          InfoDengue (Fiocruz) · lido em {dataDoBanco(lido.conferidoEm).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}
        </p>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <Doenca doenca="dengue" semanas={foto.dengue} />
        <Doenca doenca="chikungunya" semanas={foto.chikungunya} />
      </div>
      {foto.vizinhos.length > 0 && (
        <div className="mt-3">
          <p className="text-xs text-muted mb-2">Dengue nas cidades mais próximas</p>
          <ul className="flex flex-wrap gap-2">
            {foto.vizinhos.map((v) => (
              <li key={v.codigo} className="text-xs bg-card border border-border rounded-full px-3 py-1.5 inline-flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ background: COR[v.nivel] }} />
                {v.nome} · {NOME_NIVEL[v.nivel]} · {v.incidencia.toLocaleString("pt-BR")}/100 mil
              </li>
            ))}
          </ul>
        </div>
      )}
      <p className="text-xs text-muted mt-3">
        Verde: sem transmissão relevante. Amarelo: clima favorável ao mosquito. Laranja: transmissão sustentada. Vermelho: epidemia. Os casos são estimados pela Fiocruz, que corrige o atraso das notificações.
      </p>
    </section>
  );
}
