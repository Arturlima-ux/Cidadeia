import { and, desc, eq, inArray, isNotNull, like, lt, notInArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { alertas, atendimentos, pedidoEventos, pedidosProposta, prefeituras, usuarios } from "@/db/schema";
import { gerarId } from "@/lib/id";
import { enviarEmail } from "@/lib/email";
import { destinoDaEquipe } from "@/lib/contato-comercial";
import { planosContratadosDe } from "@/lib/planos";
import { PREFEITURAS_INTERNAS } from "@/lib/prefeituras-internas";
import { ID_PREFEITURA_DEMO } from "@/lib/demo/prefeitura-demo";
import { situacaoDaPrefeitura } from "@/lib/cobranca-servidor";
import { avaliarPrazo } from "@/lib/prazo-atendimento";
import type { StatusAtendimento, TipoAtendimento } from "@/lib/atendimento";
import { EVENTO_FALHOU, EVENTO_OK, FONTES, type Fonte } from "@/lib/importacao-automatica";
import {
  DIAS_ALERTA_PARADO,
  EVENTO_ACESSO,
  parouDeImportar,
  riscoDe,
  sinaisDoCliente,
  type FatosDoCliente,
  type Risco,
  type Sinal,
} from "@/lib/saude-do-cliente";

// ── A COLETA DOS SINAIS, O REGISTRO DE ACESSO E O E-MAIL DA EQUIPE ──
// (as regras estão em saude-do-cliente.ts)

/**
 * Uma linha por pessoa por dia: o id é determinístico, e a segunda abertura
 * do dia não grava nada. Chamado depois da resposta (after), no layout do
 * painel: não custa nada a quem está usando.
 */
export async function registrarAcesso(s: { prefeituraId: string; usuarioId: string; cargo: string; demo?: boolean }) {
  if (s.demo || PREFEITURAS_INTERNAS.includes(s.prefeituraId) || s.prefeituraId === ID_PREFEITURA_DEMO) return;
  const dia = new Date().toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });
  try {
    await db
      .insert(pedidoEventos)
      .values({
        id: `acesso:${s.prefeituraId}:${dia}:${s.usuarioId}`,
        pedidoId: `acesso:${s.prefeituraId}`,
        tipo: EVENTO_ACESSO,
        descricao: s.cargo,
        autor: s.usuarioId,
      })
      .onConflictDoNothing();
  } catch (e) {
    console.error("[acesso] não registrado:", e);
  }
}

export type SaudeDoCliente = { id: string; municipio: string; uf: string; risco: Risco; sinais: Sinal[]; ultimoAcesso: string | null };

export async function saudeDosClientes(hoje: Date = new Date()): Promise<SaudeDoCliente[]> {
  const todas = await db
    .select({ id: prefeituras.id, municipio: prefeituras.municipio, uf: prefeituras.estado, planos: prefeituras.planosContratados })
    .from(prefeituras)
    .where(notInArray(prefeituras.id, [...PREFEITURAS_INTERNAS, ID_PREFEITURA_DEMO]));
  const clientes = todas.filter((p) => planosContratadosDe(p.planos).length > 0);
  if (!clientes.length) return [];
  const ids = clientes.map((c) => c.id);
  const limiteParado = new Date(hoje.getTime() - DIAS_ALERTA_PARADO * 86_400_000).toISOString().slice(0, 10);

  const [acessos, pessoas, parados, abertas, importacoes, pedidos] = await Promise.all([
    // O último acesso de cada prefeitura, e o último do gabinete.
    db
      .select({
        pedidoId: pedidoEventos.pedidoId,
        em: sql<string>`max(${pedidoEventos.criadoEm})`,
        gabinete: sql<string | null>`max(case when ${pedidoEventos.descricao} in ('prefeito','admin') then ${pedidoEventos.criadoEm} end)`,
      })
      .from(pedidoEventos)
      .where(and(eq(pedidoEventos.tipo, EVENTO_ACESSO), inArray(pedidoEventos.pedidoId, ids.map((i) => `acesso:${i}`))))
      .groupBy(pedidoEventos.pedidoId),
    db.select({ prefeituraId: usuarios.prefeituraId, email: usuarios.email }).from(usuarios).where(inArray(usuarios.prefeituraId, ids)),
    db
      .select({ prefeituraId: alertas.prefeituraId })
      .from(alertas)
      .where(and(inArray(alertas.prefeituraId, ids), eq(alertas.resolvido, false), eq(alertas.prioridade, "urgente"), lt(alertas.createdAt, limiteParado))),
    db
      .select({
        prefeituraId: atendimentos.prefeituraId,
        tipo: atendimentos.tipo,
        status: atendimentos.status,
        abertoEm: atendimentos.createdAt,
        prorrogado: atendimentos.prazoProrrogado,
      })
      .from(atendimentos)
      .where(and(inArray(atendimentos.prefeituraId, ids), inArray(atendimentos.status, ["aberto", "em_analise"]))),
    db
      .select({ pedidoId: pedidoEventos.pedidoId, tipo: pedidoEventos.tipo })
      .from(pedidoEventos)
      .where(and(like(pedidoEventos.pedidoId, "importacao:%"), inArray(pedidoEventos.tipo, [EVENTO_OK, EVENTO_FALHOU])))
      .orderBy(desc(pedidoEventos.criadoEm))
      .limit(5000),
    db
      .select({ prefeituraId: pedidosProposta.prefeituraId, contratadoEm: pedidosProposta.contratadoEm })
      .from(pedidosProposta)
      .where(and(inArray(pedidosProposta.prefeituraId, ids), isNotNull(pedidosProposta.contratadoEm))),
  ]);

  const saida: SaudeDoCliente[] = [];
  for (const c of clientes) {
    const acesso = acessos.find((a) => a.pedidoId === `acesso:${c.id}`);
    const gente = pessoas.filter((p) => p.prefeituraId === c.id);
    const tentativasPorFonte = new Map<Fonte, ("ok" | "falhou")[]>();
    for (const i of importacoes) {
      const [, pref, fonte] = i.pedidoId.split(":");
      if (pref !== c.id) continue;
      const l = tentativasPorFonte.get(fonte as Fonte) ?? [];
      l.push(i.tipo === EVENTO_OK ? "ok" : "falhou");
      tentativasPorFonte.set(fonte as Fonte, l);
    }
    const situacao = await situacaoDaPrefeitura(c.id);
    const contratado = pedidos.filter((p) => p.prefeituraId === c.id).map((p) => p.contratadoEm!).sort().pop() ?? null;
    let fimDoContrato: string | null = null;
    if (contratado) {
      const d = new Date(`${contratado.slice(0, 10)}T12:00:00Z`);
      d.setUTCFullYear(d.getUTCFullYear() + 1);
      fimDoContrato = d.toISOString().slice(0, 10);
    }

    const fatos: FatosDoCliente = {
      municipio: c.municipio,
      uf: c.uf,
      ultimoAcesso: acesso?.em ?? null,
      ultimoAcessoGestor: acesso?.gabinete ?? null,
      usuarios: gente.length,
      usuariosComEmail: gente.filter((p) => p.email).length,
      urgentesParados: parados.filter((p) => p.prefeituraId === c.id).length,
      manifestacoesVencidas: abertas
        .filter((a) => a.prefeituraId === c.id)
        .filter(
          (a) =>
            avaliarPrazo({ tipo: a.tipo as TipoAtendimento, status: a.status as StatusAtendimento, abertoEm: a.abertoEm, prorrogado: a.prorrogado }, hoje)
              .situacao === "vencido"
        ).length,
      fontesParadas: [...tentativasPorFonte]
        .filter(([, t]) => parouDeImportar(t))
        .map(([f]) => FONTES.find((x) => x.fonte === f)?.nome ?? f),
      diasDeAtraso: situacao.tipo === "vencida" || situacao.tipo === "travada" ? situacao.diasAtraso : 0,
      fimDoContrato,
    };
    const sinais = sinaisDoCliente(fatos, hoje);
    saida.push({ id: c.id, municipio: c.municipio, uf: c.uf, risco: riscoDe(sinais), sinais, ultimoAcesso: fatos.ultimoAcesso });
  }
  const ordem: Record<Risco, number> = { alto: 0, medio: 1, baixo: 2 };
  return saida.sort((a, b) => ordem[a.risco] - ordem[b.risco] || b.sinais.length - a.sinais.length);
}

const esc = (t: string) => t.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] ?? c);

/** Toda segunda, junto da Segunda do prefeito: a lista de quem pede ligação. Só sai se alguém estiver em risco. */
export async function avisarEquipeDoRisco(hoje: Date = new Date()): Promise<{ emRisco: number; enviado: boolean }> {
  const idEnvio = `risco:${hoje.toISOString().slice(0, 10)}`;
  const [ja] = await db.select({ id: pedidoEventos.id }).from(pedidoEventos).where(eq(pedidoEventos.pedidoId, idEnvio)).limit(1);
  if (ja) return { emRisco: 0, enviado: false };

  const lista = (await saudeDosClientes(hoje)).filter((c) => c.risco !== "baixo");
  if (!lista.length) return { emRisco: 0, enviado: false };
  const base = process.env.APP_URL ?? "https://cidadeia.vercel.app";
  const altos = lista.filter((c) => c.risco === "alto").length;
  const html = [
    `<p><strong>Clientes que pedem uma ligação esta semana.</strong></p>`,
    ...lista.map(
      (c) =>
        `<p><strong>${esc(c.municipio)}/${c.uf}</strong> · risco ${c.risco === "alto" ? "ALTO" : "médio"}<br>${c.sinais.map((s) => `– ${esc(s.texto)}`).join("<br>")}</p>`
    ),
    `<p><a href="${base}/admin/clientes">Ver todos os clientes</a></p>`,
  ].join("\n");
  const envio = await enviarEmail({
    para: destinoDaEquipe(),
    assunto: `Risco de cancelamento: ${altos ? `${altos} alto${altos > 1 ? "s" : ""}, ` : ""}${lista.length} no total`,
    html,
  });
  await db.insert(pedidoEventos).values({
    id: gerarId("pev"),
    pedidoId: idEnvio,
    tipo: "risco_enviado",
    descricao: JSON.stringify(lista.map((c) => ({ id: c.id, risco: c.risco }))),
    autor: "saúde do cliente",
  });
  return { emRisco: lista.length, enviado: envio.enviado };
}
