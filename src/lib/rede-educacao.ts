import { and, eq, gte } from "drizzle-orm";
import { db } from "@/db";
import {
  escolas,
  ocorrenciasEscola,
  estoqueMerenda,
  pnaeCompras,
  pnaeRepasses,
  buscaAtiva,
  fundebEducacao,
  educacaoResultados,
} from "@/db/schema";
import { temAcessoSecretaria } from "@/lib/sessao";
import { contaParaOMunicipio } from "@/lib/censo-escolar";
import { lerEscola, type LeituraEscola } from "@/lib/leitura-escola";
import { aulasPerdidas, lerCalendario, DIAS_LETIVOS_LDB, type CalendarioEscola } from "@/lib/ocorrencias-escola";

// ── A REDE DE ESCOLAS, LIDA UMA VEZ SÓ ──
//
// Três superfícies mostram o estado da rede: a tela da secretaria, o PDF
// que circula por e-mail e o contexto que a IA lê. As três buscavam as
// MESMAS sete tabelas, montavam os MESMOS quatro mapas por escola e
// chamavam lerEscola() com o MESMO objeto de vinte linhas.
//
// Isso não era só repetição. Era o molde de um defeito que já custou caro
// duas vezes no mesmo módulo:
//
//   1. As três não filtravam por dependência, então escola estadual
//      entrava na conta do FUNDEB do município.
//   2. O contexto da IA recalculou "abaixo da meta" por fora e passou a
//      contradizer a tela ao lado, no arquivo cujo comentário dizia que
//      nada ali recalculava nada.
//
// Com três cópias, corrigir uma e esquecer as outras é o caminho natural —
// e foi o que aconteceu. Agora existe uma leitura só.
//
// ── POR QUE ESTA FUNÇÃO EXIGE O CARGO ──
//
// A tela obtinha os dados por server actions, que conferem
// temAcessoSecretaria e devolvem lista vazia sem permissão. Trocar isso
// por uma consulta direta ao banco devolveria a rede inteira de Educação
// a um secretário de Obras.
//
// Então a guarda mora aqui, e não no chamador: sem acesso, volta null.
// Quem esquecer de checar não recebe dado — em vez de receber tudo.

export type EscolaLida = {
  escola: typeof escolas.$inferSelect;
  leitura: LeituraEscola;
  calendario: CalendarioEscola;
};

export type RedeEducacao = {
  /** Tudo que está cadastrado, inclusive outras redes e extintas. */
  todas: (typeof escolas.$inferSelect)[];
  /** O que entra nas contas: ativas e administradas pelo município. */
  ativas: (typeof escolas.$inferSelect)[];
  /** Uma por escola ativa, já ordenada: quem precisa de decisão primeiro. */
  lidas: EscolaLida[];
  ocorrenciasDoAno: (typeof ocorrenciasEscola.$inferSelect)[];
  merenda: (typeof estoqueMerenda.$inferSelect)[];
  compras: (typeof pnaeCompras.$inferSelect)[];
  repasse: typeof pnaeRepasses.$inferSelect | null;
  casos: (typeof buscaAtiva.$inferSelect)[];
  fundeb: typeof fundebEducacao.$inferSelect | null;
  resultados: (typeof educacaoResultados.$inferSelect)[];
  ano: number;
};

/** Manifestação da ouvidoria já filtrada para uma escola. */
export type MencaoOuvidoria = { tipo: string; assunto: string; createdAt: string };

const inicioDoAno = (ano: number) => `${ano}-01-01`;

function agruparPorEscola<T extends { escolaId: string }>(linhas: T[]): Map<string, T[]> {
  const mapa = new Map<string, T[]>();
  for (const l of linhas) {
    const atual = mapa.get(l.escolaId);
    if (atual) atual.push(l);
    else mapa.set(l.escolaId, [l]);
  }
  return mapa;
}

export async function lerRedeEducacao(
  prefeituraId: string,
  quem: { cargo: string; secretaria?: string | null },
  // A ouvidoria é do plano Essencial e nem toda superfície a tem: o PDF e
  // o contexto da IA passam sem, e a ficha da direção não deve ver
  // manifestação do município. Por isso entra por parâmetro.
  mencoesDaEscola: (nomeDaEscola: string) => MencaoOuvidoria[] = () => []
): Promise<RedeEducacao | null> {
  if (!temAcessoSecretaria(quem, "educacao")) return null;
  // Cargo de uma instalação só enxerga a própria ficha, nunca a rede.
  if (quem.cargo === "escola" || quem.cargo === "unidade") return null;

  const ano = new Date().getUTCFullYear();

  let todas: RedeEducacao["todas"] = [];
  let ocorrenciasDoAno: RedeEducacao["ocorrenciasDoAno"] = [];
  let merenda: RedeEducacao["merenda"] = [];
  let compras: RedeEducacao["compras"] = [];
  let repasse: RedeEducacao["repasse"] = null;
  let casos: RedeEducacao["casos"] = [];
  let fundeb: RedeEducacao["fundeb"] = null;
  let resultados: RedeEducacao["resultados"] = [];

  try {
    const [r, o, m, c, rp, b, fd, res] = await Promise.all([
      db.select().from(escolas).where(eq(escolas.prefeituraId, prefeituraId)).orderBy(escolas.nome),
      db
        .select()
        .from(ocorrenciasEscola)
        .where(and(eq(ocorrenciasEscola.prefeituraId, prefeituraId), gte(ocorrenciasEscola.createdAt, inicioDoAno(ano)))),
      db.select().from(estoqueMerenda).where(eq(estoqueMerenda.prefeituraId, prefeituraId)),
      db.select().from(pnaeCompras).where(and(eq(pnaeCompras.prefeituraId, prefeituraId), eq(pnaeCompras.ano, ano))),
      db.select().from(pnaeRepasses).where(and(eq(pnaeRepasses.prefeituraId, prefeituraId), eq(pnaeRepasses.ano, ano))).limit(1),
      db.select().from(buscaAtiva).where(eq(buscaAtiva.prefeituraId, prefeituraId)),
      db.select().from(fundebEducacao).where(and(eq(fundebEducacao.prefeituraId, prefeituraId), eq(fundebEducacao.ano, ano))).limit(1),
      db.select().from(educacaoResultados).where(and(eq(educacaoResultados.prefeituraId, prefeituraId), eq(educacaoResultados.ano, ano))),
    ]);
    todas = r;
    ocorrenciasDoAno = o;
    merenda = m;
    compras = c;
    repasse = rp[0] ?? null;
    casos = b;
    fundeb = fd[0] ?? null;
    resultados = res;
  } catch (e) {
    // Banco fora não pode virar tela de erro nem PDF que falha: as
    // superfícies mostram o que houver. O erro fica no log — era
    // justamente um catch mudo que escondeu uma queda de banco por dias.
    console.error("[rede-educacao] leitura da rede:", e);
  }

  const ativas = todas.filter((e) => e.situacao !== "extinta" && contaParaOMunicipio(e));
  const abertas = ocorrenciasDoAno.filter((o) => o.status === "aberta");

  const abertasPor = agruparPorEscola(abertas);
  const doAnoPor = agruparPorEscola(ocorrenciasDoAno);
  const merendaPor = agruparPorEscola(merenda);
  const casosPor = agruparPorEscola(casos);

  const lidas: EscolaLida[] = ativas
    .map((e) => ({
      escola: e,
      calendario: lerCalendario(aulasPerdidas(doAnoPor.get(e.id) ?? []), e.diasPrevistos ?? DIAS_LETIVOS_LDB),
      leitura: lerEscola({
        escola: {
          nome: e.nome,
          situacao: e.situacao,
          dependencia: e.dependencia,
          origem: e.origem,
          censoAno: e.censoAno,
          matriculasCenso: e.matriculasCenso,
          matriculasAtuais: e.matriculasAtuais,
          diasPrevistos: e.diasPrevistos,
        },
        ocorrenciasAbertas: abertasPor.get(e.id) ?? [],
        ocorrenciasDoAno: doAnoPor.get(e.id) ?? [],
        merenda: merendaPor.get(e.id) ?? [],
        buscaAtiva: casosPor.get(e.id) ?? [],
        mencoesOuvidoria: mencoesDaEscola(e.nome),
      }),
    }))
    .sort((a, b) => b.leitura.peso - a.leitura.peso || a.escola.nome.localeCompare(b.escola.nome, "pt-BR"));

  return { todas, ativas, lidas, ocorrenciasDoAno, merenda, compras, repasse, casos, fundeb, resultados, ano };
}

/** A que mais precisa de decisão agora — a primeira com algum achado. */
export function aQueMaisPrecisa(rede: RedeEducacao): EscolaLida | undefined {
  return rede.lidas.find((x) => x.leitura.achados.length > 0);
}
