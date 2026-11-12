import type { ContextoDashboard } from "@/lib/contexto-dashboard";
import { temAcessoSecretaria } from "@/lib/sessao";
import { dataDoBanco } from "@/lib/data-do-banco";
import { estadosDasNotificacoes, aprovacoesDeNotificacao, podeNotificarObra } from "@/lib/notificacao-servidor";
import { aprovacoesDeRenovacao, podeMontarRenovacao } from "@/lib/renovacao-servidor";
import { estadoDaRenovacaoNaLista } from "@/lib/renovacao-contrato";
import { lerVigencia, pedeAcao } from "@/lib/vigencia";
import { montarPedidoReposicao } from "@/lib/estoque-saude";
import { montarPedidoMerenda } from "@/lib/merenda";
import { buscarContratos } from "@/app/dashboard/secretarias/licitacoes/contratos-actions";
import { buscarEstoqueDaRede } from "@/app/dashboard/secretarias/saude/rede-actions";
import { buscarUnidadesSaude } from "@/app/dashboard/secretarias/saude/actions";
import { buscarMerendaDaRede } from "@/app/dashboard/secretarias/educacao/merenda-actions";
import { buscarRedeDeEscolas } from "@/app/dashboard/secretarias/educacao/rede-actions";
import {
  itemDaNotificacao,
  itemDaRenovacao,
  itemDoPedido,
  nosUltimos30Dias,
  ordenarFila,
  placarDa,
  type ItemPronto,
  type Placar,
} from "@/lib/pronto-para-aprovar";

// ── A FILA, LIDA DO BANCO ──
//
// Cada fonte é a MESMA leitura que a tela do módulo usa, com a guarda de
// acesso dela: o secretário de Educação não vê a notificação da obra, e um
// módulo não contratado não entra. Uma fonte que falha some da fila sem
// derrubar as outras.

const semFalhar = async <T,>(nome: string, f: () => Promise<T>, vazio: T): Promise<T> => {
  try {
    return await f();
  } catch (e) {
    console.error(`[pronto] ${nome}:`, (e as Error).name);
    return vazio;
  }
};

export async function carregarFila(ctx: ContextoDashboard, hoje: Date = new Date()): Promise<{ fila: ItemPronto[]; placar: Placar }> {
  const { sessao } = ctx;
  const id = sessao.prefeituraId;
  const fila: ItemPronto[] = [];
  let aprovados = 0;

  const obras = async () => {
    if (!ctx.temPlano("obras") || !podeNotificarObra(sessao)) return;
    const estados = await estadosDasNotificacoes(sessao, hoje);
    for (const [obraId, e] of estados) {
      const item = itemDaNotificacao({ obraId, obraNome: e.obraNome, motivo: e.motivo, estado: e.estado });
      if (item) fila.push(item);
    }
    const feitas = await aprovacoesDeNotificacao(id);
    aprovados += feitas.filter((a) => nosUltimos30Dias(dataDoBanco(a.createdAt), hoje)).length;
  };

  const contratos = async () => {
    if (!ctx.temPlano("licitacoes") || !podeMontarRenovacao(sessao)) return;
    const lista = await buscarContratos(id);
    if (!lista.length) return;
    const aprovacoes = await aprovacoesDeRenovacao(id);
    const prefeitura = {
      municipio: ctx.prefeitura.municipio,
      estado: ctx.prefeitura.estado,
      cnpj: ctx.prefeitura.cnpj,
      prefeito: ctx.prefeitura.prefeito,
    };
    for (const c of lista) {
      const vigencia = lerVigencia({ objeto: c.objeto, vigenciaFim: c.vigenciaFim, fornecedorNome: c.fornecedorNome }, hoje);
      // Mesmo filtro da tela de Licitações, menos o contrato sem data: sem
      // data não há prazo, e documento de renovação sem prazo não é urgente
      // nem está pronto.
      if (!pedeAcao(vigencia.situacao) || vigencia.situacao === "sem_data") continue;
      const estado = estadoDaRenovacaoNaLista(
        c,
        lista,
        prefeitura,
        aprovacoes.filter((a) => a.contratoId === c.id)
      );
      if (!estado) continue;
      const item = itemDaRenovacao({
        contratoId: c.id,
        objeto: c.objeto,
        numeroContrato: c.numeroContrato,
        vigenciaTexto: vigencia.texto,
        situacao: vigencia.situacao,
        peso: vigencia.peso,
        estado: estado.estado,
      });
      if (item) fila.push(item);
    }
    aprovados += aprovacoes.filter((a) => nosUltimos30Dias(dataDoBanco(a.createdAt), hoje)).length;
  };

  const saude = async () => {
    if (!ctx.temPlano("saude") || !temAcessoSecretaria(sessao, "saude") || sessao.cargo === "unidade") return;
    const [estoque, unidades] = await Promise.all([buscarEstoqueDaRede(id), buscarUnidadesSaude(id)]);
    const nomeDe = new Map(unidades.map((u) => [u.id, u.nome]));
    const pedido = montarPedidoReposicao(estoque.map((l) => ({ ...l, unidadeNome: nomeDe.get(l.unidadeId) ?? "Unidade" })));
    const item = itemDoPedido("saude", pedido.map((p) => ({ situacao: p.situacao, local: p.unidadeId })));
    if (item) fila.push(item);
  };

  const merenda = async () => {
    if (!ctx.temPlano("educacao") || !temAcessoSecretaria(sessao, "educacao") || sessao.cargo === "escola") return;
    const [estoque, escolas] = await Promise.all([buscarMerendaDaRede(id), buscarRedeDeEscolas(id)]);
    const nomeDe = new Map(escolas.map((e) => [e.id, e.nome]));
    const pedido = montarPedidoMerenda(estoque.map((l) => ({ ...l, escolaNome: nomeDe.get(l.escolaId) ?? "Escola" })));
    const item = itemDoPedido("educacao", pedido.map((p) => ({ situacao: p.situacao, local: p.escolaId })));
    if (item) fila.push(item);
  };

  await Promise.all([
    semFalhar("obras", obras, undefined),
    semFalhar("contratos", contratos, undefined),
    semFalhar("saude", saude, undefined),
    semFalhar("merenda", merenda, undefined),
  ]);

  const ordenada = ordenarFila(fila);
  return { fila: ordenada, placar: placarDa(ordenada, aprovados) };
}
