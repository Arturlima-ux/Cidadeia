import { db } from "@/db";
import { sql } from "drizzle-orm";

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

export async function GET() {
  const inicio = Date.now();

  try {
    await db.execute(sql`select 1`);

    return Response.json({
      ok: true,
      banco: "acordado",
      // Latência serve para notar degradação antes de virar queda: um número
      // que sai de 500 ms para 5 s é aviso, e sem registrá-lo ninguém vê.
      ms: Date.now() - inicio,
      em: new Date().toISOString(),
    });
  } catch (erro) {
    // 503, e não 500: é indisponibilidade temporária de dependência externa,
    // e é isso que um monitor precisa distinguir de defeito no código.
    return Response.json(
      {
        ok: false,
        banco: "sem resposta",
        ms: Date.now() - inicio,
        // A mensagem crua pode conter a string de conexão. Nunca sai daqui.
        detalhe: erro instanceof Error ? erro.name : "erro desconhecido",
      },
      { status: 503 }
    );
  }
}
