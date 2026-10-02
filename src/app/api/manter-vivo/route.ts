import { db } from "@/db";
import { medicoesBanco } from "@/db/schema";
import { gerarId } from "@/lib/id";
import { sql, desc } from "drizzle-orm";

// ── ACORDAR O BANCO ANTES QUE ELE DURMA ──
//
// O plano gratuito do Supabase pausa um projeto que fica cerca de sete dias
// sem nenhuma requisição. Pausado, o dado não se perde — mas o site quebra
// inteiro: login não responde, o índice de portais não lista, o painel não
// abre. Se um prefeito abrir o link justamente nesse intervalo, ele vê erro,
// e essa é a única impressão que vai ficar.
//
// Enquanto não há clientes, o tráfego real é quase zero. Depender de alguém
// lembrar de abrir o site uma vez por semana é depender de lembrar — e a
// semana em que se esquece é a semana da reunião.
//
// A consulta abaixo é o mínimo que caracteriza atividade para o banco: uma
// linha, sem tabela, sem escrita. Não é o site que precisa ser tocado, é o
// POSTGRES — abrir uma página estática não conta, porque ela nem chega ao
// banco.
//
// Quando o primeiro município entrar, isto deixa de ser necessário: o uso real
// mantém o projeto acordado. Fica assim mesmo, porque custa uma consulta por
// dia e continua servindo de sinal de vida.

export const dynamic = "force-dynamic";

/**
 * Guarda o resultado da verificação.
 *
 * ── POR QUE GRAVAR O QUE JÁ SE MEDIA ──
 *
 * A latência era calculada e jogada fora. Guardá-la custa uma linha por dia e
 * resolve a pendência mais difícil do contrato: a cláusula de disponibilidade
 * mínima mensal, que estava em branco porque o Supabase não oferece SLA em
 * plano nenhum abaixo do Enterprise. Em vez de prometer um percentual sem
 * lastro, a cláusula passa a dizer onde a medição é publicada.
 *
 * A gravação nunca derruba a verificação: se o insert falhar, a rota ainda
 * responde. Um monitor que quebra por causa do próprio registro é pior que
 * nenhum monitor.
 */
/**
 * Intervalo mínimo entre dois registros.
 *
 * ── POR QUE ISTO EXISTE ──
 *
 * Esta rota não tem autenticação, e com razão: ela é o sinal de vida do
 * sistema, e sinal de vida atrás de login não serve de sinal para ninguém.
 * Enquanto ela só LIA o banco (`select 1`), isso era inofensivo.
 *
 * Passou a ESCREVER. Sem limite, qualquer um encheria a tabela de medições
 * com um laço de curl — e pior que o espaço gasto seria o efeito na apuração
 * publicada, já que a página de disponibilidade conta sobre essas linhas.
 *
 * O limite é no registro, não no endpoint: continua respondendo a quantas
 * chamadas vierem, e grava no máximo uma por hora. O cron roda uma vez por
 * dia, então nunca esbarra nisso.
 */
const INTERVALO_MINIMO_MS = 60 * 60 * 1000;

async function registrar(ok: boolean, ms: number, detalhe: string | null) {
  try {
    const [ultima] = await db
      .select({ verificadoEm: medicoesBanco.verificadoEm })
      .from(medicoesBanco)
      .orderBy(desc(medicoesBanco.verificadoEm))
      .limit(1);

    if (ultima) {
      const desdeAUltima = Date.now() - new Date(ultima.verificadoEm).getTime();
      // Falha sempre registra: uma queda logo depois de uma verificação boa é
      // exatamente o que não pode passar despercebido, e é raro o bastante
      // para não virar vetor de inundação.
      if (ok && desdeAUltima < INTERVALO_MINIMO_MS) return;
    }

    await db.insert(medicoesBanco).values({
      id: gerarId("med"),
      verificadoEm: new Date().toISOString(),
      ok,
      ms,
      detalhe,
      origem: "cron",
    });
  } catch (e) {
    console.error("[manter-vivo] não consegui registrar a medição:", e);
  }
}

export async function GET() {
  const inicio = Date.now();

  try {
    await db.execute(sql`select 1`);
    const ms = Date.now() - inicio;
    await registrar(true, ms, null);

    return Response.json({
      ok: true,
      banco: "acordado",
      // Latência serve para notar degradação antes de virar queda: um número
      // que sai de 500 ms para 5 s é aviso, e sem registrá-lo ninguém vê.
      ms,
      em: new Date().toISOString(),
    });
  } catch (erro) {
    const ms = Date.now() - inicio;
    // ── A FALHA É O REGISTRO QUE MAIS IMPORTA ──
    //
    // Se o banco está fora, este insert também falha — e é por isso que
    // registrar() engole o próprio erro. O dia continua contando como falha na
    // apuração por AUSÊNCIA de registro bem-sucedido, que é o comportamento
    // certo: dia sem verificação não é dia disponível.
    await registrar(false, ms, erro instanceof Error ? erro.name : "erro desconhecido");

    // 503, e não 500: é indisponibilidade temporária de dependência externa,
    // e é isso que um monitor precisa distinguir de defeito no código.
    return Response.json(
      {
        ok: false,
        banco: "sem resposta",
        ms,
        // A mensagem crua pode conter a string de conexão. Nunca sai daqui.
        detalhe: erro instanceof Error ? erro.name : "erro desconhecido",
      },
      { status: 503 }
    );
  }
}
