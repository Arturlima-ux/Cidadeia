import Link from "next/link";
import type { Antecipacao } from "@/lib/antecipacao";
import { MINIMO_LEITURAS, HORIZONTE_MESES } from "@/lib/antecipacao";
import { LIMITE_PESSOAL } from "@/lib/despesa-pessoal";
import type { DadosVisaoDoPrefeito } from "@/lib/visao-do-prefeito-servidor";
import { DIAS_EM_BREVE, FRONTEIRAS, pctBr, proximaFronteira, type PontoPessoal } from "@/lib/visao-do-prefeito";
import GraficoPessoal from "@/components/GraficoPessoal";

// ── O PAINEL DO VÍDEO, COM O DADO DA PREFEITURA ──
//
// O vídeo da home mostra este painel com números de exemplo. Aqui ele é o
// mesmo desenho, com o que a prefeitura tem de verdade: três números em cima,
// a despesa com pessoal nas linhas da LRF, e o aviso antecipado ao lado.
//
// Componente de servidor; só o gráfico roda no navegador, para responder ao
// dedo e ao mouse. SVG puro, sem biblioteca de gráfico. A linha se desenha e
// o ponto respira só para quem não pediu menos movimento ao sistema.

type Tom = "urgente" | "medio" | "info" | "neutro";

const COR: Record<Tom, string> = {
  urgente: "var(--urgente)",
  medio: "var(--medio)",
  info: "var(--info)",
  neutro: "var(--muted)",
};

export default function VisaoDoPrefeito({
  dados,
  antecipacao,
}: {
  dados: DadosVisaoDoPrefeito;
  /** A antecipação mais importante da prefeitura, se houver. */
  antecipacao: Antecipacao | null;
}) {
  const serie = dados.pessoal;
  const atual = serie.at(-1) ?? null;
  const daPessoal = antecipacao?.chave.startsWith("pessoal_") ? antecipacao : null;

  return (
    <section
      aria-labelledby="visao-do-prefeito"
      className="rounded-[22px] border border-border p-4 sm:p-6"
      style={{ background: "var(--card)" }}
    >
      <div className="flex items-baseline justify-between gap-4 flex-wrap">
        <h2 id="visao-do-prefeito" className="text-lg font-semibold tracking-[-0.02em]">
          Visão do prefeito
        </h2>
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
          Dados do Tesouro{atual ? ` · RGF até ${atual.rotulo}` : ""}
        </p>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 [&>*:first-child]:col-span-2 sm:[&>*:first-child]:col-span-1">
        <CartaoPessoal atual={atual} temAviso={daPessoal !== null} />
        <CartaoProtocolos resumo={dados.protocolos} />
        <CartaoObras resumo={dados.obras} />
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <GraficoOuVazio serie={serie} projecao={daPessoal} />
        <AvisoAntecipado antecipacao={antecipacao} serie={serie} />
      </div>
    </section>
  );
}

// ── OS TRÊS CARTÕES ──

function Cartao({
  href,
  rotulo,
  valor,
  unidade,
  nota,
  tom,
}: {
  href: string;
  rotulo: string;
  valor: React.ReactNode;
  unidade?: string;
  nota: React.ReactNode;
  tom: Tom;
}) {
  // A borda acende só quando o número pede atenção. Os três acesos ao mesmo
  // tempo é o retrato fiel de uma prefeitura com três problemas.
  const aceso = tom === "urgente" || tom === "medio";
  return (
    <Link
      href={href}
      className="group relative block rounded-2xl border p-4 sm:p-5 transition hover:-translate-y-0.5"
      style={{
        borderColor: aceso ? COR[tom] : "var(--border)",
        background: aceso
          ? `radial-gradient(120% 90% at 100% 0%, color-mix(in srgb, ${COR[tom]} 12%, transparent), transparent 60%), var(--superficie)`
          : "var(--superficie)",
      }}
    >
      <p className="text-sm text-muted">{rotulo}</p>
      <p className="mt-2 flex items-baseline gap-1.5">
        <span className="text-4xl sm:text-[2.6rem] font-medium leading-none tracking-[-0.04em] tabular-nums">{valor}</span>
        {unidade && <span className="text-muted text-lg">{unidade}</span>}
      </p>
      <p className="mt-3 flex items-start gap-1.5 text-xs leading-snug" style={{ color: aceso ? COR[tom] : "var(--muted)" }}>
        {tom !== "neutro" && <span className="w-1.5 h-1.5 mt-[5px] rounded-full shrink-0" style={{ background: COR[tom] }} aria-hidden />}
        <span>{nota}</span>
      </p>
    </Link>
  );
}

function CartaoPessoal({ atual, temAviso }: { atual: PontoPessoal | null; temAviso: boolean }) {
  if (!atual) {
    return (
      <Cartao
        href="/dashboard/pessoal"
        rotulo="Despesa com pessoal"
        valor="—"
        tom="neutro"
        nota="aguardando o RGF do Tesouro"
      />
    );
  }
  const p = atual.percentual;
  const proxima = proximaFronteira(p);
  const tom: Tom = p > LIMITE_PESSOAL ? "urgente" : p >= FRONTEIRAS[0].valor || temAviso ? "medio" : "info";
  const nota = proxima ? `${proxima.nome} em ${pctBr(proxima.valor)}%` : `acima do teto de ${pctBr(LIMITE_PESSOAL)}%`;
  return <Cartao href="/dashboard/pessoal" rotulo="Despesa com pessoal" valor={pctBr(p)} unidade="%" tom={tom} nota={nota} />;
}

function CartaoProtocolos({ resumo }: { resumo: DadosVisaoDoPrefeito["protocolos"] }) {
  if (!resumo) return <CartaoSemModulo rotulo="Protocolos abertos" modulo="Essencial" />;
  const { abertos, vencidos, vencemEmBreve } = resumo;
  const semana = `${vencemEmBreve} ${vencemEmBreve === 1 ? "vence" : "vencem"} em até ${DIAS_EM_BREVE} dias`;
  const [tom, nota]: [Tom, string] =
    vencidos > 0
      ? ["urgente", `${vencidos} com prazo vencido${vencemEmBreve > 0 ? ` · ${semana}` : ""}`]
      : vencemEmBreve > 0
      ? ["medio", semana]
      : abertos > 0
      ? ["info", `nenhum vence em ${DIAS_EM_BREVE} dias`]
      : ["neutro", "nenhum aguardando resposta"];
  return <Cartao href="/dashboard/atendimento" rotulo="Protocolos abertos" valor={abertos} tom={tom} nota={nota} />;
}

function CartaoObras({ resumo }: { resumo: DadosVisaoDoPrefeito["obras"] }) {
  if (!resumo) return <CartaoSemModulo rotulo="Obras no prazo" modulo="Obras" />;
  const { noPrazo, avaliadas, atrasadas, semMedicao } = resumo;
  const semMed = semMedicao > 0 ? `${semMedicao} sem medição recente` : "";
  if (avaliadas === 0) {
    return (
      <Cartao
        href="/dashboard/secretarias/obras"
        rotulo="Obras no prazo"
        valor="—"
        tom={semMedicao > 0 ? "medio" : "neutro"}
        nota={semMed || "Nenhuma obra com prazo e medição"}
      />
    );
  }
  const [tom, nota]: [Tom, string] =
    atrasadas > 0
      ? ["medio", `${atrasadas} com atraso${semMed ? ` · ${semMed}` : ""}`]
      : semMedicao > 0
      ? ["medio", semMed]
      : ["info", "todas andando com o prazo"];
  return (
    <Cartao
      href="/dashboard/secretarias/obras"
      rotulo="Obras no prazo"
      valor={
        <>
          {noPrazo}
          <span className="text-[0.62em] tracking-[-0.02em]"> de </span>
          {avaliadas}
        </>
      }
      tom={tom}
      nota={nota}
    />
  );
}

function CartaoSemModulo({ rotulo, modulo }: { rotulo: string; modulo: string }) {
  return (
    <Link
      href="/dashboard/modulos/marketplace"
      className="block rounded-2xl border border-dashed border-border p-4 sm:p-5 hover:border-brand transition"
    >
      <p className="text-sm text-muted">{rotulo}</p>
      <p className="mt-3 text-sm leading-snug">Entra com o módulo {modulo}.</p>
      <p className="mt-3 text-xs text-brand-claro">Ver o módulo →</p>
    </Link>
  );
}

// ── O GRÁFICO ──
//
// Interativo, como gráfico de bolsa (components/GraficoPessoal.tsx). Aqui fica
// só o estado vazio, que não precisa de JavaScript.

function GraficoOuVazio({ serie, projecao }: { serie: PontoPessoal[]; projecao: Antecipacao | null }) {
  if (serie.length === 0) {
    return (
      <div className="rounded-2xl border border-border p-5 flex flex-col justify-center min-h-[260px]" style={{ background: "var(--superficie)" }}>
        <p className="font-medium">A série da despesa com pessoal aparece aqui.</p>
        <p className="text-sm text-muted mt-2 max-w-[48ch] leading-relaxed">
          O RGF entra sozinho do Tesouro, com os quatro anos anteriores na primeira importação, e cada apuração vira
          um ponto nas linhas de alerta, prudencial e teto da LRF.
        </p>
        <Link href="/dashboard/pessoal" className="mt-4 text-sm font-semibold text-brand-claro hover:underline">
          Abrir Despesa com pessoal →
        </Link>
      </div>
    );
  }
  return (
    <GraficoPessoal
      serie={serie}
      projecao={projecao ? { em: projecao.travessia.em, limiar: projecao.travessia.limiar } : null}
    />
  );
}

// ── O AVISO ANTECIPADO ──

const DEPOIS_DA_FRONTEIRA: Record<string, string> = {
  alerta: "Antes do alerta oficial. Dá tempo de decidir.",
  prudencial: "Antes de nomear, reajustar e criar cargo virarem atos nulos.",
  teto: "Antes do prazo de recondução e da multa pessoal.",
};

function AvisoAntecipado({ antecipacao, serie }: { antecipacao: Antecipacao | null; serie: PontoPessoal[] }) {
  const atual = serie.at(-1)?.percentual ?? null;

  if (!antecipacao) {
    const acima = atual !== null && atual > LIMITE_PESSOAL;
    return (
      <div
        className="rounded-2xl border p-5 flex flex-col"
        style={{ borderColor: acima ? "var(--urgente)" : "var(--border)", background: "var(--superficie)" }}
      >
        <p
          className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em]"
          style={{ color: acima ? "var(--urgente)" : "var(--info)" }}
        >
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: "currentColor" }} aria-hidden />
          {acima ? "Acima do teto" : "Aviso antecipado"}
        </p>
        {acima ? (
          <>
            <p className="mt-4 text-lg leading-snug font-medium">A despesa com pessoal passou de {pctBr(LIMITE_PESSOAL)}%.</p>
            <p className="mt-3 text-sm text-muted leading-relaxed">
              Corre o prazo de recondução: o excesso sai em dois quadrimestres, um terço no primeiro (LRF, art. 23).
            </p>
          </>
        ) : (
          <>
            <p className="mt-4 text-lg leading-snug font-medium">Nenhuma fronteira à vista agora.</p>
            <p className="mt-3 text-sm text-muted leading-relaxed">
              {serie.length === 0
                ? `A projeção começa quando houver ${MINIMO_LEITURAS} apurações da despesa com pessoal: com menos, não há ritmo para medir.`
                : serie.length < MINIMO_LEITURAS
                ? `Com ${serie.length} ${serie.length === 1 ? "apuração" : "apurações"}, ainda não dá para medir o ritmo. A projeção começa na ${MINIMO_LEITURAS}ª.`
                : `A projeção é refeita a cada apuração e avisa aqui, com até ${HORIZONTE_MESES} meses de antecedência, quando o ritmo levar a uma linha da LRF.`}
            </p>
          </>
        )}
        <Link href="/dashboard/pessoal" className="mt-auto pt-5 text-sm font-semibold text-brand-claro hover:underline">
          Ver a série completa →
        </Link>
      </div>
    );
  }

  const tom = antecipacao.prioridade === "urgente" ? "var(--urgente)" : "var(--medio)";
  const pessoal = antecipacao.chave.startsWith("pessoal_");
  const fronteira = FRONTEIRAS.find((f) => Math.abs(f.valor - antecipacao.travessia.limiar) < 0.01);

  return (
    <div
      className="rounded-2xl border p-5 flex flex-col"
      style={{
        borderColor: tom,
        background: `radial-gradient(120% 80% at 0% 0%, color-mix(in srgb, ${tom} 10%, transparent), transparent 65%), var(--superficie)`,
      }}
    >
      <p className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em]" style={{ color: tom }}>
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: "currentColor" }} aria-hidden />
        Aviso antecipado
      </p>
      <p className="mt-4 text-lg leading-snug font-medium">
        {pessoal ? `Despesa com pessoal a caminho de ${pctBr(antecipacao.travessia.limiar)}%.` : antecipacao.titulo}
      </p>
      <p className="mt-3 text-sm text-muted leading-relaxed first-letter:uppercase">{antecipacao.quando}.</p>
      {pessoal && fronteira && <p className="mt-1 text-sm text-muted leading-relaxed">{DEPOIS_DA_FRONTEIRA[fronteira.nome]}</p>}
      <Link href={antecipacao.destino} className="mt-auto pt-5 text-sm font-semibold text-brand-claro hover:underline">
        O que fazer agora →
      </Link>
    </div>
  );
}
