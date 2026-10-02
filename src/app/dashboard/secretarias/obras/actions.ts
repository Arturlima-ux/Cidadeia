"use server";

import { auditar } from "@/lib/auditoria";
import { z } from "zod";
import { db } from "@/db";
import { obras, contratos, decisoesObra } from "@/db/schema";
import { and, eq, desc } from "drizzle-orm";
import { validarDecisao, type TipoDecisaoObra, type DecisaoObra } from "@/lib/decisao-obra";
import { gerarId } from "@/lib/id";
import { LIMITES_BRASIL } from "@/lib/coordenadas";
import { lerSessao, temAcessoSecretaria } from "@/lib/sessao";
import { ehObraOuEngenharia } from "@/lib/obra-prazo";
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

const schemaObra = z.object({
  nome: z.string().min(2, "Informe o nome da obra."),
  bairro: z.string().optional(),
  progressoAtual: z.coerce.number().min(0).max(100).default(0),
  progressoEsperado: z.coerce.number().min(0).max(100).default(0),
  valorContrato: z.coerce.number().optional(),
  // Caixa do Brasil, não o mundo: pega latitude e longitude trocadas, que
  // antes passavam e caíam no oceano (src/lib/coordenadas.ts).
  latitude: z.coerce.number().min(LIMITES_BRASIL.latitude.min).max(LIMITES_BRASIL.latitude.max).optional(),
  longitude: z.coerce.number().min(LIMITES_BRASIL.longitude.min).max(LIMITES_BRASIL.longitude.max).optional(),
  status: z.enum(["planejada", "em_andamento", "atrasada", "concluida", "paralisada"]),
});

export async function criarObra(formData: FormData) {
  const sessao = await lerSessao();
  if (!sessao) throw new Error("Não autenticado.");
  if (!temAcessoSecretaria(sessao, "obras")) throw new Error("Sem permissão para esta secretaria.");

  const dados = schemaObra.parse({
    nome: formData.get("nome"),
    bairro: formData.get("bairro") || undefined,
    progressoAtual: formData.get("progressoAtual") || 0,
    progressoEsperado: formData.get("progressoEsperado") || 0,
    valorContrato: formData.get("valorContrato") || undefined,
    latitude: formData.get("latitude") || undefined,
    longitude: formData.get("longitude") || undefined,
    status: formData.get("status"),
  });

  await db.insert(obras).values({
    id: gerarId("obra"),
    prefeituraId: sessao.prefeituraId,
    nome: dados.nome,
    bairro: dados.bairro ?? null,
    progressoAtual: dados.progressoAtual,
    progressoEsperado: dados.progressoEsperado,
    valorContrato: dados.valorContrato ?? null,
    latitude: dados.latitude ?? null,
    longitude: dados.longitude ?? null,
    status: dados.status,
  });

  await auditar(sessao, { acao: "criar", entidade: "obra", resumo: `"${dados.nome}" — ${dados.progressoAtual}% executado, ${dados.status}` });
  revalidatePath("/dashboard/secretarias/obras");
}

const schemaAtualizarProgresso = z.object({
  id: z.string(),
  progressoAtual: z.coerce.number().min(0).max(100),
  status: z.enum(["planejada", "em_andamento", "atrasada", "concluida", "paralisada"]),
});

export async function atualizarProgressoObra(formData: FormData) {
  const sessao = await lerSessao();
  if (!sessao) throw new Error("Não autenticado.");
  if (!temAcessoSecretaria(sessao, "obras")) throw new Error("Sem permissão para esta secretaria.");

  const dados = schemaAtualizarProgresso.parse({
    id: formData.get("id"),
    progressoAtual: formData.get("progressoAtual"),
    status: formData.get("status"),
  });

  await db
    .update(obras)
    .set({
      progressoAtual: dados.progressoAtual,
      status: dados.status,
      atualizadoEm: new Date().toISOString(),
    })
    .where(and(eq(obras.id, dados.id), eq(obras.prefeituraId, sessao.prefeituraId)));

  await auditar(sessao, { acao: "alterar", entidade: "obra", entidadeId: dados.id, resumo: `progresso ${dados.progressoAtual}%, status ${dados.status}` });
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

  const todosContratos = await db
    .select()
    .from(contratos)
    .where(eq(contratos.prefeituraId, prefeituraId));

  const deObra = todosContratos.filter((c) => ehObraOuEngenharia(c.categoria));
  if (deObra.length === 0) return { ok: true, importados: 0, atualizados: 0 };

  const existentes = new Map(
    (await db.select().from(obras).where(eq(obras.prefeituraId, prefeituraId)))
      .filter((o) => o.numeroControlePncpContrato)
      .map((o) => [o.numeroControlePncpContrato!, o])
  );

  let importados = 0;
  let atualizados = 0;

  for (const c of deObra) {
    if (!c.numeroControlePncp) continue;
    const jaTem = existentes.get(c.numeroControlePncp);

    if (jaTem) {
      // ── POR QUE ATUALIZAR, E O QUE NÃO ATUALIZAR ──
      //
      // Termo aditivo de prazo muda a vigência do contrato. Se a obra guardasse
      // a data da primeira importação, o radar acusaria como vencida uma obra
      // que foi legitimamente prorrogada — e essa é a acusação mais cara que
      // este módulo pode fazer.
      //
      // O progresso NÃO é tocado: ele é medição da prefeitura, não do portal.
      if (
        jaTem.vigenciaInicio !== c.vigenciaInicio ||
        jaTem.vigenciaFim !== c.vigenciaFim ||
        jaTem.valorContrato !== c.valorGlobal
      ) {
        await db
          .update(obras)
          .set({
            vigenciaInicio: c.vigenciaInicio,
            vigenciaFim: c.vigenciaFim,
            valorContrato: c.valorGlobal,
            fornecedorNome: c.fornecedorNome,
          })
          .where(and(eq(obras.id, jaTem.id), eq(obras.prefeituraId, prefeituraId)));
        atualizados++;
      }
      continue;
    }

    await db.insert(obras).values({
      id: gerarId("obra"),
      prefeituraId,
      // O objeto do contrato é longo; a tela mostra o nome e o objeto inteiro
      // fica no campo do contrato, que a junção alcança.
      nome: c.objeto.slice(0, 160),
      valorContrato: c.valorGlobal,
      numeroControlePncpContrato: c.numeroControlePncp,
      vigenciaInicio: c.vigenciaInicio,
      vigenciaFim: c.vigenciaFim,
      fornecedorNome: c.fornecedorNome,
      origem: "pncp" as const,
      // ── NULL, E NÃO ZERO ──
      // Ninguém mediu esta obra ainda. Entrar com 0% afirmaria progresso zero
      // sobre obra que pode estar em 90%, e o alerta de atraso sairia contra a
      // prefeitura por um número que o software inventou.
      progressoAtual: null,
      status: "em_andamento" as const,
    });
    importados++;
  }

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
