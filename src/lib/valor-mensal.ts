import { and, eq, isNotNull, notInArray, or } from "drizzle-orm";
import { renderToBuffer } from "@react-pdf/renderer";
import { db } from "@/db";
import { pedidoEventos, prefeituras, usuarios } from "@/db/schema";
import { gerarId } from "@/lib/id";
import { enviarEmail } from "@/lib/email";
import { linkApp } from "@/lib/url-app";
import { planosContratadosDe } from "@/lib/planos";
import { PREFEITURAS_INTERNAS } from "@/lib/prefeituras-internas";
import { ID_PREFEITURA_DEMO } from "@/lib/demo/prefeitura-demo";
import { carregarValor } from "@/lib/valor-entregue-servidor";
import { frasesDoValor } from "@/lib/valor-entregue";
import { RelatorioValorPDF } from "@/lib/relatorios/RelatorioValor";

// ── O RESUMO DO MÊS, NO DIA 1º ──
//
// Todo dia 1º, o prefeito e os administradores recebem o "O que o CidadeIA
// fez" do mês que acabou, com o PDF anexo. É o documento que ele encaminha
// ao secretário de finanças quando a renovação entra na pauta. Mês sem nada
// a contar não gera e-mail: isso é sinal para a equipe (alerta de risco de
// cancelamento), não para o cliente.

export const EVENTO_VALOR_MENSAL = "valor_mensal_enviado";

const NOME_MES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const esc = (t: string) => t.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] ?? c);

export async function rodarValorMensal(opcoes: { hoje?: Date } = {}) {
  const hoje = opcoes.hoje ?? new Date();
  const anterior = new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth() - 1, 1));
  const mes = `${NOME_MES[anterior.getUTCMonth()]} de ${anterior.getUTCFullYear()}`;
  const chaveMes = anterior.toISOString().slice(0, 7);
  const r = { prefeituras: 0, emails: 0, semConteudo: 0, erros: [] as string[] };

  const todas = await db
    .select({ id: prefeituras.id, nome: prefeituras.nome, municipio: prefeituras.municipio, estado: prefeituras.estado, planos: prefeituras.planosContratados })
    .from(prefeituras)
    .where(notInArray(prefeituras.id, [...PREFEITURAS_INTERNAS, ID_PREFEITURA_DEMO]));

  for (const p of todas.filter((x) => planosContratadosDe(x.planos).length > 0)) {
    try {
      const idEnvio = `valor:${p.id}:${chaveMes}`;
      const [ja] = await db
        .select({ id: pedidoEventos.id })
        .from(pedidoEventos)
        .where(and(eq(pedidoEventos.pedidoId, idEnvio), eq(pedidoEventos.tipo, EVENTO_VALOR_MENSAL)))
        .limit(1);
      if (ja) continue;

      const valor = await carregarValor(p.id, "mes", hoje);
      if (valor.vazio) {
        r.semConteudo++;
        continue;
      }
      const pdf = await renderToBuffer(
        RelatorioValorPDF({ prefeitura: p, periodo: mes, valor, geradoEm: hoje.toISOString() })
      );
      const frases = frasesDoValor(valor);
      const html = [
        `<p>Bom dia.</p>`,
        `<p>O que o CidadeIA fez em <strong>${esc(p.municipio)}</strong> em ${mes}:</p>`,
        `<ul>${frases.map((f) => `<li style="margin-bottom:6px">${esc(f)}</li>`).join("")}</ul>`,
        `<p>O relatório completo vai em PDF, anexo, para encaminhar a quem precisar.</p>`,
        `<p><a href="${linkApp("/dashboard/valor?periodo=ano")}">Ver o acumulado do ano no painel</a></p>`,
        `<p style="color:#888;font-size:13px">Contagem do que aconteceu no sistema, sem estimativa. Quem resolve é a equipe da prefeitura; o CidadeIA avisa a tempo.</p>`,
      ].join("\n");

      const pessoas = await db
        .select({ email: usuarios.email })
        .from(usuarios)
        .where(and(eq(usuarios.prefeituraId, p.id), isNotNull(usuarios.email), or(eq(usuarios.cargo, "prefeito"), eq(usuarios.cargo, "admin"))));
      const emails = [...new Set(pessoas.map((x) => x.email).filter((e): e is string => !!e))];
      for (const para of emails) {
        await enviarEmail({
          para,
          assunto: `${p.municipio}: o que o CidadeIA fez em ${mes}`,
          html,
          anexos: [{ nome: `cidadeia-${chaveMes}-${p.municipio.toLowerCase().replace(/\s+/g, "-")}.pdf`, conteudo: new Uint8Array(pdf) }],
        });
        r.emails++;
      }
      await db.insert(pedidoEventos).values({
        id: gerarId("pev"),
        pedidoId: idEnvio,
        tipo: EVENTO_VALOR_MENSAL,
        descricao: JSON.stringify({ prefeituraId: p.id, para: emails, resolvidos: valor.resolvidos }),
        autor: "resumo mensal",
      });
      r.prefeituras++;
    } catch (e) {
      r.erros.push(`${p.municipio}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  return r;
}
