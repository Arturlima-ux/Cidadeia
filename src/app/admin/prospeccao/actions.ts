"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { pedidoEventos } from "@/db/schema";
import { emailDaEquipe } from "@/lib/equipe";
import { gerarId } from "@/lib/id";
import { ESTADOS } from "@/lib/estados";
import { municipioPorCodigo } from "@/lib/municipios";
import { municipioPorSlug, slugDeMunicipio } from "@/lib/slug-municipio";
import {
  CANAIS,
  CARGOS_PROSPECTO,
  ETAPAS,
  ROTULO_SITUACAO,
  TIPO,
  diaDeBrasilia,
  ehDia,
  ehIdDeProspecto,
  montarProspecto,
  proximaAoEntrar,
  proximaDepoisDoFollowup,
  type Canal,
  type DadosProspecto,
  type Proxima,
  type Situacao,
} from "@/lib/prospeccao";

// ── AS AÇÕES DA MESA DE PROSPECÇÃO ──
// Só a equipe. Cada ação é um registro a mais na linha do tempo do prospecto
// (lib/prospeccao.ts explica por que sem tabela nova); apagar remove todos.

type Resultado = { ok: boolean; erro?: string };

const corta = (v: FormDataEntryValue | null, max: number) => String(v ?? "").trim().slice(0, max);

async function registrar(id: string, tipo: string, descricao: string, autor: string) {
  await db.insert(pedidoEventos).values({ id: gerarId("pev"), pedidoId: id, tipo, descricao, autor });
}

async function registrarProxima(id: string, proxima: Proxima | null, autor: string) {
  await registrar(id, TIPO.proxima, JSON.stringify(proxima), autor);
}

async function lerProspecto(id: string) {
  const linhas = await db
    .select({ tipo: pedidoEventos.tipo, descricao: pedidoEventos.descricao, autor: pedidoEventos.autor, criadoEm: pedidoEventos.criadoEm })
    .from(pedidoEventos)
    .where(eq(pedidoEventos.pedidoId, id));
  return montarProspecto(id, linhas);
}

function revalidar() {
  revalidatePath("/admin/prospeccao");
}

/** Um prospecto novo, pelo formulário da mesa. */
export async function criarProspecto(_antes: Resultado | null, form: FormData): Promise<Resultado> {
  const autor = await emailDaEquipe();
  if (!autor) return { ok: false, erro: "Sem permissão." };

  const municipio = corta(form.get("municipio"), 80);
  const uf = corta(form.get("uf"), 2).toUpperCase();
  const canal = corta(form.get("canal"), 20) as Canal;
  const cargo = corta(form.get("cargo"), 60);
  const situacao = (corta(form.get("situacao"), 20) || "mapeada") as Situacao;
  if (!municipio) return { ok: false, erro: "Diga a cidade." };
  if (!(ESTADOS as readonly string[]).includes(uf)) return { ok: false, erro: "Escolha a UF." };
  if (!(CANAIS as readonly string[]).includes(canal)) return { ok: false, erro: "Escolha o canal." };
  if (cargo && !(CARGOS_PROSPECTO as readonly string[]).includes(cargo)) return { ok: false, erro: "Cargo inválido." };
  if (!(ETAPAS as readonly string[]).includes(situacao) || situacao === "pedido") return { ok: false, erro: "Etapa inválida." };

  // A cidade da tabela do IBGE, quando o nome bate: é o que liga ao Raio-X.
  const achado = municipioPorSlug(uf, slugDeMunicipio(municipio));
  const dados: DadosProspecto = {
    municipio: achado?.nome ?? municipio,
    uf,
    codigoIbge: achado?.codigo ?? null,
    pessoa: corta(form.get("pessoa"), 80),
    cargo,
    canal,
    contato: corta(form.get("contato"), 120),
    gancho: corta(form.get("gancho"), 280),
  };

  const id = gerarId("pros");
  await registrar(id, TIPO.criado, JSON.stringify({ ...dados, situacao }), autor);
  await registrarProxima(id, proximaAoEntrar(situacao, diaDeBrasilia(Date.now())), autor);
  revalidar();
  return { ok: true };
}

/** Uma cidade que estudou o CidadeIA sem deixar contato vira prospecto mapeado (de /admin/interessados). */
export async function levarSinalParaProspeccao(form: FormData): Promise<void> {
  const autor = await emailDaEquipe();
  if (!autor) return;
  const m = municipioPorCodigo(corta(form.get("codigoIbge"), 7));
  if (!m) return;
  const dados: DadosProspecto = {
    municipio: m.nome,
    uf: m.uf,
    codigoIbge: m.codigo,
    pessoa: "",
    cargo: "",
    canal: "ligacao",
    contato: "",
    gancho: corta(form.get("gancho"), 280) || "Estudaram o Raio-X nesta semana, sem deixar contato",
  };
  const id = gerarId("pros");
  await registrar(id, TIPO.criado, JSON.stringify({ ...dados, situacao: "mapeada" }), autor);
  await registrarProxima(id, { acao: "Achar quem cuida das contas e o contato", data: diaDeBrasilia(Date.now()) }, autor);
  revalidar();
  revalidatePath("/admin/interessados");
}

/** Muda a etapa (ou pausa, descarta, vira pedido) e já agenda a próxima ação da cadência. */
export async function mudarSituacao(id: string, situacao: Situacao, nota = ""): Promise<Resultado> {
  const autor = await emailDaEquipe();
  if (!autor) return { ok: false, erro: "Sem permissão." };
  if (!ehIdDeProspecto(id) || !(situacao in ROTULO_SITUACAO)) return { ok: false, erro: "Pedido inválido." };
  if (!(await lerProspecto(id))) return { ok: false, erro: "Prospecto não encontrado." };
  await registrar(id, TIPO.situacao, JSON.stringify({ situacao }), autor);
  const texto = nota.trim().slice(0, 500);
  if (texto) await registrar(id, TIPO.nota, texto, autor);
  await registrarProxima(id, proximaAoEntrar(situacao, diaDeBrasilia(Date.now())), autor);
  revalidar();
  return { ok: true };
}

/** Follow-up feito, sem resposta: conta e agenda o seguinte da cadência. */
export async function registrarFollowup(id: string, nota = ""): Promise<Resultado> {
  const autor = await emailDaEquipe();
  if (!autor) return { ok: false, erro: "Sem permissão." };
  if (!ehIdDeProspecto(id)) return { ok: false, erro: "Pedido inválido." };
  const p = await lerProspecto(id);
  if (!p) return { ok: false, erro: "Prospecto não encontrado." };
  await registrar(id, TIPO.followup, nota.trim().slice(0, 500) || `Follow-up ${p.followups + 1} feito, sem resposta`, autor);
  await registrarProxima(id, proximaDepoisDoFollowup(p.followups + 1, diaDeBrasilia(Date.now())), autor);
  revalidar();
  return { ok: true };
}

/** A próxima ação escrita à mão: o que fazer e em que dia. */
export async function definirProxima(id: string, acao: string, data: string): Promise<Resultado> {
  const autor = await emailDaEquipe();
  if (!autor) return { ok: false, erro: "Sem permissão." };
  const a = acao.trim().slice(0, 160);
  if (!ehIdDeProspecto(id) || !a || !ehDia(data)) return { ok: false, erro: "Diga a ação e o dia." };
  await registrarProxima(id, { acao: a, data }, autor);
  revalidar();
  return { ok: true };
}

/** Uma anotação: o que a pessoa disse, uma objeção, um combinado. */
export async function anotar(id: string, nota: string): Promise<Resultado> {
  const autor = await emailDaEquipe();
  if (!autor) return { ok: false, erro: "Sem permissão." };
  const texto = nota.trim().slice(0, 1000);
  if (!ehIdDeProspecto(id) || !texto) return { ok: false, erro: "Escreva a anotação." };
  await registrar(id, TIPO.nota, texto, autor);
  revalidar();
  return { ok: true };
}

/** Apaga o prospecto inteiro, com todo o histórico (quem pediu para não ser procurado). */
export async function apagarProspecto(id: string): Promise<Resultado> {
  const autor = await emailDaEquipe();
  if (!autor) return { ok: false, erro: "Sem permissão." };
  if (!ehIdDeProspecto(id)) return { ok: false, erro: "Pedido inválido." };
  await db.delete(pedidoEventos).where(eq(pedidoEventos.pedidoId, id));
  revalidar();
  return { ok: true };
}
