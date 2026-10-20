import { lerSiope } from "@/lib/siope-servidor";
import type { Indicadores } from "@/lib/siope";
import { dataDoBanco } from "@/lib/data-do-banco";

// O que a prefeitura declarou ao SIOPE (FNDE): o prazo de cada bimestre e os
// percentuais oficiais da educação (lib/siope.ts). Lido a cada três dias.

const br = (iso: string) => iso.slice(0, 10).split("-").reverse().join("/");
const pct = (v: number) => `${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;

type Regra = { rotulo: string; campo: "mde" | "fundeb70" | "fundebNaoAplicado"; limite: number; minimo: boolean; base: string };
const REGRAS: Regra[] = [
  { rotulo: "Impostos em educação (MDE)", campo: "mde", limite: 25, minimo: true, base: "mínimo 25% · CF, art. 212" },
  { rotulo: "FUNDEB na remuneração", campo: "fundeb70", limite: 70, minimo: true, base: "mínimo 70% · Lei 14.113, art. 26" },
  { rotulo: "FUNDEB não aplicado no ano", campo: "fundebNaoAplicado", limite: 10, minimo: false, base: "máximo 10% · Lei 14.113, art. 25" },
];

function Numeros({ i, parcial }: { i: Indicadores; parcial: boolean }) {
  return (
    <div className="grid sm:grid-cols-3 gap-3">
      {REGRAS.map((r) => {
        const v = i[r.campo];
        const ok = v === null ? null : r.minimo ? v >= r.limite : v <= r.limite;
        // Parcial não ganha vermelho: no meio do ano o percentual ainda anda (e pode até sair negativo).
        const cor = v === null || parcial ? "var(--foreground)" : ok ? "var(--info)" : "var(--urgente)";
        return (
          <div key={r.campo} className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs text-muted">{r.rotulo}</p>
            <p className="text-2xl font-semibold mt-1 tabular-nums" style={{ color: cor }}>
              {v === null ? "—" : pct(v)}
            </p>
            <p className="text-[11px] text-muted mt-0.5">{r.base}</p>
          </div>
        );
      })}
    </div>
  );
}

export default async function Siope({ prefeituraId }: { prefeituraId: string }) {
  const lido = await lerSiope(prefeituraId);
  if (!lido) {
    return (
      <section>
        <h2 className="font-semibold text-sm text-muted mb-3">SIOPE: o que a prefeitura declarou ao FNDE</h2>
        <p className="text-sm text-muted bg-card border border-border rounded-xl p-4">
          A leitura do SIOPE acontece sozinha na madrugada. Na primeira vez, os prazos de declaração e os percentuais oficiais da educação aparecem aqui no dia seguinte.
        </p>
      </section>
    );
  }
  const { foto } = lido;
  const atrasados = foto.declaracoes.filter((d) => !d.declaradoEm && d.noEstado > 0);
  return (
    <section>
      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
        <h2 className="font-semibold text-sm text-muted">SIOPE: o que a prefeitura declarou ao FNDE</h2>
        <p className="text-xs text-muted">
          SIOPE (FNDE) · lido em {dataDoBanco(lido.conferidoEm).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}
        </p>
      </div>

      {atrasados.length > 0 && (
        <p className="text-sm rounded-xl p-4 mb-3 border" style={{ background: "var(--urgente-tint)", borderColor: "var(--urgente-borda)", color: "var(--urgente)" }}>
          {atrasados.length === 1 ? "Há 1 bimestre vencido" : `Há ${atrasados.length} bimestres vencidos`} sem declaração. Enquanto não for transmitida, a prefeitura
          fica sem transferências voluntárias e sem novas operações de crédito (Lei 14.113/2020, art. 38, § 1º).
        </p>
      )}

      <ul className="flex flex-wrap gap-2 mb-4">
        {foto.declaracoes.map((d) => {
          const atrasado = !d.declaradoEm && d.noEstado > 0;
          const cor = d.declaradoEm ? "var(--info)" : atrasado ? "var(--urgente)" : "var(--muted)";
          return (
            <li key={`${d.ano}-${d.bimestre}`} className="text-xs bg-card border border-border rounded-full px-3 py-1.5 inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ background: cor }} />
              {d.bimestre}º bim/{d.ano} ·{" "}
              {d.declaradoEm
                ? `declarado${/^\d{4}-\d{2}-\d{2}/.test(d.declaradoEm) ? ` em ${br(d.declaradoEm)}` : ""}`
                : atrasado
                  ? `atrasado (prazo ${br(d.prazo)})`
                  : "sem confirmação"}
            </li>
          );
        })}
      </ul>

      {foto.fechamento && (
        <div className="mb-4">
          <p className="text-xs text-muted mb-2">Exercício de {foto.fechamento.ano} fechado (6º bimestre)</p>
          <Numeros i={foto.fechamento} parcial={false} />
        </div>
      )}
      {foto.parcial && (
        <div className="mb-3">
          <p className="text-xs text-muted mb-2">
            {foto.parcial.ano} até o {foto.parcial.bimestre}º bimestre: parcial, o percentual só fecha no 6º bimestre
          </p>
          <Numeros i={foto.parcial} parcial />
        </div>
      )}
      {foto.estado && foto.fechamento && foto.estado.ano === foto.fechamento.ano && (
        <p className="text-xs text-muted">
          No {foto.uf}, em {foto.estado.ano}: {foto.estado.abaixo25} de {foto.estado.comDado} municípios abaixo de 25% em educação e {foto.estado.abaixo70} abaixo de 70% do FUNDEB na remuneração.
        </p>
      )}
      <p className="text-xs text-muted mt-2">
        Os percentuais são os que o próprio SIOPE calcula com a declaração do contador: é o número que o FNDE e o Tribunal de Contas olham.
      </p>
    </section>
  );
}
