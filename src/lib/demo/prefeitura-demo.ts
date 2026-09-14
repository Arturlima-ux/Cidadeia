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

export const ID_PREFEITURA_DEMO = "demo_prefeitura";
export const ID_USUARIO_DEMO = "demo_usuario";
export const NOME_DEMO = "Prefeitura de Vila Nova";
const VALIDADE_MS = 24 * 60 * 60 * 1000;

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
    .select({ createdAt: prefeituras.createdAt })
    .from(prefeituras)
    .where(eq(prefeituras.id, ID_PREFEITURA_DEMO))
    .limit(1);

  if (existente) {
    const idade = Date.now() - new Date(existente.createdAt).getTime();
    if (Number.isFinite(idade) && idade < VALIDADE_MS) return;
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
  await db.insert(unidadesSaude).values([
    { id: "demo_ubs_1", prefeituraId: ID_PREFEITURA_DEMO, nome: "UBS Central", tipo: "ubs", bairro: "Centro", latitude: -6.7712, longitude: -43.0221 },
    { id: "demo_ubs_2", prefeituraId: ID_PREFEITURA_DEMO, nome: "UBS Alto da Serra", tipo: "ubs", bairro: "Alto da Serra", latitude: -6.7655, longitude: -43.0312 },
    { id: "demo_hosp", prefeituraId: ID_PREFEITURA_DEMO, nome: "Hospital Municipal", tipo: "hospital", bairro: "Centro", latitude: -6.7748, longitude: -43.0189 },
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
  await db.insert(escolas).values([
    { id: "demo_esc_1", prefeituraId: ID_PREFEITURA_DEMO, nome: "E. M. Padre Cícero", bairro: "Centro", evasaoPercentual: 12.4, latitude: -6.7701, longitude: -43.0235 },
    { id: "demo_esc_2", prefeituraId: ID_PREFEITURA_DEMO, nome: "E. M. Maria das Dores", bairro: "Alto da Serra", evasaoPercentual: 9.8, latitude: -6.7648, longitude: -43.0298 },
    { id: "demo_esc_3", prefeituraId: ID_PREFEITURA_DEMO, nome: "E. M. José Alencar", bairro: "Jardim", evasaoPercentual: 3.1, latitude: -6.7789, longitude: -43.0157 },
    { id: "demo_esc_4", prefeituraId: ID_PREFEITURA_DEMO, nome: "E. M. Santa Luzia", bairro: "Vila Operária", evasaoPercentual: 2.6, latitude: -6.7733, longitude: -43.0276 },
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
    { id: "demo_lic_2", prefeituraId: ID_PREFEITURA_DEMO, numero: "PE 009/2026", objeto: "Gêneros alimentícios para as creches", modalidade: "Pregão eletrônico", valorEstimado: 380_000, fornecedor: "Alimentos Boa Mesa Ltda", status: "homologada", prazoFinal: diasAtras(90), createdAt: diasAtras(120) },
    { id: "demo_lic_3", prefeituraId: ID_PREFEITURA_DEMO, numero: "PE 005/2026", objeto: "Kit lanche para eventos escolares", modalidade: "Pregão eletrônico", valorEstimado: 140_000, fornecedor: "Alimentos Boa Mesa Ltda", status: "homologada", prazoFinal: diasAtras(160), createdAt: diasAtras(190) },
    { id: "demo_lic_4", prefeituraId: ID_PREFEITURA_DEMO, numero: "PE 012/2026", objeto: "Medicamentos básicos", modalidade: "Pregão eletrônico", valorEstimado: 640_000, fornecedor: "Distribuidora Vida", status: "homologada", prazoFinal: diasAtras(60), createdAt: diasAtras(100) },
    { id: "demo_lic_5", prefeituraId: ID_PREFEITURA_DEMO, numero: "DL 007/2026", objeto: "Material de expediente", modalidade: "Dispensa de licitação", valorEstimado: 63_900, fornecedor: "Papelaria Central", status: "homologada", prazoFinal: diasAtras(30), createdAt: diasAtras(45) },
    { id: "demo_lic_6", prefeituraId: ID_PREFEITURA_DEMO, numero: "TP 003/2026", objeto: "Pavimentação Beira-Rio", modalidade: "Tomada de preços", valorEstimado: 2_100_000, fornecedor: null, status: "publicada", prazoFinal: diasAFrente(12), createdAt: diasAtras(10) },
  ]);

  // ── Atendimento: uma no prazo, uma vencendo, uma respondida ──
  await db.insert(atendimentos).values([
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
