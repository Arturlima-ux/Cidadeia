import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { leads, pedidoEventos } from "@/db/schema";
import { gerarId } from "@/lib/id";
import { enviarEmail } from "@/lib/email";
import { conferirSituacaoFiscal } from "@/lib/vigia-fiscal";
import { municipioPorCodigo } from "@/lib/municipios";
import { caminhoDoRaioX } from "@/lib/slug-municipio";
import {
  EVENTO_AVISO_CANCELADO,
  EVENTO_AVISO_ENVIADO,
  ORIGEM_AVISO,
  chaveDoAviso,
  emailDoAviso,
  fatosDaCidade,
  fatosNovos,
} from "@/lib/aviso-da-cidade";

// ── A ROTINA DIÁRIA DOS AVISOS GRATUITOS ──
// Uma conferência por cidade (não por inscrito), em rodízio para caber no
// tempo da função; depois, para cada inscrito ativo daquela cidade, só o que
// ele ainda não recebeu. Ver aviso-da-cidade.ts.

const base = () => process.env.APP_URL ?? "https://cidadeia.vercel.app";

export type RelatorioAvisos = { cidades: number; emails: number; adiadas: number; erros: string[] };

export async function inscritosAtivos() {
  const todos = await db.select().from(leads).where(eq(leads.origem, ORIGEM_AVISO));
  if (!todos.length) return { inscritos: [], enviados: new Map<string, Set<string>>() };
  const evs = await db
    .select({ pedidoId: pedidoEventos.pedidoId, tipo: pedidoEventos.tipo, descricao: pedidoEventos.descricao })
    .from(pedidoEventos)
    .where(
      and(
        inArray(pedidoEventos.pedidoId, todos.map((l) => l.id)),
        inArray(pedidoEventos.tipo, [EVENTO_AVISO_ENVIADO, EVENTO_AVISO_CANCELADO])
      )
    );
  const cancelados = new Set(evs.filter((e) => e.tipo === EVENTO_AVISO_CANCELADO).map((e) => e.pedidoId));
  const enviados = new Map<string, Set<string>>();
  for (const e of evs) {
    if (e.tipo !== EVENTO_AVISO_ENVIADO) continue;
    const s = enviados.get(e.pedidoId) ?? new Set<string>();
    // A descrição guarda as chaves avisadas, uma por linha.
    for (const c of e.descricao.split("\n")) if (c) s.add(c);
    enviados.set(e.pedidoId, s);
  }
  return { inscritos: todos.filter((l) => !cancelados.has(l.id) && l.codigoIbge), enviados };
}

export async function rodarAvisosDaCidade(opcoes: { orcamentoMs?: number; hoje?: Date } = {}): Promise<RelatorioAvisos> {
  const inicio = Date.now();
  const orcamento = opcoes.orcamentoMs ?? 45_000;
  const hoje = opcoes.hoje ?? new Date();
  const r: RelatorioAvisos = { cidades: 0, emails: 0, adiadas: 0, erros: [] };

  const { inscritos, enviados } = await inscritosAtivos();
  const cidades = [...new Set(inscritos.map((l) => l.codigoIbge!))].sort();
  // Rodízio: a cada dia a fila começa num ponto diferente, para nenhuma
  // cidade ficar sempre para o fim quando o tempo não der para todas.
  const giro = Math.floor(hoje.getTime() / 86_400_000) % Math.max(1, cidades.length);
  const fila = [...cidades.slice(giro), ...cidades.slice(0, giro)];

  for (const [i, codigo] of fila.entries()) {
    if (Date.now() - inicio > orcamento) {
      r.adiadas = fila.length - i;
      break;
    }
    const m = municipioPorCodigo(codigo);
    if (!m) continue;
    try {
      const situacao = await conferirSituacaoFiscal({ codigoIbge: codigo, populacao: m.populacao, hoje, conferirPessoal: false });
      // Sem resposta completa do Tesouro, hoje não se diz nada a ninguém:
      // "nada em atraso" só pode sair de uma conferência inteira. Amanhã a
      // rotina tenta de novo.
      if (situacao.inconclusivos.length > 0) {
        r.erros.push(`${m.nome}: Tesouro sem resposta completa; adiado`);
        continue;
      }
      const fatos = fatosDaCidade(situacao, m.nome);
      r.cidades++;
      for (const l of inscritos.filter((x) => x.codigoIbge === codigo)) {
        const ja = enviados.get(l.id);
        const primeiro = !ja;
        const novos = fatosNovos(fatos, ja ?? new Set());
        // Primeiro envio: o retrato de hoje, mesmo sem novidade. Depois,
        // só quando há o que contar.
        if (!primeiro && novos.length === 0) continue;
        const chave = chaveDoAviso(l.id);
        const msg = emailDoAviso({
          nome: l.nome,
          municipio: m.nome,
          uf: m.uf,
          fatos: primeiro ? fatos : novos,
          primeiro,
          linkRaioX: `${base()}${caminhoDoRaioX(m)}`,
          linkProposta: `${base()}/proposta?ibge=${m.codigo}&modulos=gestao`,
          linkCancelar: chave ? `${base()}/aviso/cancelar/${chave}` : null,
        });
        const envio = await enviarEmail({ para: l.email, assunto: msg.assunto, html: msg.html });
        if (!envio.enviado) {
          r.erros.push(`${m.nome}: e-mail para inscrito não saiu (${envio.motivo})`);
          continue;
        }
        await db.insert(pedidoEventos).values({
          id: gerarId("pev"),
          pedidoId: l.id,
          tipo: EVENTO_AVISO_ENVIADO,
          // Também a marca de "já recebeu o primeiro", quando não há fato.
          descricao: [...(primeiro ? fatos : novos).map((f) => f.chave), "inicio"].join("\n"),
          autor: "aviso da cidade",
        });
        r.emails++;
      }
    } catch (e) {
      r.erros.push(`${m.nome}: ${e instanceof Error ? e.message : String(e)}`);
    }
    await new Promise((ok) => setTimeout(ok, 300));
  }
  return r;
}
