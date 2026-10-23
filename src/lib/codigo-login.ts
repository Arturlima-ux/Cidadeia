// ── O CÓDIGO DE ACESSO POR E-MAIL ──
//
// Segunda etapa do login: depois do CPF e da senha certos, um código de 6
// dígitos vai para o e-mail da pessoa, e só com ele a sessão abre. Senha
// vazada (anotada no balcão, repetida de outro site) deixa de bastar.
//
// ── POR QUE LIGA POR VARIÁVEL ──
// O código depende do e-mail chegar. Se o envio falhar, quem tem contrato
// fica sem entrar, e isso é pior que não ter a segunda etapa. Por isso ela
// só vale com LOGIN_COM_CODIGO=1 na Vercel, ligada quando o envio estiver
// confiável. Conta sem e-mail cadastrado entra só com a senha (não há para
// onde mandar o código), e o servidor registra isso.
//
// ── SEM TABELA NOVA ──
// O código não é guardado em lugar nenhum. Vai num cookie assinado só o
// resumo dele (HMAC com o AUTH_SECRET, amarrado ao usuário e à validade), e
// a conferência refaz o resumo do que a pessoa digitou. Quem lê o cookie não
// descobre o código; quem troca o cookie quebra a assinatura.
//
// Esta é a parte pura: tests/codigo-login.test.ts.

import { createHmac, randomInt, timingSafeEqual } from "node:crypto";

export const DIGITOS = 6;
/** Validade do código, em minutos. */
export const VALIDADE_MINUTOS = 10;
/** Tentativas de digitar o código antes de ter de recomeçar. */
export const TENTATIVAS = 5;
/** Espera mínima para pedir um novo código, em segundos. */
export const ESPERA_REENVIO_SEGUNDOS = 30;

export function loginComCodigoLigado(env: Record<string, string | undefined> = process.env): boolean {
  return env.LOGIN_COM_CODIGO?.trim() === "1";
}

/** Seis dígitos, sorteio criptográfico, zeros à esquerda mantidos. */
export function gerarCodigo(): string {
  return String(randomInt(0, 10 ** DIGITOS)).padStart(DIGITOS, "0");
}

export function resumoDoCodigo(codigo: string, usuarioId: string, expiraEm: number, segredo: string): string {
  return createHmac("sha256", segredo).update(`${usuarioId}:${expiraEm}:${codigo}`).digest("hex");
}

/** Confere em tempo constante, e recusa vencido ou fora do formato. */
export function codigoConfere(
  digitado: string,
  pendente: { usuarioId: string; expiraEm: number; resumo: string },
  segredo: string,
  agora: number = Date.now()
): "certo" | "errado" | "vencido" {
  if (agora > pendente.expiraEm) return "vencido";
  const limpo = digitado.replace(/\D/g, "");
  if (limpo.length !== DIGITOS) return "errado";
  const esperado = Buffer.from(pendente.resumo, "hex");
  const recebido = Buffer.from(resumoDoCodigo(limpo, pendente.usuarioId, pendente.expiraEm, segredo), "hex");
  return esperado.length === recebido.length && timingSafeEqual(esperado, recebido) ? "certo" : "errado";
}

/** "a****@gmail.com": a pessoa reconhece o e-mail sem a tela expor o endereço. */
export function mascararEmail(email: string): string {
  const [nome, dominio] = email.split("@");
  if (!nome || !dominio) return "o seu e-mail";
  return `${nome[0]}${"*".repeat(Math.max(3, nome.length - 1))}@${dominio}`;
}
