import { and, eq, inArray, isNotNull, like, notInArray, or, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  alertas,
  auditoria,
  buscaAtiva,
  contratos,
  escolas,
  estoqueSaude,
  licitacoes,
  pedidoEventos,
  prefeituras,
  unidadesSaude,
  usuarios,
} from "@/db/schema";
import { gerarId } from "@/lib/id";
import { repartirAvisos } from "@/lib/alerta-por-area";
import { enviarEmail } from "@/lib/email";
import { linkApp } from "@/lib/url-app";
import { planosContratadosDe } from "@/lib/planos";
import { PREFEITURAS_INTERNAS } from "@/lib/prefeituras-internas";
import { gerarDeteccoesDaRotina } from "@/lib/ia";
import { detectarPadroes } from "@/lib/padroes-licitacoes";
import type { DeteccaoAutomatica } from "@/lib/deteccao-automatica";
import { lerEmendas } from "@/lib/emendas-pix-servidor";
import { lerObrasFederais } from "@/lib/obras-federais-servidor";
import { lerArboviroses } from "@/lib/arboviroses-servidor";
import { achadosDosMinimosAutomaticos } from "@/lib/minimos-automaticos";
import { achadosDasArboviroses } from "@/lib/arboviroses";
import { achadosDasObrasFederais } from "@/lib/obras-federais";
import { ehObraOuEngenharia } from "@/lib/obra-prazo";
import { radarDaPrefeitura } from "@/lib/radar-transparencia-servidor";
import { achadosDoRadar } from "@/lib/radar-transparencia";
import { achadosDasEmendas } from "@/lib/emendas-pix";
import {
  EVENTO_REGRA_ENCERRADA,
  achadosDaBuscaAtiva,
  achadosDoEstoque,
  achadosDosAditivos,
  achadosDosContratos,
  achadosDosPadroes,
  chaveDoAchado,
  emailDaVigia,
  idDoAlerta,
  planejar,
  prefixoDaPrefeitura,
  type AchadoComId,
  type AlertaExistente,
} from "@/lib/vigia-dos-modulos";

// ── A ROTINA DIÁRIA DA VIGIA DOS MÓDULOS ──
// Ver vigia-dos-modulos.ts para o que ela procura e como decide.

/** Tudo o que as regras acham hoje numa prefeitura. `completo` é falso se alguma fonte falhou. */
export async function achadosDaPrefeitura(
  prefeituraId: string,
  planosRaw: string,
  hoje: Date = new Date()
): Promise<{ achados: DeteccaoAutomatica[]; completo: boolean; erros: string[] }> {
  const planos = planosContratadosDe(planosRaw);
  const erros: string[] = [];
  const fontes: Promise<DeteccaoAutomatica[]>[] = [gerarDeteccoesDaRotina(prefeituraId)];

  if (planos.includes("licitacoes")) {
    fontes.push(
      (async () => {
        const [lista, cts] = await Promise.all([
          db.select().from(licitacoes).where(eq(licitacoes.prefeituraId, prefeituraId)),
          db.select().from(contratos).where(eq(contratos.prefeituraId, prefeituraId)),
        ]);
        return [...achadosDosContratos(cts, hoje), ...achadosDosPadroes(detectarPadroes(lista, hoje, cts)), ...achadosDosAditivos(cts)];
      })()
    );
  } else if (planos.includes("obras")) {
    // Sem Licitações, a vigia de aditivos olha só os contratos de obra.
    fontes.push(
      db
        .select()
        .from(contratos)
        .where(eq(contratos.prefeituraId, prefeituraId))
        .then((cts) => achadosDosAditivos(cts.filter((c) => ehObraOuEngenharia(c.categoria))))
    );
  }
  // Obras federais do ObrasGov (lib/obras-federais.ts): cada plano vê as da sua área.
  if (planos.includes("obras") || planos.includes("saude") || planos.includes("educacao")) {
    fontes.push(
      lerObrasFederais(prefeituraId).then((r) =>
        r
          ? achadosDasObrasFederais(r.obras, hoje).filter(
              (a) => planos.includes("obras") || (a.secretaria !== null && planos.includes(a.secretaria as "saude" | "educacao"))
            )
          : []
      )
    );
  }
  if (planos.includes("essencial")) {
    fontes.push(radarDaPrefeitura(prefeituraId, hoje).then(achadosDoRadar));
  }
  if (planos.includes("gestao")) {
    fontes.push(lerEmendas(prefeituraId).then((r) => (r ? achadosDasEmendas(r.emendas, hoje) : [])));
  }
  const areasDosMinimos = (["saude", "educacao"] as const).filter((a) => planos.includes(a) || planos.includes("gestao"));
  if (areasDosMinimos.length) {
    fontes.push(achadosDosMinimosAutomaticos(prefeituraId, [...areasDosMinimos], hoje.getUTCFullYear()));
  }
  if (planos.includes("saude")) {
    fontes.push(lerArboviroses(prefeituraId).then((r) => (r ? achadosDasArboviroses(r.foto) : [])));
    fontes.push(
      (async () => {
        const linhas = await db
          .select({
            item: estoqueSaude.item,
            categoria: estoqueSaude.categoria,
            saldo: estoqueSaude.saldo,
            consumoMensal: estoqueSaude.consumoMensal,
            atualizadoEm: estoqueSaude.atualizadoEm,
            unidadeNome: unidadesSaude.nome,
          })
          .from(estoqueSaude)
          .innerJoin(unidadesSaude, eq(unidadesSaude.id, estoqueSaude.unidadeId))
          .where(eq(estoqueSaude.prefeituraId, prefeituraId));
        return achadosDoEstoque(linhas, hoje);
      })()
    );
  }
  if (planos.includes("educacao")) {
    fontes.push(
      (async () => {
        const casos = await db
          .select({
            situacao: buscaAtiva.situacao,
            ultimaPresenca: buscaAtiva.ultimaPresenca,
            conselhoTutelarEm: buscaAtiva.conselhoTutelarEm,
            faltas: buscaAtiva.faltas,
            aulasPeriodo: buscaAtiva.aulasPeriodo,
            escolaNome: escolas.nome,
          })
          .from(buscaAtiva)
          .innerJoin(escolas, eq(escolas.id, buscaAtiva.escolaId))
          .where(eq(buscaAtiva.prefeituraId, prefeituraId));
        return achadosDaBuscaAtiva(casos, hoje);
      })()
    );
  }

  const resultados = await Promise.allSettled(fontes);
  const achados: DeteccaoAutomatica[] = [];
  for (const r of resultados) {
    if (r.status === "fulfilled") achados.push(...r.value);
    else erros.push(r.reason instanceof Error ? r.reason.message : String(r.reason));
  }
  return { achados, completo: erros.length === 0, erros };
}

async function alertasExistentes(prefeituraId: string): Promise<AlertaExistente[]> {
  const linhas = await db
    .select({ id: alertas.id, prioridade: alertas.prioridade, resolvido: alertas.resolvido })
    .from(alertas)
    .where(and(eq(alertas.prefeituraId, prefeituraId), like(alertas.id, `${prefixoDaPrefeitura(prefeituraId)}%`)));
  if (!linhas.length) return [];
  const ids = linhas.map((l) => l.id);
  const [manuais, encerrados] = await Promise.all([
    db
      .select({ id: auditoria.entidadeId, em: sql<string>`max(${auditoria.createdAt})` })
      .from(auditoria)
      .where(and(eq(auditoria.prefeituraId, prefeituraId), eq(auditoria.entidade, "alerta"), eq(auditoria.acao, "resolver"), inArray(auditoria.entidadeId, ids)))
      .groupBy(auditoria.entidadeId),
    db
      .select({ id: pedidoEventos.pedidoId, em: sql<string>`max(${pedidoEventos.criadoEm})` })
      .from(pedidoEventos)
      .where(and(eq(pedidoEventos.tipo, EVENTO_REGRA_ENCERRADA), inArray(pedidoEventos.pedidoId, ids)))
      .groupBy(pedidoEventos.pedidoId),
  ]);
  const mapaManual = new Map(manuais.map((m) => [m.id, m.em]));
  const mapaEncerrado = new Map(encerrados.map((m) => [m.id, m.em]));
  return linhas.map((l) => ({
    ...l,
    fechadoAMaoEm: mapaManual.get(l.id) ?? null,
    encerradoEm: mapaEncerrado.get(l.id) ?? null,
  }));
}

/** Grava o que o plano decidiu. Devolve os novos (inclusive reabertos), os que pioraram e quantos fechou. */
export async function aplicarVigia(
  prefeituraId: string,
  achados: DeteccaoAutomatica[],
  podeEncerrar: boolean
): Promise<{ novos: AchadoComId[]; piorados: AchadoComId[]; encerrados: number }> {
  const comId: AchadoComId[] = achados.map((d) => ({ ...d, id: idDoAlerta(prefeituraId, chaveDoAchado(d)) }));
  const existentes = await alertasExistentes(prefeituraId);
  const plano = planejar(existentes, comId);
  const novos: AchadoComId[] = [];

  for (const a of plano.inserir) {
    const r = await db
      .insert(alertas)
      .values({ id: a.id, prefeituraId, titulo: a.titulo, descricao: a.descricao, prioridade: a.prioridade, secretaria: a.secretaria })
      .onConflictDoNothing()
      .returning({ id: alertas.id });
    if (r.length) novos.push(a);
  }
  for (const a of plano.reabrir) {
    // Volta ao topo da lista: createdAt de hoje.
    await db
      .update(alertas)
      .set({ titulo: a.titulo, descricao: a.descricao, prioridade: a.prioridade, secretaria: a.secretaria, resolvido: false, createdAt: sql`now()::text` })
      .where(and(eq(alertas.id, a.id), eq(alertas.prefeituraId, prefeituraId)));
    novos.push(a);
  }
  for (const a of plano.atualizar) {
    await db
      .update(alertas)
      .set({ titulo: a.titulo, descricao: a.descricao, prioridade: a.prioridade, secretaria: a.secretaria })
      .where(and(eq(alertas.id, a.id), eq(alertas.prefeituraId, prefeituraId)));
  }

  let encerrados = 0;
  if (podeEncerrar) {
    const fechar = [...plano.encerrar, ...plano.registrarSumico];
    if (plano.encerrar.length) {
      const r = await db
        .update(alertas)
        .set({ resolvido: true })
        .where(and(eq(alertas.prefeituraId, prefeituraId), inArray(alertas.id, plano.encerrar), eq(alertas.resolvido, false)))
        .returning({ id: alertas.id, titulo: alertas.titulo, prioridade: alertas.prioridade, secretaria: alertas.secretaria, createdAt: alertas.createdAt });
      encerrados = r.length;
      // A linha do tempo de cada alerta fechado sozinho: o que era, desde
      // quando. É a matéria-prima do "O que o CidadeIA evitou".
      if (r.length) {
        await db.insert(pedidoEventos).values(
          r.map((x) => ({
            id: gerarId("pev"),
            pedidoId: x.id,
            tipo: EVENTO_REGRA_ENCERRADA,
            descricao: JSON.stringify({ prefeituraId, titulo: x.titulo, prioridade: x.prioridade, secretaria: x.secretaria, desde: x.createdAt, pelaVigia: true }),
            autor: "vigia dos módulos",
          }))
        );
      }
    }
    const soRegistro = fechar.filter((id) => !plano.encerrar.includes(id));
    if (soRegistro.length) {
      await db.insert(pedidoEventos).values(
        soRegistro.map((id) => ({
          id: gerarId("pev"),
          pedidoId: id,
          tipo: EVENTO_REGRA_ENCERRADA,
          descricao: JSON.stringify({ prefeituraId, pelaVigia: false }),
          autor: "vigia dos módulos",
        }))
      );
    }
  }

  return { novos, piorados: plano.piorou, encerrados };
}

async function avisar(prefeituraId: string, municipio: string, novos: AchadoComId[], piorados: AchadoComId[]) {
  if (!novos.length && !piorados.length) return 0;
  const pessoas = await db
    .select({ email: usuarios.email, cargo: usuarios.cargo, secretaria: usuarios.secretaria })
    .from(usuarios)
    .where(
      and(
        eq(usuarios.prefeituraId, prefeituraId),
        isNotNull(usuarios.email),
        or(eq(usuarios.cargo, "prefeito"), eq(usuarios.cargo, "admin"), eq(usuarios.cargo, "secretario"))
      )
    );
  // Cada um recebe só a parte dele (lib/alerta-por-area.ts): o secretário, a
  // área dele; o prefeito, o gabinete e o urgente das áreas.
  const itens = [...novos.map((d) => ({ ...d, piorou: false })), ...piorados.map((d) => ({ ...d, piorou: true }))];
  const reparto = repartirAvisos(itens, pessoas);
  let enviados = 0;
  for (const [para, { papel, alertas: deles }] of reparto) {
    const msg = emailDaVigia({
      municipio,
      novos: deles.filter((d) => !d.piorou),
      piorados: deles.filter((d) => d.piorou),
      linkAlertas: linkApp("/dashboard/alertas"),
      papel,
    });
    if (!msg) continue;
    await enviarEmail({ para, assunto: msg.assunto, html: msg.html });
    enviados++;
  }
  return enviados;
}

export type RelatorioVigiaModulos = {
  prefeituras: number;
  alertasNovos: number;
  piorados: number;
  encerrados: number;
  emails: number;
  adiadas: number;
  erros: string[];
};

/** Passa por todas as prefeituras clientes. Em rodízio e com orçamento de tempo, como a vigia fiscal. */
export async function rodarVigiaDosModulos(opcoes: { orcamentoMs?: number; hoje?: Date; soPrefeitura?: string } = {}): Promise<RelatorioVigiaModulos> {
  const inicio = Date.now();
  const orcamento = opcoes.orcamentoMs ?? 45_000;
  const hoje = opcoes.hoje ?? new Date();
  const r: RelatorioVigiaModulos = { prefeituras: 0, alertasNovos: 0, piorados: 0, encerrados: 0, emails: 0, adiadas: 0, erros: [] };

  const todas = await db
    .select({ id: prefeituras.id, municipio: prefeituras.municipio, planos: prefeituras.planosContratados })
    .from(prefeituras)
    .where(
      opcoes.soPrefeitura
        ? eq(prefeituras.id, opcoes.soPrefeitura)
        : notInArray(prefeituras.id, PREFEITURAS_INTERNAS)
    );
  const clientes = todas.filter((p) => planosContratadosDe(p.planos).length > 0).sort((a, b) => a.id.localeCompare(b.id));
  const giro = Math.floor(hoje.getTime() / 86_400_000) % Math.max(1, clientes.length);
  const fila = [...clientes.slice(giro), ...clientes.slice(0, giro)];

  for (const [i, p] of fila.entries()) {
    if (Date.now() - inicio > orcamento) {
      r.adiadas = fila.length - i;
      break;
    }
    try {
      const { achados, completo, erros } = await achadosDaPrefeitura(p.id, p.planos, hoje);
      for (const e of erros) r.erros.push(`${p.municipio}: ${e}`);
      // Fonte que falhou hoje não pode fechar alerta: a ausência do achado
      // seria falta de dado, não problema resolvido.
      const { novos, piorados, encerrados } = await aplicarVigia(p.id, achados, completo);
      r.emails += await avisar(p.id, p.municipio, novos, piorados);
      r.prefeituras++;
      r.alertasNovos += novos.length;
      r.piorados += piorados.length;
      r.encerrados += encerrados;
    } catch (e) {
      r.erros.push(`${p.municipio}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  return r;
}
