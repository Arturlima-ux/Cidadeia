"use server";

import { db } from "@/db";
import { licitacoes, prefeituras } from "@/db/schema";
import { eq } from "drizzle-orm";
import { lerSessao } from "@/lib/sessao";
import { limitarUso } from "@/lib/rate-limit";
import {
  buscarContratacoesPncp,
  conferirPublicacao,
  resumirConferencia,
  processosSoNoPncp,
  paraLicitacaoLocal,
  type Conferencia,
  type ContratacaoPncp,
} from "@/lib/pncp";
import { temAcessoSecretaria } from "@/lib/sessao";
import { randomUUID } from "node:crypto";

export type ResultadoConferencia =
  | {
      ok: true;
      conferencias: Conferencia[];
      total: number;
      publicadas: number;
      ano: number;
      /** Varredura completa? Sem isso a tela não pode cobrar publicação. */
      completa: boolean;
      modalidadesIncompletas: string[];
      /** Quantos o PNCP tem no ano, ao todo. É a régua do cadastro local. */
      totalNoPncp: number;
      /** O que está no PNCP e ninguém cadastrou — a oferta de importação. */
      soNoPncp: ContratacaoPncp[];
    }
  | { ok: false; erro: string; limiteExcedido: boolean };

/**
 * Confere quais processos da prefeitura constam no PNCP.
 *
 * Roda sob pedido, e não a cada abertura de tela, por dois motivos: o PNCP
 * limita requisições com facilidade, e cada conferência dispara uma chamada
 * por modalidade. O limite local abaixo protege o PNCP de nós — sem ele, um
 * usuário atualizando a página levaria a consulta ao 429 e a tela passaria a
 * dizer "não publicado" para processos que estão lá.
 */
export async function conferirNoPncp(ano: number): Promise<ResultadoConferencia> {
  const sessao = await lerSessao();
  if (!sessao) {
    return { ok: false, erro: "Sessão expirada. Entre novamente.", limiteExcedido: false };
  }
  // Esta ação conferia só a sessão. Server action despacha por id no cabeçalho
  // Next-Action, não por caminho, então o proxy que guarda /dashboard não
  // alcança isto: qualquer conta logada da prefeitura — inclusive a direção de
  // uma escola, que é a conta de menor confiança do produto — chamava a
  // conferência e recebia a lista de processos de Licitações. É o mesmo furo da
  // rota de relatório, e a correção é a mesma pergunta positiva.
  if (!temAcessoSecretaria(sessao, "licitacoes")) {
    return { ok: false, erro: "Sem acesso à pasta de Licitações.", limiteExcedido: false };
  }

  const podeUsar = await limitarUso(`pncp:${sessao.prefeituraId}`, 12, 10);
  if (!podeUsar) {
    return {
      ok: false,
      erro: "Muitas conferências seguidas. Aguarde alguns minutos antes de tentar de novo.",
      limiteExcedido: true,
    };
  }

  const [prefeitura] = await db
    .select({ cnpj: prefeituras.cnpj })
    .from(prefeituras)
    .where(eq(prefeituras.id, sessao.prefeituraId))
    .limit(1);

  if (!prefeitura?.cnpj) {
    return {
      ok: false,
      erro: "O CNPJ do município não está cadastrado — sem ele não dá para consultar o PNCP.",
      limiteExcedido: false,
    };
  }

  const consulta = await buscarContratacoesPncp(prefeitura.cnpj, ano);
  if (!consulta.ok) {
    return { ok: false, erro: consulta.erro, limiteExcedido: consulta.limiteExcedido };
  }

  const locais = await db
    .select({
      id: licitacoes.id,
      numero: licitacoes.numero,
      objeto: licitacoes.objeto,
      status: licitacoes.status,
      // Sem estes dois o casamento cai para número+ano, que nos dados reais
      // confunde "Dispensa 5/2026" com "Pregão 5/2026".
      numeroControlePncp: licitacoes.numeroControlePncp,
      modalidade: licitacoes.modalidade,
    })
    .from(licitacoes)
    .where(eq(licitacoes.prefeituraId, sessao.prefeituraId));

  // Processo em planejamento ainda não deveria estar no PNCP — cobrar
  // publicação dele seria alarme falso, e alarme falso ensina o gestor a
  // ignorar a tela.
  const conferiveis = locais.filter((l) => l.status !== "planejamento");

  const conferencias = conferirPublicacao(conferiveis, consulta.contratacoes, consulta.completa);
  const resumo = resumirConferencia(conferencias);

  return {
    ok: true,
    conferencias,
    total: resumo.total,
    publicadas: resumo.publicadas,
    ano,
    completa: consulta.completa,
    modalidadesIncompletas: consulta.modalidadesIncompletas,
    totalNoPncp: consulta.contratacoes.length,
    // A oferta de importação compara contra TODOS os processos locais, não só
    // os conferíveis: um processo em planejamento não é cobrado por
    // publicação, mas também não deve ser importado de novo.
    soNoPncp: processosSoNoPncp(locais, consulta.contratacoes),
  };
}

export type ResultadoImportacao =
  | { ok: true; importados: number; ignorados: number }
  | { ok: false; erro: string };

/**
 * Traz para o cadastro os processos que o PNCP tem e ninguém digitou.
 *
 * ── POR QUE ISTO MUDA O MÓDULO DE LUGAR ──
 *
 * Fracionamento e concentração de fornecedor rodavam sobre o que um servidor
 * teve paciência de digitar — e o próprio texto da tela admitia que a detecção
 * "depende de um histórico real de processos". O histórico existe: é público,
 * obrigatório desde abril de 2024, e num município de verdade tem centenas de
 * linhas. Ninguém vai digitar 480 dispensas, e enquanto não entrarem o detector
 * de fracionamento olha uma amostra escolhida por quem cadastrou.
 *
 * A consulta é refeita aqui em vez de receber a lista da tela: lista que vem do
 * cliente é lista que o cliente pode trocar, e isto escreve no banco.
 */
export async function importarDoPncp(ano: number): Promise<ResultadoImportacao> {
  const sessao = await lerSessao();
  if (!sessao) return { ok: false, erro: "Sessão expirada. Entre novamente." };
  if (!temAcessoSecretaria(sessao, "licitacoes")) {
    return { ok: false, erro: "Sem acesso à pasta de Licitações." };
  }
  // Gestor decide o que entra no cadastro. Cargo de instalação não importa
  // processo, mesmo tendo a pasta.
  if (sessao.cargo === "unidade" || sessao.cargo === "escola") {
    return { ok: false, erro: "Seu acesso não inclui alterar o cadastro de processos." };
  }

  const podeUsar = await limitarUso(`pncp-importar:${sessao.prefeituraId}`, 6, 10);
  if (!podeUsar) {
    return { ok: false, erro: "Muitas importações seguidas. Aguarde alguns minutos." };
  }

  const [prefeitura] = await db
    .select({ cnpj: prefeituras.cnpj })
    .from(prefeituras)
    .where(eq(prefeituras.id, sessao.prefeituraId))
    .limit(1);
  if (!prefeitura?.cnpj) {
    return { ok: false, erro: "O CNPJ do município não está cadastrado." };
  }

  const consulta = await buscarContratacoesPncp(prefeitura.cnpj, ano);
  if (!consulta.ok) return { ok: false, erro: consulta.erro };

  const locais = await db
    .select({
      id: licitacoes.id,
      numero: licitacoes.numero,
      objeto: licitacoes.objeto,
      status: licitacoes.status,
      // Sem estes dois o casamento cai para número+ano, que nos dados reais
      // confunde "Dispensa 5/2026" com "Pregão 5/2026".
      numeroControlePncp: licitacoes.numeroControlePncp,
      modalidade: licitacoes.modalidade,
    })
    .from(licitacoes)
    .where(eq(licitacoes.prefeituraId, sessao.prefeituraId));

  const novos = processosSoNoPncp(locais, consulta.contratacoes);
  if (novos.length === 0) return { ok: true, importados: 0, ignorados: 0 };

  const linhas = novos
    .map((c) => {
      const campos = paraLicitacaoLocal(c);
      return campos ? { id: randomUUID(), prefeituraId: sessao.prefeituraId, ...campos } : null;
    })
    .filter((l): l is NonNullable<typeof l> => l !== null);

  if (linhas.length > 0) await db.insert(licitacoes).values(linhas);

  return { ok: true, importados: linhas.length, ignorados: novos.length - linhas.length };
}
