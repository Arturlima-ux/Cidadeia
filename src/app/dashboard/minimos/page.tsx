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
import {
  avaliarDefasagem,
  descreverDefasagem,
  TOLERANCIA_MINIMOS,
} from "@/lib/defasagem";
import FaixaExemplo from "@/components/FaixaExemplo";
import { EXEMPLO_MINIMOS, MUNICIPIO_EXEMPLO } from "@/lib/exemplos-conformidade";
import { buscarBases, somarAplicadoLancado } from "./actions";
import FormularioBase from "./FormularioBase";
import PainelObrigacoes from "./PainelObrigacoes";
import { podeOptarPorSemestral } from "@/lib/obrigacoes-fiscais";

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

/**
 * Coloca a moldura de exemplo só quando é exemplo, sem duplicar o bloco de
 * cartões. Duas cópias do mesmo JSX é como uma delas para de ser atualizada.
 */
function Envoltorio({ exemplo, children }: { exemplo: boolean; children: React.ReactNode }) {
  return exemplo ? <FaixaExemplo>{children}</FaixaExemplo> : <>{children}</>;
}

export default async function MinimosPage() {
  const { prefeitura, temPlano } = await contextoDashboard();
  if (!temPlano("gestao")) return <BloqueioPlano plano="gestao" />;

  // O exercício é o ano no fuso do município, não no do servidor: virar o ano
  // em UTC três horas antes faria a página abrir o exercício seguinte com a
  // prefeitura ainda fechando o anterior.
  const agora = new Date();
  const fuso = fusoDoEstado(prefeitura.estado);
  const exercicio = Number(
    new Intl.DateTimeFormat("pt-BR", { timeZone: fuso, year: "numeric" }).format(agora)
  );
  const mesAtual = Number(
    new Intl.DateTimeFormat("pt-BR", { timeZone: fuso, month: "numeric" }).format(agora)
  );

  const bases = await buscarBases(exercicio);
  const lancados = await Promise.all(
    AREAS_MINIMO.map(async (area) => ({ area, ...(await somarAplicadoLancado(exercicio, area)) }))
  );

  // Tudo ou nada: o exemplo só aparece com a tela inteiramente vazia. Um
  // cartão inventado ao lado de um verdadeiro é a forma mais fácil de o gestor
  // levar o errado para uma reunião.
  const semNenhumDado = bases.length === 0;

  const painel = AREAS_MINIMO.map((area) => {
    const salvo = semNenhumDado
      ? { ...EXEMPLO_MINIMOS[area], origemAplicado: "manual" as const, area }
      : (bases.find((b) => b.area === area) ?? null);
    const lancado = lancados.find((l) => l.area === area)!;
    const avaliacao: AvaliacaoMinimo | null = salvo
      ? avaliarMinimo({
          area,
          base: salvo.baseCalculo,
          aplicado: salvo.aplicado,
          mesesDecorridos: salvo.mesReferencia,
        })
      : null;

    // Quanto tempo faz que ninguém confirma este número. É o que decide se o
    // cartão pode pintar um veredito ou só mostrar o valor: nada aqui obriga
    // o contador a voltar, e uma base de março continuaria dizendo "cumprido"
    // em outubro, em verde, com duas casas decimais.
    const defasagem = salvo
      ? avaliarDefasagem({
          exercicio,
          mesReferencia: salvo.mesReferencia,
          hojeExercicio: exercicio,
          hojeMes: mesAtual,
          toleranciaMeses: TOLERANCIA_MINIMOS,
        })
      : null;

    return { area, salvo, lancado, avaliacao, defasagem };
  });

  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <h1 className="font-serif text-2xl font-bold">Mínimos constitucionais</h1>
        <p className="text-muted text-sm mt-1.5 leading-relaxed max-w-2xl">
          Acompanhamento de {semNenhumDado ? MUNICIPIO_EXEMPLO : prefeitura.municipio} no
          exercício de {exercicio}. Mostra quanto falta aplicar{" "}
          <strong>enquanto ainda dá para empenhar</strong> — e não em dezembro,
          quando o contador fecha o demonstrativo.
        </p>
      </div>

      <Envoltorio exemplo={semNenhumDado}>
      <div className="grid sm:grid-cols-2 gap-4">
        {painel.map(({ area, avaliacao, salvo, defasagem }) => {
          const info = MINIMOS[area];

          // Dado velho perde a cor do veredito, não o número. O verde é o que
          // faz o gestor parar de olhar — e é justamente o verde que não pode
          // ser afirmado sobre uma medição que ninguém confirma há meses.
          const desatualizado = defasagem !== null && defasagem.situacao !== "atual";
          const tom = avaliacao && !desatualizado ? TOM[avaliacao.situacao] : null;
          const avisoIdade =
            defasagem && salvo
              ? descreverDefasagem(defasagem, { exercicio, mesReferencia: salvo.mesReferencia })
              : null;

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
                    style={{ color: tom?.cor ?? "var(--muted)" }}
                  >
                    {percentual(avaliacao.percentualAtual)}
                  </p>
                  <p
                    className="text-xs font-semibold uppercase tracking-wide"
                    style={{ color: tom?.cor ?? "var(--muted)" }}
                  >
                    {desatualizado
                      ? defasagem!.situacao === "vencido"
                        ? "Sem conclusão — dado vencido"
                        : "Medição antiga"
                      : NOME_SITUACAO[avaliacao.situacao]}
                  </p>

                  {avisoIdade && (
                    <p className="text-xs text-muted leading-relaxed border-t border-border/60 pt-3 mt-1">
                      {avisoIdade}
                    </p>
                  )}

                  {/* Só o dado VENCIDO cala o "faltam X". Medição de quatro
                      meses ainda orienta ordem de grandeza, e o aviso acima já
                      tirou a falsa confiança; esconder o valor aí perderia a
                      única informação acionável do cartão. Meio ano depois,
                      não: aí seria ordem de gasto sobre número que ninguém
                      confirma. */}
                  {defasagem?.situacao !== "vencido" && avaliacao.situacao !== "cumprido" && (
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
                          <strong style={{ color: tom?.cor ?? "var(--muted)" }}>
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
      </Envoltorio>

      <PainelObrigacoes podeSemestral={podeOptarPorSemestral(prefeitura.populacao)} />

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
          {/* Lê `bases`, não `painel`: com a tela em modo exemplo, `salvo` é o
              município fictício, e pré-preencher o formulário com ele faria o
              gestor gravar 48 milhões inventados como base da prefeitura dele
              — bastaria clicar em Salvar sem reparar. O exemplo ilustra a
              tela; nunca entra no campo que vira registro. */}
          {painel.map(({ area, lancado }) => {
            const gravado = bases.find((b) => b.area === area) ?? null;
            return (
            <div key={area} className="bg-card border border-border rounded-xl p-5">
              <h3 className="font-semibold mb-4">{MINIMOS[area].area}</h3>
              <FormularioBase
                area={area}
                exercicio={exercicio}
                baseCalculo={gravado?.baseCalculo ?? null}
                aplicado={gravado?.aplicado ?? null}
                mesReferencia={gravado?.mesReferencia ?? null}
                sugestaoAplicado={lancado.total}
                temSiconfi={lancado.temSiconfi}
              />
            </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
