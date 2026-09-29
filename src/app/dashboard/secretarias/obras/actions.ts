"use server";

import { auditar } from "@/lib/auditoria";
import { z } from "zod";
import { db } from "@/db";
import { obras, contratos } from "@/db/schema";
import { and, eq, desc } from "drizzle-orm";
import { gerarId } from "@/lib/id";
import { LIMITES_BRASIL } from "@/lib/coordenadas";
import { lerSessao, temAcessoSecretaria } from "@/lib/sessao";
import { ehObraOuEngenharia } from "@/lib/obra-prazo";
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
