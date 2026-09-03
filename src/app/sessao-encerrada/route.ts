import { NextResponse } from "next/server";
import { NOME_COOKIE_SESSAO } from "@/lib/sessao";

// ── ONDE A SESSÃO INVÁLIDA MORRE ──
//
// Existe por uma restrição do Next: cookie só pode ser modificado em Server
// Action ou Route Handler. O layout do painel tentava apagar o cookie
// diretamente ao descobrir que a prefeitura da sessão não existe mais, e isso
// lançava — com uma consequência cruel: o cookie continuava lá, então a
// próxima visita repetia o erro. O usuário ficava preso numa tela de "algo deu
// errado" que nenhum botão resolvia, porque a causa viajava junto com ele.
//
// O layout agora só redireciona para cá. Este handler pode apagar o cookie, e
// apaga — encerrando o ciclo na primeira passagem.
//
// Acontece quando a prefeitura foi removida do banco com a sessão ainda
// válida: troca de ambiente, conta de teste recriada, cliente encerrado.

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  // `sessao=expirada` é o que permite ao login explicar por que a pessoa
  // voltou para lá. Sem isso ela é devolvida ao formulário sem motivo
  // aparente, o que parece defeito.
  const destino = new URL("/login?sessao=expirada", request.url);

  const resposta = NextResponse.redirect(destino);
  resposta.cookies.delete(NOME_COOKIE_SESSAO);
  return resposta;
}
