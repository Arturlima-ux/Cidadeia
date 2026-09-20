import { montarProposta, porteDaPopulacao, PORTES, type PorteMunicipio } from "@/lib/precos";
import { LIMITE_DISPENSA, cabeNaDispensa } from "@/lib/contratacao";
import { NOME_PLANO_ADDON, type PlanoAddon } from "@/lib/planos";
import { detalheDoModulo } from "@/lib/modulos-detalhe";
import { modulosDoPedido } from "@/lib/pedidos";

// ── A PROPOSTA COMERCIAL, MONTADA A PARTIR DO PEDIDO ──
//
// O site promete "proposta e termo de referência em até um dia útil". O
// termo já sai pronto do kit; a proposta era escrita à mão para cada
// pedido. Aqui ela nasce do próprio pedido: município e faixa pelo IBGE,
// módulos com o valor da tabela interna, total mensal e anual, o
// enquadramento na dispensa, o que cada módulo entrega (a mesma lista da
// home) e os próximos passos do processo. Função pura: o PDF só desenha.
//
// ── OS DADOS DA EMPRESA ──
// Vêm do ambiente (EMPRESA_*, SUPORTE_*). Enquanto não existirem, a
// proposta sai com o marcador entre colchetes — igual ao kit — e a mesa
// avisa. Melhor um colchete visível do que um campo em branco que passa.

export type DadosEmpresa = {
  razaoSocial: string | null;
  cnpj: string | null;
  endereco: string | null;
  representante: string | null;
  emailSuporte: string | null;
  telefoneSuporte: string | null;
};

export function empresaDoAmbiente(env: NodeJS.ProcessEnv = process.env): DadosEmpresa {
  const v = (k: string) => env[k]?.trim() || null;
  return {
    razaoSocial: v("EMPRESA_RAZAO_SOCIAL"),
    cnpj: v("EMPRESA_CNPJ"),
    endereco: v("EMPRESA_ENDERECO"),
    representante: v("EMPRESA_REPRESENTANTE"),
    emailSuporte: v("SUPORTE_EMAIL"),
    telefoneSuporte: v("SUPORTE_TELEFONE"),
  };
}

/** Marcadores que ainda faltam preencher — a mesa mostra antes de baixar. */
export function pendenciasDaEmpresa(e: DadosEmpresa): string[] {
  const faltam: string[] = [];
  if (!e.razaoSocial) faltam.push("EMPRESA_RAZAO_SOCIAL");
  if (!e.cnpj) faltam.push("EMPRESA_CNPJ");
  if (!e.endereco) faltam.push("EMPRESA_ENDERECO");
  if (!e.representante) faltam.push("EMPRESA_REPRESENTANTE");
  if (!e.emailSuporte) faltam.push("SUPORTE_EMAIL");
  if (!e.telefoneSuporte) faltam.push("SUPORTE_TELEFONE");
  return faltam;
}

export type PedidoParaProposta = {
  id: string;
  municipio: string;
  uf: string;
  populacao: number;
  modulos: string; // JSON gravado no pedido
  nome: string;
  cargo: string | null;
  email: string;
  createdAt: string;
};

export type ItemDaProposta = {
  modulo: PlanoAddon;
  nome: string;
  resumo: string;
  capacidades: string[];
  mensal: number | null;
  anual: number | null;
};

export type PropostaComercial = {
  numero: string;
  emitidaEm: string; // ISO
  validaAte: string; // ISO
  destinatario: { prefeitura: string; municipio: string; uf: string; nome: string; cargo: string | null; email: string };
  municipio: { populacao: number; porte: PorteMunicipio; faixa: string };
  itens: ItemDaProposta[];
  totalMensal: number;
  totalAnual: number;
  /** true quando algum módulo está sem preço na faixa (faixas grandes). */
  sobConsulta: boolean;
  enquadramento: {
    cabeNaDispensa: boolean;
    limite: number;
    base: string;
    percentualDoLimite: number | null;
    texto: string;
  };
  proximosPassos: string[];
  condicoes: string[];
  empresa: DadosEmpresa;
  pendenciasDaEmpresa: string[];
};

const DIAS_DE_VALIDADE = 30;

export function montarPropostaComercial(
  pedido: PedidoParaProposta,
  empresa: DadosEmpresa,
  hoje: Date = new Date()
): PropostaComercial {
  const modulos = modulosDoPedido(pedido.modulos);
  const porte = porteDaPopulacao(pedido.populacao);
  const faixa = PORTES.find((p) => p.chave === porte)?.rotulo ?? porte;
  const calculo = montarProposta({ porte, modulos });

  const itens: ItemDaProposta[] = calculo.itens.map((i) => {
    const d = detalheDoModulo(i.modulo);
    return {
      modulo: i.modulo,
      nome: NOME_PLANO_ADDON[i.modulo],
      resumo: d?.resumo ?? "",
      capacidades: d?.capacidades ?? [],
      mensal: i.mensal,
      anual: i.mensal === null ? null : i.mensal * 12,
    };
  });

  const validaAte = new Date(hoje);
  validaAte.setDate(validaAte.getDate() + DIAS_DE_VALIDADE);

  const sobConsulta = calculo.incompleta;
  const cabe = !sobConsulta && cabeNaDispensa(calculo.anual);
  const percentual = sobConsulta ? null : Math.round((calculo.anual / LIMITE_DISPENSA.valor) * 100);

  const enquadramentoTexto = sobConsulta
    ? `Município na faixa "${faixa} habitantes": o valor desta faixa é definido em proposta específica, após conversa sobre o volume de dados e o número de secretarias. Os demais itens seguem a tabela.`
    : cabe
      ? `O total de doze meses (${moeda(calculo.anual)}) corresponde a ${percentual}% do limite de ${moeda(LIMITE_DISPENSA.valor)} para dispensa de licitação por valor (${LIMITE_DISPENSA.base}, atualizado pelo ${LIMITE_DISPENSA.atualizadoPor}). A contratação pode ser feita por dispensa, sem pregão.`
      : `O total de doze meses (${moeda(calculo.anual)}) ultrapassa o limite de ${moeda(LIMITE_DISPENSA.valor)} para dispensa por valor (${LIMITE_DISPENSA.base}). O caminho é o pregão eletrônico, ou a contratação por etapas dentro do limite.`;

  return {
    numero: `${hoje.getFullYear()}-${pedido.id.slice(-8).toUpperCase()}`,
    emitidaEm: hoje.toISOString(),
    validaAte: validaAte.toISOString(),
    destinatario: {
      prefeitura: `Prefeitura Municipal de ${pedido.municipio}`,
      municipio: pedido.municipio,
      uf: pedido.uf,
      nome: pedido.nome,
      cargo: pedido.cargo,
      email: pedido.email,
    },
    municipio: { populacao: pedido.populacao, porte, faixa },
    itens,
    totalMensal: calculo.mensal,
    totalAnual: calculo.anual,
    sobConsulta,
    enquadramento: {
      cabeNaDispensa: cabe,
      limite: LIMITE_DISPENSA.valor,
      base: LIMITE_DISPENSA.base,
      percentualDoLimite: percentual,
      texto: enquadramentoTexto,
    },
    proximosPassos: [
      "Aceite desta proposta por e-mail, indicando os módulos escolhidos.",
      "O termo de referência, a minuta de contrato, o acordo de tratamento de dados e o acordo de nível de serviço já acompanham (kit de contratação) e podem ser adaptados pela assessoria jurídica do Município.",
      cabe
        ? "Instrução do processo de dispensa de licitação por valor, com a justificativa de preço baseada nesta proposta."
        : "Instrução do processo de contratação no rito indicado no enquadramento acima.",
      "Assinatura do contrato. Os módulos são ativados na conta da prefeitura no mesmo dia, e a Implantação guiada indica o que cadastrar primeiro.",
      "Faturamento mensal contra nota fiscal, com pagamento por empenho e ordem bancária, conforme a rotina da tesouraria.",
    ],
    condicoes: [
      "Valores mensais, por módulo, sem fidelidade: o Município pode encerrar qualquer módulo com aviso de 30 dias.",
      "Inclui hospedagem, atualizações, suporte em dias úteis e o portal público do município (no módulo Essencial).",
      "Sem custo de implantação: a Implantação guiada faz parte do sistema.",
      "Reajuste anual pelo IPCA, na data de aniversário do contrato.",
      `Proposta válida por ${DIAS_DE_VALIDADE} dias.`,
    ],
    empresa,
    pendenciasDaEmpresa: pendenciasDaEmpresa(empresa),
  };
}

export function moeda(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
