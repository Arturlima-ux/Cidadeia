import reserva from "@/dados/rgf-reserva.json";
import obras from "@/dados/panorama-obras.json";
import { PANORAMA, passaramDoAlerta } from "@/lib/panorama";
import { codigosNaOrdemDoMapa } from "@/lib/mapa-municipios-codigos";
import { LIMITE_ALERTA, LIMITE_PESSOAL, LIMITE_PRUDENCIAL } from "@/lib/despesa-pessoal";
import { descompactar, type LinhaReserva } from "@/lib/rgf-reserva";
import { modulosNaOrdemDaHome } from "@/lib/modulos-detalhe";
import { FONTES_OFICIAIS } from "@/lib/fontes-oficiais";
import { LINK_DA_FONTE } from "@/lib/links-oficiais";
import { NOME_DOS_ESTADOS, type Estado } from "@/lib/estados";

// ── O QUE AS TRÊS ESTRUTURAS DA HOME MOSTRAM (nov/2026) ──
//
// As três propostas de estrutura para a home, do fim do mapa para baixo
// (/modelo/a, /b e /c, só na prévia), leem os MESMOS dados, e todos são
// reais: o panorama do RGF de todas as prefeituras, o panorama de obras do
// ObrasGov e a despesa com pessoal de cada município, como a vigia guardou.
// Nenhum número aqui é inventado nem arredondado para impressionar.

export const PERGUNTA: Record<string, string> = {
  essencial: "Todo pedido do cidadão tem número e resposta?",
  gestao: "Como está a prefeitura inteira hoje?",
  saude: "Qual unidade precisa de você hoje?",
  educacao: "Os 200 dias letivos vão fechar?",
  obras: "Cada obra está andando como deveria?",
  licitacoes: "O que a prefeitura já comprou e contratou no ano?",
};

export type ModuloAbaixo = { chave: string; nome: string; pergunta: string; resumo: string; capacidades: string[] };

export function modulosAbaixo(): ModuloAbaixo[] {
  return modulosNaOrdemDaHome().map(({ chave, nome, detalhe }) => ({
    chave,
    nome,
    pergunta: PERGUNTA[chave] ?? detalhe.resumo,
    resumo: detalhe.resumo,
    capacidades: detalhe.capacidades,
  }));
}

export const FONTES_ABAIXO = FONTES_OFICIAIS.map((f) => ({ nome: f, link: LINK_DA_FONTE[f] }));

export const PASSOS = [
  { titulo: "Os dados entram sozinhos", texto: "Das bases oficiais, toda semana, sem digitar nem instalar nada." },
  { titulo: "A lei é conferida sozinha", texto: "Cada prazo e cada limite, com o artigo de lei ao lado." },
  { titulo: "O trabalho sai pronto", texto: "Ofício, aviso público e relatório montados. A equipe confere e assina." },
];

const num = (n: number) => n.toLocaleString("pt-BR");

/** Os números grandes, todos do panorama conferido pela vigia. */
export function numerosDoBrasil() {
  const b = PANORAMA.brasil;
  const o = (obras as { brasil: { paralisadas: number; inacabadas: number; emExecucao: number }; geradoEm: string }).brasil;
  return {
    conferidoEm: PANORAMA.geradoEm,
    municipios: b.municipios,
    comRgf: b.comNumero,
    passaramDoAlerta: passaramDoAlerta(b),
    acimaDoLimite: b.acimaDoLimite,
    rgfAtrasado: b.rgfAtrasado,
    obrasParadas: o.paralisadas + o.inacabadas,
    obrasEmExecucao: o.emExecucao,
    fontes: FONTES_OFICIAIS.length,
    texto: {
      municipios: num(b.municipios),
      passaramDoAlerta: num(passaramDoAlerta(b)),
      acimaDoLimite: num(b.acimaDoLimite),
      rgfAtrasado: num(b.rgfAtrasado),
      obrasParadas: num(o.paralisadas + o.inacabadas),
      comRgf: num(b.comNumero),
    },
  };
}

/** Os estados com mais prefeituras acima do limite de alerta, em proporção. */
export function estadosEmAlerta(qtd = 5) {
  return Object.entries(PANORAMA.porUf)
    .filter(([, c]) => c.comNumero >= 10)
    .map(([uf, c]) => ({ uf, nome: NOME_DOS_ESTADOS[uf as Estado] ?? uf, fracao: passaramDoAlerta(c) / c.comNumero, passaram: passaramDoAlerta(c), de: c.comNumero }))
    .sort((a, b) => b.fracao - a.fracao)
    .slice(0, qtd);
}

/**
 * Uma letra por ponto do mapa de municípios, na ordem de codigosNaOrdemDoMapa:
 * 0 abaixo do alerta, 1 alerta, 2 prudencial, 3 acima do limite, - sem número.
 * Vai para o navegador como texto curto (~5,5 KB), e o desenho sai de lá.
 */
export function faixasDoMapa(): string {
  const dados = reserva as unknown as { m: Record<string, LinhaReserva> };
  return codigosNaOrdemDoMapa()
    .map((codigo) => {
      const l = dados.m[codigo];
      if (!l) return "-";
      const d = descompactar(l);
      if (!d.rclAjustada) return "-";
      const pct = (d.despesaTotal / d.rclAjustada) * 100;
      if (pct < 20 || pct > 90) return "-";
      return pct > LIMITE_PESSOAL ? "3" : pct >= LIMITE_PRUDENCIAL ? "2" : pct >= LIMITE_ALERTA ? "1" : "0";
    })
    .join("");
}
