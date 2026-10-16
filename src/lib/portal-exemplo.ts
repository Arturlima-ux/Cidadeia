import type { LinhaVoz } from "@/lib/voz-da-cidade";
import type { dashboardSnapshots, licitacoes, obras, publicacoes } from "@/db/schema";
import type { Conjunto, Fontes, Frescor } from "@/lib/dados-abertos";
import type { TipoAtendimento, StatusAtendimento } from "@/lib/atendimento";

// Mensagens da cidade fictícia (Bela Aurora): usadas pelo portal de exemplo
// (/transparencia/exemplo) e pela vitrine da home. Datas relativas a `agora`,
// para as "últimas mensagens" nunca envelhecerem.

const DIA = 86_400_000;
// Fora do componente: a página é refeita a cada pedido (force-dynamic).
export const instante = () => Date.now();

export function mensagensDeExemplo(agora: number): LinhaVoz[] {
  const tipos: TipoAtendimento[] = ["protocolo", "reclamacao", "elogio", "sugestao", "protocolo", "informacao", "reclamacao", "elogio", "denuncia", "protocolo"];
  const areas = ["saude", "obras", "educacao", "administracao", "obras", "saude", "assistencia", "educacao"];
  const linhas: LinhaVoz[] = [];
  for (let i = 0; i < 42; i++) {
    const criada = agora - (i * 2.6 + (i % 3) * 0.4) * DIA - (i % 5) * 3_600_000;
    const respondida = i % 7 !== 0 && i > 2;
    const prazo = 1 + ((i * 3) % 6);
    linhas.push({
      tipo: tipos[i % tipos.length],
      status: (respondida ? (i % 4 === 0 ? "encerrado" : "respondido") : i % 2 ? "em_analise" : "aberto") as StatusAtendimento,
      secretaria: areas[i % areas.length],
      createdAt: new Date(criada).toISOString(),
      respondidoEm: respondida ? new Date(criada + prazo * DIA).toISOString() : null,
      // Nem todo mundo avalia; dos que avaliam, a maioria diz que resolveu.
      avaliacao: !respondida || i % 4 === 1 ? null : i % 9 === 4 ? "nao" : i % 6 === 3 ? "parte" : "sim",
    });
  }
  return linhas;
}


// ── OS DADOS DA CIDADE DE EXEMPLO ──
// Aqui, e não na página, para a página e os arquivos de dados abertos
// (/transparencia/exemplo/dados/...) mostrarem a mesma cidade.

// Um ponto qualquer no interior, longe de cidade de verdade: só as distâncias
// entre os lugares de exemplo importam.
export const CENTRO_DO_EXEMPLO = { lat: -6.5, lng: -41.0 };

export function dadosDoExemplo(agora: number) {
  const CENTRO = CENTRO_DO_EXEMPLO;
  const hoje = new Date(agora).toISOString();
  const base = { prefeituraId: "exemplo", createdAt: hoje, atualizadoEm: hoje } as const;
  const dados: {
    snapshot: typeof dashboardSnapshots.$inferSelect;
    listaObras: (typeof obras.$inferSelect)[];
    listaLicitacoes: (typeof licitacoes.$inferSelect)[];
    listaPublicacoes: (typeof publicacoes.$inferSelect)[];
    unidades: { id: string; nome: string; tipo: string; bairro: string | null; endereco: string | null; telefone: string | null; turno: string | null; latitude: number | null; longitude: number | null }[];
    escolas: { id: string; nome: string; bairro: string | null; endereco: string | null; telefone: string | null; etapas: string | null; latitude: number | null; longitude: number | null }[];
  } = {
      snapshot: { id: "exemplo", prefeituraId: "exemplo", receita: 62_400_000, despesas: 51_150_000, saldo: 11_250_000, indiceTransparencia: null, origem: "manual", atualizadoEm: hoje },
      listaObras: [
        ["Reforma da Unidade Básica de Saúde do Centro", "Centro", 72, 840_000, "em_andamento", 0.002, 0.001],
        ["Pavimentação da Rua das Flores", "Jardim Primavera", 100, 1_250_000, "concluida", -0.01, 0.007],
        ["Quadra coberta da Escola Municipal Aurora", "Vila Nova", 35, 690_000, "atrasada", -0.006, -0.008],
        ["Creche municipal do bairro Alto Alegre", "Alto Alegre", 54, 1_980_000, "em_andamento", 0.019, -0.015],
        ["Praça da Matriz", "Centro", 0, 320_000, "planejada", 0.001, -0.002],
      ].map(([nome, bairro, progresso, valor, status, dLat, dLng], i) => ({
        ...base,
        id: `ex${i}`,
        nome: nome as string,
        bairro: bairro as string,
        progressoAtual: progresso as number,
        progressoEsperado: 0,
        valorContrato: valor as number,
        numeroControlePncpContrato: null,
        vigenciaInicio: null,
        vigenciaFim: null,
        fornecedorNome: null,
        origem: "manual",
        latitude: CENTRO.lat + (dLat as number),
        longitude: CENTRO.lng + (dLng as number),
        status: status as "em_andamento",
      })),
      listaLicitacoes: [
        ["PE 012/2026", "Merenda escolar para as escolas municipais", "Pregão eletrônico", 540_000, "publicada"],
        ["PE 009/2026", "Remédios da farmácia básica", "Pregão eletrônico", 380_000, "homologada"],
        ["CC 003/2026", "Construção de passagem molhada no Riacho Fundo", "Concorrência", 910_000, "em_disputa"],
        ["PE 014/2026", "Transporte escolar da zona rural", "Pregão eletrônico", 1_120_000, "planejamento"],
      ].map(([numero, objeto, modalidade, valor, status], i) => ({
        id: `exl${i}`,
        prefeituraId: "exemplo",
        numero: numero as string,
        objeto: objeto as string,
        modalidade: modalidade as string,
        valorEstimado: valor as number,
        fornecedor: null,
        status: status as "publicada",
        observacaoRisco: null,
        prazoFinal: null,
        numeroControlePncp: null,
        createdAt: hoje,
      })),
      listaPublicacoes: (
        [
          ["servico", "IPTU: segunda via do carnê", "Emita a segunda via do IPTU com o número da inscrição do imóvel, que está no carnê antigo ou na escritura.", "Número da inscrição do imóvel ou CPF do proprietário", "Na hora", "Setor de Tributos, Rua Principal, 100 · seg. a sex., 8h às 14h", "Finanças"],
          ["servico", "Alvará de funcionamento", "Licença para abrir ou manter um comércio, uma oficina ou um escritório funcionando na cidade.", "CNPJ, contrato social, comprovante de endereço e vistoria dos bombeiros", "Até 15 dias úteis", "Setor de Tributos ou pelo protocolo deste portal", "Finanças"],
          ["servico", "Matrícula na rede municipal", "Vaga em creche e escola municipal para crianças de 0 a 14 anos.", "Certidão de nascimento, cartão de vacina, comprovante de endereço e CPF do responsável", "Resultado em até 5 dias úteis", "Secretaria de Educação ou direto na escola mais próxima", "Educação"],
          ["servico", "Coleta de entulho e poda", "A prefeitura recolhe entulho de pequena obra e galhos de poda, com agendamento.", "Endereço e o que vai ser recolhido", "Até 7 dias", "Pelo protocolo deste portal ou na Secretaria de Obras", "Obras"],
          ["estrutura", "Secretaria Municipal de Saúde", "Responsável pelas unidades de saúde, vacinação, farmácia básica e transporte de pacientes. Telefone (00) 3333-0101 · seg. a sex., 7h às 13h.", null, null, null, "Saúde"],
          ["faq", "Onde pego remédio de graça?", "Na Farmácia Básica, ao lado da UBS do Centro, com a receita do SUS e o cartão do SUS. Seg. a sex., 7h às 17h.", null, null, null, "Saúde"],
        ] as const
      ).map(([tipo, titulo, conteudo, requisitos, prazo, contato, secretaria], i) => ({
        id: `exp${i}`,
        prefeituraId: "exemplo",
        tipo,
        titulo,
        conteudo,
        requisitos,
        prazo,
        contato,
        secretaria,
        linkExterno: null,
        publicado: true,
        atualizadoEm: hoje,
        createdAt: hoje,
      })),
      unidades: [
        ["UBS do Centro", "ubs", "Centro", "Rua da Matriz, 45", "(00) 3333-0201", "Seg. a sex., 7h às 17h", 0.002, 0.001],
        ["UPA 24 horas Bela Aurora", "upa", "Jardim Primavera", "Av. Brasil, 1200", "(00) 3333-0192", "Todos os dias, 24 horas", -0.012, 0.009],
        ["UBS Alto Alegre", "ubs", "Alto Alegre", "Rua Sete, 310", "(00) 3333-0202", "Seg. a sex., 7h às 13h", 0.021, -0.017],
        ["Farmácia Básica Municipal", "farmacia", "Centro", "Rua da Matriz, 47", "(00) 3333-0203", "Seg. a sex., 7h às 17h", 0.0025, 0.0012],
      ].map(([nome, tipo, bairro, endereco, telefone, turno, dLat, dLng], i) => ({
        id: `exu${i}`,
        nome: nome as string,
        tipo: tipo as string,
        bairro: bairro as string,
        endereco: endereco as string,
        telefone: telefone as string,
        turno: turno as string,
        latitude: CENTRO.lat + (dLat as number),
        longitude: CENTRO.lng + (dLng as number),
      })),
      escolas: [
        ["Escola Municipal Aurora", "Vila Nova", "Rua das Acácias, 80", "(00) 3333-0301", "Ensino fundamental, 1º ao 9º ano", -0.006, -0.008],
        ["Creche Municipal Pequeno Príncipe", "Centro", "Rua da Matriz, 210", "(00) 3333-0302", "Creche e pré-escola", 0.003, 0.004],
      ].map(([nome, bairro, endereco, telefone, etapas, dLat, dLng], i) => ({
        id: `exe${i}`,
        nome: nome as string,
        bairro: bairro as string,
        endereco: endereco as string,
        telefone: telefone as string,
        etapas: etapas as string,
        latitude: CENTRO.lat + (dLat as number),
        longitude: CENTRO.lng + (dLng as number),
      })),
  };
  return dados;
}

export function fontesDoExemplo(agora: number): Fontes {
  const d = dadosDoExemplo(agora);
  return {
    obras: d.listaObras,
    compras: d.listaLicitacoes,
    contratos: [],
    unidades: d.unidades,
    escolas: d.escolas,
    servicos: d.listaPublicacoes.filter((p) => p.tipo === "servico"),
    manifestacoes: mensagensDeExemplo(agora),
    dinheiro: [d.snapshot],
  };
}

/** Na cidade de exemplo, o selo mostra o que acontece num município cliente. */
export function frescorDoExemplo(agora: number): Partial<Record<Conjunto, Frescor>> {
  const ha = (dias: number) => new Date(agora - dias * DIA).toISOString();
  return {
    obras: { quando: ha(1), sozinho: true, fonte: "PNCP" },
    compras: { quando: ha(0), sozinho: true, fonte: "PNCP" },
    "unidades-de-saude": { quando: ha(2), sozinho: true, fonte: "CNES" },
    escolas: { quando: ha(40), sozinho: false, fonte: "prefeitura" },
    servicos: { quando: ha(5), sozinho: false, fonte: "prefeitura" },
    manifestacoes: { quando: ha(0), sozinho: true, fonte: "próprio portal, a cada manifestação" },
    dinheiro: { quando: ha(3), sozinho: false, fonte: "prefeitura" },
  };
}
