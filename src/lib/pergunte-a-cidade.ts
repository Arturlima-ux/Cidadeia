// ── PERGUNTE À CIDADE ──
//
// O defeito mais comum dos sites de prefeitura: para achar alguma coisa, o
// morador precisa saber qual secretaria cuida dela, e a busca, quando existe,
// devolve página em branco. Num estudo de usabilidade, um em cada três não
// achou o endereço da UPA. E quando ele pergunta, a resposta é "olha no
// portal", e o dado não está lá.
//
// Aqui o morador escreve do jeito dele, "onde tem posto de saúde?", "quanto
// custou a obra da praça?", "como tiro alvará?", e recebe a resposta pronta,
// com o endereço, o telefone, o valor ou o andamento, e o link para o dado.
// Sem IA paga e sem mandar a pergunta para lugar nenhum: o portal inteiro vira
// um índice que roda no próprio celular.
//
// Quando não há resposta, a pergunta não morre: vira um pedido de informação
// formal à prefeitura (LAI, 20 dias), já preenchido.

export type TipoItem = "servico" | "saude" | "escola" | "obra" | "compra" | "dinheiro" | "publicacao" | "contato" | "acao";

export type ItemDaCidade = {
  id: string;
  tipo: TipoItem;
  titulo: string;
  /** A resposta, numa frase. */
  resposta: string;
  /** Linhas extras: endereço, telefone, horário, valor. */
  detalhes: string[];
  /** Âncora no portal ou endereço externo (mapa, serviço online). */
  link: { href: string; rotulo: string } | null;
  /** Texto pesquisável, já normalizado. */
  termos: string;
  /** Desempate: o que costuma ser procurado vem antes. */
  peso: number;
};

export const ROTULO_TIPO: Record<TipoItem, string> = {
  servico: "Serviço",
  saude: "Saúde",
  escola: "Educação",
  obra: "Obra",
  compra: "Compra",
  dinheiro: "Dinheiro",
  publicacao: "Publicado pela prefeitura",
  contato: "Contato",
  acao: "No portal",
};

/** Minúsculas, sem acento, só letras e números. */
export function normalizar(t: string): string {
  return t
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const PARADAS = new Set(
  "a o as os de da do das dos e em no na nos nas um uma uns umas para pra pro por com sem que qual quais quem onde como quando quanto quanta quantos quantas tem ter tenho eu meu minha minhas meus voce voces ele ela isso esse essa este esta aqui ali la e ou se ja mais muito muita fazer faco faz posso pode preciso quero sobre ao aos sao foi vai esta estao the ha"
    .split(" ")
);

// O jeito do morador falar → o jeito do dado estar escrito. Cada palavra da
// pergunta puxa as da direita.
const SINONIMOS: Record<string, string[]> = {
  posto: ["ubs", "saude", "unidade", "basica"],
  postinho: ["ubs", "saude", "unidade"],
  medico: ["saude", "ubs", "hospital", "unidade", "consulta"],
  consulta: ["saude", "ubs", "agendamento"],
  doente: ["saude", "ubs", "upa", "hospital"],
  emergencia: ["upa", "hospital", "samu", "pronto"],
  urgencia: ["upa", "hospital", "samu", "pronto"],
  ambulancia: ["samu"],
  remedio: ["farmacia", "medicamento", "saude"],
  vacina: ["vacina", "vacinacao", "saude", "ubs"],
  dentista: ["odonto", "saude", "ubs"],
  escola: ["escola", "educacao", "ensino", "creche"],
  creche: ["creche", "infantil", "educacao"],
  matricula: ["matricula", "escola", "educacao"],
  filho: ["escola", "creche", "educacao", "matricula"],
  merenda: ["merenda", "alimentacao", "escolar"],
  buraco: ["pavimentacao", "asfalto", "rua", "obra", "pedido"],
  asfalto: ["pavimentacao", "asfalto", "obra"],
  rua: ["pavimentacao", "obra", "rua", "calcamento"],
  calcamento: ["pavimentacao", "calcamento", "obra"],
  praca: ["praca", "obra", "reforma"],
  ponte: ["ponte", "obra"],
  obra: ["obra", "construcao", "reforma", "ampliacao"],
  luz: ["iluminacao", "poste", "lampada"],
  poste: ["iluminacao", "poste"],
  lixo: ["coleta", "limpeza", "lixo", "residuo"],
  entulho: ["coleta", "entulho", "limpeza"],
  agua: ["agua", "saneamento", "abastecimento"],
  esgoto: ["esgoto", "saneamento"],
  arvore: ["poda", "arvore", "meio", "ambiente"],
  imposto: ["iptu", "tributo", "taxa", "issqn", "itbi"],
  iptu: ["iptu", "tributo", "imposto"],
  taxa: ["taxa", "tributo", "alvara"],
  alvara: ["alvara", "licenca", "funcionamento"],
  empresa: ["alvara", "issqn", "nota", "fiscal", "mei"],
  nota: ["nota", "fiscal", "nfse"],
  certidao: ["certidao", "negativa", "debito"],
  emprego: ["emprego", "vaga", "concurso", "seletivo"],
  concurso: ["concurso", "seletivo", "edital"],
  dinheiro: ["dinheiro", "receita", "despesa", "gasto", "orcamento"],
  gasto: ["despesa", "gasto", "dinheiro"],
  gastou: ["despesa", "gasto", "dinheiro"],
  arrecadou: ["receita", "dinheiro"],
  orcamento: ["orcamento", "receita", "despesa", "dinheiro"],
  salario: ["folha", "pessoal", "servidor"],
  custou: ["valor", "contrato", "custo"],
  custa: ["valor", "contrato", "custo"],
  preco: ["valor", "contrato", "custo"],
  licitacao: ["licitacao", "compra", "pregao", "edital"],
  compra: ["compra", "licitacao", "pregao"],
  comprando: ["compra", "licitacao"],
  contrato: ["contrato", "licitacao", "compra"],
  reclamar: ["reclamacao", "ouvidoria", "pedido"],
  reclamacao: ["reclamacao", "ouvidoria", "pedido"],
  denunciar: ["denuncia", "ouvidoria"],
  denuncia: ["denuncia", "ouvidoria"],
  protocolo: ["protocolo", "acompanhar", "pedido"],
  pedido: ["pedido", "protocolo", "solicitacao"],
  telefone: ["telefone", "contato"],
  endereco: ["endereco", "contato"],
  horario: ["horario", "funcionamento", "turno"],
  aberto: ["horario", "funcionamento", "turno"],
  prefeito: ["prefeito", "gabinete"],
  secretaria: ["secretaria", "estrutura", "contato"],
  secretario: ["secretaria", "estrutura", "contato"],
  atrasada: ["atrasada", "parada", "paralisada"],
  atrasadas: ["atrasada", "parada", "paralisada"],
  parada: ["parada", "paralisada", "atrasada"],
  pronta: ["pronta", "concluida"],
  prontas: ["pronta", "concluida"],
};

export function palavrasDaPergunta(pergunta: string): string[] {
  return normalizar(pergunta)
    .split(" ")
    .filter((p) => p.length > 1 && !PARADAS.has(p));
}

/** Plural simples: "obras" acha "obra", "escolas" acha "escola". */
const raiz = (p: string) => (p.length > 4 && p.endsWith("s") ? p.slice(0, -1) : p);

export type Resultado = ItemDaCidade & { pontos: number };

/**
 * As melhores respostas para a pergunta. Cada palavra vale mais quando aparece
 * no título; o sinônimo vale metade da palavra dita, ou menos. Precisa casar ao menos
 * uma palavra de verdade, senão a lista sairia cheia de coisa sem relação.
 */
export function buscar(itens: ItemDaCidade[], pergunta: string, limite = 6): Resultado[] {
  const palavras = palavrasDaPergunta(pergunta).map(raiz);
  if (!palavras.length) return [];
  const extras = [...new Set(palavras.flatMap((p) => SINONIMOS[p] ?? SINONIMOS[`${p}s`] ?? []))].filter((s) => !palavras.includes(s));

  const resultados: Resultado[] = [];
  for (const item of itens) {
    const titulo = ` ${normalizar(item.titulo)} `;
    const corpo = ` ${item.termos} `;
    let pontos = 0;
    let casou = 0;
    for (const p of palavras) {
      const naPalavra = new RegExp(`\\b${p}`);
      if (naPalavra.test(titulo)) {
        pontos += 3;
        casou++;
      } else if (naPalavra.test(corpo)) {
        pontos += 2;
        casou++;
      }
    }
    for (const s of extras) {
      const naPalavra = new RegExp(`\\b${s}`);
      if (naPalavra.test(titulo)) {
        pontos += 1;
        casou++;
      } else if (naPalavra.test(corpo)) pontos += 0.5;
    }
    if (!casou) continue;
    // Pergunta inteira contida no título: é exatamente isto.
    if (titulo.includes(` ${palavras.join(" ")}`)) pontos += 4;
    resultados.push({ ...item, pontos: pontos + item.peso * 0.1 });
  }
  resultados.sort((a, b) => b.pontos - a.pontos);
  // Muito abaixo da melhor resposta é ruído: some, para a lista dizer
  // "é isto" e não "pode ser qualquer coisa".
  const corte = (resultados[0]?.pontos ?? 0) * 0.45;
  return resultados.filter((r) => r.pontos >= corte).slice(0, limite);
}

// ── montar o índice a partir do que o portal já tem ──

const moeda = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const mapa = (lat: number | null, lng: number | null, nome: string, municipio: string) =>
  lat !== null && lng !== null
    ? { href: `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, rotulo: "Como chegar" }
    : { href: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${nome}, ${municipio}`)}`, rotulo: "Ver no mapa" };

const NOME_UNIDADE: Record<string, string> = {
  ubs: "Unidade Básica de Saúde (posto)",
  posto: "Posto de saúde",
  hospital: "Hospital",
  samu: "SAMU",
  upa: "UPA, pronto atendimento",
  caps: "CAPS, saúde mental",
  clinica: "Clínica",
  laboratorio: "Laboratório",
  farmacia: "Farmácia",
  vigilancia: "Vigilância em saúde",
  outro: "Unidade de saúde",
};

const OBRA: Record<string, string> = {
  planejada: "vai começar",
  em_andamento: "em andamento",
  atrasada: "atrasada",
  concluida: "pronta",
  paralisada: "parada",
};

const COMPRA: Record<string, string> = {
  planejamento: "em preparação",
  publicada: "aberta para propostas",
  em_disputa: "com empresas disputando",
  homologada: "concluída",
  cancelada: "cancelada",
};

export type DadosDoIndice = {
  municipio: string;
  servicos: { id: string; titulo: string; conteudo: string; requisitos: string | null; prazo: string | null; contato: string | null; linkExterno: string | null; secretaria: string | null }[];
  outrasPublicacoes: { id: string; tipo: string; titulo: string; conteudo: string; secretaria: string | null }[];
  unidades: { id: string; nome: string; tipo: string; bairro: string | null; endereco: string | null; telefone: string | null; turno: string | null; latitude: number | null; longitude: number | null }[];
  escolas: { id: string; nome: string; bairro: string | null; endereco: string | null; telefone: string | null; etapas: string | null; latitude: number | null; longitude: number | null }[];
  obras: { id: string; nome: string; status: string; bairro: string | null; valorContrato: number | null; progressoAtual: number | null }[];
  compras: { id: string; objeto: string; numero: string; status: string; valorEstimado: number | null }[];
  dinheiro: { receita: number | null; despesas: number | null; saldo: number | null } | null;
};

const linha = (rotulo: string, v: string | null | undefined) => (v && v.trim() ? `${rotulo}: ${v.trim()}` : null);
const curto = (t: string, n = 180) => (t.length > n ? `${t.slice(0, n - 1).trimEnd()}…` : t);

export function montarIndice(d: DadosDoIndice): ItemDaCidade[] {
  const itens: ItemDaCidade[] = [];
  const add = (i: Omit<ItemDaCidade, "termos"> & { extra?: string }) => {
    const { extra, ...resto } = i;
    itens.push({ ...resto, termos: normalizar([i.titulo, i.resposta, ...i.detalhes, extra ?? ""].join(" ")) });
  };

  for (const s of d.servicos) {
    add({
      id: `servico:${s.id}`,
      tipo: "servico",
      titulo: s.titulo,
      resposta: curto(s.conteudo),
      detalhes: [linha("O que levar", s.requisitos), linha("Prazo", s.prazo), linha("Onde pedir", s.contato), s.secretaria].filter((x): x is string => !!x),
      link: s.linkExterno ? { href: s.linkExterno, rotulo: "Fazer online" } : { href: "#servicos", rotulo: "Ver na Carta de Serviços" },
      peso: 8,
      extra: "servico carta como fazer pedir solicitar",
    });
  }

  for (const u of d.unidades) {
    const tipo = NOME_UNIDADE[u.tipo] ?? "Unidade de saúde";
    add({
      id: `saude:${u.id}`,
      tipo: "saude",
      titulo: u.nome,
      resposta: `${tipo}${u.bairro ? `, no bairro ${u.bairro}` : ""}.`,
      detalhes: [linha("Endereço", u.endereco), linha("Telefone", u.telefone), linha("Horário", u.turno)].filter((x): x is string => !!x),
      link: mapa(u.latitude, u.longitude, u.nome, d.municipio),
      peso: u.tipo === "ubs" || u.tipo === "upa" || u.tipo === "hospital" ? 9 : 6,
      extra: `saude ${u.tipo} ${tipo} unidade atendimento ${u.bairro ?? ""}`,
    });
  }

  for (const e of d.escolas) {
    add({
      id: `escola:${e.id}`,
      tipo: "escola",
      titulo: e.nome,
      resposta: `Escola da rede${e.bairro ? `, no bairro ${e.bairro}` : ""}${e.etapas ? `. ${e.etapas}` : ""}.`,
      detalhes: [linha("Endereço", e.endereco), linha("Telefone", e.telefone)].filter((x): x is string => !!x),
      link: mapa(e.latitude, e.longitude, e.nome, d.municipio),
      peso: 7,
      extra: `escola educacao ensino matricula ${e.bairro ?? ""}`,
    });
  }

  for (const o of d.obras) {
    const situacao = OBRA[o.status] ?? "em andamento";
    add({
      id: `obra:${o.id}`,
      tipo: "obra",
      titulo: o.nome,
      resposta: `Obra ${situacao}${o.progressoAtual !== null && o.progressoAtual > 0 && o.status !== "concluida" ? `, com ${Math.round(o.progressoAtual)}% feito` : ""}.`,
      detalhes: [o.bairro ? `Bairro: ${o.bairro}` : null, o.valorContrato !== null ? `Valor do contrato: ${moeda(o.valorContrato)}` : null].filter((x): x is string => !!x),
      link: { href: "#obras", rotulo: "Ver todas as obras" },
      peso: 6,
      extra: `obra ${situacao} ${o.status} valor custo contrato ${o.bairro ?? ""}`,
    });
  }

  for (const c of d.compras) {
    const situacao = COMPRA[c.status] ?? "em andamento";
    add({
      id: `compra:${c.id}`,
      tipo: "compra",
      titulo: c.objeto,
      resposta: `Compra ${situacao} (processo ${c.numero}).`,
      detalhes: c.valorEstimado !== null ? [`Valor estimado: ${moeda(c.valorEstimado)}`] : [],
      link: { href: "#compras", rotulo: "Ver as compras" },
      peso: 4,
      extra: `compra licitacao contrato ${situacao} valor`,
    });
  }

  for (const p of d.outrasPublicacoes) {
    add({
      id: `publicacao:${p.id}`,
      tipo: p.tipo === "estrutura" ? "contato" : "publicacao",
      titulo: p.titulo,
      resposta: curto(p.conteudo),
      detalhes: p.secretaria ? [p.secretaria] : [],
      link: { href: "#publicacoes", rotulo: "Ler completo" },
      peso: p.tipo === "faq" ? 7 : p.tipo === "estrutura" ? 6 : 3,
      extra: p.tipo === "estrutura" ? "secretaria secretario contato telefone endereco horario" : p.tipo,
    });
  }

  if (d.dinheiro?.receita) {
    const { receita, despesas, saldo } = d.dinheiro;
    const deCem = despesas !== null ? Math.round((despesas / receita) * 100) : null;
    add({
      id: "dinheiro",
      tipo: "dinheiro",
      titulo: "Quanto a prefeitura arrecadou e gastou",
      resposta:
        deCem !== null
          ? `Entraram ${moeda(receita)} e já foram gastos ${moeda(despesas!)}: de cada R$ 100, R$ ${deCem} já saíram.`
          : `Entraram ${moeda(receita)} na prefeitura.`,
      detalhes: saldo !== null ? [`Ainda em caixa: ${moeda(saldo)}`] : [],
      link: { href: "#dinheiro", rotulo: "Ver o dinheiro da cidade" },
      peso: 8,
      extra: "dinheiro receita despesa gasto gastou arrecadou orcamento caixa saldo financas contas",
    });
  }

  // Os caminhos do próprio portal: sempre respondem.
  add({
    id: "acao:pedido",
    tipo: "acao",
    titulo: "Fazer um pedido, reclamação ou elogio à prefeitura",
    resposta: "Você escreve, recebe um número de protocolo e a resposta chega no seu e-mail.",
    detalhes: ["Reclamação, denúncia, sugestão e elogio podem ser anônimos."],
    link: { href: "#atendimento", rotulo: "Fazer agora" },
    peso: 5,
    extra: "pedido reclamacao reclamar denuncia denunciar elogio sugestao ouvidoria solicitacao protocolo buraco poste lixo",
  });
  add({
    id: "acao:acompanhar",
    tipo: "acao",
    titulo: "Acompanhar meu protocolo",
    resposta: "Com o número do protocolo e a chave de consulta, você vê o andamento e a resposta.",
    detalhes: [],
    link: { href: "#atendimento", rotulo: "Acompanhar" },
    peso: 4,
    extra: "protocolo acompanhar andamento consultar resposta pedido",
  });
  add({
    id: "acao:informacao",
    tipo: "acao",
    titulo: "Pedir uma informação pública (Lei de Acesso à Informação)",
    resposta: "Qualquer pessoa pode pedir, sem explicar o motivo. A prefeitura tem 20 dias para responder.",
    detalhes: [],
    link: { href: "#atendimento", rotulo: "Pedir informação" },
    peso: 3,
    extra: "informacao lai acesso documento dado publico pedir",
  });

  return itens;
}

export const SUGESTOES = [
  "Onde tem posto de saúde?",
  "Quais obras estão atrasadas?",
  "Quanto a prefeitura gastou?",
  "Como faço uma reclamação?",
];
