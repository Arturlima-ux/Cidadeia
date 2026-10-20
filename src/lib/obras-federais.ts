import type { DeteccaoAutomatica } from "@/lib/deteccao-automatica";
import type { Area } from "@/lib/alerta-por-area";
import { pontuar } from "@/lib/classificar-manifestacao";
import panorama from "@/dados/panorama-obras.json";

// ── AS OBRAS COM DINHEIRO FEDERAL NO MUNICÍPIO ──
//
// Creche do FNDE, UBS do Ministério da Saúde, pavimentação de convênio: a obra
// é da prefeitura, o dinheiro é da União, e quem acompanha é o ObrasGov
// (Cadastro Integrado de Projetos de Investimento). Obra federal paralisada é
// a que mais rende cobrança de devolução e manchete, e o prefeito
// frequentemente só descobre a situação quando o ministério notifica.
//
// Aqui elas entram sozinhas, toda semana, pelo código IBGE do município:
// nome, situação (cadastrada, em execução, paralisada, inacabada, concluída,
// cancelada), datas previstas, percentual de execução física e, quando
// paralisada, a justificativa registrada. Vira alerta:
//
//   - paralisada ou inacabada;
//   - em execução depois da data final prevista;
//   - em execução sem atualização física há mais de 120 dias.
//
// A área (saúde, educação, obras) sai do nome da obra, para o alerta chegar
// à secretaria que responde por ela. Esta é a parte pura; a consulta está em
// obras-federais-servidor.ts.

export type GeometriaCru = { id_projeto_investimento: string; cod_ibge?: number | string | null; no_municipio?: string | null };

export type ProjetoCru = {
  id_projeto_investimento: string;
  desc_nome?: string | null;
  desc_projeto?: string | null;
  desc_meta_global?: string | null;
  situacao?: string | null;
  especie_intervencao?: string | null;
  natureza_intervencao?: string | null;
  organizacao_resp?: string | null;
  dt_inicial_prevista?: string | null;
  dt_final_prevista?: string | null;
  dt_final_efetiva?: string | null;
};

export type ExecucaoFisicaCru = {
  id_projeto_investimento: string;
  percentual_execucao_fisica?: number | string | null;
  dt_atualizacao_execucao?: string | null;
  dt_cadastro_execucao?: string | null;
};

export type HistoricoCru = {
  id_projeto_investimento: string;
  descricao_historico_situacao_investimento?: string | null;
  data_historico_situacao_investimento?: string | null;
  justificativa_cancelada_paralisada?: string | null;
};

export type EmpenhoCru = { id_projeto_investimento: string; valor_empenho?: number | null; pago?: number | null; rppago?: number | null };

export type ObraFederal = {
  id: string;
  nome: string;
  situacao: string | null;
  area: Area;
  responsavel: string | null;
  inicioPrevisto: string | null;
  fimPrevisto: string | null;
  percentual: number | null;
  execucaoAtualizadaEm: string | null;
  empenhado: number | null;
  pago: number | null;
  paralisadaEm: string | null;
  justificativa: string | null;
};

const texto = (t: string | null | undefined) => {
  const v = (t ?? "").trim();
  return v ? v : null;
};
const dia = (t: string | null | undefined) => (t && /^\d{4}-\d{2}-\d{2}/.test(t) ? t.slice(0, 10) : null);
const numero = (v: unknown) => {
  const n = typeof v === "string" ? Number(v.replace(",", ".")) : typeof v === "number" ? v : NaN;
  return Number.isFinite(n) ? n : null;
};

/**
 * Toda obra é "obra": aqui só se pergunta se ela é de escola ou de saúde,
 * para o alerta ir também a essa secretaria. Palavras de construção não
 * contam (empatariam tudo com Obras).
 */
export function areaDaObra(texto: string): Area {
  const p = pontuar(texto);
  if (p.educacao >= 3 && p.educacao > p.saude) return "educacao";
  if (p.saude >= 3 && p.saude > p.educacao) return "saude";
  return "obras";
}

/** As que já acabaram ou foram canceladas não precisam de detalhe nem de alerta. */
export const encerrada = (situacao: string | null | undefined) => /conclu|cancel/i.test(situacao ?? "");

export function montarObrasFederais(
  projetos: ProjetoCru[],
  execucoes: ExecucaoFisicaCru[],
  historicos: HistoricoCru[],
  empenhos: EmpenhoCru[]
): ObraFederal[] {
  const ultimaExecucao = new Map<string, ExecucaoFisicaCru>();
  for (const e of execucoes) {
    const atual = ultimaExecucao.get(e.id_projeto_investimento);
    const data = e.dt_atualizacao_execucao ?? e.dt_cadastro_execucao ?? "";
    if (!atual || data > (atual.dt_atualizacao_execucao ?? atual.dt_cadastro_execucao ?? "")) ultimaExecucao.set(e.id_projeto_investimento, e);
  }
  const paralisacao = new Map<string, HistoricoCru>();
  for (const h of historicos) {
    if (!/paralis|inacab/i.test(h.descricao_historico_situacao_investimento ?? "")) continue;
    const atual = paralisacao.get(h.id_projeto_investimento);
    if (!atual || (h.data_historico_situacao_investimento ?? "") > (atual.data_historico_situacao_investimento ?? "")) paralisacao.set(h.id_projeto_investimento, h);
  }
  const valores = new Map<string, { empenhado: number; pago: number }>();
  for (const e of empenhos) {
    const v = valores.get(e.id_projeto_investimento) ?? { empenhado: 0, pago: 0 };
    v.empenhado += e.valor_empenho ?? 0;
    v.pago += (e.pago ?? 0) + (e.rppago ?? 0);
    valores.set(e.id_projeto_investimento, v);
  }

  return projetos
    .map((p) => {
      const nome = texto(p.desc_nome) ?? `Projeto ${p.id_projeto_investimento}`;
      const ex = ultimaExecucao.get(p.id_projeto_investimento);
      const h = paralisacao.get(p.id_projeto_investimento);
      const v = valores.get(p.id_projeto_investimento);
      return {
        id: p.id_projeto_investimento,
        nome,
        situacao: texto(p.situacao),
        // "U.E. José Teixeira Filho" só vira escola pela meta ("Escola 4 salas"): o texto todo entra.
        area: areaDaObra(`${nome} ${nome} ${[p.desc_meta_global, p.desc_projeto, p.especie_intervencao].filter(Boolean).join(" ")}`),
        responsavel: texto(p.organizacao_resp),
        inicioPrevisto: dia(p.dt_inicial_prevista),
        fimPrevisto: dia(p.dt_final_prevista),
        percentual: ex ? numero(ex.percentual_execucao_fisica) : null,
        execucaoAtualizadaEm: dia(ex?.dt_atualizacao_execucao ?? ex?.dt_cadastro_execucao),
        empenhado: v ? v.empenhado : null,
        pago: v ? v.pago : null,
        paralisadaEm: dia(h?.data_historico_situacao_investimento),
        justificativa: texto(h?.justificativa_cancelada_paralisada),
      } satisfies ObraFederal;
    })
    .sort((a, b) => Number(encerrada(a.situacao)) - Number(encerrada(b.situacao)) || a.nome.localeCompare(b.nome, "pt-BR"));
}

const DIA = 86_400_000;
const diasDesde = (iso: string, hoje: Date) => Math.floor((hoje.getTime() - Date.parse(`${iso}T12:00:00Z`)) / DIA);
const br = (iso: string) => iso.split("-").reverse().join("/");
const reais = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
export const DIAS_SEM_ATUALIZACAO = 120;

export function achadosDasObrasFederais(obras: ObraFederal[], hoje: Date = new Date()): DeteccaoAutomatica[] {
  const achados: DeteccaoAutomatica[] = [];
  for (const o of obras) {
    if (encerrada(o.situacao)) continue;
    const nome = o.nome.length > 80 ? `${o.nome.slice(0, 77)}…` : o.nome;
    const andamento = [
      o.percentual !== null ? `${o.percentual.toFixed(0)}% executada` : null,
      o.pago ? `${reais(o.pago)} já pagos` : null,
      o.responsavel,
    ]
      .filter(Boolean)
      .join(" · ");
    const sit = (o.situacao ?? "").toLowerCase();

    if (sit.includes("paralis") || sit.includes("inacab")) {
      achados.push({
        categoria: "estagnacao",
        prioridade: "urgente",
        secretaria: o.area,
        titulo: `Obra federal ${sit.includes("inacab") ? "inacabada" : "paralisada"}: ${nome}`,
        descricao: `${andamento ? `${andamento}. ` : ""}${o.paralisadaEm ? `Registrada como ${sit.includes("inacab") ? "inacabada" : "paralisada"} no ObrasGov em ${br(o.paralisadaEm)}` : "Situação registrada no ObrasGov"}${o.justificativa ? `: ${o.justificativa}` : ""}. Obra federal parada pode gerar cobrança de devolução do recurso; vale um plano de retomada com o órgão que repassou.`,
        chave: `obrafed:${o.id}:${sit.includes("inacab") ? "inacabada" : "paralisada"}`,
      });
      continue;
    }
    // Atraso e medição só valem para o que está em execução: "Cadastrada" com
    // data de 2021 é projeto que nunca começou (há muitos, conferido), não obra atrasada.
    if (!/execu/i.test(o.situacao ?? "")) continue;
    if (o.fimPrevisto && diasDesde(o.fimPrevisto, hoje) > 0 && !(o.percentual !== null && o.percentual >= 100)) {
      achados.push({
        categoria: "prazo",
        prioridade: "medio",
        secretaria: o.area,
        titulo: `Obra federal passou da data prevista: ${nome}`,
        descricao: `${andamento ? `${andamento}. ` : ""}A conclusão estava prevista para ${br(o.fimPrevisto)} no ObrasGov. Sem prorrogação registrada, o órgão que repassou o recurso pode cobrar explicação.`,
        chave: `obrafed:${o.id}:atrasada:${o.fimPrevisto}`,
      });
    } else if (o.execucaoAtualizadaEm && diasDesde(o.execucaoAtualizadaEm, hoje) > DIAS_SEM_ATUALIZACAO) {
      achados.push({
        categoria: "dado_desatualizado",
        prioridade: "info",
        secretaria: o.area,
        titulo: `Obra federal sem medição atualizada: ${nome}`,
        descricao: `${andamento ? `${andamento}. ` : ""}A execução física não é atualizada no ObrasGov desde ${br(o.execucaoAtualizadaEm)}. Dado parado no sistema federal parece obra parada para quem fiscaliza.`,
        chave: `obrafed:${o.id}:sem-medicao`,
      });
    }
  }
  return achados;
}

// ── O ESTADO AO LADO ── (scripts/vigia/panorama-obras.ts, toda segunda)
type ContagemObras = { paralisadas: number; inacabadas: number; emExecucao: number };
const PANORAMA_OBRAS = panorama as { geradoEm: string | null; porUf: Record<string, ContagemObras> };

/** Quantas obras federais estão paradas no estado, se a vigia já contou. */
export function obrasParadasNoEstado(uf: string): (ContagemObras & { geradoEm: string }) | null {
  const c = PANORAMA_OBRAS.porUf[uf];
  return c && PANORAMA_OBRAS.geradoEm ? { ...c, geradoEm: PANORAMA_OBRAS.geradoEm } : null;
}
