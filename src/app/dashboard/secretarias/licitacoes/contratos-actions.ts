"use server";

import { db } from "@/db";
import { contratos, prefeituras } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { lerSessao, temAcessoSecretaria } from "@/lib/sessao";
import { limitarUso } from "@/lib/rate-limit";
import { buscarContratosPncp, type ContratoPncp } from "@/lib/contratos-pncp";
import { randomUUID } from "node:crypto";

/**
 * Lê os contratos já guardados. Usada pela tela, que é componente de servidor.
 *
 * A guarda mora aqui e não no chamador, pela mesma razão registrada em
 * lib/rede-educacao.ts: contextoDashboard() garante sessão e plano, mas NÃO
 * garante acesso à pasta. Sem esta checagem, um secretário de Obras abriria a
 * rota e receberia os contratos de Licitações.
 */
export async function buscarContratos(prefeituraId: string) {
  const sessao = await lerSessao();
  if (!sessao || sessao.prefeituraId !== prefeituraId) return [];
  if (!temAcessoSecretaria(sessao, "licitacoes")) return [];
  if (sessao.cargo === "unidade" || sessao.cargo === "escola") return [];

  try {
    return await db.select().from(contratos).where(eq(contratos.prefeituraId, prefeituraId));
  } catch (e) {
    // Banco fora não pode virar tela de erro: a seção some e o resto da página
    // continua. Um catch mudo já escondeu uma queda de banco por dias neste
    // projeto, então o erro vai para o log.
    console.error("[contratos] leitura:", e);
    return [];
  }
}

export type ResultadoImportacaoContratos =
  | { ok: true; importados: number; anos: number[]; completa: boolean }
  | { ok: false; erro: string };

/**
 * Traz do PNCP os contratos do município.
 *
 * ── POR QUE VARRE DOIS ANOS ──
 *
 * O filtro do portal é por data de PUBLICAÇÃO, não por vigência. Nos dados
 * reais de um município, a consulta de 2026 devolveu contratos assinados em
 * novembro de 2025 — e são justamente esses, os antigos ainda vigentes, que
 * interessam ao radar de vencimento. Varrer só o ano corrente perderia
 * contratos que vencem neste mês.
 */
export async function importarContratosDoPncp(ano: number): Promise<ResultadoImportacaoContratos> {
  const sessao = await lerSessao();
  if (!sessao) return { ok: false, erro: "Sessão expirada. Entre novamente." };
  if (!temAcessoSecretaria(sessao, "licitacoes")) {
    return { ok: false, erro: "Sem acesso à pasta de Licitações." };
  }
  if (sessao.cargo === "unidade" || sessao.cargo === "escola") {
    return { ok: false, erro: "Seu acesso não inclui alterar o cadastro." };
  }

  const podeUsar = await limitarUso(`contratos-pncp:${sessao.prefeituraId}`, 6, 10);
  if (!podeUsar) {
    return { ok: false, erro: "Muitas importações seguidas. Aguarde alguns minutos." };
  }

  const [prefeitura] = await db
    .select({ cnpj: prefeituras.cnpj })
    .from(prefeituras)
    .where(eq(prefeituras.id, sessao.prefeituraId))
    .limit(1);
  if (!prefeitura?.cnpj) {
    return { ok: false, erro: "O CNPJ do município não está cadastrado." };
  }

  const anos = [ano, ano - 1];
  const doPortal = new Map<string, ContratoPncp>();
  let completa = true;

  for (const a of anos) {
    const r = await buscarContratosPncp(prefeitura.cnpj, a);
    if (!r.ok) return { ok: false, erro: r.erro };
    if (!r.completa) completa = false;
    // O mesmo contrato pode vir nas duas varreduras; a chave do portal desempata.
    for (const c of r.contratos) doPortal.set(c.numeroControlePncp, c);
  }

  const jaTem = new Set(
    (
      await db
        .select({ chave: contratos.numeroControlePncp })
        .from(contratos)
        .where(eq(contratos.prefeituraId, sessao.prefeituraId))
    )
      .map((r) => r.chave)
      .filter((x): x is string => !!x)
  );

  const novos = [...doPortal.values()].filter((c) => !jaTem.has(c.numeroControlePncp));
  if (novos.length === 0) return { ok: true, importados: 0, anos, completa };

  await db.insert(contratos).values(
    novos.map((c) => ({
      id: randomUUID(),
      prefeituraId: sessao.prefeituraId,
      numeroControlePncp: c.numeroControlePncp,
      numeroControlePncpCompra: c.numeroControlePncpCompra,
      numeroContrato: c.numeroContrato,
      processo: c.processo,
      objeto: c.objeto,
      fornecedorDocumento: c.fornecedorDocumento,
      fornecedorNome: c.fornecedorNome,
      fornecedorTipoPessoa: c.fornecedorTipoPessoa,
      valorInicial: c.valorInicial,
      valorGlobal: c.valorGlobal,
      dataAssinatura: c.dataAssinatura,
      vigenciaInicio: c.vigenciaInicio,
      vigenciaFim: c.vigenciaFim,
      tipoContrato: c.tipoContrato,
      categoria: c.categoria,
      frutoAdesao: c.frutoAdesao,
      numeroRetificacao: c.numeroRetificacao,
      origem: "pncp" as const,
    }))
  );

  return { ok: true, importados: novos.length, anos, completa };
}

/** Remove um contrato do cadastro. */
export async function excluirContrato(id: string): Promise<{ ok: boolean; erro?: string }> {
  const sessao = await lerSessao();
  if (!sessao) return { ok: false, erro: "Sessão expirada." };
  if (!temAcessoSecretaria(sessao, "licitacoes")) return { ok: false, erro: "Sem acesso." };
  if (sessao.cargo === "unidade" || sessao.cargo === "escola") {
    return { ok: false, erro: "Seu acesso não inclui alterar o cadastro." };
  }
  // O id sozinho não basta: sem o filtro de prefeitura, um id adivinhado
  // apagaria contrato de outro município.
  await db.delete(contratos).where(and(eq(contratos.id, id), eq(contratos.prefeituraId, sessao.prefeituraId)));
  return { ok: true };
}
