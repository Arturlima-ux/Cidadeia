import type { DeteccaoAutomatica } from "@/lib/deteccao-automatica";

// ── AS EMENDAS PIX DA PREFEITURA ──
//
// Transferência especial (art. 166-A da Constituição) é o dinheiro de emenda
// parlamentar que cai direto na conta do município, sem convênio. Por isso o
// apelido "emenda Pix" — e por isso o controle aperta: desde 2024 decisões
// do STF cobram plano de trabalho cadastrado no Transferegov e transparência
// sobre a aplicação, e os Tribunais de Contas passaram a cobrar a
// rastreabilidade de cada real.
//
// O prefeito raramente sabe, de cabeça, quantas emendas recebeu, de quem, em
// que situação está cada uma e qual prazo vence. Tudo isso é público no
// Transferegov; aqui vira lista e alerta:
//
//   - emenda com impedimento (o dinheiro não sai enquanto não resolver);
//   - plano de trabalho com análise pendente;
//   - execução que termina em até 60 dias sem relatório de gestão final;
//   - execução que já terminou sem relatório final;
//   - devolução de recurso com vencimento próximo.
//
// Só o que o Transferegov mostra. Nenhum prazo é inventado aqui: as datas são
// as que a própria prefeitura cadastrou no plano de trabalho.
//
// Esta é a parte pura. A consulta e a gravação estão em emendas-pix-servidor.ts.

// ── Linhas cruas da API (só os campos usados) ──

export type BeneficiarioCru = { id_beneficiario: number; cnpj_beneficiario: string | null; nome_beneficiario: string | null };

export type PlanoAcaoCru = {
  id_plano_acao: number;
  codigo_plano_acao: string | null;
  ano_plano_acao: number | null;
  situacao_plano_acao: string | null;
  data_aceite_plano_acao: string | null;
  nome_parlamentar_emenda_plano_acao: string | null;
  codigo_emenda_parlamentar_formatado_plano_acao: string | null;
  motivo_impedimento_plano_acao: string | null;
  valor_custeio_plano_acao: number | null;
  valor_investimento_plano_acao: number | null;
  nome_objeto: string | null;
  detalhamento_objeto?: string | null;
  codigo_descricao_areas_politicas_publicas_plano_acao: string | null;
};

export type PlanoTrabalhoCru = {
  id_plano_trabalho: number;
  id_plano_acao: number;
  situacao_plano_trabalho: string | null;
  data_inicio_execucao_plano_trabalho: string | null;
  data_fim_execucao_plano_trabalho: string | null;
  dt_hora_pt_aprovado: string | null;
  ind_orgao_analises_pendentes: boolean | string | number | null;
};

export type RelatorioGestaoCru = {
  id_relatorio_gestao_novo: number;
  id_plano_acao: number;
  data_relatorio_gestao_novo: string | null;
  tipo_relatorio_gestao_novo: string | null;
  situacao_relatorio_gestao_novo: string | null;
  valor_executado_relatorio_gestao_novo: number | null;
};

export type DevolucaoCru = {
  id_devolucao: number;
  id_plano_acao: number;
  situacao_devolucao: string | null;
  dt_vencimento_devolucao: string | null;
  dt_pagamento_devolucao: string | null;
  vl_total_devolucao: number | null;
};

// ── O que a prefeitura vê ──

export type Emenda = {
  id: number;
  codigo: string | null;
  ano: number | null;
  parlamentar: string | null;
  numeroEmenda: string | null;
  objeto: string | null;
  area: string | null;
  valor: number;
  situacao: string | null;
  impedimento: string | null;
  planoTrabalho: {
    situacao: string | null;
    inicio: string | null;
    fim: string | null;
    aprovadoEm: string | null;
    analisePendente: boolean;
  } | null;
  relatorios: { tipo: string | null; situacao: string | null; data: string | null; executado: number | null }[];
  devolucoes: { situacao: string | null; vencimento: string | null; pagaEm: string | null; valor: number | null }[];
};

export const soDigitos = (t: string | null | undefined) => (t ?? "").replace(/\D/g, "");

export function cnpjFormatado(cnpj: string): string {
  const d = soDigitos(cnpj);
  return d.length === 14 ? `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}` : cnpj;
}

const texto = (t: string | null | undefined) => {
  const v = (t ?? "").trim();
  return v ? v : null;
};
const dia = (t: string | null | undefined) => (t && /^\d{4}-\d{2}-\d{2}/.test(t) ? t.slice(0, 10) : null);
const verdadeiro = (v: unknown) => v === true || v === 1 || (typeof v === "string" && /^(s|sim|true|1)$/i.test(v.trim()));

/** As áreas vêm como "25-Energia / 752-Energia Elétrica" (conferido no serviço): fica só o nome. */
export function areaDe(t: string | null): string | null {
  const v = texto(t);
  if (!v) return null;
  const nomes = v
    .split(/[;|/]/)
    .map((p) => p.replace(/^\s*\d+\s*[-–]\s*/, "").trim())
    .filter(Boolean);
  return [...new Set(nomes)].join(", ") || null;
}

export function montarEmendas(
  planos: PlanoAcaoCru[],
  trabalhos: PlanoTrabalhoCru[],
  relatorios: RelatorioGestaoCru[],
  devolucoes: DevolucaoCru[]
): Emenda[] {
  const porPlano = <T extends { id_plano_acao: number }>(l: T[]) => {
    const m = new Map<number, T[]>();
    for (const x of l) m.set(x.id_plano_acao, [...(m.get(x.id_plano_acao) ?? []), x]);
    return m;
  };
  const pts = porPlano(trabalhos);
  const rels = porPlano(relatorios);
  const devs = porPlano(devolucoes);

  return planos
    .map((p) => {
      // Mais de um plano de trabalho por plano de ação acontece quando um é
      // refeito; vale o último.
      const pt = (pts.get(p.id_plano_acao) ?? []).sort((a, b) => b.id_plano_trabalho - a.id_plano_trabalho)[0];
      return {
        id: p.id_plano_acao,
        codigo: texto(p.codigo_plano_acao),
        ano: p.ano_plano_acao ?? null,
        parlamentar: texto(p.nome_parlamentar_emenda_plano_acao),
        numeroEmenda: texto(p.codigo_emenda_parlamentar_formatado_plano_acao),
        // O objeto costuma vir vazio nas emendas antigas (conferido): o
        // detalhamento é a segunda tentativa; a tela cai na área depois.
        objeto: texto(p.nome_objeto) ?? texto(p.detalhamento_objeto),
        area: areaDe(p.codigo_descricao_areas_politicas_publicas_plano_acao),
        valor: (p.valor_custeio_plano_acao ?? 0) + (p.valor_investimento_plano_acao ?? 0),
        situacao: texto(p.situacao_plano_acao),
        impedimento: texto(p.motivo_impedimento_plano_acao),
        planoTrabalho: pt
          ? {
              situacao: texto(pt.situacao_plano_trabalho),
              inicio: dia(pt.data_inicio_execucao_plano_trabalho),
              fim: dia(pt.data_fim_execucao_plano_trabalho),
              aprovadoEm: dia(pt.dt_hora_pt_aprovado),
              analisePendente: verdadeiro(pt.ind_orgao_analises_pendentes),
            }
          : null,
        relatorios: (rels.get(p.id_plano_acao) ?? [])
          .map((r) => ({
            tipo: texto(r.tipo_relatorio_gestao_novo),
            situacao: texto(r.situacao_relatorio_gestao_novo),
            data: dia(r.data_relatorio_gestao_novo),
            executado: r.valor_executado_relatorio_gestao_novo ?? null,
          }))
          .sort((a, b) => (b.data ?? "").localeCompare(a.data ?? "")),
        devolucoes: (devs.get(p.id_plano_acao) ?? []).map((d) => ({
          situacao: texto(d.situacao_devolucao),
          vencimento: dia(d.dt_vencimento_devolucao),
          pagaEm: dia(d.dt_pagamento_devolucao),
          valor: d.vl_total_devolucao ?? null,
        })),
      };
    })
    .sort((a, b) => (b.ano ?? 0) - (a.ano ?? 0) || b.valor - a.valor);
}

export const temRelatorioFinal = (e: Emenda) => e.relatorios.some((r) => /final/i.test(r.tipo ?? ""));

const DIA = 86_400_000;
const diasAte = (iso: string, hoje: Date) => Math.round((Date.parse(`${iso}T12:00:00Z`) - hoje.getTime()) / DIA);

const reais = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

function nomeDa(e: Emenda): string {
  const de = e.parlamentar ? ` de ${e.parlamentar}` : "";
  return `Emenda Pix${de}${e.ano ? ` (${e.ano})` : ""}`;
}

/** Quanto antes do fim da execução o aviso começa. */
export const DIAS_ANTES_DO_FIM = 60;
const DIAS_ANTES_DA_DEVOLUCAO = 15;

/** Os alertas da vigia diária. */
export function achadosDasEmendas(emendas: Emenda[], hoje: Date = new Date()): DeteccaoAutomatica[] {
  const achados: DeteccaoAutomatica[] = [];
  for (const e of emendas) {
    const nome = nomeDa(e);
    const objeto = e.objeto ? ` — ${e.objeto.length > 90 ? `${e.objeto.slice(0, 87)}…` : e.objeto}` : "";

    if (e.impedimento) {
      achados.push({
        categoria: "financeiro",
        prioridade: "medio",
        secretaria: null,
        titulo: `${nome} com impedimento no Transferegov`,
        descricao: `${reais(e.valor)}${objeto}. Motivo registrado: ${e.impedimento}. Enquanto o impedimento não for resolvido, o recurso não é liberado.`,
        chave: `emenda:${e.id}:impedida`,
      });
    }

    if (e.planoTrabalho?.analisePendente) {
      achados.push({
        categoria: "prazo",
        prioridade: "info",
        secretaria: null,
        titulo: `${nome}: plano de trabalho com análise pendente`,
        descricao: `${reais(e.valor)}${objeto}. Há análise pendente de órgão sobre o plano de trabalho no Transferegov; vale acompanhar para não travar a execução.`,
        chave: `emenda:${e.id}:analise`,
      });
    }

    const fim = e.planoTrabalho?.fim;
    if (fim && !temRelatorioFinal(e)) {
      const dias = diasAte(fim, hoje);
      if (dias < 0) {
        achados.push({
          categoria: "prazo",
          prioridade: "urgente",
          secretaria: null,
          titulo: `${nome}: execução terminou sem relatório de gestão final`,
          descricao: `${reais(e.valor)}${objeto}. O prazo de execução do plano de trabalho acabou em ${fim.split("-").reverse().join("/")} e não há relatório de gestão final no Transferegov. É o que o Tribunal de Contas pede primeiro.`,
          chave: `emenda:${e.id}:sem-final:${fim}`,
        });
      } else if (dias <= DIAS_ANTES_DO_FIM) {
        achados.push({
          categoria: "prazo",
          prioridade: dias <= 15 ? "urgente" : "medio",
          secretaria: null,
          titulo: `${nome}: execução termina em ${dias} dia(s)`,
          descricao: `${reais(e.valor)}${objeto}. O plano de trabalho termina em ${fim.split("-").reverse().join("/")}. Depois disso vem o relatório de gestão final no Transferegov; o que não foi executado pode ter de ser devolvido.`,
          chave: `emenda:${e.id}:fim:${fim}`,
        });
      }
    }

    for (const d of e.devolucoes) {
      if (d.pagaEm || !d.vencimento) continue;
      const dias = diasAte(d.vencimento, hoje);
      if (dias > DIAS_ANTES_DA_DEVOLUCAO) continue;
      achados.push({
        categoria: "prazo",
        prioridade: "urgente",
        secretaria: null,
        titulo: dias < 0 ? `${nome}: devolução de recurso vencida` : `${nome}: devolução de recurso vence em ${dias} dia(s)`,
        descricao: `${d.valor ? reais(d.valor) : "Valor não informado"} a devolver, vencimento ${d.vencimento.split("-").reverse().join("/")}${d.situacao ? ` (${d.situacao})` : ""}. Devolução em atraso gera multa e juros.`,
        chave: `emenda:${e.id}:devolucao:${d.vencimento}`,
      });
    }
  }
  return achados;
}

export type ResumoEmendas = { quantidade: number; total: number; porAno: { ano: number; quantidade: number; total: number }[]; comPendencia: number };

export function resumirEmendas(emendas: Emenda[], hoje: Date = new Date()): ResumoEmendas {
  const anos = new Map<number, { quantidade: number; total: number }>();
  for (const e of emendas) {
    if (!e.ano) continue;
    const a = anos.get(e.ano) ?? { quantidade: 0, total: 0 };
    a.quantidade++;
    a.total += e.valor;
    anos.set(e.ano, a);
  }
  const pendentes = new Set(achadosDasEmendas(emendas, hoje).map((a) => a.chave?.split(":")[1]));
  return {
    quantidade: emendas.length,
    total: emendas.reduce((s, e) => s + e.valor, 0),
    porAno: [...anos.entries()].map(([ano, v]) => ({ ano, ...v })).sort((a, b) => b.ano - a.ano),
    comPendencia: pendentes.size,
  };
}
