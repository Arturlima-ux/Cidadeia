"use server";

import { auditar } from "@/lib/auditoria";
import { z } from "zod";
import { db } from "@/db";
import { obras, decisoesObra } from "@/db/schema";
import { and, eq, desc } from "drizzle-orm";
import { validarDecisao, type TipoDecisaoObra, type DecisaoObra } from "@/lib/decisao-obra";
import { gerarId } from "@/lib/id";
import { LIMITES_BRASIL } from "@/lib/coordenadas";
import { lerSessao, temAcessoSecretaria } from "@/lib/sessao";
import { importarObrasDosContratos } from "@/lib/importacoes";
import { exigirPlano } from "@/lib/exigir-plano";
import { revalidatePath } from "next/cache";

async function exigirAcesso(prefeituraId: string) {
  const sessao = await lerSessao();
  if (!sessao || sessao.prefeituraId !== prefeituraId || !temAcessoSecretaria(sessao, "obras")) {
    return null;
  }
  return sessao;
}

export async function buscarObras(prefeituraId: string) {
  if (!(await exigirAcesso(prefeituraId))) return [];
  return db
    .select()
    .from(obras)
    .where(eq(obras.prefeituraId, prefeituraId))
    .orderBy(desc(obras.createdAt));
}

const dataIso = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida.")
  .optional();

/** "1.250.000,50", "1250000.50" ou "1250000" → 1250000.5. Vazio → undefined. */
function valorEmReais(texto: FormDataEntryValue | null): number | undefined {
  const t = String(texto ?? "").replace(/[R$\s]/g, "");
  if (!t) return undefined;
  const normal = t.includes(",") ? t.replace(/\./g, "").replace(",", ".") : t;
  const n = Number(normal);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

const schemaObra = z
  .object({
    nome: z.string().trim().min(2, "Informe o nome da obra."),
    bairro: z.string().trim().optional(),
    fornecedorNome: z.string().trim().optional(),
    // Vazio é "ainda não medido" (null), e não 0%: zero afirma que a obra está parada.
    progressoAtual: z.coerce.number().min(0).max(100).nullable(),
    valorContrato: z.number().optional(),
    vigenciaInicio: dataIso,
    vigenciaFim: dataIso,
    // Caixa do Brasil, não o mundo: pega latitude e longitude trocadas, que
    // antes passavam e caíam no oceano (src/lib/coordenadas.ts).
    latitude: z.coerce.number().min(LIMITES_BRASIL.latitude.min).max(LIMITES_BRASIL.latitude.max).optional(),
    longitude: z.coerce.number().min(LIMITES_BRASIL.longitude.min).max(LIMITES_BRASIL.longitude.max).optional(),
    status: z.enum(["planejada", "em_andamento", "atrasada", "concluida", "paralisada"]),
  })
  .refine((d) => !d.vigenciaInicio || !d.vigenciaFim || d.vigenciaFim >= d.vigenciaInicio, {
    message: "O término previsto não pode ser antes do início.",
  });

const texto = (v: FormDataEntryValue | null) => {
  const t = String(v ?? "").trim();
  return t ? t : undefined;
};

export async function criarObra(formData: FormData) {
  const sessao = await lerSessao();
  if (!sessao) throw new Error("Não autenticado.");
  if (!temAcessoSecretaria(sessao, "obras")) throw new Error("Sem permissão para esta secretaria.");

  const dados = schemaObra.parse({
    nome: formData.get("nome"),
    bairro: texto(formData.get("bairro")),
    fornecedorNome: texto(formData.get("fornecedorNome")),
    progressoAtual: texto(formData.get("progressoAtual")) ?? null,
    valorContrato: valorEmReais(formData.get("valorContrato")),
    vigenciaInicio: texto(formData.get("vigenciaInicio")),
    vigenciaFim: texto(formData.get("vigenciaFim")),
    latitude: texto(formData.get("latitude")),
    longitude: texto(formData.get("longitude")),
    status: formData.get("status"),
  });
  // Uma coordenada sozinha não marca lugar nenhum.
  const temLocal = dados.latitude !== undefined && dados.longitude !== undefined;

  await db.insert(obras).values({
    id: gerarId("obra"),
    prefeituraId: sessao.prefeituraId,
    nome: dados.nome,
    bairro: dados.bairro ?? null,
    fornecedorNome: dados.fornecedorNome ?? null,
    progressoAtual: dados.progressoAtual,
    // Obsoleto: o esperado sai das datas (lib/obra-prazo.ts).
    progressoEsperado: 0,
    valorContrato: dados.valorContrato ?? null,
    vigenciaInicio: dados.vigenciaInicio ?? null,
    vigenciaFim: dados.vigenciaFim ?? null,
    latitude: temLocal ? dados.latitude! : null,
    longitude: temLocal ? dados.longitude! : null,
    status: dados.status,
  });

  await auditar(sessao, {
    acao: "criar",
    entidade: "obra",
    resumo: `"${dados.nome}" — ${dados.progressoAtual === null ? "sem medição" : `${dados.progressoAtual}% executado`}, ${dados.status}${dados.vigenciaFim ? `, término previsto ${dados.vigenciaFim}` : ""}`,
  });
  revalidatePath("/dashboard/secretarias/obras");
}

const schemaAtualizarProgresso = z.object({
  id: z.string(),
  // Vazio mantém a medição anterior (não vira 0%).
  progressoAtual: z.coerce.number().min(0).max(100).optional(),
  status: z.enum(["planejada", "em_andamento", "atrasada", "concluida", "paralisada"]),
  vigenciaInicio: dataIso,
  vigenciaFim: dataIso,
});

export async function atualizarProgressoObra(formData: FormData) {
  const sessao = await lerSessao();
  if (!sessao) throw new Error("Não autenticado.");
  if (!temAcessoSecretaria(sessao, "obras")) throw new Error("Sem permissão para esta secretaria.");

  const dados = schemaAtualizarProgresso.parse({
    id: formData.get("id"),
    progressoAtual: texto(formData.get("progressoAtual")),
    status: formData.get("status"),
    vigenciaInicio: texto(formData.get("vigenciaInicio")),
    vigenciaFim: texto(formData.get("vigenciaFim")),
  });
  if (dados.vigenciaInicio && dados.vigenciaFim && dados.vigenciaFim < dados.vigenciaInicio) {
    throw new Error("O término previsto não pode ser antes do início.");
  }

  await db
    .update(obras)
    .set({
      // atualizadoEm é a data da última medição (lib/obra-prazo.ts, "sem notícia"):
      // só muda quando há medição nova.
      ...(dados.progressoAtual !== undefined ? { progressoAtual: dados.progressoAtual, atualizadoEm: new Date().toISOString() } : {}),
      ...(dados.vigenciaInicio ? { vigenciaInicio: dados.vigenciaInicio } : {}),
      ...(dados.vigenciaFim ? { vigenciaFim: dados.vigenciaFim } : {}),
      status: dados.status,
    })
    .where(and(eq(obras.id, dados.id), eq(obras.prefeituraId, sessao.prefeituraId)));

  await auditar(sessao, {
    acao: "alterar",
    entidade: "obra",
    entidadeId: dados.id,
    resumo: [
      dados.progressoAtual !== undefined ? `progresso ${dados.progressoAtual}%` : null,
      `status ${dados.status}`,
      dados.vigenciaFim ? `término previsto ${dados.vigenciaFim}` : null,
    ]
      .filter(Boolean)
      .join(", "),
  });
  revalidatePath("/dashboard/secretarias/obras");
}

// ── EXCLUSÃO ──
// Não existia: dava para adicionar, nunca para tirar. Um cadastro duplicado
// ficava para sempre — e a lista com oito vezes a mesma obra deixa de
// ser confiável na primeira olhada.
//
// O WHERE inclui a prefeitura da sessão de propósito. O id sozinho viria do
// navegador, e um id de outra prefeitura apagaria dado alheio.
export async function excluirObra(id: string): Promise<{ erro: string | null }> {
  const sessao = await lerSessao();
  if (!sessao) return { erro: "Sessão expirada." };
  if (!temAcessoSecretaria(sessao, "obras")) return { erro: "Sem permissão." };

  const [antes] = await db
    .select({ nome: obras.nome })
    .from(obras)
    .where(and(eq(obras.id, id), eq(obras.prefeituraId, sessao.prefeituraId)))
    .limit(1);
  await db
    .delete(obras)
    .where(and(eq(obras.id, id), eq(obras.prefeituraId, sessao.prefeituraId)));

  await auditar(sessao, { acao: "excluir", entidade: "obra", entidadeId: id, resumo: antes?.nome ? `"${antes.nome}"` : `id ${id}` });
  revalidatePath("/dashboard/secretarias/obras");
  return { erro: null };
}

// ── AS OBRAS ENTRAM PELO CONTRATO ──
//
// Obra municipal não tem cadastro nacional obrigatório. O Obrasgov (ex-CIPI)
// existe, tem API pública e traz percentual aferido, paralisações e
// geolocalização — mas para município a adesão é FACULTATIVA, e dá para medir o
// peso disso: no Piauí, 9 de 400 projetos têm tomador municipal, e só 7 dos 224
// municípios do estado aparecem. Um módulo construído ali serviria 2% dos
// clientes.
//
// O contrato de obra, esse sim, é obrigatório no PNCP desde abril de 2024 e já
// está no banco depois da etapa de Licitações. Num município medido, 16 dos 134
// contratos são de Obras ou Serviços de Engenharia: R$ 9,4 milhões, com 10
// contratos de vigência já encerrada.

export type ResultadoImportacaoObras =
  | { ok: true; importados: number; atualizados: number }
  | { ok: false; erro: string };

export async function importarObrasDeContratos(
  prefeituraId: string
): Promise<ResultadoImportacaoObras> {
  const sessao = await exigirAcesso(prefeituraId);
  if (!sessao) return { ok: false, erro: "Sem acesso à pasta de Obras." };
  // Cargo de uma instalação só não altera o cadastro do município.
  if (sessao.cargo === "unidade" || sessao.cargo === "escola") {
    return { ok: false, erro: "Seu acesso não inclui alterar o cadastro." };
  }
  // O cargo alcança a pasta; falta saber se a prefeitura contratou o módulo.
  const plano = await exigirPlano(prefeituraId, "obras");
  if (!plano.ok) return { ok: false, erro: plano.erro };

  // Mesma gravação da rotina automática (lib/importacoes.ts).
  const r = await importarObrasDosContratos(prefeituraId);
  if (!r.ok) return r;
  const { importados, atualizados } = r;

  if (importados > 0 || atualizados > 0) revalidatePath("/dashboard/secretarias/obras");
  await auditar(sessao, {
    acao: "criar",
    entidade: "obra",
    resumo: `importação do PNCP: ${importados} obras novas, ${atualizados} com prazo atualizado`,
  });
  return { ok: true, importados, atualizados };
}

// ── REGISTRAR A DECISÃO SOBRE A OBRA ──
//
// Fecha o ciclo que o radar de prazo abria. O módulo apontava a obra cujo
// prazo acabou sem conclusão e parava ali; o gestor via o problema e não tinha
// onde registrar o que decidiu, nem a justificativa que o Tribunal de Contas
// pede depois.

export type ResultadoDecisao =
  | { ok: true }
  | { ok: false; erro: string; problemas?: { campo: string; mensagem: string }[] };

export async function registrarDecisaoObra(
  prefeituraId: string,
  entrada: {
    obraId: string;
    tipo: string;
    justificativa: string;
    novaPrevisao: string | null;
    documento: string | null;
  }
): Promise<ResultadoDecisao> {
  const sessao = await exigirAcesso(prefeituraId);
  if (!sessao) return { ok: false, erro: "Sem acesso à pasta de Obras." };
  if (sessao.cargo === "unidade" || sessao.cargo === "escola") {
    return { ok: false, erro: "Seu acesso não inclui decidir sobre obras do município." };
  }
  const plano = await exigirPlano(prefeituraId, "obras");
  if (!plano.ok) return { ok: false, erro: plano.erro };

  // A obra tem de ser desta prefeitura. Sem este filtro, um id adivinhado
  // registraria decisão em obra de outro município — e decisão com nome e
  // justificativa é documento, não dado solto.
  const [obra] = await db
    .select({ id: obras.id })
    .from(obras)
    .where(and(eq(obras.id, entrada.obraId), eq(obras.prefeituraId, prefeituraId)))
    .limit(1);
  if (!obra) return { ok: false, erro: "Obra não encontrada." };

  const tipo = entrada.tipo as TipoDecisaoObra;
  const problemas = validarDecisao({
    tipo,
    justificativa: entrada.justificativa,
    novaPrevisao: entrada.novaPrevisao,
  });
  if (problemas.length > 0) {
    return { ok: false, erro: "Confira os campos abaixo.", problemas };
  }

  await db.insert(decisoesObra).values({
    id: gerarId("dec"),
    prefeituraId,
    obraId: entrada.obraId,
    tipo,
    justificativa: entrada.justificativa.trim(),
    novaPrevisao: entrada.novaPrevisao,
    documento: entrada.documento?.trim() || null,
    decididoPor: sessao.nome,
    decididoEm: new Date().toISOString(),
  });

  // ── A DECISÃO QUE MEXE NA OBRA ──
  //
  // "Concluída" e "a data estava errada" não são só registro: mudam o dado.
  // Sem isso, o gestor registraria a conclusão e a obra continuaria gritando
  // na tela — e ele aprenderia que registrar não adianta.
  if (tipo === "concluida") {
    await db
      .update(obras)
      .set({ status: "concluida", progressoAtual: 100, atualizadoEm: new Date().toISOString() })
      .where(and(eq(obras.id, entrada.obraId), eq(obras.prefeituraId, prefeituraId)));
  } else if (tipo === "correcao_de_cadastro" && entrada.novaPrevisao) {
    await db
      .update(obras)
      .set({ vigenciaFim: entrada.novaPrevisao })
      .where(and(eq(obras.id, entrada.obraId), eq(obras.prefeituraId, prefeituraId)));
  }

  await auditar(sessao, {
    acao: "alterar",
    entidade: "obra",
    entidadeId: entrada.obraId,
    resumo: `decisão: ${tipo}${entrada.novaPrevisao ? ` — previsão ${entrada.novaPrevisao}` : ""}`,
  });
  revalidatePath("/dashboard/secretarias/obras");
  return { ok: true };
}

/** A decisão mais recente de cada obra da prefeitura. */
export async function buscarDecisoes(prefeituraId: string) {
  if (!(await exigirAcesso(prefeituraId))) return new Map<string, DecisaoObra>();
  try {
    const linhas = await db
      .select()
      .from(decisoesObra)
      .where(eq(decisoesObra.prefeituraId, prefeituraId))
      .orderBy(desc(decisoesObra.decididoEm));
    // A primeira de cada obra é a mais recente, porque a consulta já veio
    // ordenada do mais novo para o mais velho.
    const mapa = new Map<string, DecisaoObra>();
    for (const l of linhas) {
      if (mapa.has(l.obraId)) continue;
      mapa.set(l.obraId, {
        tipo: l.tipo,
        justificativa: l.justificativa,
        novaPrevisao: l.novaPrevisao,
        documento: l.documento,
        decididoPor: l.decididoPor,
        decididoEm: l.decididoEm,
      });
    }
    return mapa;
  } catch (e) {
    console.error("[obras] leitura de decisões:", e);
    return new Map<string, DecisaoObra>();
  }
}
