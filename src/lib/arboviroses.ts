import type { DeteccaoAutomatica } from "@/lib/deteccao-automatica";
import { decodificarPontos } from "@/lib/mapa-municipios";
import { codigosNaOrdemDoMapa } from "@/lib/mapa-municipios-codigos";

// ── DENGUE E CHIKUNGUNYA, TODA SEMANA ──
//
// O InfoDengue (Fiocruz e FGV) publica, para cada município e cada semana
// epidemiológica, os casos notificados, a estimativa de casos (corrigida pelo
// atraso de notificação), a incidência por 100 mil habitantes e um nível de
// alerta de 1 a 4:
//
//   1 verde     sem transmissão relevante
//   2 amarelo   clima favorável ao mosquito: hora de prevenir
//   3 laranja   transmissão sustentada
//   4 vermelho  incidência acima do esperado: epidemia
//
// A secretaria de saúde costuma saber disso pelo boletim do estado, dias
// depois. Aqui a leitura é semanal e automática, e olha também as cidades
// vizinhas: dengue que sobe no vizinho chega em duas ou três semanas.
//
// Formato conferido ao vivo em outubro de 2026: lista de semanas, a mais
// recente primeiro, com SE (AAAASS), data_iniSE (ms), casos, casos_est,
// p_inc100k, nivel, Rt, receptivo, transmissao.

export type Doenca = "dengue" | "chikungunya";
export const NOME_DOENCA: Record<Doenca, string> = { dengue: "Dengue", chikungunya: "Chikungunya" };

export type SemanaCru = {
  SE: number;
  data_iniSE: number;
  casos?: number | null;
  casos_est?: number | null;
  p_inc100k?: number | null;
  nivel?: number | null;
  Rt?: number | null;
  receptivo?: number | null;
  transmissao?: number | null;
};

export type Semana = { se: number; inicio: string; casos: number; estimados: number; incidencia: number; nivel: number; rt: number | null };

export function lerSemanas(cru: SemanaCru[], quantas = 8): Semana[] {
  return cru
    .filter((s) => typeof s.SE === "number" && typeof s.data_iniSE === "number")
    .sort((a, b) => b.SE - a.SE)
    .slice(0, quantas)
    .map((s) => ({
      se: s.SE,
      inicio: new Date(s.data_iniSE).toISOString().slice(0, 10),
      casos: s.casos ?? 0,
      estimados: Math.round(s.casos_est ?? s.casos ?? 0),
      incidencia: Math.round((s.p_inc100k ?? 0) * 10) / 10,
      nivel: Math.min(4, Math.max(1, Math.round(s.nivel ?? 1))),
      rt: typeof s.Rt === "number" && s.Rt > 0 ? Math.round(s.Rt * 100) / 100 : null,
    }));
}

export type Vizinho = { codigo: string; nome: string; nivel: number; incidencia: number };

export type FotografiaArboviroses = {
  dengue: Semana[];
  chikungunya: Semana[];
  vizinhos: Vizinho[];
};

/** Os municípios mais próximos, pela sede (coordenadas do IBGE, já no mapa da home). */
export function vizinhosDe(codigoIbge: string, quantos = 5): string[] {
  const codigos = codigosNaOrdemDoMapa();
  const i = codigos.indexOf(codigoIbge);
  if (i < 0) return [];
  const p = decodificarPontos();
  const x = p[i * 2];
  const y = p[i * 2 + 1];
  return codigos
    .map((c, j) => ({ c, d: (p[j * 2] - x) ** 2 + (p[j * 2 + 1] - y) ** 2 }))
    .filter((v) => v.c !== codigoIbge)
    .sort((a, b) => a.d - b.d)
    .slice(0, quantos)
    .map((v) => v.c);
}

export const NOME_NIVEL = ["", "verde", "amarelo", "laranja", "vermelho"] as const;
const SIGNIFICADO = [
  "",
  "sem transmissão relevante",
  "clima favorável ao mosquito",
  "transmissão sustentada",
  "incidência acima do esperado (epidemia)",
];

function achadoDaDoenca(d: Doenca, semanas: Semana[]): DeteccaoAutomatica | null {
  const s = semanas[0];
  if (!s || s.nivel < 2) return null;
  const anterior = semanas[1];
  const tendencia =
    anterior && s.estimados > anterior.estimados
      ? `, subindo (${anterior.estimados} na semana anterior)`
      : anterior && s.estimados < anterior.estimados
        ? `, caindo (${anterior.estimados} na semana anterior)`
        : "";
  const semana = `semana ${String(s.se).slice(4)} de ${String(s.se).slice(0, 4)}`;
  return {
    categoria: "dado_desatualizado",
    prioridade: s.nivel >= 4 ? "urgente" : s.nivel === 3 ? "medio" : "info",
    secretaria: "saude",
    titulo: `${NOME_DOENCA[d]} em alerta ${NOME_NIVEL[s.nivel]} no município`,
    descricao:
      `InfoDengue (Fiocruz), ${semana}: ${SIGNIFICADO[s.nivel]}. ${s.estimados} caso(s) estimado(s)${tendencia}, ` +
      `${s.incidencia.toLocaleString("pt-BR")} por 100 mil habitantes${s.rt ? `, Rt ${s.rt.toLocaleString("pt-BR")}` : ""}. ` +
      (s.nivel >= 3
        ? "Hora de intensificar visita dos agentes, eliminação de criadouros e organizar a rede para o aumento de atendimentos."
        : "Hora de prevenir: mutirão contra criadouros antes que a transmissão comece."),
    chave: `arbovirose:${d}:nivel${s.nivel}`,
  };
}

export function achadosDasArboviroses(f: FotografiaArboviroses): DeteccaoAutomatica[] {
  const achados = (["dengue", "chikungunya"] as Doenca[]).map((d) => achadoDaDoenca(d, f[d])).filter((a): a is DeteccaoAutomatica => !!a);
  const aqui = f.dengue[0]?.nivel ?? 1;
  const emAlta = f.vizinhos.filter((v) => v.nivel >= 3).sort((a, b) => b.nivel - a.nivel);
  if (aqui <= 2 && emAlta.length) {
    achados.push({
      categoria: "dado_desatualizado",
      prioridade: "medio",
      secretaria: "saude",
      titulo: `Dengue avança em ${emAlta.length === 1 ? "cidade vizinha" : `${emAlta.length} cidades vizinhas`}`,
      descricao: `${emAlta.map((v) => `${v.nome} (alerta ${NOME_NIVEL[v.nivel]}, ${v.incidencia.toLocaleString("pt-BR")} por 100 mil)`).join("; ")}. No município o alerta ainda é ${NOME_NIVEL[aqui]}: é a janela para agir antes de chegar.`,
      chave: "arbovirose:vizinhos",
    });
  }
  return achados;
}
