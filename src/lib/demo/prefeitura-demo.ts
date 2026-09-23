// ── A PREFEITURA DA DEMONSTRAÇÃO ──
//
// "Prefeitura de Vila Nova": fictícia, pequena, e com o dado certo para
// cada regra do painel disparar — um prazo vencido, uma obra parada, uma
// queda de frequência com histórico, um fornecedor em série. Nada além
// disso: a demonstração é para navegar, não para impressionar por volume.
//
// ── CRIADA PELO PRÓPRIO SISTEMA ──
// Não há script nem cron. O primeiro acesso a /demo cria; um acesso depois
// de 24 h apaga e recria (as datas são relativas a hoje, então "há 41 dias"
// continua sendo há 41 dias). Se um visitante conseguisse gravar algo — o
// proxy impede —, a recriação limparia.
//
// Ids fixos, com prefixo "demo_": aparecem no banco como o que são.

import { db } from "@/db";
import {
  prefeituras,
  usuarios,
  unidadesSaude,
  ocorrenciasSaude,
  ocorrenciasEscola,
  buscaAtiva,
  estoqueMerenda,
  pnaeCompras,
  pnaeRepasses,
  estoqueSaude,
  apsResultados,
  saudeIndicadores,
  escolas,
  educacaoIndicadores,
  obras,
  licitacoes,
  atendimentos,
  dashboardSnapshots,
  alertas,
  configPublica,
} from "@/db/schema";
import { eq } from "drizzle-orm";
import { serializarPlanos, PLANOS_ADDON } from "@/lib/planos";
import { quadrimestreDe } from "@/lib/aps";

export const ID_PREFEITURA_DEMO = "demo_prefeitura";
export const ID_USUARIO_DEMO = "demo_usuario";
export const NOME_DEMO = "Prefeitura de Vila Nova";
const VALIDADE_MS = 24 * 60 * 60 * 1000;
// Sobe quando o conteúdo da demo muda: a prefeitura existente é recriada
// na próxima visita, em vez de esperar as 24 h. Sem isso, a demo mostrava
// a rede antiga por um dia depois de publicar a nova.
const VERSAO_DEMO = "2026-09-23-educacao-busca-ativa";
const MARCA_VERSAO = `Vila Nova · demo ${VERSAO_DEMO}`;

function diasAtras(d: number, hora = 14): string {
  const x = new Date();
  x.setUTCDate(x.getUTCDate() - d);
  x.setUTCHours(hora, 0, 0, 0);
  return x.toISOString();
}
function diasAFrente(d: number): string {
  return diasAtras(-d);
}

export async function garantirPrefeituraDemo(): Promise<void> {
  const [existente] = await db
    .select({ createdAt: prefeituras.createdAt, maiorProblema: prefeituras.maiorProblema })
    .from(prefeituras)
    .where(eq(prefeituras.id, ID_PREFEITURA_DEMO))
    .limit(1);

  if (existente) {
    const idade = Date.now() - new Date(existente.createdAt).getTime();
    const mesmaVersao = existente.maiorProblema === MARCA_VERSAO;
    if (mesmaVersao && Number.isFinite(idade) && idade < VALIDADE_MS) return;
    // Cascata: tudo que aponta para a prefeitura vai junto.
    await db.delete(prefeituras).where(eq(prefeituras.id, ID_PREFEITURA_DEMO));
  }

  await db.insert(prefeituras).values({
    id: ID_PREFEITURA_DEMO,
    nome: NOME_DEMO,
    estado: "PI",
    municipio: "Vila Nova",
    cnpj: "00000000000000",
    populacao: 18_400,
    prefeito: "Ana Ribeiro",
    planosContratados: serializarPlanos(PLANOS_ADDON.map((p) => p.chave)),
    implantacaoConcluidaEm: diasAtras(30),
    // A versão da demo viaja num campo livre da prefeitura (não aparece na
    // tela): é como a próxima visita sabe que o conteúdo mudou.
    maiorProblema: MARCA_VERSAO,
    createdAt: new Date().toISOString(),
  });

  // Senha impossível de bater: não é um hash bcrypt. Ninguém entra por login;
  // a sessão de demonstração é criada por /demo, sem senha.
  await db.insert(usuarios).values({
    id: ID_USUARIO_DEMO,
    prefeituraId: ID_PREFEITURA_DEMO,
    cpfCnpj: "00000000000",
    senhaHash: "demo-sem-login",
    nome: "Ana Ribeiro",
    cargo: "prefeito",
  });

  await db.insert(configPublica).values({
    prefeituraId: ID_PREFEITURA_DEMO,
    slug: "vila-nova-demo",
    portalAtivo: false,
  });

  // ── Saúde: faltas subindo (7 → 12), estoque caindo ──
  // Como se tivessem vindo do CNES: código, turno, SUS, data de atualização.
  // A UBS Alto da Serra está "parada" no CNES há mais de um ano de propósito.
  const hojeIso = new Date().toISOString();
  const dataAtras = (n: number) => diasAtras(n).slice(0, 10);
  await db.insert(unidadesSaude).values([
    { id: "demo_ubs_1", prefeituraId: ID_PREFEITURA_DEMO, nome: "UBS Central", tipo: "ubs", bairro: "Centro", latitude: -6.7712, longitude: -43.0221, codigoCnes: "9000001", origem: "cnes", codigoTipoUnidade: 2, esfera: "MUNICIPAL", endereco: "Rua da Matriz, 120", turno: "Atendimentos nos turnos da manhã e à tarde", atendeSus: true, hospitalar: false, cnesAtualizadoEm: dataAtras(40), sincronizadoEm: hojeIso },
    { id: "demo_ubs_2", prefeituraId: ID_PREFEITURA_DEMO, nome: "UBS Alto da Serra", tipo: "ubs", bairro: "Alto da Serra", latitude: -6.7655, longitude: -43.0312, codigoCnes: "9000002", origem: "cnes", codigoTipoUnidade: 2, esfera: "MUNICIPAL", endereco: "Av. das Palmeiras, s/n", turno: "Atendimento somente pela manhã", atendeSus: true, hospitalar: false, cnesAtualizadoEm: dataAtras(410), sincronizadoEm: hojeIso },
    { id: "demo_hosp", prefeituraId: ID_PREFEITURA_DEMO, nome: "Hospital Municipal", tipo: "hospital", bairro: "Centro", latitude: -6.7748, longitude: -43.0189, codigoCnes: "9000003", origem: "cnes", codigoTipoUnidade: 15, esfera: "MUNICIPAL", endereco: "Rua do Hospital, 1", turno: "Atendimento contínuo", atendeSus: true, hospitalar: true, centroCirurgico: true, centroObstetrico: false, cnesAtualizadoEm: dataAtras(25), sincronizadoEm: hojeIso },
    { id: "demo_ps_1", prefeituraId: ID_PREFEITURA_DEMO, nome: "Posto de Saúde Boa Vista", tipo: "posto", bairro: "Zona Rural", latitude: -6.7301, longitude: -43.0602, codigoCnes: "9000004", origem: "cnes", codigoTipoUnidade: 1, esfera: "MUNICIPAL", endereco: "Povoado Boa Vista", turno: "Atendimento somente pela manhã", atendeSus: true, hospitalar: false, cnesAtualizadoEm: dataAtras(60), sincronizadoEm: hojeIso },
  ]);
  // Estoque por unidade, em dias de cobertura: a insulina da Alto da Serra
  // zerou; a da Central dura 9 dias; o resto está ok.
  const est = (id: string, unidadeId: string, item: string, categoria: "medicamento" | "insumo" | "vacina", unidadeMedida: string, saldo: number, consumoMensal: number, por: string, diasAtrasContagem = 2) => ({
    id, prefeituraId: ID_PREFEITURA_DEMO, unidadeId, item, categoria, unidadeMedida, saldo, consumoMensal, atualizadoPor: por, atualizadoEm: diasAtras(diasAtrasContagem),
  });
  await db.insert(estoqueSaude).values([
    est("demo_est_1", "demo_ubs_2", "Insulina NPH 100 UI/mL", "medicamento", "frasco", 0, 24, "Enf. Carla Mendes", 1),
    est("demo_est_2", "demo_ubs_2", "Losartana 50 mg", "medicamento", "comprimido", 900, 1500, "Enf. Carla Mendes", 1),
    est("demo_est_3", "demo_ubs_2", "Metformina 850 mg", "medicamento", "comprimido", 2400, 1800, "Enf. Carla Mendes", 1),
    est("demo_est_4", "demo_ubs_1", "Insulina NPH 100 UI/mL", "medicamento", "frasco", 12, 40, "Téc. João Lima", 3),
    est("demo_est_5", "demo_ubs_1", "Dipirona 500 mg", "medicamento", "comprimido", 3000, 2000, "Téc. João Lima", 3),
    est("demo_est_6", "demo_ubs_1", "Fita de glicemia", "insumo", "unidade", 150, 600, "Téc. João Lima", 3),
    est("demo_est_7", "demo_ubs_1", "Vacina influenza", "vacina", "dose", 80, 120, "Téc. João Lima", 40),
    est("demo_est_8", "demo_hosp", "Soro fisiológico 0,9% 500 mL", "insumo", "frasco", 420, 600, "Farm. Rita Sousa", 2),
    est("demo_est_9", "demo_hosp", "Amoxicilina 500 mg", "medicamento", "cápsula", 60, 900, "Farm. Rita Sousa", 2),
  ]);
  // Qualidade da APS: dois quadrimestres, para a tela mostrar série e
  // tendência. Hipertensão e diabetes caindo — é o que costuma puxar o
  // componente de qualidade para baixo.
  const qAtual = quadrimestreDe(new Date());
  const qAnterior = qAtual.numero === 1 ? { ano: qAtual.ano - 1, numero: 3 } : { ano: qAtual.ano, numero: qAtual.numero - 1 };
  const aps = (indicador: string, resultado: number, meta: number | null, q: { ano: number; numero: number }, equipe: string | null = null) => ({
    id: `demo_aps_${indicador}_${q.ano}_${q.numero}${equipe ? "_" + equipe.replace(/W/g, "") : ""}`,
    prefeituraId: ID_PREFEITURA_DEMO,
    indicador,
    equipe,
    ano: q.ano,
    quadrimestre: q.numero,
    resultado,
    meta,
    registradoPor: "Ana Ribeiro",
    atualizadoEm: diasAtras(5),
  });
  await db.insert(apsResultados).values([
    aps("acesso", 78, 70, qAtual),
    aps("hipertensao", 31, 50, qAtual),
    aps("diabetes", 38, 50, qAtual),
    aps("gestante", 64, 60, qAtual),
    aps("infantil", 71, 60, qAtual),
    aps("cancer_mulher", 46, 40, qAtual),
    aps("idosa", 52, 50, qAtual),
    aps("hipertensao", 45, 50, qAnterior),
    aps("diabetes", 44, 50, qAnterior),
    aps("acesso", 74, 70, qAnterior),
    aps("gestante", 58, 60, qAnterior),
  ]);
  // O que está acontecendo dentro delas — a linha do tempo que o indicador
  // do mês não conta.
  await db.insert(ocorrenciasSaude).values([
    { id: "demo_oc_1", prefeituraId: ID_PREFEITURA_DEMO, unidadeId: "demo_ubs_2", tipo: "sem_medico", gravidade: "urgente", descricao: "Médico de licença desde segunda; sem substituto. Atendimento só com enfermagem.", registradoPor: "Enf. Carla Mendes", createdAt: new Date(Date.now() - 3 * 86_400_000).toISOString() },
    { id: "demo_oc_2", prefeituraId: ID_PREFEITURA_DEMO, unidadeId: "demo_ubs_2", tipo: "falta_medicamento", gravidade: "atencao", descricao: "Insulina NPH acabou; pacientes orientados a buscar na UBS Central.", registradoPor: "Enf. Carla Mendes", createdAt: new Date(Date.now() - 1 * 86_400_000).toISOString() },
    { id: "demo_oc_3", prefeituraId: ID_PREFEITURA_DEMO, unidadeId: "demo_ubs_1", tipo: "equipamento_quebrado", gravidade: "atencao", descricao: "Geladeira de vacina com temperatura oscilando; vacinas transferidas para o hospital.", registradoPor: "Téc. João Lima", createdAt: new Date(Date.now() - 2 * 86_400_000).toISOString() },
    { id: "demo_oc_4", prefeituraId: ID_PREFEITURA_DEMO, unidadeId: "demo_hosp", tipo: "fila", gravidade: "atencao", descricao: "Espera acima de 3h no pronto atendimento no fim de semana.", registradoPor: "Dr. Paulo Freitas", status: "resolvida", resolvidaEm: new Date(Date.now() - 4 * 86_400_000).toISOString(), createdAt: new Date(Date.now() - 9 * 86_400_000).toISOString() },
  ]);
  await db.insert(saudeIndicadores).values(
    [
      [150, 26, 7, 88],
      [120, 28, 7, 84],
      [90, 30, 8, 80],
      [60, 31, 9, 76],
      [30, 34, 7, 74],
      [3, 38, 12, 62],
    ].map(([d, tempo, faltas, estoque], i) => ({
      id: `demo_si_${i}`,
      prefeituraId: ID_PREFEITURA_DEMO,
      tempoMedioAtendimentoMin: tempo,
      medicosAtivos: 46,
      faltasPercentual: faltas,
      estoqueMedicamentosPercentual: estoque,
      atualizadoEm: diasAtras(d),
    }))
  );

  // ── Educação: frequência caindo (86 → 71), uma escola com evasão alta ──
  // A rede vem como se tivesse sido importada do Censo Escolar: código
  // INEP, etapas, matrícula declarada. A Padre Cícero declarou 412 e tem
  // 431 hoje — 19 alunos atendidos fora da conta do FUNDEB.
  const censo = { origem: "censo" as const, dependencia: "municipal" as const, situacao: "ativa" as const, censoAno: 2025, sincronizadoEm: diasAtras(9) };
  await db.insert(escolas).values([
    { id: "demo_esc_1", prefeituraId: ID_PREFEITURA_DEMO, nome: "E. M. Padre Cícero", bairro: "Centro", evasaoPercentual: 12.4, latitude: -6.7701, longitude: -43.0235, codigoInep: "22099001", localizacao: "urbana", etapas: "Ensino Fundamental", porte: "Entre 201 e 500 matrículas", matriculasCenso: 412, matriculasAtuais: 431, diasPrevistos: 200, ...censo },
    { id: "demo_esc_2", prefeituraId: ID_PREFEITURA_DEMO, nome: "E. M. Maria das Dores", bairro: "Alto da Serra", evasaoPercentual: 9.8, latitude: -6.7648, longitude: -43.0298, codigoInep: "22099002", localizacao: "rural", etapas: "Educação Infantil, Ensino Fundamental", porte: "Entre 51 e 200 matrículas", matriculasCenso: 188, matriculasAtuais: 171, diasPrevistos: 200, ...censo },
    { id: "demo_esc_3", prefeituraId: ID_PREFEITURA_DEMO, nome: "E. M. José Alencar", bairro: "Jardim", evasaoPercentual: 3.1, latitude: -6.7789, longitude: -43.0157, codigoInep: "22099003", localizacao: "urbana", etapas: "Ensino Fundamental", porte: "Entre 201 e 500 matrículas", matriculasCenso: 356, matriculasAtuais: 354, diasPrevistos: 205, ...censo },
    { id: "demo_esc_4", prefeituraId: ID_PREFEITURA_DEMO, nome: "E. M. Santa Luzia", bairro: "Vila Operária", evasaoPercentual: 2.6, latitude: -6.7733, longitude: -43.0276, codigoInep: "22099004", localizacao: "urbana", etapas: "Educação Infantil", porte: "Até 50 matrículas", matriculasCenso: 74, matriculasAtuais: 74, diasPrevistos: 205, ...censo },
  ]);

  // O que a direção registrou: é daqui que sai a conta dos 200 dias letivos.
  await db.insert(ocorrenciasEscola).values([
    { id: "demo_ocesc_1", prefeituraId: ID_PREFEITURA_DEMO, escolaId: "demo_esc_2", tipo: "transporte", gravidade: "urgente", descricao: "Ônibus da rota do Assentamento quebrou; 34 alunos sem aula há três dias.", aulasPerdidas: 3, alunosAfetados: 34, registradoPor: "Diretora Ana Ribeiro", createdAt: diasAtras(3) },
    { id: "demo_ocesc_2", prefeituraId: ID_PREFEITURA_DEMO, escolaId: "demo_esc_2", tipo: "falta_merenda", gravidade: "atencao", descricao: "Acabou o leite; lanche reduzido a pão e suco desde ontem.", registradoPor: "Diretora Ana Ribeiro", createdAt: diasAtras(1) },
    { id: "demo_ocesc_3", prefeituraId: ID_PREFEITURA_DEMO, escolaId: "demo_esc_1", tipo: "sem_professor", gravidade: "urgente", descricao: "3º ano sem professora desde segunda; turma dispensada.", aulasPerdidas: 2, alunosAfetados: 28, registradoPor: "Diretor Marcos Sales", createdAt: diasAtras(2) },
    { id: "demo_ocesc_4", prefeituraId: ID_PREFEITURA_DEMO, escolaId: "demo_esc_1", tipo: "estrutura", gravidade: "atencao", descricao: "Caixa d'água furada; escola dispensou os alunos numa sexta.", aulasPerdidas: 1, alunosAfetados: 431, registradoPor: "Diretor Marcos Sales", status: "resolvida", resolvidaEm: diasAtras(20), createdAt: diasAtras(26) },
    { id: "demo_ocesc_5", prefeituraId: ID_PREFEITURA_DEMO, escolaId: "demo_esc_3", tipo: "infrequencia", gravidade: "atencao", descricao: "Dois alunos do 5º ano com mais de 10 faltas seguidas.", alunosAfetados: 2, registradoPor: "Diretora Lúcia Barros", createdAt: diasAtras(6) },
  ]);
  // Busca ativa: três casos, cada um numa etapa diferente. O do Pedro está
  // há 28 dias fora com os recursos escolares esgotados e sem comunicação
  // ao Conselho Tutelar — é a omissão que o Ministério Público cobra.
  const dataAtrasBa = (n: number) => diasAtras(n).slice(0, 10);
  await db.insert(buscaAtiva).values([
    { id: "demo_ba_1", prefeituraId: ID_PREFEITURA_DEMO, escolaId: "demo_esc_3", alunoNome: "Pedro Henrique Alves", alunoTurma: "5º ano B", idade: 11, faltas: 28, aulasPeriodo: 100, periodo: "3º bimestre de 2026", ultimaPresenca: dataAtrasBa(28), bolsaFamilia: true, situacao: "aberta", contatoFamiliaEm: dataAtrasBa(21), visitaEm: dataAtrasBa(12), registradoPor: "Diretora Lúcia Barros", createdAt: diasAtras(22), atualizadoEm: diasAtras(12) },
    { id: "demo_ba_2", prefeituraId: ID_PREFEITURA_DEMO, escolaId: "demo_esc_2", alunoNome: "Sara Lima da Costa", alunoTurma: "3º ano A", idade: 9, faltas: 12, aulasPeriodo: 100, periodo: "3º bimestre de 2026", ultimaPresenca: dataAtrasBa(6), bolsaFamilia: false, situacao: "aberta", registradoPor: "Diretora Ana Ribeiro", createdAt: diasAtras(5), atualizadoEm: diasAtras(5) },
    { id: "demo_ba_3", prefeituraId: ID_PREFEITURA_DEMO, escolaId: "demo_esc_1", alunoNome: "João Vitor Nunes", alunoTurma: "2º ano C", idade: 8, faltas: 18, aulasPeriodo: 100, periodo: "2º bimestre de 2026", ultimaPresenca: dataAtrasBa(55), bolsaFamilia: true, situacao: "retornou", contatoFamiliaEm: dataAtrasBa(50), visitaEm: dataAtrasBa(44), observacao: "Família mudou de bairro; transporte resolvido, voltou em agosto.", registradoPor: "Diretor Marcos Sales", createdAt: diasAtras(52), atualizadoEm: diasAtras(40) },
  ]);

  // A cozinha: o leite da Maria das Dores zerou (é a ocorrência de merenda
  // acima, vista do outro lado), o feijão da Padre Cícero acaba esta semana.
  const mer = (id: string, escolaId: string, item: string, categoria: "hortifruti" | "proteina" | "graos" | "laticinio" | "panificacao" | "mercearia" | "outro", unidadeMedida: string, saldo: number, consumoDiario: number, por: string, diasContagem = 2) => ({
    id, prefeituraId: ID_PREFEITURA_DEMO, escolaId, item, categoria, unidadeMedida, saldo, consumoDiario, atualizadoPor: por, atualizadoEm: diasAtras(diasContagem),
  });
  await db.insert(estoqueMerenda).values([
    mer("demo_mer_1", "demo_esc_2", "Leite", "laticinio", "litro", 0, 12, "Diretora Ana Ribeiro", 1),
    mer("demo_mer_2", "demo_esc_2", "Arroz", "graos", "kg", 90, 9, "Diretora Ana Ribeiro", 1),
    mer("demo_mer_3", "demo_esc_2", "Feijão", "graos", "kg", 40, 5, "Diretora Ana Ribeiro", 1),
    mer("demo_mer_4", "demo_esc_1", "Feijão", "graos", "kg", 22, 11, "Diretor Marcos Sales", 2),
    mer("demo_mer_5", "demo_esc_1", "Arroz", "graos", "kg", 300, 20, "Diretor Marcos Sales", 2),
    mer("demo_mer_6", "demo_esc_1", "Frango", "proteina", "kg", 60, 14, "Diretor Marcos Sales", 2),
    mer("demo_mer_7", "demo_esc_1", "Banana", "hortifruti", "kg", 25, 18, "Diretor Marcos Sales", 2),
    mer("demo_mer_8", "demo_esc_3", "Arroz", "graos", "kg", 260, 17, "Diretora Lúcia Barros", 4),
    mer("demo_mer_9", "demo_esc_3", "Óleo de soja", "mercearia", "litro", 48, 3, "Diretora Lúcia Barros", 4),
  ]);
  // O PNAE do ano: repasse informado e as compras lançadas. De propósito,
  // a agricultura familiar está em torno de 22% — abaixo dos 30% da lei,
  // com tempo de corrigir. É o aviso que o município nunca recebe em setembro.
  const anoPnae = new Date().getUTCFullYear();
  await db.insert(pnaeRepasses).values({
    id: "demo_pnaer", prefeituraId: ID_PREFEITURA_DEMO, ano: anoPnae, valor: 320_000, registradoPor: "Ana Ribeiro", atualizadoEm: diasAtras(30),
  });
  const cmp = (id: string, descricao: string, fornecedor: string, valor: number, af: boolean, modalidade: "chamada_publica" | "pregao" | "dispensa" | "outra", dias: number) => ({
    id, prefeituraId: ID_PREFEITURA_DEMO, ano: anoPnae, descricao, fornecedor, valor, agriculturaFamiliar: af, modalidade, dataCompra: diasAtras(dias).slice(0, 10), registradoPor: "Ana Ribeiro", createdAt: diasAtras(dias),
  });
  await db.insert(pnaeCompras).values([
    cmp("demo_pnaec_1", "Hortifrúti do 1º bimestre", "Cooperativa dos Agricultores de Vila Nova", 38_000, true, "chamada_publica", 200),
    cmp("demo_pnaec_2", "Gêneros secos — arroz, feijão, óleo", "Distribuidora Boa Mesa Ltda", 94_000, false, "pregao", 180),
    cmp("demo_pnaec_3", "Proteína — frango e carne", "Frigorífico Serra Azul", 72_000, false, "pregao", 120),
    cmp("demo_pnaec_4", "Polpa de fruta e ovos", "Associação de Produtores do Assentamento", 32_000, true, "chamada_publica", 70),
    cmp("demo_pnaec_5", "Pão e leite", "Padaria Central", 21_000, false, "dispensa", 25),
  ]);

  await db.insert(educacaoIndicadores).values(
    [
      [150, 86, 7.4],
      [120, 85, 7.4],
      [90, 84, 7.3],
      [60, 81, 7.3],
      [30, 78, 7.2],
      [3, 71, 7.2],
    ].map(([d, freq, nota], i) => ({
      id: `demo_ei_${i}`,
      prefeituraId: ID_PREFEITURA_DEMO,
      frequenciaPercentual: freq,
      notaMedia: nota,
      alunosTransporte: 312,
      professoresAtivos: 58,
      atualizadoEm: diasAtras(d),
    }))
  );

  // ── Obras: uma parada há 41 dias, uma no ritmo, uma concluída ──
  await db.insert(obras).values([
    { id: "demo_obra_1", prefeituraId: ID_PREFEITURA_DEMO, nome: "Reforma da UBS Central", bairro: "Centro", progressoAtual: 20, progressoEsperado: 65, valorContrato: 480_000, status: "atrasada", latitude: -6.7712, longitude: -43.0221, createdAt: diasAtras(200), atualizadoEm: diasAtras(41) },
    { id: "demo_obra_2", prefeituraId: ID_PREFEITURA_DEMO, nome: "Pavimentação da Av. Beira-Rio", bairro: "Centro", progressoAtual: 72, progressoEsperado: 70, valorContrato: 1_250_000, status: "em_andamento", latitude: -6.7760, longitude: -43.0170, createdAt: diasAtras(150), atualizadoEm: diasAtras(5) },
    { id: "demo_obra_3", prefeituraId: ID_PREFEITURA_DEMO, nome: "Creche Municipal Jardim", bairro: "Jardim", progressoAtual: 100, progressoEsperado: 100, valorContrato: 690_000, status: "concluida", latitude: -6.7795, longitude: -43.0150, createdAt: diasAtras(400), atualizadoEm: diasAtras(20) },
  ]);

  // ── Licitações: prazo vencido, fornecedor em série, dispensa no teto ──
  await db.insert(licitacoes).values([
    { id: "demo_lic_1", prefeituraId: ID_PREFEITURA_DEMO, numero: "PE 014/2026", objeto: "Merenda escolar", modalidade: "Pregão eletrônico", valorEstimado: 1_200_000, fornecedor: "Alimentos Boa Mesa Ltda", status: "em_disputa", prazoFinal: diasAtras(2), createdAt: diasAtras(40) },
    { id: "demo_lic_2", prefeituraId: ID_PREFEITURA_DEMO, numero: "PE 009/2026", objeto: "Gêneros alimentícios para as creches", modalidade: "Pregão eletrônico", valorEstimado: 740_000, fornecedor: "Alimentos Boa Mesa Ltda", status: "homologada", prazoFinal: diasAtras(90), createdAt: diasAtras(120) },
    { id: "demo_lic_3", prefeituraId: ID_PREFEITURA_DEMO, numero: "PE 005/2026", objeto: "Kit lanche para eventos escolares", modalidade: "Pregão eletrônico", valorEstimado: 140_000, fornecedor: "Alimentos Boa Mesa Ltda", status: "homologada", prazoFinal: diasAtras(160), createdAt: diasAtras(190) },
    { id: "demo_lic_4", prefeituraId: ID_PREFEITURA_DEMO, numero: "PE 012/2026", objeto: "Medicamentos básicos", modalidade: "Pregão eletrônico", valorEstimado: 640_000, fornecedor: "Distribuidora Vida", status: "homologada", prazoFinal: diasAtras(60), createdAt: diasAtras(100) },
    { id: "demo_lic_5", prefeituraId: ID_PREFEITURA_DEMO, numero: "DL 007/2026", objeto: "Material de expediente", modalidade: "Dispensa de licitação", valorEstimado: 63_900, fornecedor: "Papelaria Central", status: "homologada", prazoFinal: diasAtras(30), createdAt: diasAtras(45) },
    { id: "demo_lic_6", prefeituraId: ID_PREFEITURA_DEMO, numero: "TP 003/2026", objeto: "Pavimentação Beira-Rio", modalidade: "Tomada de preços", valorEstimado: 2_100_000, fornecedor: null, status: "publicada", prazoFinal: diasAFrente(12), createdAt: diasAtras(10) },
  ]);

  // ── Atendimento: uma no prazo, uma vencendo, uma respondida ──
  await db.insert(atendimentos).values([
    { id: "demo_at_ubs", prefeituraId: ID_PREFEITURA_DEMO, tipo: "reclamacao", assunto: "Sem médico na UBS Alto da Serra", mensagem: "Fui três vezes esta semana na UBS Alto da Serra e não tinha médico. Só a enfermeira.", anonimo: false, status: "aberto", protocolo: "202609-DEMO09", chaveConsulta: "DEMO0009", nome: "Maria do Socorro", origem: "site", createdAt: diasAtras(2) },
    { id: "demo_at_1", prefeituraId: ID_PREFEITURA_DEMO, protocolo: "202609-DEMO01", tipo: "reclamacao", nome: "Morador do Centro", anonimo: false, assunto: "Iluminação pública na Rua das Flores", mensagem: "Três postes apagados há duas semanas.", status: "em_analise", chaveConsulta: "DEMO0001", origem: "site", createdAt: diasAtras(8) },
    { id: "demo_at_2", prefeituraId: ID_PREFEITURA_DEMO, protocolo: "202609-DEMO02", tipo: "informacao", nome: "Cidadã", anonimo: false, assunto: "Contratos do transporte escolar", mensagem: "Solicito cópia dos contratos vigentes.", status: "aberto", chaveConsulta: "DEMO0002", origem: "site", createdAt: diasAtras(17) },
    { id: "demo_at_3", prefeituraId: ID_PREFEITURA_DEMO, protocolo: "202608-DEMO03", tipo: "denuncia", nome: null, anonimo: true, assunto: "Coleta de lixo irregular", mensagem: "Bairro Alto da Serra sem coleta.", status: "respondido", resposta: "Rota restabelecida.", respondidoEm: diasAtras(30), chaveConsulta: "DEMO0003", origem: "site", createdAt: diasAtras(40) },
  ]);

  // ── Financeiro: saldo virou negativo ──
  await db.insert(dashboardSnapshots).values([
    { id: "demo_snap_0", prefeituraId: ID_PREFEITURA_DEMO, receita: 510_000, despesas: 462_000, saldo: 48_000, indiceTransparencia: 78, atualizadoEm: diasAtras(60) },
    { id: "demo_snap_1", prefeituraId: ID_PREFEITURA_DEMO, receita: 482_000, despesas: 566_000, saldo: -84_000, indiceTransparencia: 78, atualizadoEm: diasAtras(3) },
  ]);

  await db.insert(alertas).values([
    { id: "demo_al_1", prefeituraId: ID_PREFEITURA_DEMO, titulo: "Reunião com a Comissão de Licitação", descricao: "Definir o encaminhamento do PE 014/2026.", prioridade: "urgente", secretaria: "licitacoes", resolvido: false, createdAt: diasAtras(1) },
  ]);
}
