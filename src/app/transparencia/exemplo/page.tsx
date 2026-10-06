import PortalCidade from "../PortalCidade";
import { resumirVoz, type LinhaVoz } from "@/lib/voz-da-cidade";
import type { TipoAtendimento, StatusAtendimento } from "@/lib/atendimento";

// ── A CIDADE DE EXEMPLO ──
//
// O prefeito precisa ver o portal funcionando antes de contratar, e ainda
// não há prefeitura com portal no ar. Bela Aurora não existe: o nome não é de
// município brasileiro, a UF é "BR" e a página abre com uma faixa dizendo que
// é cidade fictícia com dados de exemplo. Nada aqui se passa por uma
// prefeitura real.
//
// Mesmo componente do portal de verdade (../PortalCidade.tsx), então o que o
// prefeito vê aqui é exatamente o que o morador dele vai ver.

export const metadata = {
  title: "Portal da Transparência · cidade de exemplo",
  robots: { index: false },
};

// Sempre recalculado: as "últimas mensagens" contam dias a partir de hoje.
export const dynamic = "force-dynamic";

const DIA = 86_400_000;
// Fora do componente: a página é refeita a cada pedido (force-dynamic).
const instante = () => Date.now();

function mensagensDeExemplo(agora: number): LinhaVoz[] {
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
    });
  }
  return linhas;
}

export default function PortalExemplo() {
  const agora = instante();
  const hoje = new Date(agora).toISOString();
  const base = { prefeituraId: "exemplo", createdAt: hoje, atualizadoEm: hoje } as const;

  return (
    <PortalCidade
      exemplo
      slug="exemplo"
      portal={{
        nome: "Prefeitura de Bela Aurora",
        municipio: "Bela Aurora",
        estado: "BR",
        prefeito: null,
        whatsappNumero: null,
        codigoIbge: null,
        mostrarFinanceiro: true,
        mostrarObras: true,
        mostrarLicitacoes: true,
      }}
      snapshot={{ id: "exemplo", prefeituraId: "exemplo", receita: 62_400_000, despesas: 51_150_000, saldo: 11_250_000, indiceTransparencia: null, origem: "manual", atualizadoEm: hoje }}
      listaObras={[
        ["Reforma da Unidade Básica de Saúde do Centro", "Centro", 72, 840_000, "em_andamento"],
        ["Pavimentação da Rua das Flores", "Jardim Primavera", 100, 1_250_000, "concluida"],
        ["Quadra coberta da Escola Municipal Aurora", "Vila Nova", 35, 690_000, "atrasada"],
        ["Creche municipal do bairro Alto Alegre", "Alto Alegre", 54, 1_980_000, "em_andamento"],
        ["Praça da Matriz", "Centro", 0, 320_000, "planejada"],
      ].map(([nome, bairro, progresso, valor, status], i) => ({
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
        latitude: null,
        longitude: null,
        status: status as "em_andamento",
      }))}
      listaLicitacoes={[
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
      }))}
      listaPublicacoes={[]}
      voz={resumirVoz(mensagensDeExemplo(agora), agora)}
    />
  );
}
