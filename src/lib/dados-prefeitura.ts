import { db } from "@/db";
import {
  prefeituras,
  dashboardSnapshots,
  alertas,
  alertasSugeridos,
  sistemasConectados,
  saudeIndicadores,
  unidadesSaude,
  educacaoIndicadores,
  escolas,
  obras,
  licitacoes,
  usuarios,
} from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";

export async function buscarPrefeitura(prefeituraId: string) {
  const linhas = await db
    .select()
    .from(prefeituras)
    .where(eq(prefeituras.id, prefeituraId))
    .limit(1);
  return linhas[0] ?? null;
}

export async function buscarUltimoSnapshot(prefeituraId: string) {
  const linhas = await db
    .select()
    .from(dashboardSnapshots)
    .where(eq(dashboardSnapshots.prefeituraId, prefeituraId))
    .orderBy(desc(dashboardSnapshots.atualizadoEm))
    .limit(1);
  return linhas[0] ?? null;
}

export async function buscarAlertas(prefeituraId: string) {
  return db
    .select()
    .from(alertas)
    .where(eq(alertas.prefeituraId, prefeituraId))
    .orderBy(desc(alertas.createdAt));
}

export async function buscarSugestoesAlertasPendentes(prefeituraId: string) {
  return db
    .select()
    .from(alertasSugeridos)
    .where(
      and(
        eq(alertasSugeridos.prefeituraId, prefeituraId),
        eq(alertasSugeridos.status, "pendente")
      )
    )
    .orderBy(desc(alertasSugeridos.createdAt));
}

export async function buscarSistemasConectados(prefeituraId: string) {
  return db
    .select()
    .from(sistemasConectados)
    .where(eq(sistemasConectados.prefeituraId, prefeituraId));
}

// ── SAÚDE ──
export async function buscarUltimoIndicadorSaude(prefeituraId: string) {
  const linhas = await db
    .select()
    .from(saudeIndicadores)
    .where(eq(saudeIndicadores.prefeituraId, prefeituraId))
    .orderBy(desc(saudeIndicadores.atualizadoEm))
    .limit(1);
  return linhas[0] ?? null;
}

export async function buscarUnidadesSaude(prefeituraId: string) {
  return db
    .select()
    .from(unidadesSaude)
    .where(eq(unidadesSaude.prefeituraId, prefeituraId))
    .orderBy(desc(unidadesSaude.createdAt));
}

// ── EDUCAÇÃO ──
export async function buscarUltimoIndicadorEducacao(prefeituraId: string) {
  const linhas = await db
    .select()
    .from(educacaoIndicadores)
    .where(eq(educacaoIndicadores.prefeituraId, prefeituraId))
    .orderBy(desc(educacaoIndicadores.atualizadoEm))
    .limit(1);
  return linhas[0] ?? null;
}

export async function buscarEscolas(prefeituraId: string) {
  return db
    .select()
    .from(escolas)
    .where(eq(escolas.prefeituraId, prefeituraId))
    .orderBy(desc(escolas.createdAt));
}

// ── OBRAS ──
export async function buscarObras(prefeituraId: string) {
  return db
    .select()
    .from(obras)
    .where(eq(obras.prefeituraId, prefeituraId))
    .orderBy(desc(obras.createdAt));
}

// ── LICITAÇÕES ──
export async function buscarLicitacoes(prefeituraId: string) {
  return db
    .select()
    .from(licitacoes)
    .where(eq(licitacoes.prefeituraId, prefeituraId))
    .orderBy(desc(licitacoes.createdAt));
}

// ── USUÁRIOS ──
export async function buscarUsuarios(prefeituraId: string) {
  return db
    .select({
      id: usuarios.id,
      nome: usuarios.nome,
      cpfCnpj: usuarios.cpfCnpj,
      email: usuarios.email,
      cargo: usuarios.cargo,
      secretaria: usuarios.secretaria,
      createdAt: usuarios.createdAt,
    })
    .from(usuarios)
    .where(eq(usuarios.prefeituraId, prefeituraId))
    .orderBy(desc(usuarios.createdAt));
}

export async function buscarUsuarioPorId(usuarioId: string) {
  const linhas = await db
    .select({
      id: usuarios.id,
      nome: usuarios.nome,
      cpfCnpj: usuarios.cpfCnpj,
      email: usuarios.email,
      celular: usuarios.celular,
      fotoUrl: usuarios.fotoUrl,
      cargo: usuarios.cargo,
      secretaria: usuarios.secretaria,
    })
    .from(usuarios)
    .where(eq(usuarios.id, usuarioId))
    .limit(1);
  return linhas[0] ?? null;
}

// ── HISTÓRICO (para gráficos de tendência reais) ──
export async function buscarHistoricoSnapshots(prefeituraId: string) {
  return db
    .select()
    .from(dashboardSnapshots)
    .where(eq(dashboardSnapshots.prefeituraId, prefeituraId))
    .orderBy(dashboardSnapshots.atualizadoEm);
}

export async function buscarHistoricoSaude(prefeituraId: string) {
  return db
    .select()
    .from(saudeIndicadores)
    .where(eq(saudeIndicadores.prefeituraId, prefeituraId))
    .orderBy(saudeIndicadores.atualizadoEm);
}

export async function buscarHistoricoEducacao(prefeituraId: string) {
  return db
    .select()
    .from(educacaoIndicadores)
    .where(eq(educacaoIndicadores.prefeituraId, prefeituraId))
    .orderBy(educacaoIndicadores.atualizadoEm);
}
