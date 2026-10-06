import type { StatusAtendimento, TipoAtendimento } from "@/lib/atendimento";

// ── A VOZ DA CIDADE ──
//
// O portal mostra, em público, o que os moradores disseram à prefeitura e
// como ela respondeu. Só números e metadados: tipo da manifestação, área,
// situação e prazo. Nunca o assunto, a mensagem, o nome ou o contato — o
// assunto é texto livre e pode trazer endereço, nome de vizinho, doença.
//
// É o que a Lei 13.460/2017 (art. 23) já pede da ouvidoria: publicar o
// número de manifestações e o tempo de resposta. Aqui é ao vivo, em vez de
// um relatório anual em PDF.
//
// ── MÍNIMO PARA APARECER ──
//
// Com 2 manifestações numa cidade de 4 mil habitantes, "Denúncia · Saúde ·
// há 1 dia" aponta para alguém. Abaixo de MINIMO_PUBLICO, a seção não mostra
// nada do que foi dito, só o convite.

export const MINIMO_PUBLICO = 5;
export const JANELA_DIAS = 365;
const ITENS_FAIXA = 14;

export type LinhaVoz = {
  tipo: TipoAtendimento;
  status: StatusAtendimento;
  secretaria: string | null;
  createdAt: string;
  respondidoEm: string | null;
};

export type ItemFaixa = {
  tipo: TipoAtendimento;
  area: string;
  situacao: "respondida" | "andamento";
  /** Dias até a resposta (respondida) ou desde a abertura (andamento). */
  dias: number;
};

export type VozDaCidade =
  | { publica: false; total: number }
  | {
      publica: true;
      total: number;
      respondidas: number;
      percentualRespondido: number;
      diasMedioResposta: number | null;
      elogios: number;
      porTipo: { tipo: TipoAtendimento; quantidade: number }[];
      faixa: ItemFaixa[];
    };

const AREA: Record<string, string> = {
  saude: "Saúde",
  educacao: "Educação",
  obras: "Obras",
  licitacoes: "Compras",
  administracao: "Administração",
  assistencia: "Assistência social",
  meio_ambiente: "Meio ambiente",
  transito: "Trânsito",
  financas: "Finanças",
};
export const nomeDaArea = (s: string | null) =>
  s ? AREA[s] ?? s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, " ") : "Geral";

const DIA = 86_400_000;
const dias = (de: string, ate: number) => Math.max(0, Math.round((ate - Date.parse(de)) / DIA));

/** Resume as manifestações para o portal. `agora` em ms, para teste. */
export function resumirVoz(linhas: LinhaVoz[], agora: number = Date.now()): VozDaCidade {
  const recentes = linhas.filter((l) => agora - Date.parse(l.createdAt) <= JANELA_DIAS * DIA);
  const total = recentes.length;
  if (total < MINIMO_PUBLICO) return { publica: false, total };

  const respondidasLista = recentes.filter((l) => l.status === "respondido" || l.status === "encerrado");
  const tempos = respondidasLista
    .filter((l) => l.respondidoEm)
    .map((l) => (Date.parse(l.respondidoEm!) - Date.parse(l.createdAt)) / DIA)
    .filter((d) => Number.isFinite(d) && d >= 0);

  const contagem = new Map<TipoAtendimento, number>();
  for (const l of recentes) contagem.set(l.tipo, (contagem.get(l.tipo) ?? 0) + 1);

  const faixa: ItemFaixa[] = [...recentes]
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
    .slice(0, ITENS_FAIXA)
    .map((l) => {
      const respondida = (l.status === "respondido" || l.status === "encerrado") && !!l.respondidoEm;
      return {
        tipo: l.tipo,
        area: nomeDaArea(l.secretaria),
        situacao: respondida ? "respondida" : "andamento",
        dias: respondida ? dias(l.createdAt, Date.parse(l.respondidoEm!)) : dias(l.createdAt, agora),
      };
    });

  return {
    publica: true,
    total,
    respondidas: respondidasLista.length,
    percentualRespondido: Math.round((respondidasLista.length / total) * 100),
    diasMedioResposta: tempos.length ? Math.round((tempos.reduce((a, b) => a + b, 0) / tempos.length) * 10) / 10 : null,
    elogios: contagem.get("elogio") ?? 0,
    porTipo: [...contagem.entries()]
      .map(([tipo, quantidade]) => ({ tipo, quantidade }))
      .sort((a, b) => b.quantidade - a.quantidade),
    faixa,
  };
}
