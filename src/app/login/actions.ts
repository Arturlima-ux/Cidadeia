"use server";

import { z } from "zod";
import { db } from "@/db";
import { usuarios, prefeituras } from "@/db/schema";
import { eq } from "drizzle-orm";
import { verificarSenha } from "@/lib/senha";
import { normalizarDocumento } from "@/lib/documento";
import { criarSessao } from "@/lib/sessao";
import { redirect } from "next/navigation";
import { PREFEITURA_EQUIPE_ID } from "@/lib/equipe";
import { verificarBloqueio, registrarTentativaFalha, limparTentativas, limitarUso } from "@/lib/rate-limit";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { enviarEmail } from "@/lib/email";
import { montarEmail } from "@/lib/email-modelo";
import {
  DIGITOS,
  ESPERA_REENVIO_SEGUNDOS,
  TENTATIVAS,
  VALIDADE_MINUTOS,
  codigoConfere,
  gerarCodigo,
  loginComCodigoLigado,
  mascararEmail,
  resumoDoCodigo,
} from "@/lib/codigo-login";

const schemaLogin = z.object({
  documento: z.string().min(1, "Informe seu CPF ou CNPJ."),
  senha: z.string().min(1, "Informe sua senha."),
});

export type ResultadoLogin =
  | { ok: true }
  /** Senha certa, falta o código que foi para o e-mail (lib/codigo-login.ts). */
  | { ok: true; etapa: "codigo"; email: string }
  | { ok: false; erro: string };

// ── A ETAPA DO CÓDIGO ──
// O cookie guarda quem está entrando, até quando vale e o RESUMO do código,
// assinado. Nunca o código.
const COOKIE_CODIGO = "cidadeia_codigo";

function segredo(): string {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET não configurado.");
  return s;
}

type Pendente = { usuarioId: string; expiraEm: number; resumo: string; reenvioEm: number };

async function lerPendente(): Promise<Pendente | null> {
  const token = (await cookies()).get(COOKIE_CODIGO)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(segredo()));
    const p = payload as unknown as Pendente;
    return p.usuarioId && p.resumo && p.expiraEm ? p : null;
  } catch {
    return null;
  }
}

async function apagarPendente() {
  (await cookies()).delete(COOKIE_CODIGO);
}

async function mandarCodigo(usuarioId: string, email: string, nome: string): Promise<{ ok: true } | { ok: false; erro: string }> {
  const codigo = gerarCodigo();
  const expiraEm = Date.now() + VALIDADE_MINUTOS * 60_000;
  const pendente: Pendente = {
    usuarioId,
    expiraEm,
    resumo: resumoDoCodigo(codigo, usuarioId, expiraEm, segredo()),
    reenvioEm: Date.now() + ESPERA_REENVIO_SEGUNDOS * 1000,
  };
  const envio = await enviarEmail({
    // Segredo de acesso: nunca na caixa de saída da equipe (lib/email.ts).
    guardarNaCaixaDeSaida: false,
    para: email,
    assunto: `CidadeIA: seu código de acesso é ${codigo}`,
    html: montarEmail({
      remetente: { tipo: "cidadeia" },
      previa: `Use ${codigo} para entrar. Vale por ${VALIDADE_MINUTOS} minutos.`,
      etiqueta: { texto: "Código de acesso", tom: "marca" },
      titulo: "Seu código para entrar",
      saudacao: `Olá, ${nome.split(" ")[0]}.`,
      blocos: [
        { destaque: codigo, titulo: "Código", tom: "marca" },
        { p: `Digite os ${DIGITOS} números na tela de entrada. O código vale por ${VALIDADE_MINUTOS} minutos e só funciona uma vez.` },
        { nota: "Não foi você? Alguém digitou a sua senha certa. Troque a senha em Minha conta assim que entrar, e avise a equipe respondendo este e-mail." },
      ],
      assinatura: null,
      motivo: "Você recebe este e-mail porque alguém entrou com o seu CPF/CNPJ e a sua senha no CidadeIA.",
    }),
  });
  // Em desenvolvimento, sem envio de e-mail configurado, o código sai no
  // terminal do servidor para dar para testar a etapa. Em produção, não
  // enviar é erro, e a pessoa tenta de novo.
  const semEnvioLocal = !envio.enviado && envio.causa === "nao-configurado" && process.env.NODE_ENV !== "production";
  if (semEnvioLocal) console.log(`[login] código de acesso (só em desenvolvimento): ${codigo}`);
  if (!envio.enviado && !semEnvioLocal) {
    console.error("[login] código não enviado:", envio.detalhe ?? envio.motivo);
    return { ok: false, erro: "Não foi possível enviar o código de acesso agora. Tente de novo em instantes." };
  }
  const token = await new SignJWT({ ...pendente })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(`${VALIDADE_MINUTOS}m`)
    .sign(new TextEncoder().encode(segredo()));
  (await cookies()).set(COOKIE_CODIGO, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/login",
    maxAge: VALIDADE_MINUTOS * 60,
  });
  return { ok: true };
}

export async function fazerLogin(
  dadosBrutos: z.infer<typeof schemaLogin>
): Promise<ResultadoLogin> {
  const parsed = schemaLogin.safeParse(dadosBrutos);
  if (!parsed.success) {
    return { ok: false, erro: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const documento = normalizarDocumento(parsed.data.documento);

  const minutosRestantes = await verificarBloqueio(documento);
  if (minutosRestantes !== null) {
    return {
      ok: false,
      erro: `Muitas tentativas incorretas. Tente novamente em ${minutosRestantes} minuto${minutosRestantes > 1 ? "s" : ""}.`,
    };
  }

  const linhas = await db
    .select({
      usuarioId: usuarios.id,
      prefeituraId: usuarios.prefeituraId,
      nome: usuarios.nome,
      cargo: usuarios.cargo,
      unidadeId: usuarios.unidadeId,
      escolaId: usuarios.escolaId,
      secretaria: usuarios.secretaria,
      senhaHash: usuarios.senhaHash,
      email: usuarios.email,
      prefeituraNome: prefeituras.nome,
    })
    .from(usuarios)
    .innerJoin(prefeituras, eq(usuarios.prefeituraId, prefeituras.id))
    .where(eq(usuarios.cpfCnpj, documento))
    .limit(1);

  const usuario = linhas[0];

  // Mensagem genérica de propósito — não revela se o documento existe ou não,
  // para não facilitar enumeração de usuários cadastrados.
  const erroGenerico = "CPF/CNPJ ou senha incorretos.";

  if (!usuario) {
    await registrarTentativaFalha(documento);
    return { ok: false, erro: erroGenerico };
  }

  const senhaValida = await verificarSenha(parsed.data.senha, usuario.senhaHash);
  if (!senhaValida) {
    await registrarTentativaFalha(documento);
    return { ok: false, erro: erroGenerico };
  }

  await limparTentativas(documento);

  if (loginComCodigoLigado()) {
    const email = usuario.email?.trim();
    if (email) {
      const r = await mandarCodigo(usuario.usuarioId, email, usuario.nome);
      if (!r.ok) return r;
      return { ok: true, etapa: "codigo", email: mascararEmail(email) };
    }
    // Sem e-mail não há para onde mandar o código: entra só com a senha.
    console.warn(`[login] usuário ${usuario.usuarioId} sem e-mail: entrou sem o código de acesso.`);
  }

  await entrar(usuario);
  return { ok: true };
}

/** Segunda etapa: confere o código e abre a sessão. */
export async function confirmarCodigo(codigo: string): Promise<ResultadoLogin> {
  const pendente = await lerPendente();
  if (!pendente) return { ok: false, erro: "O código venceu. Entre de novo com CPF/CNPJ e senha." };

  const pode = await limitarUso(`codigo-login:${pendente.usuarioId}`, TENTATIVAS, VALIDADE_MINUTOS);
  if (!pode) {
    await apagarPendente();
    return { ok: false, erro: "Muitas tentativas com o código. Entre de novo com CPF/CNPJ e senha." };
  }

  const resultado = codigoConfere(codigo, pendente, segredo());
  if (resultado === "vencido") {
    await apagarPendente();
    return { ok: false, erro: "O código venceu. Entre de novo com CPF/CNPJ e senha." };
  }
  if (resultado === "errado") return { ok: false, erro: "Código incorreto. Confira no e-mail e digite de novo." };

  const [usuario] = await db
    .select({
      usuarioId: usuarios.id,
      prefeituraId: usuarios.prefeituraId,
      nome: usuarios.nome,
      cargo: usuarios.cargo,
      unidadeId: usuarios.unidadeId,
      escolaId: usuarios.escolaId,
      secretaria: usuarios.secretaria,
    })
    .from(usuarios)
    .where(eq(usuarios.id, pendente.usuarioId))
    .limit(1);
  await apagarPendente();
  if (!usuario) return { ok: false, erro: "Conta não encontrada. Entre de novo com CPF/CNPJ e senha." };

  await entrar(usuario);
  return { ok: true };
}

/** Manda um código novo, respeitando a espera entre envios. */
export async function reenviarCodigo(): Promise<ResultadoLogin> {
  const pendente = await lerPendente();
  if (!pendente) return { ok: false, erro: "O código venceu. Entre de novo com CPF/CNPJ e senha." };
  if (Date.now() < pendente.reenvioEm) {
    return { ok: false, erro: `Espere ${Math.ceil((pendente.reenvioEm - Date.now()) / 1000)} segundos para pedir outro código.` };
  }
  const pode = await limitarUso(`codigo-reenvio:${pendente.usuarioId}`, 3, VALIDADE_MINUTOS);
  if (!pode) return { ok: false, erro: "Muitos códigos pedidos. Espere alguns minutos e entre de novo." };
  const [u] = await db
    .select({ email: usuarios.email, nome: usuarios.nome })
    .from(usuarios)
    .where(eq(usuarios.id, pendente.usuarioId))
    .limit(1);
  if (!u?.email) return { ok: false, erro: "Conta sem e-mail cadastrado." };
  const r = await mandarCodigo(pendente.usuarioId, u.email, u.nome);
  return r.ok ? { ok: true, etapa: "codigo", email: mascararEmail(u.email) } : r;
}

async function entrar(usuario: {
  usuarioId: string;
  prefeituraId: string;
  nome: string;
  cargo: string;
  secretaria: string | null;
  unidadeId: string | null;
  escolaId: string | null;
}): Promise<never> {
  await criarSessao({
    usuarioId: usuario.usuarioId,
    prefeituraId: usuario.prefeituraId,
    nome: usuario.nome,
    cargo: usuario.cargo as "prefeito" | "secretario" | "admin" | "unidade" | "escola",
    secretaria: usuario.secretaria,
    unidadeId: usuario.unidadeId,
    escolaId: usuario.escolaId,
  });

  // A equipe do CidadeIA não tem painel de prefeitura: vai para a mesa.
  if (usuario.prefeituraId === PREFEITURA_EQUIPE_ID) redirect("/admin/pedidos");

  // A gerência de unidade não tem Visão Geral: vai direto para a ficha dela.
  if (usuario.cargo === "unidade" && usuario.unidadeId) {
    redirect(`/dashboard/secretarias/saude/unidades/${usuario.unidadeId}`);
  }

  // A direção da escola, idem: vai direto para a ficha da escola.
  if (usuario.cargo === "escola" && usuario.escolaId) {
    redirect(`/dashboard/secretarias/educacao/escolas/${usuario.escolaId}`);
  }

  // Quem entra cai na Visão Geral.
  redirect("/dashboard");
}

export async function sair() {
  const { encerrarSessao } = await import("@/lib/sessao");
  await encerrarSessao();
  redirect("/login");
}
