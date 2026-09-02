import { contextoDashboard } from "@/lib/contexto-dashboard";
import BloqueioPlano from "@/components/BloqueioPlano";
import { formatarMoeda } from "@/lib/formatadores";
import { fusoDoEstado } from "@/lib/horario";
import {
  MINIMOS,
  AREAS_MINIMO,
  NOME_SITUACAO,
  CONSEQUENCIA_LEGAL,
  avaliarMinimo,
  type Situacao,
  type AvaliacaoMinimo,
} from "@/lib/minimos-constitucionais";
import { buscarBases, somarAplicadoLancado } from "./actions";
import FormularioBase from "./FormularioBase";

export const metadata = { title: "Mínimos constitucionais — CidadeIA" };

const TOM: Record<Situacao, { cor: string; fundo: string; borda: string }> = {
  cumprido: { cor: "var(--info)", fundo: "var(--info-tint)", borda: "var(--info-borda)" },
  no_caminho: { cor: "var(--info)", fundo: "var(--info-tint)", borda: "var(--info-borda)" },
  risco: { cor: "var(--medio)", fundo: "var(--medio-tint)", borda: "var(--medio-borda)" },
  critico: { cor: "var(--urgente)", fundo: "var(--urgente-tint)", borda: "var(--urgente-borda)" },
};

function percentual(v: number) {
  return `${v.toFixed(2).replace(".", ",")}%`;
}

export default async function MinimosPage() {
  const { prefeitura, temPlano } = await contextoDashboard();
  if (!temPlano("gestao")) return <BloqueioPlano plano="gestao" />;

  // O exercício é o ano no fuso do município, não no do servidor: virar o ano
  // em UTC três horas antes faria a página abrir o exercício seguinte com a
  // prefeitura ainda fechando o anterior.
  const exercicio = Number(
    new Intl.DateTimeFormat("pt-BR", {
      timeZone: fusoDoEstado(prefeitura.estado),
      year: "numeric",
    }).format(new Date())
  );

  const bases = await buscarBases(exercicio);
  const lancados = await Promise.all(
    AREAS_MINIMO.map(async (area) => ({ area, ...(await somarAplicadoLancado(exercicio, area)) }))
  );

  const painel = AREAS_MINIMO.map((area) => {
    const salvo = bases.find((b) => b.area === area) ?? null;
    const lancado = lancados.find((l) => l.area === area)!;
    const avaliacao: AvaliacaoMinimo | null = salvo
      ? avaliarMinimo({
          area,
          base: salvo.baseCalculo,
          aplicado: salvo.aplicado,
          mesesDecorridos: salvo.mesReferencia,
        })
      : null;
    return { area, salvo, lancado, avaliacao };
  });

  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <h1 className="font-serif text-2xl font-bold">Mínimos constitucionais</h1>
        <p className="text-muted text-sm mt-1.5 leading-relaxed max-w-2xl">
          Acompanhamento de {prefeitura.municipio} no exercício de {exercicio}.
          Mostra quanto falta aplicar <strong>enquanto ainda dá para empenhar</strong> —
          e não em dezembro, quando o contador fecha o demonstrativo.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {painel.map(({ area, avaliacao }) => {
          const info = MINIMOS[area];
          const tom = avaliacao ? TOM[avaliacao.situacao] : null;

          return (
            <div
              key={area}
              className="arco-card border p-6 flex flex-col gap-3"
              style={{
                background: tom?.fundo ?? "var(--card)",
                borderColor: tom?.borda ?? "var(--border)",
              }}
            >
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="font-serif text-lg font-bold">{info.area}</h2>
                <span className="text-xs font-mono text-muted">mínimo {info.percentual}%</span>
              </div>

              {avaliacao ? (
                <>
                  <p
                    className="font-serif text-[2.6rem] leading-none font-extrabold tracking-tight tabular-nums"
                    style={{ color: tom!.cor }}
                  >
                    {percentual(avaliacao.percentualAtual)}
                  </p>
                  <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: tom!.cor }}>
                    {NOME_SITUACAO[avaliacao.situacao]}
                  </p>

                  {avaliacao.situacao !== "cumprido" && (
                    <div className="text-sm leading-relaxed border-t border-border/60 pt-3 mt-1 space-y-1.5">
                      <p>
                        Faltam{" "}
                        <strong className="tabular-nums">
                          {formatarMoeda(
                            avaliacao.faltaProjetadaNoAno ?? avaliacao.faltaSobreBaseAtual
                          )}
                        </strong>{" "}
                        até o fim do exercício.
                      </p>
                      {avaliacao.fatorAceleracao !== null && (
                        <p className="text-muted">
                          Exige{" "}
                          <strong style={{ color: tom!.cor }}>
                            {avaliacao.fatorAceleracao.toFixed(1).replace(".", ",")}×
                          </strong>{" "}
                          o ritmo mensal atual nos {avaliacao.mesesRestantes} meses que restam.
                        </p>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm text-muted leading-relaxed">
                  Informe a base de cálculo abaixo para o acompanhamento começar.
                </p>
              )}

              <p className="text-[11px] font-mono text-muted mt-auto pt-2">{info.base}</p>
            </div>
          );
        })}
      </div>

      <div
        className="border rounded-xl p-5 text-sm leading-relaxed"
        style={{ background: "var(--medio-tint)", borderColor: "var(--medio-borda)" }}
      >
        <p className="font-semibold mb-1">Isto é acompanhamento, não o demonstrativo oficial.</p>
        <p className="text-muted">
          O cálculo legal do MDE e do ASPS tem inclusões e exclusões que só o
          contador da prefeitura fecha. Use esta tela para agir a tempo — não
          para prestar contas. {CONSEQUENCIA_LEGAL}
        </p>
      </div>

      <div className="space-y-6">
        <h2 className="font-serif text-lg font-bold">Informar os valores</h2>
        <div className="grid md:grid-cols-2 gap-5">
          {painel.map(({ area, salvo, lancado }) => (
            <div key={area} className="bg-card border border-border rounded-xl p-5">
              <h3 className="font-semibold mb-4">{MINIMOS[area].area}</h3>
              <FormularioBase
                area={area}
                exercicio={exercicio}
                baseCalculo={salvo?.baseCalculo ?? null}
                aplicado={salvo?.aplicado ?? null}
                mesReferencia={salvo?.mesReferencia ?? null}
                sugestaoAplicado={lancado.total}
                temSiconfi={lancado.temSiconfi}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
