import { and, eq, isNotNull, or } from "drizzle-orm";
import { db } from "@/db";
import { atendimentos, configPublica, prefeituras, usuarios } from "@/db/schema";
import { enviarEmail } from "@/lib/email";
import { linkApp } from "@/lib/url-app";
import type { TipoAtendimento } from "@/lib/atendimento";
import { PRAZOS } from "@/lib/prazo-atendimento";
import {
  areaDaManifestacao,
  destinatariosDaManifestacao,
  emailAvaliacaoParaEquipe,
  emailChegouParaEquipe,
  emailProrrogacaoParaCidadao,
  emailRecebidoParaCidadao,
  emailRespostaParaCidadao,
  prazoDeResposta,
} from "@/lib/ouvidoria-avisos";

// ── OS E-MAILS DA OUVIDORIA ── (ver ouvidoria-avisos.ts)
//
// Nenhuma destas funções lança erro: o e-mail é aviso, e falhar ao avisar
// não pode desfazer o protocolo do cidadão nem a resposta do servidor.
//
// E nenhuma delas guarda cópia na caixa de saída da equipe do CidadeIA
// (guardarNaCaixaDeSaida: false): nome, e-mail e texto do cidadão são da
// prefeitura. O que não sai, o cidadão vê consultando o protocolo, e a
// prefeitura vê no painel.

async function carregar(atendimentoId: string) {
  const [a] = await db
    .select({
      a: atendimentos,
      municipio: prefeituras.municipio,
      slug: configPublica.slug,
    })
    .from(atendimentos)
    .innerJoin(prefeituras, eq(prefeituras.id, atendimentos.prefeituraId))
    .leftJoin(configPublica, eq(configPublica.prefeituraId, atendimentos.prefeituraId))
    .where(eq(atendimentos.id, atendimentoId))
    .limit(1);
  return a ?? null;
}

const linkConsulta = (slug: string | null, protocolo: string, chave: string) =>
  slug
    ? linkApp(`/transparencia/${slug}?protocolo=${encodeURIComponent(protocolo)}&chave=${encodeURIComponent(chave)}#atendimento`)
    : linkApp("/transparencia");

export async function avisarManifestacaoNova(atendimentoId: string): Promise<void> {
  try {
    const r = await carregar(atendimentoId);
    if (!r) return;
    const { a } = r;
    const tipo = a.tipo as TipoAtendimento;
    const prazo = prazoDeResposta(tipo, new Date(a.createdAt));

    const pessoas = await equipeDaPrefeitura(a.prefeituraId);
    const equipe = emailChegouParaEquipe({
      municipio: r.municipio,
      protocolo: a.protocolo,
      tipo,
      assunto: a.assunto,
      area: tipo === "denuncia" ? null : areaDaManifestacao(a.secretaria),
      anonimo: a.anonimo,
      prazo,
      linkPainel: linkApp("/dashboard/atendimento"),
    });
    const envios = destinatariosDaManifestacao(a, pessoas).map((para) =>
      enviarEmail({ para, assunto: equipe.assunto, html: equipe.html, guardarNaCaixaDeSaida: false })
    );

    if (a.email) {
      const msg = emailRecebidoParaCidadao({
        municipio: r.municipio,
        nome: a.nome,
        protocolo: a.protocolo,
        chave: a.chaveConsulta,
        tipo,
        assunto: a.assunto,
        prazo,
        linkConsulta: linkConsulta(r.slug, a.protocolo, a.chaveConsulta),
      });
      envios.push(enviarEmail({ para: a.email, assunto: msg.assunto, html: msg.html, nomeRemetente: msg.remetente, guardarNaCaixaDeSaida: false }));
    }
    await Promise.all(envios);
  } catch (e) {
    console.error("[ouvidoria] falha ao avisar manifestação nova:", e);
  }
}

async function equipeDaPrefeitura(prefeituraId: string) {
  return db
    .select({ email: usuarios.email, cargo: usuarios.cargo, secretaria: usuarios.secretaria })
    .from(usuarios)
    .where(
      and(
        eq(usuarios.prefeituraId, prefeituraId),
        isNotNull(usuarios.email),
        or(eq(usuarios.cargo, "prefeito"), eq(usuarios.cargo, "admin"), eq(usuarios.cargo, "secretario"))
      )
    );
}

/** "Não resolveu" ou "em parte": avisa quem recebeu a manifestação (lib/avaliacao-cidadao.ts). */
export async function avisarAvaliacaoRuim(atendimentoId: string, nota: "parte" | "nao", comComentario: boolean): Promise<void> {
  try {
    const r = await carregar(atendimentoId);
    if (!r) return;
    const { a } = r;
    const msg = emailAvaliacaoParaEquipe({
      municipio: r.municipio,
      protocolo: a.protocolo,
      tipo: a.tipo as TipoAtendimento,
      assunto: a.assunto,
      nota,
      comComentario,
      linkPainel: linkApp("/dashboard/atendimento"),
    });
    const pessoas = await equipeDaPrefeitura(a.prefeituraId);
    await Promise.all(destinatariosDaManifestacao(a, pessoas).map((para) => enviarEmail({ para, assunto: msg.assunto, html: msg.html, guardarNaCaixaDeSaida: false })));
  } catch (e) {
    console.error("[ouvidoria] falha ao avisar avaliação:", e);
  }
}

export async function avisarResposta(atendimentoId: string): Promise<boolean> {
  try {
    const r = await carregar(atendimentoId);
    if (!r?.a.email || !r.a.resposta) return false;
    const status = r.a.status;
    if (status === "aberto") return false;
    const msg = emailRespostaParaCidadao({
      municipio: r.municipio,
      nome: r.a.nome,
      protocolo: r.a.protocolo,
      status,
      resposta: r.a.resposta,
      linkConsulta: linkConsulta(r.slug, r.a.protocolo, r.a.chaveConsulta),
    });
    const envio = await enviarEmail({ para: r.a.email, assunto: msg.assunto, html: msg.html, nomeRemetente: msg.remetente, guardarNaCaixaDeSaida: false });
    return envio.enviado;
  } catch (e) {
    console.error("[ouvidoria] falha ao avisar resposta:", e);
    return false;
  }
}

export async function avisarProrrogacao(atendimentoId: string, justificativa: string): Promise<boolean> {
  try {
    const r = await carregar(atendimentoId);
    if (!r?.a.email) return false;
    const tipo = r.a.tipo as TipoAtendimento;
    const prazo = prazoDeResposta(tipo, new Date(r.a.createdAt), true);
    const msg = emailProrrogacaoParaCidadao({
      municipio: r.municipio,
      nome: r.a.nome,
      protocolo: r.a.protocolo,
      diasExtras: PRAZOS[tipo].prorrogacao ?? 0,
      novoPrazo: prazo.data,
      justificativa,
      lei: `${PRAZOS[tipo].lei}, ${PRAZOS[tipo].artigo}`,
      linkConsulta: linkConsulta(r.slug, r.a.protocolo, r.a.chaveConsulta),
    });
    const envio = await enviarEmail({ para: r.a.email, assunto: msg.assunto, html: msg.html, nomeRemetente: msg.remetente, guardarNaCaixaDeSaida: false });
    return envio.enviado;
  } catch (e) {
    console.error("[ouvidoria] falha ao avisar prorrogação:", e);
    return false;
  }
}
