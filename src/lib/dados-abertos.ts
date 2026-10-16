import { rotuloDaNota, type Nota } from "@/lib/avaliacao-cidadao";
// ── DADOS ABERTOS DO PORTAL ──
//
// Nos portais de prefeitura, o dado vem em PDF ou numa tabela que não se
// baixa, e não se sabe de quando é. No Piauí, nenhum dos municípios avaliados
// tinha sequer um plano de dados abertos. Aqui cada conjunto do portal se
// baixa num clique, em CSV (abre no Excel) e em JSON (para sistemas), com
// endereço fixo, e cada um diz quando foi atualizado e se entrou sozinho de
// uma fonte oficial ou foi lançado pela prefeitura.
//
// Parte pura: os conjuntos, as colunas, o arquivo e o selo de atualização.

import { dataDoBanco } from "@/lib/data-do-banco";

export type Conjunto = "obras" | "compras" | "contratos" | "unidades-de-saude" | "escolas" | "servicos" | "manifestacoes" | "dinheiro";

export type Coluna = { chave: string; titulo: string };

export type DefinicaoConjunto = {
  chave: Conjunto;
  titulo: string;
  descricao: string;
  colunas: Coluna[];
};

export const CONJUNTOS: DefinicaoConjunto[] = [
  {
    chave: "obras",
    titulo: "Obras",
    descricao: "Cada obra com o andamento, o bairro, o valor do contrato e as datas.",
    colunas: [
      { chave: "nome", titulo: "Obra" },
      { chave: "situacao", titulo: "Situação" },
      { chave: "percentual_feito", titulo: "Percentual feito" },
      { chave: "bairro", titulo: "Bairro" },
      { chave: "valor_contrato", titulo: "Valor do contrato (R$)" },
      { chave: "fornecedor", titulo: "Empresa" },
      { chave: "inicio", titulo: "Início da vigência" },
      { chave: "fim", titulo: "Fim da vigência" },
    ],
  },
  {
    chave: "compras",
    titulo: "Compras e licitações",
    descricao: "Os processos de compra, com o objeto, a modalidade, o valor estimado e a situação.",
    colunas: [
      { chave: "numero", titulo: "Processo" },
      { chave: "objeto", titulo: "O que está sendo comprado" },
      { chave: "modalidade", titulo: "Modalidade" },
      { chave: "valor_estimado", titulo: "Valor estimado (R$)" },
      { chave: "situacao", titulo: "Situação" },
      { chave: "prazo_final", titulo: "Prazo final" },
    ],
  },
  {
    chave: "contratos",
    titulo: "Contratos",
    descricao: "Os contratos publicados no PNCP: empresa, objeto, valor e vigência.",
    colunas: [
      { chave: "numero", titulo: "Contrato" },
      { chave: "objeto", titulo: "Objeto" },
      { chave: "fornecedor", titulo: "Empresa" },
      { chave: "valor_global", titulo: "Valor global (R$)" },
      { chave: "assinatura", titulo: "Assinatura" },
      { chave: "inicio", titulo: "Início da vigência" },
      { chave: "fim", titulo: "Fim da vigência" },
    ],
  },
  {
    chave: "unidades-de-saude",
    titulo: "Unidades de saúde",
    descricao: "A rede de saúde do município, com endereço, telefone, horário e coordenadas.",
    colunas: [
      { chave: "nome", titulo: "Unidade" },
      { chave: "tipo", titulo: "Tipo" },
      { chave: "bairro", titulo: "Bairro" },
      { chave: "endereco", titulo: "Endereço" },
      { chave: "telefone", titulo: "Telefone" },
      { chave: "horario", titulo: "Horário" },
      { chave: "latitude", titulo: "Latitude" },
      { chave: "longitude", titulo: "Longitude" },
    ],
  },
  {
    chave: "escolas",
    titulo: "Escolas e creches",
    descricao: "A rede municipal de ensino, com endereço, telefone, etapas e coordenadas.",
    colunas: [
      { chave: "nome", titulo: "Escola" },
      { chave: "etapas", titulo: "Etapas" },
      { chave: "bairro", titulo: "Bairro" },
      { chave: "endereco", titulo: "Endereço" },
      { chave: "telefone", titulo: "Telefone" },
      { chave: "latitude", titulo: "Latitude" },
      { chave: "longitude", titulo: "Longitude" },
    ],
  },
  {
    chave: "servicos",
    titulo: "Carta de Serviços",
    descricao: "Os serviços da prefeitura, com o que levar, o prazo e onde pedir (Lei 13.460/2017).",
    colunas: [
      { chave: "servico", titulo: "Serviço" },
      { chave: "descricao", titulo: "Descrição" },
      { chave: "o_que_levar", titulo: "O que levar" },
      { chave: "prazo", titulo: "Prazo" },
      { chave: "onde_pedir", titulo: "Onde pedir" },
      { chave: "secretaria", titulo: "Secretaria" },
    ],
  },
  {
    chave: "manifestacoes",
    titulo: "Manifestações do cidadão",
    descricao: "Pedidos, reclamações, denúncias e elogios do último ano, e quanto tempo a prefeitura levou para responder. Sem nome, contato ou texto de ninguém.",
    colunas: [
      { chave: "tipo", titulo: "Tipo" },
      { chave: "area", titulo: "Área" },
      { chave: "situacao", titulo: "Situação" },
      { chave: "aberta_em", titulo: "Aberta em" },
      { chave: "respondida_em", titulo: "Respondida em" },
      { chave: "dias_para_responder", titulo: "Dias para responder" },
      { chave: "avaliacao_do_cidadao", titulo: "A resposta resolveu? (quem pediu)" },
    ],
  },
  {
    chave: "dinheiro",
    titulo: "Receita e despesa",
    descricao: "O que entrou e o que saiu do caixa da prefeitura, em cada atualização publicada.",
    colunas: [
      { chave: "data", titulo: "Data" },
      { chave: "receita", titulo: "Receita (R$)" },
      { chave: "despesa", titulo: "Despesa (R$)" },
      { chave: "saldo", titulo: "Saldo (R$)" },
    ],
  },
];

export const definicaoDe = (c: string) => CONJUNTOS.find((d) => d.chave === c) ?? null;

export type Linha = Record<string, string | number | null>;

/**
 * CSV no padrão que o Excel brasileiro abre sem perguntar nada: ponto e
 * vírgula entre colunas, vírgula decimal e a marca UTF-8 no começo, senão o
 * acento vira lixo. O JSON, para sistemas, leva os números como número.
 */
export function paraCsv(colunas: Coluna[], linhas: Linha[]): string {
  const celula = (v: string | number | null) => {
    if (v === null || v === undefined) return "";
    const t = typeof v === "number" ? String(v).replace(".", ",") : v;
    return /[;"\n\r]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
  };
  const cabecalho = colunas.map((c) => celula(c.titulo)).join(";");
  const corpo = linhas.map((l) => colunas.map((c) => celula(l[c.chave] ?? null)).join(";"));
  return `﻿${[cabecalho, ...corpo].join("\r\n")}\r\n`;
}

export function paraJson(def: DefinicaoConjunto, linhas: Linha[], meta: { municipio: string; frescor: Frescor | null; endereco: string }): string {
  return JSON.stringify(
    {
      conjunto: def.titulo,
      municipio: meta.municipio,
      descricao: def.descricao,
      atualizado_em: meta.frescor ? dataDoBanco(meta.frescor.quando).toISOString() : null,
      origem: meta.frescor
        ? meta.frescor.sozinho
          ? meta.frescor.fonte.startsWith("próprio")
            ? `registrado pelo ${meta.frescor.fonte}`
            : `importado automaticamente do ${meta.frescor.fonte}`
          : "lançado pela prefeitura"
        : null,
      licenca: "Uso livre, citando a fonte (Lei 12.527/2011, art. 8º, § 3º, III)",
      endereco: meta.endereco,
      colunas: def.colunas,
      registros: linhas,
    },
    null,
    2
  );
}

// ── o selo de atualização ──

export type Frescor = {
  /** ISO. */
  quando: string;
  /** true: entrou sozinho de uma fonte oficial; false: lançado pela prefeitura. */
  sozinho: boolean;
  fonte: string;
};

/** "hoje", "ontem", "há 5 dias", "em 12/09/2026". */
export function haQuanto(quando: string, hoje: Date = new Date()): string {
  const d = dataDoBanco(quando);
  if (Number.isNaN(d.getTime())) return "";
  const dia = (x: Date) => x.toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });
  const dias = Math.round((new Date(`${dia(hoje)}T12:00:00Z`).getTime() - new Date(`${dia(d)}T12:00:00Z`).getTime()) / 86_400_000);
  if (dias <= 0) return "hoje";
  if (dias === 1) return "ontem";
  if (dias < 30) return `há ${dias} dias`;
  return `em ${d.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}`;
}

export function descreverFrescor(f: Frescor, hoje: Date = new Date()): string {
  const quando = haQuanto(f.quando, hoje);
  if (f.sozinho && f.fonte.startsWith("próprio")) return "Ao vivo: cada manifestação entra na hora";
  return f.sozinho ? `Atualizado sozinho ${quando}, direto do ${f.fonte}` : `Atualizado pela prefeitura ${quando}`;
}

/** O mais recente entre vários instantes (texto do banco ou ISO). */
export function maisRecente(datas: (string | null | undefined)[]): string | null {
  const validas = datas.filter((d): d is string => !!d);
  if (!validas.length) return null;
  return validas.reduce((a, b) => (dataDoBanco(b) > dataDoBanco(a) ? b : a));
}

// ── as linhas de cada conjunto, a partir do que o portal já carrega ──

const SITUACAO_OBRA: Record<string, string> = { planejada: "Vai começar", em_andamento: "Em andamento", atrasada: "Atrasada", concluida: "Pronta", paralisada: "Parada" };
const SITUACAO_COMPRA: Record<string, string> = { planejamento: "Em preparação", publicada: "Aberta para propostas", em_disputa: "Empresas disputando", homologada: "Concluída", cancelada: "Cancelada" };
const TIPO_MANIFESTACAO: Record<string, string> = { protocolo: "Pedido de serviço", reclamacao: "Reclamação", denuncia: "Denúncia", sugestao: "Sugestão", elogio: "Elogio", informacao: "Pedido de informação" };
const SITUACAO_MANIFESTACAO: Record<string, string> = { aberto: "Aberta", em_analise: "Em análise", respondido: "Respondida", encerrado: "Encerrada" };
const dia = (t: string | null | undefined) => (t ? dataDoBanco(t).toISOString().slice(0, 10) : null);

export type Fontes = {
  obras: { nome: string; status: string; progressoAtual: number | null; bairro: string | null; valorContrato: number | null; fornecedorNome: string | null; vigenciaInicio: string | null; vigenciaFim: string | null }[];
  compras: { numero: string; objeto: string; modalidade: string | null; valorEstimado: number | null; status: string; prazoFinal: string | null }[];
  contratos: { numeroContrato: string | null; objeto: string; fornecedorNome: string | null; valorGlobal: number | null; dataAssinatura: string | null; vigenciaInicio: string | null; vigenciaFim: string | null }[];
  unidades: { nome: string; tipo: string; bairro: string | null; endereco: string | null; telefone: string | null; turno: string | null; latitude: number | null; longitude: number | null }[];
  escolas: { nome: string; etapas: string | null; bairro: string | null; endereco: string | null; telefone: string | null; latitude: number | null; longitude: number | null }[];
  servicos: { titulo: string; conteudo: string; requisitos: string | null; prazo: string | null; contato: string | null; secretaria: string | null }[];
  manifestacoes: { tipo: string; secretaria: string | null; status: string; createdAt: string; respondidoEm: string | null; avaliacao?: Nota | null }[];
  dinheiro: { atualizadoEm: string; receita: number | null; despesas: number | null; saldo: number | null }[];
};

export function linhasDe(conjunto: Conjunto, f: Fontes): Linha[] {
  switch (conjunto) {
    case "obras":
      return f.obras.map((o) => ({
        nome: o.nome,
        situacao: SITUACAO_OBRA[o.status] ?? o.status,
        percentual_feito: o.progressoAtual,
        bairro: o.bairro,
        valor_contrato: o.valorContrato,
        fornecedor: o.fornecedorNome,
        inicio: dia(o.vigenciaInicio),
        fim: dia(o.vigenciaFim),
      }));
    case "compras":
      return f.compras.map((c) => ({
        numero: c.numero,
        objeto: c.objeto,
        modalidade: c.modalidade,
        valor_estimado: c.valorEstimado,
        situacao: SITUACAO_COMPRA[c.status] ?? c.status,
        prazo_final: dia(c.prazoFinal),
      }));
    case "contratos":
      return f.contratos.map((c) => ({
        numero: c.numeroContrato,
        objeto: c.objeto,
        fornecedor: c.fornecedorNome,
        valor_global: c.valorGlobal,
        assinatura: dia(c.dataAssinatura),
        inicio: dia(c.vigenciaInicio),
        fim: dia(c.vigenciaFim),
      }));
    case "unidades-de-saude":
      return f.unidades.map((u) => ({ nome: u.nome, tipo: u.tipo, bairro: u.bairro, endereco: u.endereco, telefone: u.telefone, horario: u.turno, latitude: u.latitude, longitude: u.longitude }));
    case "escolas":
      return f.escolas.map((e) => ({ nome: e.nome, etapas: e.etapas, bairro: e.bairro, endereco: e.endereco, telefone: e.telefone, latitude: e.latitude, longitude: e.longitude }));
    case "servicos":
      return f.servicos.map((s) => ({ servico: s.titulo, descricao: s.conteudo, o_que_levar: s.requisitos, prazo: s.prazo, onde_pedir: s.contato, secretaria: s.secretaria }));
    case "manifestacoes":
      // Só tipo, área, situação e datas. Nome, contato, assunto e texto
      // nunca saem, nem para quem pede o arquivo.
      return f.manifestacoes.map((m) => {
        const aberta = dia(m.createdAt);
        const respondida = dia(m.respondidoEm);
        return {
          tipo: TIPO_MANIFESTACAO[m.tipo] ?? m.tipo,
          area: m.secretaria,
          situacao: SITUACAO_MANIFESTACAO[m.status] ?? m.status,
          aberta_em: aberta,
          respondida_em: respondida,
          dias_para_responder:
            aberta && respondida ? Math.max(0, Math.round((Date.parse(respondida) - Date.parse(aberta)) / 86_400_000)) : null,
          avaliacao_do_cidadao: m.avaliacao ? rotuloDaNota(m.avaliacao) : null,
        };
      });
    case "dinheiro":
      return f.dinheiro.map((d) => ({ data: dia(d.atualizadoEm), receita: d.receita, despesa: d.despesas, saldo: d.saldo }));
  }
}
