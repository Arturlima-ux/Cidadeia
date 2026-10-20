import { carregarSinais } from "@/lib/sinais-de-interesse-servidor";
import { descreverSinal } from "@/lib/sinais-de-interesse";
import { linkRastreavel } from "@/lib/abertura-da-proposta";
import { and, desc, eq, gte, inArray } from "drizzle-orm";
import { db } from "@/db";
import { leads, pedidoEventos, pedidosProposta } from "@/db/schema";
import { enviarEmail } from "@/lib/email";
import { h, montarEmail, saudacao, type Bloco, type Html } from "@/lib/email-modelo";
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

const base = () => process.env.APP_URL ?? "https://cidadeia.vercel.app";

const RESPONDER = "É só responder este e-mail para falar com a gente. Se preferir conversar por telefone, mande um número e o melhor horário que a gente liga.";

export function emailAcompanhamento(
  chave: "acompanhamento_1" | "acompanhamento_2",
  p: { nome: string; municipio: string; uf: string; id: string }
): { assunto: string; html: string } {
  const cidade = `${p.municipio}/${p.uf}`;
  const kit = linkRastreavel(base(), p.id, "kit", protocolo(p.id));
  const motivo = `Você recebe este e-mail porque pediu uma proposta do CidadeIA para ${cidade} (protocolo ${protocolo(p.id)}).`;
  if (chave === "acompanhamento_1") {
    return {
      assunto: `Proposta do CidadeIA para ${p.municipio}: ficou alguma dúvida?`,
      html: montarEmail({
        remetente: { tipo: "cidadeia" },
        previa: "Duas perguntas que costumam aparecer nesta hora, já respondidas.",
        etiqueta: { texto: `Proposta · ${cidade}` },
        titulo: "A proposta chegou bem?",
        saudacao: saudacao(p.nome),
        blocos: [
          { p: `Passando para saber se a proposta para ${cidade} chegou bem e se ficou alguma dúvida. Duas perguntas costumam aparecer nesta hora:` },
          {
            itens: [
              {
                titulo: "Dá para contratar sem licitação?",
                detalhe: "Quando o valor anual cabe no limite da dispensa por valor, sim. O kit de contratação já traz a justificativa e o termo de referência prontos.",
                tom: "marca",
              },
              {
                titulo: "Precisa instalar alguma coisa?",
                detalhe: "Não. O painel lê o que a prefeitura já envia ao Tesouro e funciona no navegador, no computador ou no celular.",
                tom: "marca",
              },
            ],
          },
          { botao: "Abrir o kit de contratação", link: kit },
          { p: RESPONDER },
        ],
        motivo,
      }),
    };
  }
  return {
    assunto: `${p.municipio}: o processo de contratação já vai pronto`,
    html: montarEmail({
      remetente: { tipo: "cidadeia" },
      previa: "Termo de referência, estudo técnico, justificativa e minuta do contrato, prontos para o jurídico.",
      etiqueta: { texto: `Proposta · ${cidade}` },
      titulo: "O processo de contratação já vai pronto",
      saudacao: saudacao(p.nome),
      blocos: [
        { p: `Montar o processo de contratação costuma dar mais trabalho do que decidir. Por isso o CidadeIA entrega o processo pronto para ${cidade}:` },
        {
          lista: [
            "termo de referência e estudo técnico preliminar;",
            "justificativa da contratação direta e da escolha do fornecedor;",
            "minuta do contrato, acordo de tratamento de dados e nível de serviço.",
          ],
        },
        { p: "Está tudo no kit de contratação, para o setor de compras e o jurídico revisarem." },
        { botao: "Abrir o kit de contratação", link: kit },
        { p: "Esta é a última mensagem sobre a proposta. Quando a prefeitura quiser seguir, é só responder este e-mail." },
      ],
      motivo,
    }),
  };
}

export function emailRetomadaDoLead(l: { nome: string; municipio: string | null; uf: string | null; codigoIbge: string | null; origem: string }): {
  assunto: string;
  html: string;
} {
  const cidade = l.municipio ? `${l.municipio}${l.uf ? `/${l.uf}` : ""}` : "o seu município";
  const linkProposta = `${base()}/proposta${l.codigoIbge ? `?ibge=${l.codigoIbge}` : ""}`;
  const consulta = l.origem === "projecao" ? "a projeção da despesa com pessoal" : "o Raio-X";
  return {
    assunto: `${l.municipio ?? "Seu município"}: o que o painel mostraria por dentro`,
    html: montarEmail({
      remetente: { tipo: "cidadeia" },
      previa: `O Raio-X mostra o que já é público. O painel acompanha o resto, por dentro.`,
      etiqueta: l.municipio ? { texto: cidade } : null,
      titulo: "O que o painel mostraria por dentro",
      saudacao: saudacao(l.nome),
      blocos: [
        { p: `Você consultou ${consulta} de ${cidade}. Ele mostra o que já é público. O CidadeIA acompanha o resto, por dentro, e avisa antes de o Tribunal de Contas apontar:` },
        {
          lista: [
            "o prazo de cada relatório fiscal, com 15 dias de antecedência;",
            "o limite da despesa com pessoal, mês a mês, na régua da LRF;",
            "a obra que passou do prazo, o contrato que vai vencer, a manifestação sem resposta.",
          ],
        },
        { p: `A proposta para ${cidade} sai em um dia útil, com o kit de contratação pronto.` },
        { botao: "Pedir a proposta", link: linkProposta },
        { p: "Se preferir conversar, responda com um telefone que a gente liga." },
        { nota: "Esta é a única mensagem que mandamos sobre isso." },
      ],
      motivo: `Você recebe este e-mail porque consultou ${consulta} no site do CidadeIA e deixou este endereço.`,
    }),
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

    const novosOntem: Html[] = [];
    const ligacoes: Html[] = [];
    for (const l of listaLeads) {
      const meus = evsLeads.filter((e) => e.pedidoId === l.id);
      const situacao = situacaoDoLead(meus);
      const tel = telefoneDoLead(meus);
      const cidade = l.municipio ? `${l.municipio}${l.uf ? `/${l.uf}` : ""}` : "município não informado";
      if (situacao === "novo" && tel) ligacoes.push(h`<strong>${l.nome}</strong> (${l.cargo ?? ""}), ${cidade}: <a href="tel:+55${tel.telefone.replace(/\D/g, "")}">${tel.telefone}</a>${tel.horario ? `, ${tel.horario}` : ""}`);
      if (agora - Date.parse(l.createdAt) < 86_400_000) novosOntem.push(h`<strong>${l.nome}</strong> (${l.cargo ?? ""}), ${cidade} · ${l.origem}`);

      // Retomada única: Raio-X ou projeção, com e-mail, sem contato em 2 dias úteis.
      const jaRetomado = meus.some((e) => e.tipo === TIPOS_EVENTO_LEAD.acompanhamento);
      if (situacao === "novo" && !jaRetomado && l.email && l.origem !== "ligacao" && diasUteisEntre(l.createdAt, agora) >= 2) {
        if (/imprensa|cidad/i.test(l.cargo ?? "")) continue;
        // Quem assinou o aviso da cidade já recebe e-mail quando há novidade.
        if (l.origem === "aviso") continue;
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
    const blocos: Bloco[] = [];
    const cidadeDe = (p: { municipio: string; uf: string }) => `${p.municipio}/${p.uf}`;
    if (agenda.propostasAtrasadas.length) {
      blocos.push({ secao: `Propostas fora do prazo de 1 dia útil (${agenda.propostasAtrasadas.length})`, tom: "urgente" });
      blocos.push({
        itens: agenda.propostasAtrasadas.map((p) => ({ titulo: cidadeDe(p), detalhe: `${p.nome} · protocolo ${protocolo(p.id)}`, tom: "urgente" as const })),
      });
    }
    if (agenda.propostasVencendoHoje.length) {
      blocos.push({ secao: `Propostas que vencem hoje (${agenda.propostasVencendoHoje.length})`, tom: "atencao" });
      blocos.push({ itens: agenda.propostasVencendoHoje.map((p) => ({ titulo: cidadeDe(p), detalhe: p.nome, tom: "atencao" as const })) });
    }
    if (ligacoes.length) {
      blocos.push({ secao: `Ligações pedidas, ainda não feitas (${ligacoes.length})`, tom: "urgente" });
      blocos.push({ lista: ligacoes });
    }
    if (novosOntem.length) {
      blocos.push({ secao: `Interessados das últimas 24 horas (${novosOntem.length})`, tom: "marca" });
      blocos.push({ lista: novosOntem });
    }
    // Cidades que estão estudando a compra sem ter deixado contato: só as
    // novas para a equipe (quem já está em contato fica na outra lista).
    try {
      const sinais = (await carregarSinais(7, 15)).filter((x) => !x.jaEmContato).slice(0, 5);
      if (sinais.length) {
        blocos.push({ secao: `Cidades estudando o CidadeIA, sem contato ainda (${sinais.length})` });
        blocos.push({ itens: sinais.map((x) => ({ titulo: `${x.municipio}/${x.uf}`, detalhe: descreverSinal(x), tom: "marca" as const })) });
      }
    } catch (e) {
      r.erros.push(`sinais: ${e instanceof Error ? e.message : String(e)}`);
    }
    // E-mails para clientes que não saíram e esperam envio à mão.
    try {
      const { pendentesDaCaixaDeSaida } = await import("@/lib/caixa-de-saida");
      const pendentes = await pendentesDaCaixaDeSaida(50);
      if (pendentes.length)
        blocos.push({
          destaque: h`${pendentes.slice(0, 5).map((x) => x.assunto).join("; ")}. <a href="${base()}/admin/saida">Abrir a caixa de saída</a>`,
          titulo: `${pendentes.length} e-mail(s) para clientes esperando envio à mão`,
          tom: "urgente",
        });
    } catch (e) {
      r.erros.push(`caixa de saída: ${e instanceof Error ? e.message : String(e)}`);
    }
    if (r.acompanhamentos || r.retomadas)
      blocos.push({ nota: `Enviados hoje pela rotina: ${r.acompanhamentos} lembrete(s) de proposta, ${r.retomadas} retomada(s) de interessado.` });

    if (blocos.length) {
      const atrasos = agenda.propostasAtrasadas.length + ligacoes.length;
      const hoje = new Date(agora).toLocaleDateString("pt-BR", { timeZone: "America/Fortaleza", weekday: "long", day: "2-digit", month: "2-digit" });
      const envio = await enviarEmail({
        para: equipe,
        assunto: atrasos ? `Atendimento: ${atrasos} pendência(s) para hoje` : "Atendimento: resumo do dia",
        html: montarEmail({
          remetente: { tipo: "equipe" },
          previa: atrasos ? `${atrasos} pendência(s) pedem ação hoje.` : "O que entrou e o que acompanhar hoje.",
          etiqueta: { texto: `Resumo do atendimento · ${hoje}`, tom: atrasos ? "urgente" : "marca" },
          titulo: atrasos ? `${atrasos === 1 ? "1 pendência" : `${atrasos} pendências`} para hoje` : "Resumo do dia",
          blocos: [...blocos, { botao: "Abrir os interessados", link: `${base()}/admin/interessados`, depois: { texto: "Abrir a mesa de pedidos", link: `${base()}/admin/pedidos` } }],
          assinatura: null,
          motivo: "Resumo diário do atendimento comercial, enviado só quando há algo a fazer.",
        }),
      });
      r.resumoEnviado = envio.enviado;
    }
  } catch (e) {
    r.erros.push(`leads/resumo: ${e instanceof Error ? e.message : String(e)}`);
  }

  return r;
}
