import { headers } from "next/headers";
import { limitarUso } from "@/lib/rate-limit";

// ── O HERÓI CONSULTA O TESOURO A PARTIR DE UM GET PÚBLICO ──
//
// `/?m=<7 dígitos>` são 5.570 endereços enumeráveis, cada um disparando até
// oito chamadas do RGF e mais algumas do RREO, sem cadastro, a partir da home
// que o robots.txt libera. Um laço de shell percorre um estado inteiro em
// minutos.
//
// O risco não é a nossa conta de servidor: é sermos bloqueados pela API
// pública do Tesouro — que é exatamente a prova em que a página inteira se
// apoia. O produto perderia o argumento, não a performance.
//
// O cache de dados do Next (`revalidate: 604800`) só protege a repetição do
// MESMO município; enumerar municípios diferentes passa por ele inteiro.
//
// Vinte municípios em dez minutos é folgado para uma pessoa comparando
// cidades vizinhas e apertado para um laço.

const MAXIMO = 20;
const JANELA_MINUTOS = 10;

/**
 * Se este visitante ainda pode disparar consulta ao Tesouro pela home.
 *
 * Em caso de falha na contagem devolve `true`: o limite é proteção contra
 * abuso, e derrubar a porta de entrada do funil porque a tabela de limites não
 * respondeu seria o remédio pior que a doença.
 */
export async function podeConsultarPelaHome(): Promise<boolean> {
  try {
    const cabecalhos = await headers();
    const ip =
      cabecalhos.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      cabecalhos.get("x-real-ip") ||
      "desconhecido";
    return await limitarUso(`heroi:${ip}`, MAXIMO, JANELA_MINUTOS);
  } catch {
    return true;
  }
}

export const AUSENCIA_POR_LIMITE =
  `Muitas consultas deste endereço nos últimos ${JANELA_MINUTOS} minutos. ` +
  "O limite existe para não sermos bloqueados pela API pública do Tesouro, que é de onde vem " +
  "todo número desta página. Tente de novo em alguns minutos.";
