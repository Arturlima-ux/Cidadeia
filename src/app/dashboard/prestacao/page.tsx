import Link from "next/link";
import { contextoDashboard } from "@/lib/contexto-dashboard";
import BloqueioPlano from "@/components/BloqueioPlano";
import { formatarMoeda } from "@/lib/formatadores";
import { fusoDoEstado } from "@/lib/horario";
import { AREAS_MINIMO, avaliarMinimo } from "@/lib/minimos-constitucionais";
import { avaliarDespesaPessoal } from "@/lib/despesa-pessoal";
import { coberturaLegal } from "@/lib/publicacoes";
import {
  periodosDoExercicio,
  periodicidadeRgf,
  avaliarObrigacoes,
} from "@/lib/obrigacoes-fiscais";
import {
  avaliarDefasagem,
  descreverDefasagem,
  TOLERANCIA_MINIMOS,
  TOLERANCIA_PESSOAL,
  TOLERANCIA_PESSOAL_SEMESTRAL,
} from "@/lib/defasagem";
import { podeOptarPorSemestral } from "@/lib/obrigacoes-fiscais";
import {
  frenteDoMinimo,
  frenteDoPessoal,
  frenteDaTransparencia,
  frenteDosRelatorios,
  degradarPorIdade,
  ordenarFrentes,
  totalQueFalta,
  vereditoGeral,
  NOME_SITUACAO_FRENTE,
  rotuloDaConsequencia,
  type Frente,
  type SituacaoFrente,
} from "@/lib/prestacao-de-contas";
import { buscarBases } from "@/app/dashboard/minimos/actions";
import { buscarPeriodos } from "@/app/dashboard/pessoal/actions";
import { listarPublicacoes } from "@/app/dashboard/publicacoes/actions";
import { IconDownload } from "@/components/icons";

// ── A TELA DO PREFEITO ──
//
// O painel responde "o que decido hoje". Esta responde a pergunta que não
// aparecia em lugar nenhum do produto e é a única que tira um prefeito do
// cargo: as contas deste exercício passam no Tribunal?
//
// Todas as seis frentes já existiam, cada uma em sua tela. Estar separadas era
// o problema: ninguém abre seis telas e soma de cabeça. A lógica mora em
// lib/prestacao-de-contas.ts, com teste; aqui só se lê o banco e se desenha.
//
// ── POR QUE ESTA TELA NÃO MOSTRA EXEMPLO ──
//
// As telas de mínimos e de pessoal mostram um município fictício quando estão
// vazias, para a demonstração não abrir em branco. Aqui isso seria grave: o
// veredito desta página é "as contas passam", e um prefeito que o lesse sobre
// dado de ilustração fecharia o exercício tranquilo olhando uma tela nossa.
//
// Prefeitura sem dado lançado vê, em vez do exemplo, exatamente o que é
// verdade: seis frentes sem dado, e a frase dizendo que ausência de dado não é
// conformidade.

export const metadata = { title: "Prestação de contas" };

const TOM: Record<SituacaoFrente, { cor: string; fundo: string; borda: string; tracejado?: boolean }> = {
  critico: { cor: "var(--urgente)", fundo: "var(--urgente-tint)", borda: "var(--urgente-borda)" },
  risco: { cor: "var(--medio)", fundo: "var(--medio-tint)", borda: "var(--medio-borda)" },
  // Tracejado, não colorido: o olho tem que ler "falta algo aqui" antes de
  // procurar a cor, porque ausência de dado não é um nível de gravidade — é
  // uma lacuna.
  sem_dado: { cor: "var(--muted)", fundo: "var(--card)", borda: "var(--border)", tracejado: true },
  acompanhar: { cor: "var(--info)", fundo: "var(--card)", borda: "var(--border)" },
  cumprido: { cor: "var(--info)", fundo: "var(--info-tint)", borda: "var(--info-borda)" },
};

export default async function PrestacaoPage() {
  const { prefeitura, temPlano } = await contextoDashboard();
  if (!temPlano("gestao")) return <BloqueioPlano plano="gestao" />;

  // Exercício e mês no fuso do município, não no do servidor — a Vercel roda
  // em UTC, e virar o ano três horas antes abriria o exercício seguinte com a
  // prefeitura ainda fechando o anterior.
  const agora = new Date();
  const fuso = fusoDoEstado(prefeitura.estado);
  const exercicio = Number(
    new Intl.DateTimeFormat("pt-BR", { timeZone: fuso, year: "numeric" }).format(agora)
  );
  const mesAtual = Number(
    new Intl.DateTimeFormat("pt-BR", { timeZone: fuso, month: "numeric" }).format(agora)
  );

  // Quatro leituras independentes. Em sequência, a tela esperaria a soma dos
  // quatro tempos para desenhar a primeira linha.
  const [bases, periodosPessoal, publicacoes] = await Promise.all([
    buscarBases(exercicio),
    buscarPeriodos(),
    listarPublicacoes(),
  ]);

  // ── MÍNIMOS E FUNDEB ──
  const frentesMinimo = AREAS_MINIMO.map((area) => {
    const salvo = bases.find((b) => b.area === area) ?? null;
    const avaliacao = salvo
      ? avaliarMinimo({
          area,
          base: salvo.baseCalculo,
          aplicado: salvo.aplicado,
          mesesDecorridos: salvo.mesReferencia,
        })
      : null;

    const aviso = salvo
      ? descreverDefasagem(
          avaliarDefasagem({
            exercicio,
            mesReferencia: salvo.mesReferencia,
            hojeExercicio: exercicio,
            hojeMes: mesAtual,
            toleranciaMeses: TOLERANCIA_MINIMOS,
          }),
          { exercicio, mesReferencia: salvo.mesReferencia }
        )
      : null;

    return degradarPorIdade(frenteDoMinimo(area, avaliacao, formatarMoeda), aviso);
  });

  // ── TETO DA DESPESA COM PESSOAL ──
  const atual = periodosPessoal[0] ?? null;
  // Município com menos de 50 mil habitantes publica o RGF semestralmente, e
  // cobrar dele o ritmo quadrimestral seria acusá-lo de atraso por seguir a
  // periodicidade que a lei lhe faculta.
  const podeSemestral = podeOptarPorSemestral(prefeitura.populacao);
  const avisoPessoal = atual
    ? descreverDefasagem(
        avaliarDefasagem({
          exercicio: atual.exercicio,
          mesReferencia: atual.mesReferencia,
          hojeExercicio: exercicio,
          hojeMes: mesAtual,
          toleranciaMeses: podeSemestral ? TOLERANCIA_PESSOAL_SEMESTRAL : TOLERANCIA_PESSOAL,
        }),
        atual
      )
    : null;
  const frentePessoal = degradarPorIdade(
    frenteDoPessoal(atual ? avaliarDespesaPessoal(atual) : null, formatarMoeda),
    avisoPessoal
  );

  // ── TRANSPARÊNCIA ATIVA ──
  const frenteTransparencia = frenteDaTransparencia(coberturaLegal(publicacoes));

  // ── CALENDÁRIO FISCAL ──
  //
  // Calendário puro, sem rede. A confirmação de entrega exige consulta ao
  // SICONFI — seis chamadas, uma por bimestre encerrado, contra uma API que o
  // Tesouro mantém para todo mundo. Disparar isso a cada visita a esta tela
  // seria abusar de infraestrutura pública, então aqui a entrega entra como
  // "não conferida" e a conferência continua sendo um clique na tela de
  // mínimos. É por isso que esta frente nunca aparece como cumprida.
  //
  // A periodicidade do RGF fica no ritmo quadrimestral, e não no semestral que
  // a lei faculta a município pequeno. Não é descuido: `podeOptarPorSemestral`
  // responde se a prefeitura PODE optar, não se optou — a opção é escolha dela,
  // e ninguém a registrou em lugar nenhum do produto. Tratar "pode" como
  // "optou" tiraria um prazo do calendário e esta tela listaria menos pendência
  // do que existe, que é o defeito que um produto de conformidade não pode ter.
  // O calendário quadrimestral é o mais exigente dos dois, e nenhuma linha daqui
  // acusa atraso: ela pede conferência, e a conferência resolve.
  const avaliadas = avaliarObrigacoes(
    periodosDoExercicio(exercicio, {
      periodicidadeRgf: periodicidadeRgf(prefeitura.populacao),
    }),
    new Set(),
    agora
  );
  const proximo = avaliadas.find((o) => o.situacao === "a_vencer" || o.situacao === "futura");
  const frenteRelatorios = frenteDosRelatorios({
    vencidosSemConferencia: avaliadas.filter((o) => o.situacao === "vencida").length,
    proximo: proximo
      ? {
          sigla: proximo.obrigacao.sigla,
          rotulo: proximo.rotulo,
          vencimento: proximo.vencimento,
          consequencia: proximo.obrigacao.consequencia,
        }
      : null,
  });

  const frentes = ordenarFrentes([
    ...frentesMinimo,
    frentePessoal,
    frenteTransparencia,
    frenteRelatorios,
  ]);

  const veredito = vereditoGeral(frentes);
  const total = totalQueFalta(frentes);
  const tomVeredito = TOM[veredito.tom];

  return (
    <div className="max-w-4xl space-y-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs font-semibold text-muted">
            Exercício de {exercicio} · {prefeitura.municipio}
          </p>
          <h1 className="text-2xl sm:text-3xl font-semibold mt-1 tracking-[-0.02em]">
            Prestação de contas
          </h1>
          <p className="text-muted text-sm mt-1.5 leading-relaxed max-w-[64ch]">
            As seis frentes que o Tribunal de Contas julga ao fim do exercício, em uma lista só,
            ordenadas por gravidade e com a consequência legal escrita ao lado. Cada linha leva à
            tela onde se corrige — <strong>enquanto ainda dá para empenhar</strong>.
          </p>
        </div>
        <a
          href="/api/relatorios/executivo"
          className="group shrink-0 flex items-center gap-2 border border-border bg-card rounded-lg px-4 py-2.5 text-sm font-semibold hover:border-brand hover:text-brand transition"
        >
          <IconDownload className="w-4 h-4 transition-transform duration-200 group-hover:translate-y-0.5" />
          Relatório executivo (PDF)
        </a>
      </div>

      {/* ── O VEREDITO ──
          Uma frase antes de qualquer número. Um prefeito que abre esta tela
          entre duas reuniões precisa saber em cinco segundos se tem problema;
          a lista existe para quando a resposta for sim. */}
      <section
        className="arco-card border p-6 sm:p-7"
        style={{
          background: tomVeredito.fundo,
          borderColor: tomVeredito.borda,
          borderStyle: tomVeredito.tracejado ? "dashed" : "solid",
        }}
      >
        <p
          className="text-xs font-bold"
          style={{ color: tomVeredito.cor }}
        >
          {NOME_SITUACAO_FRENTE[veredito.tom]}
        </p>
        <p className="text-lg sm:text-xl font-semibold mt-2 leading-snug max-w-[52ch] tracking-[-0.02em]">
          {veredito.frase}
        </p>

        {total.frentes > 0 && (
          <div className="mt-5 pt-4 border-t" style={{ borderColor: tomVeredito.borda }}>
            <p className="text-xs font-semibold text-muted">
              Separa a prefeitura da conformidade
            </p>
            <p className="text-3xl font-semibold tabular-nums mt-1 tracking-[-0.02em]">
              {formatarMoeda(total.reais)}
            </p>
            <p className="text-xs text-muted mt-1.5 leading-relaxed max-w-[56ch]">
              {total.frentes === 1
                ? "O que falta aplicar ou cortar na única frente fora de conformidade que se mede em reais."
                : `Soma do que falta aplicar ou cortar nas ${total.frentes} frentes fora de conformidade que se medem em reais.`}{" "}
              Frentes sem dado lançado não entram nesta soma — somar zero por elas daria um total
              que parece completo e não é.
            </p>
          </div>
        )}
      </section>

      {/* ── AS FRENTES ── */}
      <ul className="flex flex-col gap-3">
        {frentes.map((f) => (
          <CartaoFrente key={f.chave} frente={f} />
        ))}
      </ul>

      <div className="text-xs text-muted leading-relaxed pt-4 border-t border-border space-y-2 max-w-[70ch]">
        <p>
          <strong className="text-ink">O que esta tela não faz.</strong> Não substitui o
          contador: os percentuais saem da base de cálculo que a prefeitura lança, e é o contador
          quem fecha esse número. Não confirma entrega de relatório ao Tesouro — a conferência
          consulta o SICONFI e fica na tela de mínimos, sob demanda, para não bater na API pública
          a cada visita.
        </p>
        <p>
          Nenhum número daqui vem de inteligência artificial. Cada veredito é regra sobre o dado
          lançado, e a norma que o cria está escrita em cada linha.
        </p>
      </div>
    </div>
  );
}

function CartaoFrente({ frente: f }: { frente: Frente }) {
  const tom = TOM[f.situacao];

  return (
    <li>
      <Link
        href={f.destino}
        className="card-interactive group block arco-card border p-5 transition hover:brightness-[1.02]"
        style={{
          background: tom.fundo,
          borderColor: tom.borda,
          borderStyle: tom.tracejado ? "dashed" : "solid",
        }}
      >
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h2 className="font-semibold text-[15px]">{f.titulo}</h2>
          <span
            className="text-xs font-bold shrink-0"
            style={{ color: tom.cor }}
          >
            {NOME_SITUACAO_FRENTE[f.situacao]}
          </span>
        </div>

        <p className="text-sm mt-2 leading-relaxed max-w-[62ch]">{f.veredito}</p>

        {(f.falta !== null || f.esforco) && (
          <div className="flex flex-wrap gap-x-6 gap-y-2 mt-3.5">
            {f.falta !== null && (
              <div>
                <p className="text-xs font-semibold text-muted">
                  Falta
                </p>
                <p
                  className="text-xl font-semibold tabular-nums leading-tight tracking-[-0.02em]"
                  style={{ color: tom.cor }}
                >
                  {formatarMoeda(f.falta)}
                </p>
              </div>
            )}
            {f.esforco && (
              <div>
                <p className="text-xs font-semibold text-muted">
                  Esforço necessário
                </p>
                {/* O fator é o número mais acionável da tela: "1,8×" diz ao
                    secretário o tamanho do empenho, coisa que um percentual
                    sozinho não diz. */}
                <p className="text-sm font-semibold leading-tight mt-1">{f.esforco}</p>
              </div>
            )}
          </div>
        )}

        {/* ── A CONSEQUÊNCIA ──
            Fica visível, não escondida atrás de um clique. É ela que separa
            um indicador de uma decisão: 21% de aplicação em educação não
            significa nada para quem não sabe que fechar o ano assim é
            rejeição de contas.

            O rótulo muda com a situação, e isso não é estilo — ver
            `rotuloDaConsequencia`. */}
        <div
          className="mt-4 pt-3 border-t text-xs leading-relaxed"
          style={{ borderColor: tom.borda }}
        >
          <p className="text-muted">
            <span className="font-semibold" style={{ color: tom.cor }}>
              {rotuloDaConsequencia(f.situacao)}:
            </span>{" "}
            {f.consequencia}
          </p>
          <p className="font-mono text-[11px] text-muted mt-1.5 flex flex-wrap items-center gap-x-2">
            {f.fundamento}
            <span
              aria-hidden
              className="font-sans not-italic transition-transform duration-200 group-hover:translate-x-1"
              style={{ color: tom.cor }}
            >
              →
            </span>
          </p>
        </div>
      </Link>
    </li>
  );
}
