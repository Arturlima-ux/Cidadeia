import { contextoDashboard } from "@/lib/contexto-dashboard";
import BloqueioPlano from "@/components/BloqueioPlano";
import { formatarMoeda } from "@/lib/formatadores";
import { fusoDoEstado } from "@/lib/horario";
import {
  LIMITE_PESSOAL,
  LIMITE_PRUDENCIAL,
  LIMITE_ALERTA,
  VEDACOES_PRUDENCIAL,
  SANCOES_PRAZO_ESGOTADO,
  BASE_LEGAL_LIMITE,
  CONSEQUENCIA_PESSOAL,
  NOME_SITUACAO_PESSOAL,
  avaliarDespesaPessoal,
  avaliarReconducao,
  type SituacaoPessoal,
} from "@/lib/despesa-pessoal";
import {
  avaliarDefasagem,
  descreverDefasagem,
  TOLERANCIA_PESSOAL,
  TOLERANCIA_PESSOAL_SEMESTRAL,
} from "@/lib/defasagem";
import { podeOptarPorSemestral } from "@/lib/obrigacoes-fiscais";
import FaixaExemplo from "@/components/FaixaExemplo";
import { EXEMPLO_PESSOAL, MUNICIPIO_EXEMPLO } from "@/lib/exemplos-conformidade";
import { buscarPeriodos } from "./actions";
import FormularioPessoal from "./FormularioPessoal";
import BotaoImportar from "./BotaoImportar";

export const metadata = { title: "Despesa com pessoal — CidadeIA" };

const TOM: Record<SituacaoPessoal, { cor: string; fundo: string; borda: string }> = {
  confortavel: { cor: "var(--info)", fundo: "var(--info-tint)", borda: "var(--info-borda)" },
  alerta: { cor: "var(--medio)", fundo: "var(--medio-tint)", borda: "var(--medio-borda)" },
  prudencial: { cor: "var(--medio)", fundo: "var(--medio-tint)", borda: "var(--medio-borda)" },
  excedido: { cor: "var(--urgente)", fundo: "var(--urgente-tint)", borda: "var(--urgente-borda)" },
};

const MESES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

function pct(v: number) {
  return `${v.toFixed(2).replace(".", ",")}%`;
}

/** Moldura de exemplo só quando é exemplo, sem duplicar o bloco de seções. */
function Envoltorio({ exemplo, children }: { exemplo: boolean; children: React.ReactNode }) {
  return exemplo ? <FaixaExemplo>{children}</FaixaExemplo> : <>{children}</>;
}

export default async function PessoalPage() {
  const { prefeitura, temPlano } = await contextoDashboard();
  if (!temPlano("gestao")) return <BloqueioPlano plano="gestao" />;

  // Exercício no fuso do município, não no do servidor — mesma razão da tela
  // de mínimos: virar o ano em UTC três horas antes abriria o exercício
  // seguinte com a prefeitura ainda fechando o anterior.
  const agora = new Date();
  const fuso = fusoDoEstado(prefeitura.estado);
  const exercicio = Number(
    new Intl.DateTimeFormat("pt-BR", { timeZone: fuso, year: "numeric" }).format(agora)
  );
  const mesAtual = Number(
    new Intl.DateTimeFormat("pt-BR", { timeZone: fuso, month: "numeric" }).format(agora)
  );

  const gravados = await buscarPeriodos();

  // Mesma regra da tela de mínimos: exemplo só com a tela inteiramente vazia,
  // e sem nunca chegar ao formulário — ver "exemplos-conformidade.ts".
  const semNenhumDado = gravados.length === 0;
  const periodos = semNenhumDado
    ? [{ ...EXEMPLO_PESSOAL, exercicio }]
    : gravados;

  const atual = periodos[0] ?? null;
  const avaliacao = atual ? avaliarDespesaPessoal(atual) : null;
  const reconducao = avaliarReconducao(periodos);

  // Município com menos de 50 mil habitantes publica o RGF semestralmente, e
  // cobrar dele o ritmo quadrimestral seria acusá-lo de atraso por seguir a
  // periodicidade que a lei lhe faculta.
  //
  // O exemplo fica de fora pela mesma razão da tela de mínimos: a guarda julga
  // a idade de uma MEDIÇÃO real, e ilustração não tem medição. Aqui a
  // tolerância mais larga faz a conta nunca estourar hoje — mas isso é
  // coincidência de dois números, não garantia. Mexer no mês do exemplo ou
  // apertar a tolerância traria o defeito de volta, em silêncio.
  const defasagem =
    atual && !semNenhumDado
      ? avaliarDefasagem({
          exercicio: atual.exercicio,
          mesReferencia: atual.mesReferencia,
          hojeExercicio: exercicio,
          hojeMes: mesAtual,
          toleranciaMeses: podeOptarPorSemestral(prefeitura.populacao)
            ? TOLERANCIA_PESSOAL_SEMESTRAL
            : TOLERANCIA_PESSOAL,
        })
      : null;

  const desatualizado = defasagem !== null && defasagem.situacao !== "atual";
  const vencido = defasagem?.situacao === "vencido";
  const avisoIdade = defasagem && atual ? descreverDefasagem(defasagem, atual) : null;

  // Perde a cor do veredito, não o número: o verde é o que faz o gestor parar
  // de olhar, e é justamente ele que não se sustenta sobre medição antiga.
  const tom = avaliacao && !desatualizado ? TOM[avaliacao.situacao] : null;
  const corNeutra = "var(--muted)";

  // A barra vai até 60% (o teto do município inteiro, art. 19, III) e não até
  // 100%: numa escala de 0 a 100 os três limites da LRF ficariam espremidos em
  // metade do traço, e a distância entre 48,6% e 54% — que é a distância entre
  // tranquilo e ilegal — sumiria.
  const ESCALA = 60;
  const posicao = (v: number) => `${Math.min(100, (v / ESCALA) * 100)}%`;

  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <h1 className="font-serif text-2xl font-bold">Despesa com pessoal</h1>
        <p className="text-muted text-sm mt-1.5 leading-relaxed max-w-2xl">
          O teto da Lei de Responsabilidade Fiscal em{" "}
          {semNenhumDado ? MUNICIPIO_EXEMPLO : prefeitura.municipio}. Aqui a
          lógica é a oposta dos mínimos: o número precisa{" "}
          <strong>ficar abaixo</strong>, e o que muda a vida do prefeito chega
          antes do limite — em 51,3% ele ainda está legal, mas já não pode
          nomear nem reajustar.
        </p>
      </div>

      <Envoltorio exemplo={semNenhumDado}>
      {avaliacao && atual ? (
        <section
          className="arco-card border p-6 sm:p-7 flex flex-col gap-5"
          style={{
            background: tom?.fundo ?? "var(--card)",
            borderColor: tom?.borda ?? "var(--border)",
          }}
        >
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <div>
              <p
                className="font-serif text-[3rem] leading-none font-extrabold tracking-tight tabular-nums"
                style={{ color: tom?.cor ?? corNeutra }}
              >
                {pct(avaliacao.percentual)}
              </p>
              <p
                className="text-xs font-semibold uppercase tracking-wide mt-2"
                style={{ color: tom?.cor ?? corNeutra }}
              >
                {desatualizado
                  ? vencido
                    ? "Sem conclusão — dado vencido"
                    : "Medição antiga"
                  : NOME_SITUACAO_PESSOAL[avaliacao.situacao]}
              </p>
            </div>
            <p className="text-xs font-mono text-muted text-right">
              12 meses até {MESES[atual.mesReferencia - 1]} de {atual.exercicio}
              <br />
              limite {LIMITE_PESSOAL}% da RCL ajustada
            </p>
          </div>

          {/* Régua com as três fronteiras. Mostrar onde o percentual cai entre
              elas responde "quanto ainda posso" melhor que qualquer frase. */}
          <div className="pt-6 pb-1">
            <div className="relative h-2.5 rounded-full bg-sutil">
              <div
                className="absolute inset-y-0 left-0 rounded-full transition-all"
                style={{
                  width: posicao(avaliacao.percentual),
                  background: tom?.cor ?? corNeutra,
                }}
              />
              {[
                { v: LIMITE_ALERTA, rotulo: "90% — alerta do TC" },
                { v: LIMITE_PRUDENCIAL, rotulo: "95% — vedações" },
                { v: LIMITE_PESSOAL, rotulo: "limite legal" },
              ].map((marca) => (
                <div
                  key={marca.v}
                  className="absolute -top-5 bottom-0 w-px bg-foreground/30"
                  style={{ left: posicao(marca.v) }}
                >
                  <span className="absolute -top-4 -translate-x-1/2 text-[10px] font-mono text-muted whitespace-nowrap">
                    {marca.v.toFixed(1).replace(".", ",")}%
                  </span>
                  <span className="sr-only">{marca.rotulo}</span>
                </div>
              ))}
            </div>
          </div>

          {avisoIdade && (
            <p className="text-sm text-muted leading-relaxed border-t border-border/60 pt-4">
              {avisoIdade}{" "}
              {vencido
                ? "Informe o período mais recente no formulário abaixo."
                : "O Relatório de Gestão Fiscal do último período fecha os dois valores."}
            </p>
          )}

          {/* Vencido cala as margens: "faltam R$ X até o limite" sobre medição
              de nove meses atrás é convite a gastar uma folga que pode não
              existir mais — e o erro nesta direção é o que estoura o teto. */}
          <div
            className="grid sm:grid-cols-2 gap-x-6 gap-y-3 text-sm border-t border-border/60 pt-4"
            hidden={vencido}
          >
            {avaliacao.situacao === "excedido" ? (
              <p className="sm:col-span-2">
                Excedente de{" "}
                <strong className="tabular-nums">{formatarMoeda(avaliacao.excedente)}</strong> —{" "}
                {avaliacao.excedentePontos.toFixed(2).replace(".", ",")} pontos percentuais acima
                do teto.
              </p>
            ) : (
              <>
                <p>
                  Até o limite legal:{" "}
                  <strong className="tabular-nums">{formatarMoeda(avaliacao.margem)}</strong>
                </p>
                <p>
                  Até as vedações:{" "}
                  <strong className="tabular-nums">
                    {formatarMoeda(avaliacao.margemAtePrudencial)}
                  </strong>
                </p>
              </>
            )}
          </div>

          <p className="text-[11px] font-mono text-muted">{BASE_LEGAL_LIMITE}</p>
        </section>
      ) : (
        <section className="arco-card border border-border p-6" style={{ background: "var(--card)" }}>
          <h2 className="font-serif text-lg font-bold">Nenhum período informado</h2>
          <p className="text-sm text-muted mt-2 leading-relaxed max-w-2xl">
            {/* Dizia que "o endpoint de RGF do Tesouro volta zerado para todos
                os municípios que testamos". Era falso: a consulta estava
                errada, foi corrigida, e a importação passou a funcionar — o
                texto ficou para trás, acusando o Tesouro na tela. */}
            Os dois números saem do Relatório de Gestão Fiscal que a prefeitura
            já publica no SICONFI. O botão acima busca o período mais recente
            sozinho; se o Tesouro ainda não tiver o RGF deste período, informe a
            Receita Corrente Líquida e a despesa com pessoal dos doze meses no
            formulário abaixo.
          </p>
        </section>
      )}

      {/* ── Recondução (art. 23) ── */}
      {reconducao && !vencido && (
        <section
          className="border rounded-xl p-5 sm:p-6 space-y-3"
          style={{
            background: reconducao.noCronograma ? "var(--medio-tint)" : "var(--urgente-tint)",
            borderColor: reconducao.noCronograma ? "var(--medio-borda)" : "var(--urgente-borda)",
          }}
        >
          <h2 className="font-serif text-lg font-bold">
            {reconducao.prazoEsgotado
              ? "Prazo de recondução esgotado"
              : `Prazo de recondução correndo — ${reconducao.periodosDecorridos === 0 ? "dois períodos" : "um período"} restante${reconducao.periodosDecorridos === 0 ? "s" : ""}`}
          </h2>
          <p className="text-sm leading-relaxed">
            O limite foi ultrapassado no período encerrado em{" "}
            <strong>
              {MESES[reconducao.desde.mesReferencia - 1]} de {reconducao.desde.exercicio}
            </strong>
            , com {reconducao.excedenteInicialPontos.toFixed(2).replace(".", ",")} pontos acima do
            teto. O art. 23 da LRF exige eliminar pelo menos um terço no primeiro período seguinte
            e todo o resto no segundo.
          </p>
          <p className="text-sm leading-relaxed">
            {reconducao.metaDestePeriodo === null ? (
              <>
                Meta do próximo período:{" "}
                <strong className="tabular-nums">{pct(reconducao.metaProximoPeriodo)}</strong> ou
                menos.
              </>
            ) : (
              <>
                Meta deste período:{" "}
                <strong className="tabular-nums">{pct(reconducao.metaDestePeriodo)}</strong>. A
                prefeitura está em{" "}
                <strong className="tabular-nums">{pct(reconducao.percentualAtual)}</strong> —{" "}
                {reconducao.noCronograma ? "dentro do cronograma." : "fora do cronograma."}
              </>
            )}
          </p>

          {reconducao.prazoEsgotado && (
            <ul className="text-sm leading-relaxed list-disc pl-5 space-y-1 pt-1">
              {SANCOES_PRAZO_ESGOTADO.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          )}
        </section>
      )}

      {/* ── Vedações ── */}
      {avaliacao && !vencido && (avaliacao.situacao === "prudencial" || avaliacao.situacao === "excedido") && (
        <section className="bg-card border border-border rounded-xl p-5 sm:p-6">
          <h2 className="font-serif text-lg font-bold">O que a prefeitura não pode fazer agora</h2>
          <p className="text-sm text-muted mt-1.5 leading-relaxed">
            Vedações do art. 22, parágrafo único da LRF — valem a partir de{" "}
            {pct(LIMITE_PRUDENCIAL)} e independem de qualquer decisão do Tribunal de Contas.
          </p>
          <ul className="text-sm leading-relaxed list-disc pl-5 space-y-1.5 mt-4">
            {VEDACOES_PRUDENCIAL.map((v) => (
              <li key={v}>{v}</li>
            ))}
          </ul>
        </section>
      )}
      </Envoltorio>

      {/* ── Série histórica ── */}
      {periodos.length > 1 && (
        <section className="space-y-3">
          <h2 className="font-serif text-lg font-bold">Períodos informados</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border border-border rounded-xl overflow-hidden">
              <thead className="bg-sutil text-left">
                <tr>
                  <th className="px-4 py-2.5 font-semibold">Período</th>
                  <th className="px-4 py-2.5 font-semibold text-right">RCL ajustada</th>
                  <th className="px-4 py-2.5 font-semibold text-right">Despesa</th>
                  <th className="px-4 py-2.5 font-semibold text-right">% da RCL</th>
                  <th className="px-4 py-2.5 font-semibold">Origem</th>
                </tr>
              </thead>
              <tbody>
                {periodos.map((p) => {
                  const a = avaliarDespesaPessoal(p);
                  return (
                    <tr key={`${p.exercicio}-${p.mesReferencia}`} className="border-t border-border">
                      <td className="px-4 py-2.5">
                        {MESES[p.mesReferencia - 1]} de {p.exercicio}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-muted">
                        {formatarMoeda(p.rcl)}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-muted">
                        {formatarMoeda(p.despesa)}
                      </td>
                      <td
                        className="px-4 py-2.5 text-right tabular-nums font-semibold"
                        style={{ color: a ? TOM[a.situacao].cor : undefined }}
                      >
                        {a ? pct(a.percentual) : "—"}
                      </td>
                      {/* Qual das duas fontes está naquela linha. O RGF é o
                          número que o TC olha; o digitado costuma ser mais
                          atual e menos definitivo — o gestor precisa saber
                          qual ele está lendo antes de citar em reunião. */}
                      <td className="px-4 py-2.5 text-xs text-muted">
                        {p.origem === "siconfi" ? "RGF do Tesouro" : "Informado"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <div
        className="border rounded-xl p-5 text-sm leading-relaxed"
        style={{ background: "var(--medio-tint)", borderColor: "var(--medio-borda)" }}
      >
        <p className="font-semibold mb-1">Isto é acompanhamento, não o Relatório de Gestão Fiscal.</p>
        <p className="text-muted">
          A composição legal da despesa com pessoal e da RCL tem inclusões e
          exclusões que só o contador da prefeitura fecha. Use esta tela para
          agir enquanto ainda dá — não para prestar contas. {CONSEQUENCIA_PESSOAL}
        </p>
      </div>

      <div className="space-y-5">
        <div>
          <h2 className="font-serif text-lg font-bold">Informar um período</h2>
          <p className="text-sm text-muted mt-1 leading-relaxed max-w-2xl">
            A apuração oficial é quadrimestral. Informar mês a mês também
            funciona e antecipa o problema — mas o cronograma de recondução
            conta os períodos que você registrar aqui, então mantenha o mesmo
            ritmo entre um lançamento e outro.
          </p>
        </div>
        <div className="bg-card border border-border rounded-xl p-5 sm:p-6 space-y-6">
          <BotaoImportar />
          <div className="border-t border-border pt-6">
          <p className="text-sm font-semibold mb-4">Ou informe à mão</p>
          {/* Lê `gravados`, não `periodos`: em modo exemplo o segundo é o
              município fictício, e pré-preencher o formulário com ele faria o
              gestor gravar 96 milhões inventados como RCL da prefeitura dele. */}
          <FormularioPessoal
            exercicio={gravados[0]?.exercicio ?? exercicio}
            mesSugerido={gravados[0]?.mesReferencia ?? mesAtual}
            rcl={gravados[0]?.rcl ?? null}
            despesa={gravados[0]?.despesa ?? null}
          />
          </div>
        </div>
      </div>
    </div>
  );
}
