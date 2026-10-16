import PortalCidade from "../PortalCidade";
import { resumirVoz } from "@/lib/voz-da-cidade";
import { instante, mensagensDeExemplo } from "@/lib/portal-exemplo";

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
      listaPublicacoes={(
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
      }))}
      unidades={[
        ["UBS do Centro", "ubs", "Centro", "Rua da Matriz, 45", "(00) 3333-0201", "Seg. a sex., 7h às 17h"],
        ["UPA 24 horas Bela Aurora", "upa", "Jardim Primavera", "Av. Brasil, 1200", "(00) 3333-0192", "Todos os dias, 24 horas"],
        ["UBS Alto Alegre", "ubs", "Alto Alegre", "Rua Sete, 310", "(00) 3333-0202", "Seg. a sex., 7h às 13h"],
        ["Farmácia Básica Municipal", "farmacia", "Centro", "Rua da Matriz, 47", "(00) 3333-0203", "Seg. a sex., 7h às 17h"],
      ].map(([nome, tipo, bairro, endereco, telefone, turno], i) => ({ id: `exu${i}`, nome, tipo, bairro, endereco, telefone, turno, latitude: null, longitude: null }))}
      escolas={[
        ["Escola Municipal Aurora", "Vila Nova", "Rua das Acácias, 80", "(00) 3333-0301", "Ensino fundamental, 1º ao 9º ano"],
        ["Creche Municipal Pequeno Príncipe", "Centro", "Rua da Matriz, 210", "(00) 3333-0302", "Creche e pré-escola"],
      ].map(([nome, bairro, endereco, telefone, etapas], i) => ({ id: `exe${i}`, nome, bairro, endereco, telefone, etapas, latitude: null, longitude: null }))}
      voz={resumirVoz(mensagensDeExemplo(agora), agora)}
    />
  );
}
