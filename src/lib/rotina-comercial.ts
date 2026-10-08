import { and, desc, eq, gte, inArray } from "drizzle-orm";
import { db } from "@/db";
import { leads, pedidoEventos, pedidosProposta } from "@/db/schema";
import { enviarEmail } from "@/lib/email";
import { gerarId } from "@/lib/id";
import { protocolo } from "@/lib/cobranca-servidor";
import { destinoDaEquipe } from "@/lib/contato-comercial";
import {
  TIPOS_EVENTO_LEAD,
  acompanhamentoDevido,
  agendaComercial,
  diasUteisEntre,
  situacaoDoLead,
  telefoneDoLead,
} from "@/lib/oportunidades";

// ── A ROTINA DIÁRIA DO ATENDIMENTO ──
//
// Roda na mesma chamada diária da cobrança (api/cron/cobranca). Três coisas:
//
//   1. o resumo da manhã para a equipe: o que está atrasado, quem pediu
//      ligação, quem chegou ontem. Vai sempre que houver algo a fazer;
//   2. o acompanhamento depois da proposta: dois e-mails curtos ao
//      interessado (3º e 8º dia útil), e depois silêncio;
//   3. um único e-mail a quem pediu o Raio-X ou a projeção e não foi atendido
//      em dois dias úteis, com o caminho da proposta.
//
// Cada envio vira um evento na linha do tempo (pedido_eventos), e é por ele
// que a rotina sabe o que já mandou: rodar duas vezes não manda duas vezes.

const escapar = (t: string) => t.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] ?? c);
const base = () => process.env.APP_URL ?? "https://cidadeia.vercel.app";

function rodape(): string {
  return `<p style="color:#888;font-size:13px">Equipe CidadeIA · responda este e-mail para falar com a gente, ou peça uma ligação em <a href="${base()}/#atendimento">${base()}</a>.</p>`;
}

export function emailAcompanhamento(
  chave: "acompanhamento_1" | "acompanhamento_2",
  p: { nome: string; municipio: string; uf: string; id: string }
): { assunto: string; html: string } {
  const primeiro = escapar(p.nome.split(" ")[0]);
  const cidade = `${escapar(p.municipio)}/${p.uf}`;
  if (chave === "acompanhamento_1") {
    return {
      assunto: `Proposta do CidadeIA para ${p.municipio}: ficou alguma dúvida?`,
      html: [
        `<p>Olá, ${primeiro}.</p>`,
        `<p>Passando para saber se a proposta para ${cidade} chegou bem e se ficou alguma dúvida.</p>`,
        `<p>Duas perguntas que costumam aparecer nesta hora:</p>`,
        `<ul>`,
        `<li><strong>Dá para contratar sem licitação?</strong> Quando o valor anual cabe no limite da dispensa por valor, sim. O kit de contratação já traz a justificativa e o termo de referência prontos: <a href="${base()}/kit">${base()}/kit</a>.</li>`,
        `<li><strong>Precisa instalar alguma coisa?</strong> Não. O painel lê o que a prefeitura já envia ao Tesouro, e funciona no navegador.</li>`,
        `</ul>`,
        `<p>Se for mais fácil conversar, responda com um telefone e o melhor horário que a gente liga.</p>`,
        `<p style="color:#888;font-size:13px">Protocolo do pedido: ${protocolo(p.id)}</p>`,
        rodape(),
      ].join("\n"),
    };
  }
  return {
    assunto: `${p.municipio}: o processo de contratação já vai pronto`,
    html: [
      `<p>Olá, ${primeiro}.</p>`,
      `<p>Montar o processo de contratação costuma dar mais trabalho que decidir. Por isso o CidadeIA entrega o processo pronto para ${cidade}:</p>`,
      `<ul>`,
      `<li>termo de referência e estudo técnico preliminar;</li>`,
      `<li>justificativa da contratação direta e da escolha do fornecedor;</li>`,
      `<li>minuta do contrato, acordo de tratamento de dados e nível de serviço.</li>`,
      `</ul>`,
      `<p>Tudo em <a href="${base()}/kit">${base()}/kit</a>, para o setor de compras e o jurídico revisarem.</p>`,
      `<p>Esta é a última mensagem que mando sobre a proposta. Quando a prefeitura quiser seguir, é só responder.</p>`,
      `<p style="color:#888;font-size:13px">Protocolo do pedido: ${protocolo(p.id)}</p>`,
      rodape(),
    ].join("\n"),
  };
}

export function emailRetomadaDoLead(l: { nome: string; municipio: string | null; uf: string | null; codigoIbge: string | null; origem: string }): {
  assunto: string;
  html: string;
} {
  const primeiro = escapar(l.nome.split(" ")[0]);
  const cidade = l.municipio ? `${escapar(l.municipio)}${l.uf ? `/${l.uf}` : ""}` : "o seu município";
  const linkProposta = `${base()}/proposta${l.codigoIbge ? `?ibge=${l.codigoIbge}` : ""}`;
  return {
    assunto: `${l.municipio ?? "Seu município"}: o que o painel mostraria por dentro`,
    html: [
      `<p>Olá, ${primeiro}.</p>`,
      `<p>Você consultou ${l.origem === "projecao" ? "a projeção da despesa com pessoal" : "o Raio-X"} de ${cidade}. Ele mostra o que já é público. O CidadeIA acompanha o resto, por dentro: os prazos de cada relatório, o limite de pessoal mês a mês, a obra que passou do prazo, e avisa antes de o Tribunal de Contas apontar.</p>`,
      `<p>A proposta para ${cidade} sai em um dia útil, com o kit de contratação pronto: <a href="${linkProposta}">${linkProposta}</a>.</p>`,
      `<p>Se preferir conversar, responda com um telefone que a gente liga.</p>`,
      `<p style="color:#888;font-size:13px">Não vamos mandar outras mensagens sobre isto.</p>`,
      rodape(),
    ].join("\n"),
  };
}

export type RelatorioRotinaComercial = { resumoEnviado: boolean; acompanhamentos: number; retomadas: number; erros: string[] };

export async function rodarRotinaComercial(agora = Date.now()): Promise<RelatorioRotinaComercial> {
  const r: RelatorioRotinaComercial = { resumoEnviado: false, acompanhamentos: 0, retomadas: 0, erros: [] };
  const equipe = destinoDaEquipe();

  // ── 2. acompanhamento depois da proposta ──
  try {
    const comProposta = await db
      .select()
      .from(pedidosProposta)
      .where(eq(pedidosProposta.status, "proposta_enviada"))
      .orderBy(desc(pedidosProposta.createdAt))
      .limit(200);
    if (comProposta.length) {
      const evs = await db
        .select({ pedidoId: pedidoEventos.pedidoId, tipo: pedidoEventos.tipo, criadoEm: pedidoEventos.criadoEm })
        .from(pedidoEventos)
        .where(inArray(pedidoEventos.pedidoId, comProposta.map((p) => p.id)));
      for (const p of comProposta) {
        const meus = evs.filter((e) => e.pedidoId === p.id);
        const enviadaEm = meus.filter((e) => e.tipo === "proposta_enviada").sort((a, b) => b.criadoEm.localeCompare(a.criadoEm))[0]?.criadoEm ?? null;
        const devido = acompanhamentoDevido(enviadaEm, meus.map((e) => e.tipo), agora);
        if (!devido) continue;
        const msg = emailAcompanhamento(devido.chave, p);
        const envio = await enviarEmail({ para: p.email, assunto: msg.assunto, html: msg.html, responderPara: equipe });
        await db.insert(pedidoEventos).values({
          id: gerarId("pev"),
          pedidoId: p.id,
          tipo: devido.chave,
          descricao: envio.enviado ? `Lembrete automático enviado: ${msg.assunto}` : `Lembrete automático NÃO saiu (${envio.motivo})`,
          autor: "rotina diária",
        });
        if (envio.enviado) r.acompanhamentos++;
      }
    }
  } catch (e) {
    r.erros.push(`acompanhamento: ${e instanceof Error ? e.message : String(e)}`);
  }

  // ── 3. e 1. leads e resumo ──
  try {
    const desde = new Date(agora - 30 * 86_400_000).toISOString();
    const [listaLeads, recebidos] = await Promise.all([
      db.select().from(leads).where(gte(leads.createdAt, desde)).orderBy(desc(leads.createdAt)).limit(300),
      db
        .select({
          id: pedidosProposta.id,
          municipio: pedidosProposta.municipio,
          uf: pedidosProposta.uf,
          nome: pedidosProposta.nome,
          email: pedidosProposta.email,
          status: pedidosProposta.status,
          createdAt: pedidosProposta.createdAt,
        })
        .from(pedidosProposta)
        .where(and(eq(pedidosProposta.status, "recebido")))
        .limit(200),
    ]);
    const evsLeads = listaLeads.length
      ? await db
          .select({ pedidoId: pedidoEventos.pedidoId, tipo: pedidoEventos.tipo, descricao: pedidoEventos.descricao, criadoEm: pedidoEventos.criadoEm })
          .from(pedidoEventos)
          .where(inArray(pedidoEventos.pedidoId, listaLeads.map((l) => l.id)))
      : [];

    const novosOntem: string[] = [];
    const ligacoes: string[] = [];
    for (const l of listaLeads) {
      const meus = evsLeads.filter((e) => e.pedidoId === l.id);
      const situacao = situacaoDoLead(meus);
      const tel = telefoneDoLead(meus);
      const cidade = l.municipio ? `${l.municipio}${l.uf ? `/${l.uf}` : ""}` : "município não informado";
      if (situacao === "novo" && tel) ligacoes.push(`${escapar(l.nome)} (${escapar(l.cargo ?? "")}), ${escapar(cidade)}: <a href="tel:+55${tel.telefone.replace(/\D/g, "")}">${tel.telefone}</a>${tel.horario ? `, ${escapar(tel.horario)}` : ""}`);
      if (agora - Date.parse(l.createdAt) < 86_400_000) novosOntem.push(`${escapar(l.nome)} (${escapar(l.cargo ?? "")}), ${escapar(cidade)}, ${escapar(l.origem)}`);

      // Retomada única: Raio-X ou projeção, com e-mail, sem contato em 2 dias úteis.
      const jaRetomado = meus.some((e) => e.tipo === TIPOS_EVENTO_LEAD.acompanhamento);
      if (situacao === "novo" && !jaRetomado && l.email && l.origem !== "ligacao" && diasUteisEntre(l.createdAt, agora) >= 2) {
        if (/imprensa|cidad/i.test(l.cargo ?? "")) continue;
        const msg = emailRetomadaDoLead(l);
        const envio = await enviarEmail({ para: l.email, assunto: msg.assunto, html: msg.html, responderPara: equipe });
        await db.insert(pedidoEventos).values({
          id: gerarId("pev"),
          pedidoId: l.id,
          tipo: TIPOS_EVENTO_LEAD.acompanhamento,
          descricao: envio.enviado ? `Retomada automática enviada` : `Retomada automática NÃO saiu (${envio.motivo})`,
          autor: "rotina diária",
        });
        if (envio.enviado) r.retomadas++;
      }
    }

    const agenda = agendaComercial(recebidos, agora);
    const blocos: string[] = [];
    if (agenda.propostasAtrasadas.length)
      blocos.push(
        `<p><strong style="color:#c0392b">Propostas fora do prazo de 1 dia útil (${agenda.propostasAtrasadas.length}):</strong><br/>${agenda.propostasAtrasadas
          .map((p) => `${escapar(p.municipio)}/${p.uf}, ${escapar(p.nome)}, protocolo ${protocolo(p.id)}`)
          .join("<br/>")}</p>`
      );
    if (agenda.propostasVencendoHoje.length)
      blocos.push(
        `<p><strong>Propostas que vencem hoje (${agenda.propostasVencendoHoje.length}):</strong><br/>${agenda.propostasVencendoHoje
          .map((p) => `${escapar(p.municipio)}/${p.uf}, ${escapar(p.nome)}`)
          .join("<br/>")}</p>`
      );
    if (ligacoes.length) blocos.push(`<p><strong>Ligações pedidas, ainda não feitas (${ligacoes.length}):</strong><br/>${ligacoes.join("<br/>")}</p>`);
    if (novosOntem.length) blocos.push(`<p><strong>Interessados das últimas 24 h (${novosOntem.length}):</strong><br/>${novosOntem.join("<br/>")}</p>`);
    if (r.acompanhamentos || r.retomadas)
      blocos.push(`<p style="color:#666">Enviados hoje pela rotina: ${r.acompanhamentos} lembrete(s) de proposta, ${r.retomadas} retomada(s) de interessado.</p>`);

    if (blocos.length) {
      const atrasos = agenda.propostasAtrasadas.length + ligacoes.length;
      const envio = await enviarEmail({
        para: equipe,
        assunto: atrasos ? `Atendimento: ${atrasos} pendência(s) para hoje` : "Atendimento: resumo do dia",
        html: [...blocos, `<p><a href="${base()}/admin/interessados">Abrir os interessados</a> · <a href="${base()}/admin/pedidos">Abrir a mesa de pedidos</a></p>`].join("\n"),
      });
      r.resumoEnviado = envio.enviado;
    }
  } catch (e) {
    r.erros.push(`leads/resumo: ${e instanceof Error ? e.message : String(e)}`);
  }

  return r;
}
