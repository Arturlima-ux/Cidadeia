import reserva from "@/dados/rgf-reserva.json";
import { municipioPorCodigo, type Municipio } from "@/lib/municipios";
import { proximoVencimento } from "@/lib/obrigacoes-fiscais";
import { descompactar, type LinhaReserva } from "@/lib/rgf-reserva";
import { rotuloDoPeriodoRgf } from "@/lib/fatos-do-municipio";
import { LIMITE_ALERTA, LIMITE_PESSOAL, LIMITE_PRUDENCIAL } from "@/lib/despesa-pessoal";
import { PANORAMA, passaramDoAlerta, type ContagemPanorama } from "@/lib/panorama";
import { NOME_DOS_ESTADOS, type Estado } from "@/lib/estados";
import { PRECO_MENSAL, porteDaPopulacao, PORTES, type PorteMunicipio } from "@/lib/precos";
import { codigosNaOrdemDoMapa } from "@/lib/mapa-municipios-codigos";
import { decodificarPontos } from "@/lib/mapa-municipios";

// ── A EDIÇÃO DE HOJE (novembro de 2026) ──
//
// O motivo para voltar todo dia à página: a "edição" da prefeitura, montada
// só com o que já está guardado aqui (sem consulta ao Tesouro na hora, então
// abre rápido e não falha): os dias até o próximo RREO e o próximo RGF, a
// despesa com pessoal do último RGF que a vigia leu (dados/rgf-reserva.json,
// relido toda segunda e quinta), onde o estado está no Panorama e o preço do
// módulo Gestão no porte da cidade. Sem cidade, a edição é a do Brasil.
//
// Número que não fecha (abaixo de 20% ou acima de 90% da receita) é erro de
// declaração, não gestão: a edição diz que não dá para ler, em vez de mostrar.

export type Faixa = "abaixo" | "alerta" | "prudencial" | "acima";

export type PrazoDaEdicao = { sigla: "RREO" | "RGF"; rotulo: string; vencimento: string; dias: number };

export type EdicaoDaCidade = {
  tipo: "cidade";
  hoje: string;
  municipio: { codigo: string; nome: string; uf: string; populacao: number | null; porte: string; porteChave: PorteMunicipio };
  /** Posição da sede no mapa em relevo (lat/lng da sede pelo IBGE). */
  sede: { lat: number; lng: number } | null;
  prazos: PrazoDaEdicao[];
  pessoal:
    | { situacao: "lida"; pct: number; faixa: Faixa; periodo: string; folgaAtePrudencial: number }
    | { situacao: "nao-fecha" | "sem-rgf" };
  estado: { uf: string; nome: string; passaramDoAlerta: number; comNumero: number };
  gestaoMensal: number | null;
  conferidoEm: string | null;
};

export type EdicaoDoBrasil = {
  tipo: "brasil";
  hoje: string;
  prazos: PrazoDaEdicao[];
  brasil: { municipios: number; comNumero: number; passaramDoAlerta: number; acimaDoLimite: number; rgfAtrasado: number };
  conferidoEm: string;
};

const DADOS = reserva as unknown as { geradoEm: string | null; m: Record<string, LinhaReserva> };

export function faixaDaDespesa(pct: number): Faixa {
  if (pct > LIMITE_PESSOAL) return "acima";
  if (pct >= LIMITE_PRUDENCIAL) return "prudencial";
  if (pct >= LIMITE_ALERTA) return "alerta";
  return "abaixo";
}

export function prazosDaEdicao(hoje: string): PrazoDaEdicao[] {
  const out: PrazoDaEdicao[] = [];
  for (const chave of ["rreo", "rgf"] as const) {
    const p = proximoVencimento(chave, hoje);
    if (p) out.push({ sigla: chave === "rreo" ? "RREO" : "RGF", rotulo: p.periodo.rotulo, vencimento: p.periodo.vencimento, dias: p.dias });
  }
  return out.sort((a, b) => a.dias - b.dias);
}

function rotuloDoPorte(p: PorteMunicipio): string {
  const porte = PORTES.find((x) => x.chave === p)!;
  return `${porte.rotulo} ${porte.detalhe}`;
}

/** Sede no mapa: os pontos estão na mesma conta de lib/localizacao.ts (paraMapa), desfeita aqui. */
function sedeDe(codigo: string): { lat: number; lng: number } | null {
  const i = codigosNaOrdemDoMapa().indexOf(codigo);
  if (i < 0) return null;
  const p = decodificarPontos();
  const x = p[i * 2], y = p[i * 2 + 1];
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  return { lng: (x - 1780.593) / 24.0686, lat: (137.0145 - y) / 24.8884 };
}

export function edicaoDaCidade(
  codigo: string,
  hoje: string,
  o: { dados?: typeof DADOS; municipio?: Municipio | null; panorama?: Record<string, ContagemPanorama>; semSede?: boolean } = {}
): EdicaoDaCidade | null {
  const m = o.municipio !== undefined ? o.municipio : municipioPorCodigo(codigo);
  if (!m) return null;
  const dados = o.dados ?? DADOS;
  const linha = dados.m[codigo];
  let pessoal: EdicaoDaCidade["pessoal"] = { situacao: "sem-rgf" };
  if (linha) {
    const d = descompactar(linha);
    const pct = d.rclAjustada > 0 ? (d.despesaTotal / d.rclAjustada) * 100 : NaN;
    if (!Number.isFinite(pct) || pct < 20 || pct > 90) pessoal = { situacao: "nao-fecha" };
    else
      pessoal = {
        situacao: "lida",
        pct,
        faixa: faixaDaDespesa(pct),
        periodo: rotuloDoPeriodoRgf(d.periodo),
        folgaAtePrudencial: Math.round(d.rclAjustada * (LIMITE_PRUDENCIAL / 100) - d.despesaTotal),
      };
  }
  const doEstado = (o.panorama ?? PANORAMA.porUf)[m.uf];
  const porte = porteDaPopulacao(m.populacao);
  return {
    tipo: "cidade",
    hoje,
    municipio: { codigo: m.codigo, nome: m.nome, uf: m.uf, populacao: m.populacao, porte: rotuloDoPorte(porte), porteChave: porte },
    sede: o.semSede ? null : sedeDe(m.codigo),
    prazos: prazosDaEdicao(hoje),
    pessoal,
    estado: {
      uf: m.uf,
      nome: NOME_DOS_ESTADOS[m.uf as Estado] ?? m.uf,
      passaramDoAlerta: doEstado ? passaramDoAlerta(doEstado) : 0,
      comNumero: doEstado?.comNumero ?? 0,
    },
    gestaoMensal: PRECO_MENSAL.gestao[porte],
    conferidoEm: dados.geradoEm,
  };
}

export function edicaoDoBrasil(hoje: string): EdicaoDoBrasil {
  const b = PANORAMA.brasil;
  return {
    tipo: "brasil",
    hoje,
    prazos: prazosDaEdicao(hoje),
    brasil: {
      municipios: b.municipios,
      comNumero: b.comNumero,
      passaramDoAlerta: passaramDoAlerta(b),
      acimaDoLimite: b.acimaDoLimite,
      rgfAtrasado: b.rgfAtrasado,
    },
    conferidoEm: PANORAMA.geradoEm,
  };
}

// ── DESDE A ÚLTIMA VISITA ──
// O que o navegador guarda (lib/edicao.ts) é só o número da última edição
// vista; a comparação diz o que mudou, em palavras. Nada sai do aparelho.

export type Lembranca = { codigo: string; visto: string; pct: number | null; periodo: string | null };

export function oQueMudou(antes: Lembranca | null, agora: EdicaoDaCidade): string | null {
  if (!antes || antes.codigo !== agora.municipio.codigo || antes.visto >= agora.hoje) return null;
  const quando = diaDaSemanaOuData(antes.visto, agora.hoje);
  const p = agora.pessoal;
  if (p.situacao === "lida" && antes.pct !== null && antes.periodo !== p.periodo) {
    return `Desde ${quando}, saiu o ${p.periodo}: a despesa com pessoal foi de ${umaCasa(antes.pct)}% para ${umaCasa(p.pct)}%.`;
  }
  if (p.situacao === "lida" && antes.pct !== null && Math.abs(antes.pct - p.pct) >= 0.05) {
    return `Desde ${quando}, a despesa com pessoal foi de ${umaCasa(antes.pct)}% para ${umaCasa(p.pct)}%.`;
  }
  return `Desde ${quando}, nenhum número novo no Tesouro. O próximo prazo chegou mais perto.`;
}

export const umaCasa = (n: number) => n.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

const SEMANA = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
function diaDaSemanaOuData(iso: string, hoje: string): string {
  const dias = Math.round((Date.parse(hoje) - Date.parse(iso)) / 86_400_000);
  if (dias === 1) return "ontem";
  const d = new Date(`${iso}T12:00:00Z`);
  if (dias < 7) return `${SEMANA[d.getUTCDay()]}`;
  return d.toLocaleDateString("pt-BR", { day: "numeric", month: "long", timeZone: "UTC" });
}
