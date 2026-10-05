// ── O MÓDULO FOI CONTRATADO? ──
//
// São duas perguntas diferentes, e confundi-las abriu um buraco:
//
//   temAcessoSecretaria(sessao, "licitacoes")
//     → o CARGO desta pessoa alcança essa pasta? Para prefeito e admin a
//       resposta é sempre sim.
//
//   temPlano(prefeitura.planosContratados, "licitacoes")
//     → a PREFEITURA contratou esse módulo?
//
// As telas fazem a segunda (`if (!ctx.temPlano(...)) return <BloqueioPlano/>`).
// As server actions e as rotas de API criadas nas últimas etapas faziam só a
// primeira — e server action despacha por id no cabeçalho Next-Action, rota de
// API não passa pelo proxy de /dashboard. Então o prefeito de um município que
// contratou apenas Saúde passava em temAcessoSecretaria, a tela o bloqueava, e
// a ação por baixo dela não.
//
// Não é vazamento entre municípios: o dado é do próprio município e vem de
// portal público. É uso de módulo não contratado — e, no caso das importações,
// gravação de dado de um módulo que a prefeitura não paga.
//
// Fica num lugar só porque a alternativa era repetir a consulta a prefeituras
// em quatro arquivos, e três cópias da mesma regra já divergiram duas vezes
// neste projeto.

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { prefeituras } from "@/db/schema";
import { temPlano, NOME_PLANO_ADDON, type PlanoAddon } from "@/lib/planos";
import { painelTravado } from "@/lib/cobranca";
import { situacaoDaPrefeitura } from "@/lib/cobranca-servidor";

export type PlanoConferido =
  | { ok: true; cnpj: string; municipio: string; estado: string }
  | { ok: false; erro: string };

/**
 * Confere o plano e já devolve os dados da prefeitura que quem chama precisa.
 *
 * Devolver o CNPJ junto não é conveniência: as três ações que consultam o PNCP
 * precisavam dele e faziam a própria consulta a `prefeituras`. Uma consulta só
 * evita que alguém acrescente a quarta e esqueça a checagem de plano.
 */
export async function exigirPlano(
  prefeituraId: string,
  addon: PlanoAddon
): Promise<PlanoConferido> {
  const [p] = await db
    .select({
      cnpj: prefeituras.cnpj,
      municipio: prefeituras.municipio,
      estado: prefeituras.estado,
      planosContratados: prefeituras.planosContratados,
    })
    .from(prefeituras)
    .where(eq(prefeituras.id, prefeituraId))
    .limit(1);

  if (!p) return { ok: false, erro: "Prefeitura não encontrada." };
  if (!temPlano(p.planosContratados, addon)) {
    return { ok: false, erro: `O plano ${NOME_PLANO_ADDON[addon]} não está contratado.` };
  }
  // A trava financeira vale também para as ações, não só para as telas: com
  // a conta suspensa, importação e gravação param até o pagamento.
  if (painelTravado(await situacaoDaPrefeitura(prefeituraId))) {
    return { ok: false, erro: "Conta suspensa por mensalidade em atraso. Veja Financeiro, no painel." };
  }
  return { ok: true, cnpj: p.cnpj, municipio: p.municipio, estado: p.estado };
}

/**
 * Ano vindo do cliente, aceito só dentro de uma janela plausível.
 *
 * ── POR QUE ISTO EXISTE ──
 *
 * As ações declaravam `ano: number`, e isso é tipo de TypeScript — que some em
 * runtime. Server action recebe o que o cliente mandar, e o valor ia direto
 * para dentro da URL da consulta ao PNCP (`dataInicial=${ano}0101`).
 *
 * O host é fixo, então não dá para apontar a requisição para outro servidor.
 * Mas uma string como "2026&cnpj=OUTRO" injeta parâmetro na consulta, e a
 * importação gravaria no cadastro do município os processos de outro. Não
 * vaza dado protegido — o PNCP é público — mas corrompe o cadastro de quem
 * clicou, e é gravação a partir de entrada não validada.
 */
export function anoValido(bruto: unknown, hoje: Date = new Date()): number | null {
  const n = typeof bruto === "number" ? bruto : Number(bruto);
  if (!Number.isInteger(n)) return null;
  const corrente = hoje.getFullYear();
  // O PNCP começou a receber publicações em 2021; adiante de um ano não há o
  // que consultar.
  if (n < 2021 || n > corrente + 1) return null;
  return n;
}
