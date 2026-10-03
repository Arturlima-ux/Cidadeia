"use server";

import { z } from "zod";
import { db } from "@/db";
import { leads } from "@/db/schema";
import { gerarId } from "@/lib/id";
import { enviarEmail } from "@/lib/email";
import { limitarUso } from "@/lib/rate-limit";
import { ehCodigoIbge, buscarMunicipioPorCodigo } from "@/lib/populacao-ibge";
import { buscarSerieRgf } from "@/lib/siconfi-rgf";
import { montarProjecao } from "@/lib/projecao-do-municipio";
import { CARGOS_LEAD } from "@/lib/leads";

// ── O PEDIDO DA PROJEÇÃO ──
//
// Os três fatos do herói são abertos. Isto é o outro lado da trava: a
// trajetória medida sobre vários períodos e o que ainda dá para fazer antes da
// fronteira. Trabalho do software, não dado público.
//
// ── A TELA NÃO PROMETE ENVIO QUE NÃO ACONTECE ──
//
// Enquanto o remetente do Resend for o gratuito, ele entrega só para o dono da
// conta e recusa qualquer outro destinatário. `enviarEmail` devolve false
// nesse caso, e `enviadoParaVoce` carrega isso até a tela — que diz "recebido,
// chega em até um dia útil" em vez de "enviado". A equipe encaminha à mão a
// partir do aviso. Com domínio próprio o mesmo código passa a entregar
// sozinho, sem mudar nada. É o contrato que `registrarLeadRaioX` já usa.

const DESTINO_EQUIPE_PADRAO = "arturmlo2005@gmail.com";

const schema = z.object({
  codigoIbge: z.string().refine(ehCodigoIbge, "Município inválido."),
  nome: z.string().trim().min(2, "Informe seu nome.").max(120),
  cargo: z.enum(CARGOS_LEAD, { message: "Escolha uma opção." }),
  email: z.string().trim().email("E-mail inválido.").max(160),
});

export type ResultadoProjecao =
  | { ok: true; enviadoParaVoce: boolean }
  | { ok: false; erro: string; campo?: string };

function escapar(t: string): string {
  return t.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] ?? c);
}

export async function solicitarProjecao(entrada: unknown): Promise<ResultadoProjecao> {
  const parsed = schema.safeParse(entrada);
  if (!parsed.success) {
    const primeiro = parsed.error.issues[0];
    return {
      ok: false,
      erro: primeiro?.message ?? "Dados inválidos.",
      campo: String(primeiro?.path?.[0] ?? ""),
    };
  }
  const dados = parsed.data;

  if (!(await limitarUso(`projecao:${dados.email.toLowerCase()}`, 5, 60))) {
    return { ok: false, erro: "Já recebemos pedidos deste e-mail há pouco. Tente de novo em uma hora." };
  }

  const municipio = await buscarMunicipioPorCodigo(dados.codigoIbge);
  if (!municipio) return { ok: false, erro: "Município não encontrado." };

  // 1) grava. É o registro que vale, mesmo que nenhum e-mail saia.
  try {
    await db.insert(leads).values({
      id: gerarId("lead"),
      origem: "projecao",
      codigoIbge: municipio.codigo,
      municipio: municipio.nome,
      uf: municipio.uf,
      nome: dados.nome,
      cargo: dados.cargo,
      email: dados.email,
    });
  } catch (e) {
    console.error("[projecao] falha ao gravar:", e);
  }

  // 2) monta a projeção com a série que o Tesouro tiver.
  let corpo: string;
  let resumoEquipe = "sem série suficiente";
  try {
    const projecao = montarProjecao(await buscarSerieRgf(municipio.codigo));
    const linhas: string[] = [];

    if (projecao.percentualAtual === null) {
      linhas.push(
        "O Tesouro não tem RGF publicado deste município nos últimos períodos, então não há " +
          "trajetória a medir. Essa ausência é, por si, um achado."
      );
    } else {
      linhas.push(
        `Despesa com pessoal na apuração mais recente: ` +
          `${projecao.percentualAtual.toFixed(2).replace(".", ",")}% da receita corrente líquida, ` +
          `sobre ${projecao.apuracoes} apuração(ões) publicadas.`
      );
      if (projecao.travessia) {
        linhas.push(`${projecao.travessia.titulo}: ${projecao.travessia.quando}.`);
        linhas.push(projecao.travessia.oQue);
        linhas.push(projecao.travessia.base);
      } else {
        linhas.push(
          "A série publicada ainda não sustenta uma data de travessia — são necessárias ao menos " +
            "quatro apurações com ritmo estável, e prever sobre menos que isso seria inventar."
        );
      }
      linhas.push(...projecao.acoes);
      resumoEquipe = `${projecao.percentualAtual.toFixed(2)}% · ${projecao.situacaoAtual ?? "-"}`;
    }

    corpo = linhas.map((l) => `<p>${escapar(l)}</p>`).join("\n");
  } catch (e) {
    console.error("[projecao] falha ao montar:", e);
    corpo = "<p>O Tesouro não respondeu no momento do envio. Refazemos a consulta e mandamos.</p>";
  }

  const base = process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "https://cidadeia.vercel.app";

  const paraVoce = await enviarEmail({
    para: dados.email,
    assunto: `Projeção da despesa com pessoal — ${municipio.nome}/${municipio.uf}`,
    html: [
      `<p>Olá, ${escapar(dados.nome)}.</p>`,
      `<p>Projeção do exercício para ${escapar(municipio.nome)}/${municipio.uf}, sobre o que a própria prefeitura declarou ao Tesouro:</p>`,
      corpo,
      `<p>O painel funcionando, com uma prefeitura fictícia: <a href="${base}/demo">${base}/demo</a>.</p>`,
      `<p>O CidadeIA não substitui o parecer da contabilidade interna nem a assessoria jurídica do município.</p>`,
    ].join("\n"),
  });

  await enviarEmail({
    para: process.env.PROPOSTA_DESTINO_EMAIL?.trim() || DESTINO_EQUIPE_PADRAO,
    assunto: `Projeção pedida — ${municipio.nome}/${municipio.uf} — ${dados.cargo}`,
    html: [
      `<p><strong>${escapar(dados.nome)}</strong> · ${escapar(dados.cargo)} · ${escapar(dados.email)}</p>`,
      `<p>${escapar(municipio.nome)}/${municipio.uf} · ${resumoEquipe}</p>`,
      paraVoce.enviado
        ? "<p>E-mail para a pessoa: enviado.</p>"
        : `<p><strong>O e-mail para a pessoa NÃO saiu — encaminhe à mão.</strong> Motivo: ${escapar(paraVoce.detalhe ?? paraVoce.motivo)}</p>`,
      corpo,
    ].join("\n"),
  });

  return { ok: true, enviadoParaVoce: paraVoce.enviado };
}
