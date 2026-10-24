"use server";

import { z } from "zod";
import { db } from "@/db";
import { leads } from "@/db/schema";
import { gerarId } from "@/lib/id";
import { enviarEmail } from "@/lib/email";
import { montarEmail, saudacao, type Bloco } from "@/lib/email-modelo";
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
  let gravado = false;
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
    gravado = true;
  } catch (e) {
    console.error("[projecao] falha ao gravar:", e);
  }

  // 2) monta a projeção com a série que o Tesouro tiver.
  let corpo: Bloco[];
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

    corpo = linhas.map((l) => ({ p: l }));
  } catch (e) {
    console.error("[projecao] falha ao montar:", e);
    corpo = [{ destaque: "O Tesouro não respondeu no momento do envio. Refazemos a consulta e mandamos.", tom: "atencao" }];
  }

  const base = process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "https://cidadeia.vercel.app";

  const cidade = `${municipio.nome}/${municipio.uf}`;
  const paraVoce = await enviarEmail({
    guardarNaCaixaDeSaida: true,
    para: dados.email,
    assunto: `Projeção da despesa com pessoal — ${cidade}`,
    html: montarEmail({
      remetente: { tipo: "cidadeia" },
      previa: `Para onde vai a despesa com pessoal de ${municipio.nome} até o fim do exercício.`,
      etiqueta: { texto: `Projeção · ${cidade}` },
      titulo: `A despesa com pessoal de ${municipio.nome} até o fim do ano`,
      saudacao: saudacao(dados.nome),
      blocos: [
        { p: `Como pedido, esta é a projeção do exercício para ${cidade}, calculada sobre o que a própria prefeitura declarou ao Tesouro Nacional no RGF:` },
        ...corpo,
        { botao: "Ver o painel funcionando", link: `${base}/demo` },
        { nota: "O CidadeIA não substitui o parecer da contabilidade nem a assessoria jurídica do município. Dados públicos do Siconfi (Tesouro Nacional)." },
      ],
      motivo: `Você recebe este e-mail porque pediu a projeção de ${cidade} no site do CidadeIA.`,
    }),
  });

  const paraEquipe = await enviarEmail({
    para: process.env.PROPOSTA_DESTINO_EMAIL?.trim() || DESTINO_EQUIPE_PADRAO,
    assunto: `Projeção pedida — ${cidade} — ${dados.cargo}`,
    html: montarEmail({
      remetente: { tipo: "equipe" },
      previa: `${dados.nome}, ${dados.cargo} · ${resumoEquipe}`,
      etiqueta: { texto: "Novo interessado · Projeção", tom: "marca" },
      titulo: `${dados.nome} pediu a projeção de ${cidade}`,
      blocos: [
        !paraVoce.enviado && { destaque: `O e-mail para a pessoa NÃO saiu: encaminhe à mão. Motivo: ${paraVoce.detalhe ?? paraVoce.motivo}`, tom: "urgente" },
        {
          dados: [
            ["Nome", dados.nome],
            ["Cargo", dados.cargo],
            ["E-mail", dados.email],
            ["Situação", resumoEquipe],
          ],
        },
        ...corpo,
        { botao: "Ver os interessados", link: `${base}/admin/interessados` },
      ],
      assinatura: null,
      motivo: "Aviso interno de novo interessado.",
    }),
  });

  // Nada gravado E nenhum aviso à equipe significa que o pedido não existe em
  // lugar nenhum. Dizer "chega em até um dia útil" aí é a mesma doença que
  // esta ação combate do outro lado: prometer o que não acontece.
  if (!gravado && !paraEquipe.enviado) {
    return {
      ok: false,
      erro:
        "Não conseguimos registrar o pedido agora. Nada foi perdido do seu lado: tente de novo " +
        "em alguns minutos, ou escreva para contato@cidadeia.com.br.",
    };
  }

  return { ok: true, enviadoParaVoce: paraVoce.enviado };
}
