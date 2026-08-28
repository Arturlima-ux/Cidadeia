import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const NOME_COOKIE = "cidadeia_sessao";
const DURACAO_SESSAO = "7d";

function chaveSecreta() {
  const segredo = process.env.AUTH_SECRET;
  if (!segredo) {
    throw new Error(
      "AUTH_SECRET não configurado. Defina uma string aleatória longa no .env (veja .env.example)."
    );
  }
  return new TextEncoder().encode(segredo);
}

export type SessaoPayload = {
  usuarioId: string;
  prefeituraId: string;
  nome: string;
  cargo: "prefeito" | "secretario" | "admin";
  secretaria?: string | null;
};

export async function criarSessao(payload: SessaoPayload) {
  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(DURACAO_SESSAO)
    .sign(chaveSecreta());

  const store = await cookies();
  store.set(NOME_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function lerSessao(): Promise<SessaoPayload | null> {
  const store = await cookies();
  const token = store.get(NOME_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, chaveSecreta());
    return payload as unknown as SessaoPayload;
  } catch {
    return null;
  }
}

/**
 * Confere se a sessão pode ler/escrever dados de uma secretaria específica.
 * Prefeito e admin acessam qualquer secretaria da própria prefeitura;
 * secretário só acessa a secretaria à qual está vinculado.
 */
export function temAcessoSecretaria(
  sessao: SessaoPayload,
  secretaria: string
): boolean {
  if (sessao.cargo === "secretario") return sessao.secretaria === secretaria;
  return true;
}

export async function encerrarSessao() {
  const store = await cookies();
  store.delete(NOME_COOKIE);
}

export const NOME_COOKIE_SESSAO = NOME_COOKIE;

// Versão para uso no middleware (Edge runtime) — só verifica, não lê via
// next/headers já que o middleware recebe o cookie pelo request diretamente.
export async function verificarTokenSessao(token: string | undefined) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, chaveSecreta());
    return payload as unknown as SessaoPayload;
  } catch {
    return null;
  }
}
