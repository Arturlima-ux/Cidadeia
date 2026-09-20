"use server";

import { z } from "zod";
import { db } from "@/db";
import { prefeituras, usuarios, pedidosProposta } from "@/db/schema";
import { eq } from "drizzle-orm";
import { gerarId } from "@/lib/id";
import { gerarHashSenha, senhaForte } from "@/lib/senha";
import { validarCpfOuCnpj, normalizarDocumento } from "@/lib/documento";
import { criarSessao } from "@/lib/sessao";
import { garantirEnderecoPublico } from "@/lib/endereco-publico";
import { redirect } from "next/navigation";

// Fluxo enxuto — só o essencial para começar a usar. População, mandato,
// quantidade de secretarias, sistemas conectados e módulos contratados dá
// pra preencher depois direto no painel (Configurações / Marketplace).
const schemaCadastro = z.object({
  nomePrefeitura: z.string().min(3, "Informe o nome da prefeitura."),
  estado: z.string().length(2, "Use a sigla do estado (ex: CE)."),
  municipio: z.string().min(2, "Informe o município."),
  cnpj: z.string().refine((v) => validarCpfOuCnpj(v), "CNPJ inválido."),
  nomeResponsavel: z.string().min(3, "Informe seu nome."),
  documentoLogin: z.string().refine((v) => validarCpfOuCnpj(v), "CPF/CNPJ de login inválido."),
  emailResponsavel: z.string().email("E-mail inválido."),
  senha: z.string(),
  // Honeypot — campo escondido do humano via CSS; se vier preenchido, é bot.
  site: z.string().optional(),
  // Pedido de proposta de origem (opcional). Ver cadastro/page.tsx.
  propostaId: z.string().max(80).optional(),
});

export type CadastroInput = z.infer<typeof schemaCadastro>;

export type ResultadoCadastro =
  | { ok: true }
  | { ok: false; erro: string; campo?: string };

export async function cadastrarPrefeitura(
  dadosBrutos: CadastroInput
): Promise<ResultadoCadastro> {
  const parsed = schemaCadastro.safeParse(dadosBrutos);
  if (!parsed.success) {
    const primeiro = parsed.error.issues[0];
    return {
      ok: false,
      erro: primeiro?.message || "Dados inválidos.",
      campo: String(primeiro?.path?.[0] ?? ""),
    };
  }
  const dados = parsed.data;

  // Honeypot preenchido — silenciosamente finge sucesso (não dá pista pro bot).
  if (dados.site) {
    return { ok: true };
  }

  const forte = senhaForte(dados.senha);
  if (!forte.ok) {
    return { ok: false, erro: forte.motivo!, campo: "senha" };
  }

  const cnpjNormalizado = normalizarDocumento(dados.cnpj);
  const documentoLoginNormalizado = normalizarDocumento(dados.documentoLogin);

  // Verifica duplicidade
  const prefeituraExistente = await db
    .select({ id: prefeituras.id })
    .from(prefeituras)
    .where(eq(prefeituras.cnpj, cnpjNormalizado))
    .limit(1);
  if (prefeituraExistente.length > 0) {
    return {
      ok: false,
      erro: "Já existe uma prefeitura cadastrada com este CNPJ.",
      campo: "cnpj",
    };
  }

  const usuarioExistente = await db
    .select({ id: usuarios.id })
    .from(usuarios)
    .where(eq(usuarios.cpfCnpj, documentoLoginNormalizado))
    .limit(1);
  if (usuarioExistente.length > 0) {
    return {
      ok: false,
      erro: "Este CPF/CNPJ já está cadastrado como usuário.",
      campo: "documentoLogin",
    };
  }

  const prefeituraId = gerarId("pref");
  const usuarioId = gerarId("user");
  const senhaHash = await gerarHashSenha(dados.senha);

  // ── O PEDIDO DE PROPOSTA QUE ORIGINOU A CONTA ──
  // Se veio de /proposta, o pedido já sabe o código IBGE e a população: a
  // prefeitura nasce com o município reconhecido (passo da Implantação
  // feito) e o pedido passa a ter dono. Só vale para pedido sem conta.
  let pedido: { id: string; codigoIbge: string; populacao: number } | null = null;
  if (dados.propostaId && /^prop_[A-Za-z0-9_-]{4,64}$/.test(dados.propostaId)) {
    try {
      const [p] = await db
        .select({ id: pedidosProposta.id, codigoIbge: pedidosProposta.codigoIbge, populacao: pedidosProposta.populacao, prefeituraId: pedidosProposta.prefeituraId })
        .from(pedidosProposta)
        .where(eq(pedidosProposta.id, dados.propostaId))
        .limit(1);
      if (p && !p.prefeituraId) pedido = { id: p.id, codigoIbge: p.codigoIbge, populacao: p.populacao };
    } catch (e) {
      console.error("[cadastro] não foi possível ler o pedido de proposta:", e);
    }
  }

  try {
    await db.insert(prefeituras).values({
      id: prefeituraId,
      nome: dados.nomePrefeitura,
      estado: dados.estado.toUpperCase(),
      municipio: dados.municipio,
      cnpj: cnpjNormalizado,
      // Quem cria a conta é registrado como prefeito(a) — sem pedir o nome
      // de novo num campo separado.
      prefeito: dados.nomeResponsavel,
      planosContratados: "[]", // nenhum módulo por padrão — ligados pela equipe após o contrato
      codigoIbge: pedido?.codigoIbge ?? null,
      populacao: pedido?.populacao ?? null,
    });

    await db.insert(usuarios).values({
      id: usuarioId,
      prefeituraId,
      cpfCnpj: documentoLoginNormalizado,
      senhaHash,
      email: dados.emailResponsavel,
      nome: dados.nomeResponsavel,
      cargo: "prefeito",
    });
  } catch (e) {
    console.error("[cadastro] falha ao gravar no banco:", e);
    return {
      ok: false,
      erro:
        "Não foi possível concluir o cadastro agora. Tente novamente em instantes.",
    };
  }

  // O endereço público (/transparencia/<slug>) nasce junto com a conta.
  // Sem o Essencial, mostra o portal mínimo; com ele, o completo.
  try {
    await garantirEnderecoPublico(prefeituraId);
  } catch (e) {
    console.error("[cadastro] endereço público não criado agora:", e);
  }

  if (pedido) {
    try {
      await db.update(pedidosProposta).set({ prefeituraId }).where(eq(pedidosProposta.id, pedido.id));
    } catch (e) {
      // A conta existe; o vínculo é recuperável em /admin/pedidos.
      console.error("[cadastro] não foi possível vincular o pedido à conta:", e);
    }
  }

  await criarSessao({
    usuarioId,
    prefeituraId,
    nome: dados.nomeResponsavel,
    cargo: "prefeito",
  });

  // Para a implantação, não para o painel: sem módulo contratado, a Visão
  // Geral é um cadeado — e essa era a primeira tela que o prefeito via.
  redirect("/dashboard/implantacao");
}
