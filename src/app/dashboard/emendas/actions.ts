"use server";

import { revalidatePath } from "next/cache";
import { lerSessao, ehGestor } from "@/lib/sessao";
import { buscarPrefeitura } from "@/lib/dados-prefeitura";
import { limitarUso } from "@/lib/rate-limit";
import { exigirPlano } from "@/lib/exigir-plano";
import { buscarEmendasPix, gravarEmendas } from "@/lib/emendas-pix-servidor";
import { FalhaTransferegov } from "@/lib/transferegov";

export type ResultadoEmendas = { ok: true; quantidade: number } | { ok: false; erro: string };

/** Lê agora no Transferegov, sem esperar a rotina da madrugada. */
export async function atualizarEmendas(): Promise<ResultadoEmendas> {
  const sessao = await lerSessao();
  if (!sessao) return { ok: false, erro: "Sessão expirada. Entre novamente." };
  if (sessao.demo) return { ok: false, erro: "Na demonstração os dados são de exemplo." };
  if (!ehGestor(sessao)) return { ok: false, erro: "Apenas o prefeito ou um administrador pode atualizar." };
  if (!(await exigirPlano(sessao.prefeituraId, "gestao")).ok) return { ok: false, erro: "Disponível no plano Gestão." };
  if (!(await limitarUso(`emendas:${sessao.prefeituraId}`, 4, 60))) {
    return { ok: false, erro: "Muitas consultas seguidas. Tente de novo em uma hora." };
  }
  const prefeitura = await buscarPrefeitura(sessao.prefeituraId);
  if (!prefeitura?.cnpj) return { ok: false, erro: "Cadastre o CNPJ da prefeitura em Configurações: é por ele que o Transferegov encontra as emendas." };
  try {
    const emendas = await buscarEmendasPix(prefeitura.cnpj);
    await gravarEmendas(sessao.prefeituraId, emendas);
    revalidatePath("/dashboard/emendas");
    return { ok: true, quantidade: emendas.length };
  } catch (e) {
    return { ok: false, erro: e instanceof FalhaTransferegov ? `${e.message}. A rotina tenta de novo sozinha amanhã.` : "Não foi possível consultar o Transferegov agora." };
  }
}
