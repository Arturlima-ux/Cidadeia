import type { DeteccaoAutomatica } from "@/lib/deteccao-automatica";
import { dataDoBanco } from "@/lib/data-do-banco";

// ── O RADAR DA TRANSPARÊNCIA ──
//
// O Tribunal de Contas e o Programa Nacional de Transparência Pública (PNTP,
// da Atricon) conferem o portal item por item: tem receita e despesa? tem as
// licitações e os contratos? tem a estrutura com endereço e horário? tem a
// Carta de Serviços? A prefeitura costuma descobrir o que falta quando sai a
// avaliação.
//
// Aqui a conferência é diária e contra os dados do próprio portal. Cada item
// diz se está cumprido, COMO (sozinho, pela importação automática, ou pelo
// que a prefeitura publicou) e o que fazer quando falta. O que depende de
// gente (secretarias, serviços, perguntas frequentes) vira alerta para quem
// pode resolver; o que o CidadeIA cumpre sozinho só aparece como cumprido.

export type ItemRadar = {
  chave: string;
  nome: string;
  base: string;
  situacao: "ok" | "falta" | "velho";
  /** Como está sendo cumprido, ou o que fazer. */
  detalhe: string;
  /** Cumprido sem ninguém precisar fazer nada. */
  sozinho: boolean;
};

export type EntradaRadar = {
  portalAtivo: boolean;
  publicadas: { tipo: string }[];
  financeiro: { atualizadoEm: string | null; automatico: boolean } | null;
  compras: number;
  contratos: number;
  obras: number;
  emendas: number;
  /** Planos que trazem dado sozinho. */
  importaLicitacoes: boolean;
  importaObras: boolean;
};

const DIA = 86_400_000;
/** Receita e despesa com mais que isto é "tempo real" só no nome (LC 131). */
const DIAS_FINANCEIRO = 60;

export function radarDaTransparencia(e: EntradaRadar, hoje: Date = new Date()): ItemRadar[] {
  const tem = (tipo: string) => e.publicadas.some((p) => p.tipo === tipo);
  const quando = e.financeiro?.atualizadoEm ? dataDoBanco(e.financeiro.atualizadoEm).getTime() : NaN;
  const idadeFin = Number.isFinite(quando) ? (hoje.getTime() - quando) / DIA : null;

  const itens: ItemRadar[] = [
    {
      chave: "financeiro",
      nome: "Receitas e despesas",
      base: "LC 131/2009 e LAI, art. 8º, § 1º, III",
      situacao: !e.financeiro ? "falta" : idadeFin !== null && idadeFin > DIAS_FINANCEIRO ? "velho" : "ok",
      detalhe: !e.financeiro
        ? "Ative a exibição do financeiro nas configurações do portal ou contrate o Gestão, que importa do Tesouro sozinho."
        : idadeFin !== null && idadeFin > DIAS_FINANCEIRO
          ? `Última atualização há ${Math.round(idadeFin)} dias. A lei pede informação em tempo real.`
          : e.financeiro.automatico
            ? "Importado sozinho do Tesouro Nacional."
            : "Atualizado pela prefeitura.",
      sozinho: !!e.financeiro?.automatico,
    },
    {
      chave: "licitacoes",
      nome: "Licitações e contratos",
      base: "LAI, art. 8º, § 1º, IV",
      situacao: e.compras + e.contratos > 0 ? "ok" : "falta",
      detalhe:
        e.compras + e.contratos > 0
          ? e.importaLicitacoes
            ? "Importados sozinhos do Portal Nacional de Contratações Públicas toda semana."
            : "Publicados pela prefeitura."
          : "Nenhuma licitação ou contrato no portal. O módulo Licitações importa do PNCP sozinho.",
      sozinho: e.importaLicitacoes && e.compras + e.contratos > 0,
    },
    {
      chave: "obras",
      nome: "Obras",
      base: "LAI, art. 8º, § 1º, V",
      situacao: e.obras > 0 ? "ok" : "falta",
      detalhe: e.obras > 0 ? (e.importaObras ? "Saem sozinhas dos contratos de engenharia do PNCP." : "Publicadas pela prefeitura.") : "Nenhuma obra no portal. O módulo Obras monta a lista a partir dos contratos.",
      sozinho: e.importaObras && e.obras > 0,
    },
    {
      chave: "repasses",
      nome: "Repasses e transferências recebidos",
      base: "LAI, art. 8º, § 1º, II",
      situacao: e.emendas > 0 || tem("repasse") ? "ok" : "falta",
      detalhe:
        e.emendas > 0
          ? "As emendas Pix entram sozinhas do Transferegov toda semana."
          : tem("repasse")
            ? "Publicados pela prefeitura."
            : "Nenhum repasse publicado. Se a prefeitura recebe convênios ou emendas, publique em Publicações › Repasse.",
      sozinho: e.emendas > 0,
    },
    {
      chave: "estrutura",
      nome: "Secretarias, endereços e horários",
      base: "LAI, art. 8º, § 1º, I",
      situacao: tem("estrutura") ? "ok" : "falta",
      detalhe: tem("estrutura") ? "Publicado pela prefeitura." : "Cadastre cada secretaria com endereço, telefone e horário em Publicações. É o primeiro item que o Tribunal confere.",
      sozinho: false,
    },
    {
      chave: "servicos",
      nome: "Carta de Serviços ao Usuário",
      base: "Lei 13.460/2017, art. 7º",
      situacao: tem("servico") ? "ok" : "falta",
      detalhe: tem("servico") ? "Publicada pela prefeitura." : "Publique os serviços com o que levar, o prazo e onde pedir, em Publicações › Serviço ao cidadão.",
      sozinho: false,
    },
    {
      chave: "faq",
      nome: "Perguntas frequentes",
      base: "LAI, art. 8º, § 1º, VI",
      situacao: tem("faq") ? "ok" : "falta",
      detalhe: tem("faq") ? "Publicadas pela prefeitura." : "Publique as dúvidas que se repetem no balcão em Publicações › Pergunta frequente.",
      sozinho: false,
    },
    {
      chave: "sic",
      nome: "Pedido de informação e ouvidoria pela internet",
      base: "LAI, arts. 9º e 10; Lei 13.460/2017",
      situacao: e.portalAtivo ? "ok" : "falta",
      detalhe: e.portalAtivo ? "O formulário do portal registra, dá protocolo e conta o prazo sozinho." : "O portal está desativado: ative-o em Protocolo e ouvidoria.",
      sozinho: e.portalAtivo,
    },
    {
      chave: "estatistica",
      nome: "Relatório dos pedidos recebidos e atendidos",
      base: "LAI, art. 30, III",
      situacao: e.portalAtivo ? "ok" : "falta",
      detalhe: "A voz da cidade publica sozinha quantas manifestações chegaram, quantas foram respondidas e em quanto tempo.",
      sozinho: e.portalAtivo,
    },
    {
      chave: "dados-abertos",
      nome: "Dados abertos em formato legível por máquina",
      base: "LAI, art. 8º, § 3º, II e III",
      situacao: e.portalAtivo ? "ok" : "falta",
      detalhe: "Planilha e JSON de cada conjunto, gerados sozinhos a partir do portal.",
      sozinho: e.portalAtivo,
    },
    {
      chave: "busca",
      nome: "Ferramenta de pesquisa",
      base: "LAI, art. 8º, § 3º, I",
      situacao: e.portalAtivo ? "ok" : "falta",
      detalhe: "O \"Pergunte à cidade\" busca em tudo o que o portal publica.",
      sozinho: e.portalAtivo,
    },
    {
      chave: "acessibilidade",
      nome: "Acessibilidade",
      base: "LAI, art. 8º, § 3º, VIII; Lei 13.146/2015, art. 63",
      situacao: e.portalAtivo ? "ok" : "falta",
      detalhe: "Leitura em voz alta, letra maior, alto contraste e sem animação, no botão Acessibilidade.",
      sozinho: e.portalAtivo,
    },
  ];
  return itens;
}

/** Os que dependem de alguém publicar viram alerta (o resto é configuração ou módulo). */
const PRIORIDADE: Record<string, DeteccaoAutomatica["prioridade"]> = {
  estrutura: "medio",
  servicos: "medio",
  financeiro: "medio",
  faq: "info",
  repasses: "info",
};

export function achadosDoRadar(itens: ItemRadar[]): DeteccaoAutomatica[] {
  return itens
    .filter((i) => i.situacao !== "ok" && PRIORIDADE[i.chave])
    .map((i) => ({
      categoria: "dado_desatualizado" as const,
      prioridade: PRIORIDADE[i.chave],
      secretaria: null,
      titulo: i.situacao === "velho" ? `Portal: ${i.nome.toLowerCase()} desatualizado` : `Portal sem ${i.nome.toLowerCase()}`,
      descricao: `${i.detalhe} (${i.base})`,
      chave: `radar:${i.chave}:${i.situacao}`,
    }));
}
