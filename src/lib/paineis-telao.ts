import type { PainelTelao } from "@/app/dashboard/apresentacao/Telao";
import {
  MINIMOS,
  AREAS_MINIMO,
  avaliarMinimo,
  type AreaMinimo,
} from "@/lib/minimos-constitucionais";
import { avaliarDefasagem, nomeDoMes, TOLERANCIA_MINIMOS } from "@/lib/defasagem";

// ── MONTAGEM DOS PAINÉIS DO TELÃO ──
//
// Pura, separada do componente, porque a decisão de o que vira notícia numa
// sessão pública é regra de negócio — e errar aqui é caro de desfazer.
//
// A regra que atravessa tudo: número ausente NUNCA vira zero. No painel do
// gestor, zero é ambíguo e ele sabe interpretar; num telão diante da câmara,
// "0 obras concluídas" é acusação, e ninguém vai parar a sessão para explicar
// que o dado só não foi cadastrado.

export type DadosTelao = {
  municipio: string;
  /**
   * Exercício e mês corrente no fuso do município.
   *
   * Serve só para medir a idade da base de cálculo — e é aqui que o telão mais
   * precisa dela. No painel do gestor, um "cumprido" verde sobre dado velho é
   * um erro que ele corrige sozinho ao abrir o formulário; projetado numa
   * sessão da câmara, vira declaração pública que o vereador vai cobrar.
   */
  hoje: { exercicio: number; mes: number };
  minimos: { area: AreaMinimo; base: number; aplicado: number; mesReferencia: number }[];
  obras: { status: string; progressoAtual: number; progressoEsperado: number }[];
  atendimentos: { status: string }[];
  saldo: number | null;
};

function formatarReais(v: number): string {
  if (Math.abs(v) >= 1_000_000) {
    return `R$ ${(v / 1_000_000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mi`;
  }
  if (Math.abs(v) >= 1_000) {
    return `R$ ${(v / 1_000).toLocaleString("pt-BR", { maximumFractionDigits: 0 })} mil`;
  }
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

export function montarPaineisTelao(dados: DadosTelao): PainelTelao[] {
  const paineis: PainelTelao[] = [];

  // ── mínimos constitucionais ──
  for (const area of AREAS_MINIMO) {
    const info = MINIMOS[area];
    const registro = dados.minimos.find((m) => m.area === area);

    if (!registro || registro.base <= 0) {
      paineis.push({
        chave: `minimo-${area}`,
        rotulo: `Mínimo em ${info.area}`,
        valor: "—",
        contexto: `Informe a base de cálculo no painel para acompanhar o mínimo de ${info.percentual}%.`,
        tom: "neutro",
        semDado: true,
      });
      continue;
    }

    const a = avaliarMinimo({
      area,
      base: registro.base,
      aplicado: registro.aplicado,
      mesesDecorridos: registro.mesReferencia,
    });
    const cumprido = a.percentualAtual >= a.exigido;

    // Idade da medição. O telão é o lugar onde afirmar sobre dado velho custa
    // mais caro: o número fica projetado, em corpo grande, e ninguém vai parar
    // a sessão para explicar que a base é de março.
    const defasagem = avaliarDefasagem({
      exercicio: dados.hoje.exercicio,
      mesReferencia: registro.mesReferencia,
      hojeExercicio: dados.hoje.exercicio,
      hojeMes: dados.hoje.mes,
      toleranciaMeses: TOLERANCIA_MINIMOS,
    });

    if (defasagem.situacao !== "atual") {
      // Mostra o número e a data, sem veredito e sem cor. `semDado: false`
      // porque o dado existe — o que não existe é a conclusão.
      paineis.push({
        chave: `minimo-${area}`,
        rotulo: `Mínimo em ${info.area}`,
        valor: `${a.percentualAtual.toFixed(1).replace(".", ",")}%`,
        contexto: `Medido até ${nomeDoMes(registro.mesReferencia)}. Mínimo de ${
          a.exigido
        }% — a posição de hoje depende de fechamento mais recente.`,
        tom: "neutro",
        semDado: false,
      });
      continue;
    }

    paineis.push({
      chave: `minimo-${area}`,
      rotulo: `Mínimo em ${info.area}`,
      valor: `${a.percentualAtual.toFixed(1).replace(".", ",")}%`,
      contexto: cumprido
        ? `Acima do mínimo de ${a.exigido}% exigido pela lei.`
        : `Abaixo do mínimo de ${a.exigido}%. Faltam ${formatarReais(
            a.faltaProjetadaNoAno ?? a.faltaSobreBaseAtual
          )} até o fim do exercício.`,
      tom: cumprido ? "bom" : a.situacao === "critico" ? "ruim" : "atencao",
      semDado: false,
    });
  }

  // ── obras ──
  if (dados.obras.length > 0) {
    const concluidas = dados.obras.filter((o) => o.status === "concluida").length;
    const atrasadas = dados.obras.filter(
      (o) =>
        o.status !== "concluida" &&
        o.status !== "cancelada" &&
        o.progressoAtual < o.progressoEsperado - 10
    ).length;

    paineis.push({
      chave: "obras-concluidas",
      rotulo: "Obras concluídas",
      valor: String(concluidas),
      contexto: `de ${dados.obras.length} ${dados.obras.length === 1 ? "obra cadastrada" : "obras cadastradas"}.`,
      tom: "bom",
      semDado: false,
    });

    // O painel de atraso só existe quando HÁ atraso. Num telão, "0 obras
    // atrasadas" é bom — mas ocupa doze segundos dizendo nada, e a tela tem
    // pouca atenção para gastar.
    if (atrasadas > 0) {
      paineis.push({
        chave: "obras-atrasadas",
        rotulo: "Obras atrasadas",
        valor: String(atrasadas),
        contexto: "mais de dez pontos abaixo do progresso previsto.",
        tom: "ruim",
        semDado: false,
      });
    }
  }

  // ── atendimento ao cidadão ──
  if (dados.atendimentos.length > 0) {
    const respondidos = dados.atendimentos.filter(
      (a) => a.status === "respondido" || a.status === "encerrado"
    ).length;
    const proporcao = Math.round((respondidos / dados.atendimentos.length) * 100);

    paineis.push({
      chave: "atendimento",
      rotulo: "Manifestações respondidas",
      valor: `${proporcao}%`,
      contexto: `${respondidos} de ${dados.atendimentos.length} manifestações do cidadão já respondidas.`,
      tom: proporcao >= 80 ? "bom" : proporcao >= 50 ? "atencao" : "ruim",
      semDado: false,
    });
  }

  // ── saldo ──
  if (dados.saldo !== null) {
    paineis.push({
      chave: "saldo",
      rotulo: "Saldo do último registro",
      valor: formatarReais(dados.saldo),
      contexto: dados.saldo < 0 ? "Saldo negativo no último fechamento registrado." : null,
      tom: dados.saldo < 0 ? "ruim" : "neutro",
      semDado: false,
    });
  }

  return paineis;
}
