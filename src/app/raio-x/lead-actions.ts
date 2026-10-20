"use server";

import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { leads } from "@/db/schema";
import { gerarId } from "@/lib/id";
import { enviarEmail } from "@/lib/email";
import { limitarUso } from "@/lib/rate-limit";
import { ehCodigoIbge, buscarMunicipioPorCodigo } from "@/lib/populacao-ibge";
import { montarRaioX } from "@/lib/raio-x";
import { RESSALVA_MINIMOS, resumoDoRaioX } from "@/lib/raio-x-texto";
import { montarEmail, saudacao, type Bloco } from "@/lib/email-modelo";
import { caminhoDoRaioX } from "@/lib/slug-municipio";
import { CARGOS_LEAD } from "@/lib/leads";

// ── O LEAD DO RAIO-X ──
//
// "Receba este Raio-X por e-mail, com a leitura de cada número." Grava o
// lead, tenta enviar para a pessoa, e avisa a equipe com o Raio-X e os
// dados de quem pediu.
//
// ── HONESTIDADE NO RESULTADO ──
// Enquanto o Resend estiver no plano gratuito (entrega só para o dono da
// conta), o e-mail para o lead é recusado. A tela NÃO diz "enviado" nesse
// caso: diz "recebido — chega em até um dia útil", e a equipe encaminha à
// mão a partir do aviso. Com domínio próprio, o mesmo código passa a
// entregar sozinho, e a tela passa a dizer "enviado" — sem mudar nada.

const DESTINO_EQUIPE_PADRAO = "arturmlo2005@gmail.com";

const schema = z.object({
  codigoIbge: z.string().refine(ehCodigoIbge, "Município inválido."),
  nome: z.string().trim().min(2, "Informe seu nome.").max(120),
  cargo: z.enum(CARGOS_LEAD, { message: "Escolha uma opção." }),
  email: z.string().trim().email("E-mail inválido.").max(160),
});

export type ResultadoLead = { ok: true; enviadoParaVoce: boolean } | { ok: false; erro: string; campo?: string };

export async function registrarLeadRaioX(entrada: unknown): Promise<ResultadoLead> {
  const parsed = schema.safeParse(entrada);
  if (!parsed.success) {
    const primeiro = parsed.error.issues[0];
    return { ok: false, erro: primeiro?.message ?? "Dados inválidos.", campo: String(primeiro?.path?.[0] ?? "") };
  }
  const dados = parsed.data;

  if (!(await limitarUso(`lead:${dados.email.toLowerCase()}`, 5, 60))) {
    return { ok: false, erro: "Já recebemos pedidos deste e-mail há pouco. Tente de novo em uma hora." };
  }

  const municipio = await buscarMunicipioPorCodigo(dados.codigoIbge);
  if (!municipio) return { ok: false, erro: "Município não encontrado." };

  const id = gerarId("lead");

  // 1) grava — é o registro que vale, mesmo que nenhum e-mail saia
  let gravado = false;
  try {
    await db.insert(leads).values({
      id,
      origem: "raio-x",
      codigoIbge: municipio.codigo,
      municipio: municipio.nome,
      uf: municipio.uf,
      nome: dados.nome,
      cargo: dados.cargo,
      email: dados.email,
    });
    gravado = true;
  } catch (e) {
    console.error("[lead] falha ao gravar:", e);
  }

  // 2) o Raio-X em texto (o mesmo que a página mostra)
  let corpo: Bloco[];
  let resumoEquipe = "";
  try {
    const r = await montarRaioX(municipio.nome, municipio.uf);
    if (r.ok) {
      const linhas = resumoDoRaioX(r.raioX).filter((l) => l !== RESSALVA_MINIMOS);
      corpo = [{ lista: linhas }, { nota: RESSALVA_MINIMOS }];
      resumoEquipe = linhas.slice(1, 3).join(" ");
    } else {
      corpo = [{ destaque: r.erro, tom: "atencao" }];
    }
  } catch {
    corpo = [{ destaque: "O Tesouro Nacional não respondeu no momento do envio. Os números estão na página do município, que é refeita toda semana.", tom: "atencao" }];
  }
  const base = process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "https://cidadeia.vercel.app";
  const link = `${base}${caminhoDoRaioX(municipio)}`;
  const cidade = `${municipio.nome}/${municipio.uf}`;

  // 3) para a pessoa
  const paraVoce = await enviarEmail({
    para: dados.email,
    assunto: `Raio-X da Prefeitura de ${cidade}: o que o Tesouro já publicou`,
    html: montarEmail({
      remetente: { tipo: "cidadeia" },
      previa: `A leitura de cada número que ${municipio.nome} declarou ao Tesouro Nacional.`,
      etiqueta: { texto: `Raio-X · ${cidade}` },
      titulo: `O Raio-X da Prefeitura de ${municipio.nome}`,
      saudacao: saudacao(dados.nome),
      blocos: [
        { p: `Como pedido, aqui está o Raio-X de ${cidade}, com a leitura de cada número que a prefeitura declarou ao Tesouro Nacional:` },
        ...corpo,
        { botao: "Ver o Raio-X completo", link, depois: { texto: "Ver o painel funcionando", link: `${base}/demo` } },
        { secao: "O que não aparece em base pública" },
        { p: "Obra parada, prazo de ouvidoria vencendo, dispensa virando fracionamento, contrato perto do fim: é isso que o CidadeIA acompanha por dentro, todos os dias, e avisa antes de o Tribunal de Contas apontar." },
        { nota: "Dados públicos do Siconfi (Tesouro Nacional) e do IBGE. A página do município é refeita toda semana com o que o Tesouro publicar." },
      ],
      motivo: `Você recebe este e-mail porque pediu o Raio-X de ${cidade} no site do CidadeIA.`,
    }),
  });

  // 4) para a equipe — sempre, com os dados de quem pediu
  await enviarEmail({
    para: process.env.PROPOSTA_DESTINO_EMAIL?.trim() || DESTINO_EQUIPE_PADRAO,
    assunto: `Lead do Raio-X — ${cidade} — ${dados.cargo}`,
    html: montarEmail({
      remetente: { tipo: "equipe" },
      previa: `${dados.nome}, ${dados.cargo}. ${resumoEquipe}`,
      etiqueta: { texto: "Novo interessado · Raio-X", tom: "marca" },
      titulo: `${dados.nome} pediu o Raio-X de ${cidade}`,
      blocos: [
        !paraVoce.enviado && { destaque: `O e-mail para a pessoa NÃO saiu: encaminhe à mão. Motivo: ${paraVoce.detalhe ?? paraVoce.motivo}`, tom: "urgente" },
        !gravado && { destaque: "Não gravado no banco (tabela leads ausente?).", tom: "urgente" },
        {
          dados: [
            ["Nome", dados.nome],
            ["Cargo", dados.cargo],
            ["E-mail", dados.email],
            ["Município", `${cidade} · ${new Intl.NumberFormat("pt-BR").format(municipio.populacao)} hab.`],
          ],
        },
        ...corpo,
        { botao: "Abrir o Raio-X", link, depois: { texto: "Ver os interessados", link: `${base}/admin/interessados` } },
      ],
      assinatura: null,
      motivo: "Aviso interno de novo interessado.",
    }),
  });

  if (paraVoce.enviado && gravado) {
    try {
      await db.update(leads).set({ emailEnviado: true }).where(eq(leads.id, id));
    } catch {
      /* secundário */
    }
  }

  return { ok: true, enviadoParaVoce: paraVoce.enviado };
}
