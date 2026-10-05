import { timingSafeEqual } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { usuarios } from "@/db/schema";
import { lerSessao } from "@/lib/sessao";
import { ehAdmin } from "@/lib/pedidos";

// ── A CONTA DA EQUIPE ──
//
// A equipe do CidadeIA não é prefeitura. Até outubro de 2026, quem quisesse
// entrar em /admin precisava criar uma conta de prefeitura (estado,
// município, CNPJ) e torcer para o e-mail bater com ADMIN_EMAILS.
//
// Isso tinha um furo: o e-mail do cadastro não é verificado. Qualquer pessoa
// que criasse uma prefeitura com o e-mail da equipe ganhava a mesa de
// pedidos, os dados de quem pediu proposta e o botão que ativa módulos.
//
// Agora a equipe tem uma conta própria, numa "prefeitura" interna que não é
// município nenhum, criada em /equipe/criar com um código que só existe na
// Vercel (EQUIPE_CODIGO). Para ser da equipe é preciso as duas coisas: estar
// nessa conta interna E ter o e-mail em ADMIN_EMAILS. Conta de prefeitura,
// com qualquer e-mail, nunca entra em /admin.

export const PREFEITURA_EQUIPE_ID = "pref_equipe_cidadeia";

export function ehEquipe(
  usuario: { email: string | null | undefined; prefeituraId: string | null | undefined } | null | undefined,
  lista = process.env.ADMIN_EMAILS
): boolean {
  if (!usuario) return false;
  return usuario.prefeituraId === PREFEITURA_EQUIPE_ID && ehAdmin(usuario.email, lista);
}

/** Compara o código de criação sem vazar, pelo tempo, quantos caracteres batem. */
export function codigoConfere(entrada: string, esperado = process.env.EQUIPE_CODIGO): boolean {
  if (!esperado || esperado.length < 12) return false;
  const a = Buffer.from(entrada.trim());
  const b = Buffer.from(esperado);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * O e-mail de quem está logado, se for da equipe; null em qualquer outro
 * caso. É a única porta de /admin: páginas, ações e rotas chamam esta.
 */
export async function emailDaEquipe(): Promise<string | null> {
  const sessao = await lerSessao();
  if (!sessao || sessao.demo) return null;
  const [u] = await db
    .select({ email: usuarios.email, prefeituraId: usuarios.prefeituraId })
    .from(usuarios)
    .where(eq(usuarios.id, sessao.usuarioId))
    .limit(1);
  return ehEquipe(u) ? (u!.email ?? null) : null;
}

// ── O PAINEL DE TESTE DA EQUIPE ──
//
// Um CPF só pode ter um login, e o da equipe não é prefeitura. Para conferir
// o painel sem criar uma segunda conta, a equipe entra numa prefeitura de
// teste própria, sem município nenhum: todos os módulos ligados, liberada
// para gravar, sem cobrança e sem portal público. Os clientes não a veem; ela não entra em funil,
// financeiro nem lista nenhuma.
//
// A sessão passa a apontar para esta prefeitura, mas o usuário continua sendo
// o da equipe: emailDaEquipe() lê a conta no banco, então /admin segue aberto
// e "Voltar à mesa" troca a sessão de volta.
export const PREFEITURA_TESTE_ID = "pref_teste_equipe";
