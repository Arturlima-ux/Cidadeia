import type { Area } from "@/lib/alerta-por-area";

// ── A MANIFESTAÇÃO QUE CHEGA NA SECRETARIA CERTA SOZINHA ──
//
// O campo "área" do formulário é opcional, e o cidadão quase nunca preenche:
// ele sabe que tem um buraco na rua, não sabe que isso é da Secretaria de
// Obras. Sem área, a manifestação ia para o gabinete, alguém precisava ler e
// encaminhar, e o prazo legal corria enquanto isso.
//
// Aqui o texto decide: palavras de cada área, com peso maior para as que só
// aparecem nela ("UBS", "merenda", "buraco", "pregão"). Só classifica quando
// uma área ganha com folga; na dúvida, continua indo para o gabinete, como
// antes. Denúncia nunca é classificada: ela pode ser sobre a própria
// secretaria, e quem decide o encaminhamento é o gabinete.

const PALAVRAS: Record<Area, [string, number][]> = {
  saude: [
    ["ubs", 3], ["posto de saude", 3], ["postinho", 3], ["hospital", 3], ["upa", 3], ["medico", 2], ["medica", 2],
    ["enfermeir", 2], ["consulta", 2], ["exame", 2], ["remedio", 3], ["medicamento", 3], ["farmacia", 2],
    ["vacina", 3], ["dengue", 3], ["mosquito", 2], ["ambulancia", 3], ["samu", 3], ["agente de saude", 3],
    ["dentista", 3], ["saude", 2], ["gestante", 2], ["pre-natal", 3], ["prenatal", 3], ["receita medica", 3],
    ["caps", 2], ["fila de espera", 1], ["cirurgia", 3], ["psf", 3], ["esf", 2], ["zoonose", 2],
  ],
  educacao: [
    ["escola", 3], ["creche", 3], ["professor", 3], ["professora", 3], ["aluno", 3], ["aluna", 3],
    ["merenda", 3], ["transporte escolar", 3], ["onibus escolar", 3], ["matricula", 3], ["sala de aula", 3],
    ["diretor da escola", 3], ["diretora", 1], ["educacao", 2], ["ensino", 2], ["livro didatico", 3],
    ["fardamento", 3], ["uniforme escolar", 3], ["vaga na creche", 3], ["reforco escolar", 3], ["eja", 2],
  ],
  obras: [
    ["buraco", 3], ["asfalto", 3], ["calcamento", 3], ["pavimentacao", 3], ["rua", 1], ["estrada", 2],
    ["ponte", 2], ["iluminacao", 3], ["poste", 3], ["lampada", 3], ["luz da rua", 3], ["esgoto", 3],
    ["bueiro", 3], ["alagamento", 3], ["lixo", 2], ["coleta", 2], ["entulho", 3], ["capina", 3], ["mato", 2],
    ["praca", 2], ["calcada", 2], ["obra", 2], ["reforma", 1], ["drenagem", 3], ["galeria", 2], ["meio-fio", 3],
    ["poda", 3], ["arvore", 1], ["limpeza urbana", 3], ["terreno baldio", 2], ["cratera", 3], ["vicinal", 3],
  ],
  licitacoes: [
    ["licitacao", 3], ["pregao", 3], ["edital", 3], ["contrato", 2], ["fornecedor", 3], ["empresa vencedora", 3],
    ["dispensa", 2], ["inexigibilidade", 3], ["compra", 1], ["superfaturamento", 3], ["sobrepreco", 3],
    ["nota fiscal", 2], ["empenho", 2], ["pagamento a empresa", 3], ["ata de registro", 3], ["cotacao", 2],
  ],
};

export function normalizar(t: string): string {
  return ` ${t
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\- ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()} `;
}

/** A pontuação de cada área para um texto. */
export function pontuar(texto: string): Record<Area, number> {
  const t = normalizar(texto);
  const saida = { saude: 0, educacao: 0, obras: 0, licitacoes: 0 } as Record<Area, number>;
  for (const area of Object.keys(PALAVRAS) as Area[]) {
    for (const [palavra, peso] of PALAVRAS[area]) {
      // Palavra curta só vale inteira ("upa" não pode casar com "ocupação").
      const alvo = palavra.length <= 4 ? ` ${palavra} ` : palavra;
      if (t.includes(alvo)) saida[area] += peso;
    }
  }
  return saida;
}

/** Quanto a primeira área precisa ter, no mínimo, para valer. */
const MINIMO = 3;

/**
 * A área da manifestação pelo texto, ou null na dúvida. O assunto pesa o
 * dobro: é a frase que o cidadão escolheu para resumir o problema.
 */
export function classificarArea(assunto: string, mensagem: string, tipo?: string): Area | null {
  if (tipo === "denuncia") return null;
  const a = pontuar(assunto);
  const m = pontuar(mensagem);
  const total = (Object.keys(a) as Area[])
    .map((area) => ({ area, pontos: a[area] * 2 + m[area] }))
    .sort((x, y) => y.pontos - x.pontos);
  const [primeira, segunda] = total;
  if (primeira.pontos < MINIMO) return null;
  // Empate ou quase: o gabinete decide.
  if (segunda.pontos > 0 && primeira.pontos < segunda.pontos * 1.5) return null;
  return primeira.area;
}

export const EVENTO_AREA_AUTOMATICA = "area_automatica";
