import bcrypt from "bcryptjs";

const SALT_ROUNDS = 12;

export async function gerarHashSenha(senha: string): Promise<string> {
  return bcrypt.hash(senha, SALT_ROUNDS);
}

export async function verificarSenha(
  senha: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(senha, hash);
}

export function senhaForte(senha: string): { ok: boolean; motivo?: string } {
  if (senha.length < 8) {
    return { ok: false, motivo: "A senha precisa ter pelo menos 8 caracteres." };
  }
  if (!/[A-Za-z]/.test(senha) || !/[0-9]/.test(senha)) {
    return {
      ok: false,
      motivo: "A senha precisa ter letras e números.",
    };
  }
  return { ok: true };
}
