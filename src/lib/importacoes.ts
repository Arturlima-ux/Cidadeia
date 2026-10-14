import { randomUUID } from "node:crypto";
import { and, eq, inArray, isNotNull } from "drizzle-orm";
import { db } from "@/db";
import { contratos, despesaPessoal, investimentos, licitacoes, obras, unidadesSaude } from "@/db/schema";
import { gerarId } from "@/lib/id";
import { buscarRgfMaisRecente } from "@/lib/siconfi-rgf";
import { LIMITE_PESSOAL } from "@/lib/despesa-pessoal";
import { buscarDespesasSiconfi, competenciaDoBimestre } from "@/lib/siconfi";
import { buscarRedeNoCnes } from "@/lib/cnes";
import { buscarContratacoesPncp, processosSoNoPncp, paraLicitacaoLocal } from "@/lib/pncp";
import { buscarContratosPncp, type ContratoPncp } from "@/lib/contratos-pncp";
import { ehObraOuEngenharia } from "@/lib/obra-prazo";

// ── AS IMPORTAÇÕES, SEM A TELA ──
//
// O que o botão de cada tela faz (trazer o RGF e o RREO do Tesouro, a rede do
// CNES, os processos e contratos do PNCP, as obras dos contratos) mora aqui,
// sem sessão. A tela confere quem clicou e chama a mesma função; a rotina
// diária (importacao-automatica.ts) chama sem ninguém clicar. Uma regra de
// gravação só, para as duas portas: duas cópias divergem, e a que ficar para
// trás é a que grava errado.

// ── despesa com pessoal (RGF) ──

export type ResultadoRgf =
  | { ok: true; mesReferencia: number; exercicio: number; percentual: number; instituicao: string | null; gravou: boolean }
  | { ok: false; erro: string };

/**
 * `respeitarManual`: na rotina automática, o período que alguém lançou à mão
 * não é sobrescrito. Quem clica em "importar" pediu o número do Tesouro, e
 * leva.
 */
export async function importarRgf(
  prefeituraId: string,
  codigoIbge: string,
  opcoes: { hoje?: Date; respeitarManual?: boolean } = {}
): Promise<ResultadoRgf> {
  const agora = opcoes.hoje ?? new Date();
  const resultado = await buscarRgfMaisRecente(codigoIbge, agora.getFullYear(), agora.getMonth() + 1);
  if (!resultado.ok) return { ok: false, erro: resultado.erro };
  const { dados } = resultado;

  // Confere a nossa régua contra a do Tesouro antes de gravar. Se o limite que
  // ele publica não representar 54% da RCL ajustada, alguma premissa mudou —
  // e é melhor recusar do que gravar um número que a tela vai julgar por uma
  // régua que não vale mais.
  // Null é "o anexo não trouxe a linha", e não "o limite é zero": sem o número
  // publicado não há o que conferir, e a importação segue com a régua da lei.
  if (dados.limiteMaximo !== null && dados.limiteMaximo > 0) {
    const limitePublicado = (dados.limiteMaximo / dados.rclAjustada) * 100;
    if (Math.abs(limitePublicado - LIMITE_PESSOAL) > 0.5) {
      return {
        ok: false,
        erro:
          `O Tesouro publicou para este município um limite de ${limitePublicado.toFixed(1).replace(".", ",")}% ` +
          `da RCL, e não os ${LIMITE_PESSOAL}% que esta tela usa. Confira com o contador antes de importar.`,
      };
    }
  }

  const { exercicio, mesReferencia } = dados.periodo;
  const percentual = (dados.despesaTotal / dados.rclAjustada) * 100;
  const [existente] = await db
    .select({ id: despesaPessoal.id, origem: despesaPessoal.origem, rcl: despesaPessoal.rcl, despesa: despesaPessoal.despesa })
    .from(despesaPessoal)
    .where(
      and(
        eq(despesaPessoal.prefeituraId, prefeituraId),
        eq(despesaPessoal.exercicio, exercicio),
        eq(despesaPessoal.mesReferencia, mesReferencia)
      )
    )
    .limit(1);

  if (existente && opcoes.respeitarManual && existente.origem !== "siconfi") {
    return { ok: true, exercicio, mesReferencia, percentual, instituicao: dados.instituicao, gravou: false };
  }
  // Nada mudou desde a última importação: não toca a linha.
  if (existente && existente.origem === "siconfi" && existente.rcl === dados.rclAjustada && existente.despesa === dados.despesaTotal) {
    return { ok: true, exercicio, mesReferencia, percentual, instituicao: dados.instituicao, gravou: false };
  }

  const valores = {
    // Grava a AJUSTADA: é sobre ela que o art. 20, § 6º manda calcular o
    // limite. A RCL cheia daria um percentual menor que o oficial, dizendo ao
    // prefeito que ele tem folga que não tem.
    rcl: dados.rclAjustada,
    despesa: dados.despesaTotal,
    origem: "siconfi" as const,
    atualizadoEm: new Date().toISOString(),
  };
  if (existente) {
    await db.update(despesaPessoal).set(valores).where(eq(despesaPessoal.id, existente.id));
  } else {
    await db.insert(despesaPessoal).values({ id: gerarId("pessoal"), prefeituraId, exercicio, mesReferencia, ...valores });
  }
  return { ok: true, exercicio, mesReferencia, percentual, instituicao: dados.instituicao, gravou: true };
}

// ── despesa por função (RREO) ──

export type ResultadoRreo =
  | { ok: true; importados: number; total: number; instituicao: string | null; periodo: string }
  | { ok: false; erro: string };

/**
 * Reimportar o MESMO período substitui só o que veio do SICONFI — lançamento
 * manual do gestor nunca é apagado.
 */
export async function importarRreo(prefeituraId: string, codigoIbge: string, ano: number, bimestre: number): Promise<ResultadoRreo> {
  const resultado = await buscarDespesasSiconfi(codigoIbge, ano, bimestre);
  if (!resultado.ok) return resultado;
  const competencia = competenciaDoBimestre(ano, bimestre);

  await db
    .delete(investimentos)
    .where(and(eq(investimentos.prefeituraId, prefeituraId), eq(investimentos.origem, "siconfi"), eq(investimentos.competencia, competencia)));
  if (resultado.despesas.length) {
    await db.insert(investimentos).values(
      resultado.despesas.map((d) => ({
        id: gerarId("inv"),
        prefeituraId,
        secretaria: d.secretaria,
        valor: d.valor,
        descricao: `SICONFI ${bimestre}º bim/${ano} — função: ${d.funcoes.join(", ")}`,
        competencia,
        origem: "siconfi" as const,
      }))
    );
  }
  return {
    ok: true,
    importados: resultado.despesas.length,
    total: resultado.despesas.reduce((a, d) => a + d.valor, 0),
    instituicao: resultado.instituicao,
    periodo: `${bimestre}º bimestre de ${ano}`,
  };
}

/** Os bimestres cujo RREO já deveria estar no Tesouro (prazo de 30 dias), do mais recente ao mais antigo. */
export function bimestresVencidos(hoje: Date, quantos = 2): { ano: number; bimestre: number }[] {
  const lista: { ano: number; bimestre: number }[] = [];
  let ano = hoje.getUTCFullYear();
  let bimestre = 6;
  // Anda para trás a partir do último bimestre do ano corrente.
  while (lista.length < quantos && ano >= hoje.getUTCFullYear() - 1) {
    const fim = new Date(Date.UTC(ano, bimestre * 2, 0));
    const prazo = new Date(fim.getTime() + 30 * 86_400_000);
    if (prazo <= hoje) lista.push({ ano, bimestre });
    bimestre--;
    if (bimestre === 0) {
      bimestre = 6;
      ano--;
    }
  }
  return lista;
}

// ── rede de saúde (CNES) ──

export type ResultadoCnes =
  | { ok: true; novas: number; atualizadas: number; desativadas: number; ignoradas: number; total: number }
  | { ok: false; erro: string };

/**
 * Cria o que não existe, atualiza o que existe (pelo código CNES), e marca
 * como inativa a unidade CNES que sumiu de lá. Unidades cadastradas à mão
 * não são tocadas.
 */
export async function sincronizarCnes(prefeituraId: string, codigoIbge: string): Promise<ResultadoCnes> {
  const r = await buscarRedeNoCnes(codigoIbge);
  if (!r.ok) return r;

  const existentes = await db
    .select({ id: unidadesSaude.id, codigoCnes: unidadesSaude.codigoCnes, ativo: unidadesSaude.ativo })
    .from(unidadesSaude)
    .where(and(eq(unidadesSaude.prefeituraId, prefeituraId), isNotNull(unidadesSaude.codigoCnes)));
  const porCodigo = new Map(existentes.map((e) => [e.codigoCnes!, e]));
  const agora = new Date().toISOString();

  let novas = 0;
  let atualizadas = 0;
  const vistos = new Set<string>();
  for (const u of r.unidades) {
    vistos.add(u.codigoCnes);
    const dados = {
      nome: u.nome,
      tipo: u.tipo,
      bairro: u.bairro,
      latitude: u.latitude,
      longitude: u.longitude,
      codigoTipoUnidade: u.codigoTipoUnidade,
      esfera: u.esfera,
      endereco: u.endereco,
      telefone: u.telefone,
      turno: u.turno,
      atendeSus: u.atendeSus,
      hospitalar: u.hospitalar,
      centroCirurgico: u.centroCirurgico,
      centroObstetrico: u.centroObstetrico,
      cnesAtualizadoEm: u.cnesAtualizadoEm,
      sincronizadoEm: agora,
      ativo: true,
    };
    const ex = porCodigo.get(u.codigoCnes);
    if (ex) {
      await db.update(unidadesSaude).set(dados).where(eq(unidadesSaude.id, ex.id));
      atualizadas++;
    } else {
      await db.insert(unidadesSaude).values({ id: gerarId("us"), prefeituraId, codigoCnes: u.codigoCnes, origem: "cnes", ...dados });
      novas++;
    }
  }

  const sumiram = existentes.filter((e) => e.ativo && !vistos.has(e.codigoCnes!)).map((e) => e.id);
  if (sumiram.length > 0) {
    await db.update(unidadesSaude).set({ ativo: false, sincronizadoEm: agora }).where(inArray(unidadesSaude.id, sumiram));
  }
  return { ok: true, novas, atualizadas, desativadas: sumiram.length, ignoradas: r.ignoradas, total: r.unidades.length };
}

// ── processos (PNCP) ──

export type ResultadoProcessos = { ok: true; importados: number; ignorados: number } | { ok: false; erro: string };

/** Traz os processos que o PNCP tem e ninguém digitou. Os que já existem não são tocados. */
export async function importarProcessosPncp(prefeituraId: string, cnpj: string, ano: number): Promise<ResultadoProcessos> {
  const consulta = await buscarContratacoesPncp(cnpj, ano);
  if (!consulta.ok) return { ok: false, erro: consulta.erro };

  const locais = await db
    .select({
      id: licitacoes.id,
      numero: licitacoes.numero,
      objeto: licitacoes.objeto,
      status: licitacoes.status,
      // Sem estes dois o casamento cai para número+ano, que nos dados reais
      // confunde "Dispensa 5/2026" com "Pregão 5/2026".
      numeroControlePncp: licitacoes.numeroControlePncp,
      modalidade: licitacoes.modalidade,
    })
    .from(licitacoes)
    .where(eq(licitacoes.prefeituraId, prefeituraId));

  const novos = processosSoNoPncp(locais, consulta.contratacoes);
  if (novos.length === 0) return { ok: true, importados: 0, ignorados: 0 };
  const linhas = novos
    .map((c) => {
      const campos = paraLicitacaoLocal(c);
      return campos ? { id: randomUUID(), prefeituraId, ...campos } : null;
    })
    .filter((l): l is NonNullable<typeof l> => l !== null);
  if (linhas.length > 0) await db.insert(licitacoes).values(linhas);
  return { ok: true, importados: linhas.length, ignorados: novos.length - linhas.length };
}

// ── contratos (PNCP) ──

export type ResultadoContratos = { ok: true; importados: number; anos: number[]; completa: boolean } | { ok: false; erro: string };

/**
 * Varre dois anos: o filtro do portal é por data de PUBLICAÇÃO, não por
 * vigência, e os contratos antigos ainda vigentes são justamente os que
 * interessam ao radar de vencimento.
 */
export async function importarContratosPncp(prefeituraId: string, cnpj: string, ano: number): Promise<ResultadoContratos> {
  const anos = [ano, ano - 1];
  const doPortal = new Map<string, ContratoPncp>();
  let completa = true;
  for (const a of anos) {
    const r = await buscarContratosPncp(cnpj, a);
    if (!r.ok) return { ok: false, erro: r.erro };
    if (!r.completa) completa = false;
    for (const c of r.contratos) doPortal.set(c.numeroControlePncp, c);
  }

  const jaTem = new Set(
    (await db.select({ chave: contratos.numeroControlePncp }).from(contratos).where(eq(contratos.prefeituraId, prefeituraId)))
      .map((r) => r.chave)
      .filter((x): x is string => !!x)
  );
  const novos = [...doPortal.values()].filter((c) => !jaTem.has(c.numeroControlePncp));
  if (novos.length === 0) return { ok: true, importados: 0, anos, completa };

  await db.insert(contratos).values(
    novos.map((c) => ({
      id: randomUUID(),
      prefeituraId,
      numeroControlePncp: c.numeroControlePncp,
      numeroControlePncpCompra: c.numeroControlePncpCompra,
      numeroContrato: c.numeroContrato,
      processo: c.processo,
      objeto: c.objeto,
      fornecedorDocumento: c.fornecedorDocumento,
      fornecedorNome: c.fornecedorNome,
      fornecedorTipoPessoa: c.fornecedorTipoPessoa,
      valorInicial: c.valorInicial,
      valorGlobal: c.valorGlobal,
      dataAssinatura: c.dataAssinatura,
      vigenciaInicio: c.vigenciaInicio,
      vigenciaFim: c.vigenciaFim,
      tipoContrato: c.tipoContrato,
      categoria: c.categoria,
      frutoAdesao: c.frutoAdesao,
      numeroRetificacao: c.numeroRetificacao,
      origem: "pncp" as const,
    }))
  );
  return { ok: true, importados: novos.length, anos, completa };
}

// ── obras (a partir dos contratos) ──

export type ResultadoObras = { ok: true; importados: number; atualizados: number } | { ok: false; erro: string };

export async function importarObrasDosContratos(prefeituraId: string): Promise<ResultadoObras> {
  const todosContratos = await db.select().from(contratos).where(eq(contratos.prefeituraId, prefeituraId));
  const deObra = todosContratos.filter((c) => ehObraOuEngenharia(c.categoria));
  if (deObra.length === 0) return { ok: true, importados: 0, atualizados: 0 };

  const existentes = new Map(
    (await db.select().from(obras).where(eq(obras.prefeituraId, prefeituraId)))
      .filter((o) => o.numeroControlePncpContrato)
      .map((o) => [o.numeroControlePncpContrato!, o])
  );

  let importados = 0;
  let atualizados = 0;
  for (const c of deObra) {
    if (!c.numeroControlePncp) continue;
    const jaTem = existentes.get(c.numeroControlePncp);
    if (jaTem) {
      // Termo aditivo de prazo muda a vigência do contrato: a obra acompanha,
      // para o radar não acusar de vencida uma obra prorrogada. O progresso
      // NÃO é tocado: é medição da prefeitura, não do portal.
      if (jaTem.vigenciaInicio !== c.vigenciaInicio || jaTem.vigenciaFim !== c.vigenciaFim || jaTem.valorContrato !== c.valorGlobal) {
        await db
          .update(obras)
          .set({ vigenciaInicio: c.vigenciaInicio, vigenciaFim: c.vigenciaFim, valorContrato: c.valorGlobal, fornecedorNome: c.fornecedorNome })
          .where(and(eq(obras.id, jaTem.id), eq(obras.prefeituraId, prefeituraId)));
        atualizados++;
      }
      continue;
    }
    await db.insert(obras).values({
      id: gerarId("obra"),
      prefeituraId,
      nome: c.objeto.slice(0, 160),
      valorContrato: c.valorGlobal,
      numeroControlePncpContrato: c.numeroControlePncp,
      vigenciaInicio: c.vigenciaInicio,
      vigenciaFim: c.vigenciaFim,
      fornecedorNome: c.fornecedorNome,
      origem: "pncp" as const,
      // NULL, e não zero: ninguém mediu esta obra ainda. Entrar com 0%
      // afirmaria progresso zero sobre obra que pode estar em 90%.
      progressoAtual: null,
      status: "em_andamento" as const,
    });
    importados++;
  }
  return { ok: true, importados, atualizados };
}
