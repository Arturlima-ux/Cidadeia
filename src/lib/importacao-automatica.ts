import { and, desc, eq, inArray, like, notInArray } from "drizzle-orm";
import { db } from "@/db";
import { investimentos, pedidoEventos, prefeituras } from "@/db/schema";
import { gerarId } from "@/lib/id";
import { dataDoBanco } from "@/lib/data-do-banco";

export { dataDoBanco };
import { planosContratadosDe, type PlanoAddon } from "@/lib/planos";
import { PREFEITURAS_INTERNAS } from "@/lib/prefeituras-internas";
import { ID_PREFEITURA_DEMO } from "@/lib/demo/prefeitura-demo";
import { exigirPlano } from "@/lib/exigir-plano";
import { buscarCodigoIbge, competenciaDoBimestre } from "@/lib/siconfi";
import { buscarEmendasPix, gravarEmendas } from "@/lib/emendas-pix-servidor";
import { buscarObrasFederais, gravarObrasFederais } from "@/lib/obras-federais-servidor";
import {
  bimestresVencidos,
  importarContratosPncp,
  importarObrasDosContratos,
  importarProcessosPncp,
  importarRgf,
  importarRreo,
  sincronizarCnes,
} from "@/lib/importacoes";

// ── A IMPORTAÇÃO QUE NINGUÉM PRECISA LEMBRAR DE FAZER ──
//
// Cada tela tinha um botão "importar do Tesouro / do CNES / do PNCP". Funciona
// no dia da implantação; três meses depois, ninguém clica, o RGF novo não
// entra, o contrato assinado semana passada não aparece no radar, e a vigia
// passa a vigiar dado velho. O site promete "o que já é público entra
// sozinho"; agora entra:
//
//   Gestão      RGF (despesa com pessoal) e RREO (despesa por função)
//   Saúde       rede do CNES
//   Licitações  processos e contratos do PNCP
//   Obras       contratos do PNCP e as obras que saem deles
//   Obras,      as obras com dinheiro federal no município (ObrasGov)
//   Saúde e
//   Educação
//   Gestão e    as emendas Pix recebidas (Transferegov): alerta no Gestão,
//   Essencial   repasses publicados sozinhos no portal
//
// Uma vez por semana cada fonte, de madrugada, antes da vigia das 6h40: a
// vigia já acorda com o dado novo. Fonte que falhou tenta de novo no dia
// seguinte. O Censo Escolar fica de fora: o INEP não tem consulta pública,
// só o arquivo, que a secretaria sobe uma vez por ano.
//
// O que foi lançado à mão nunca é sobrescrito pela rotina (ver
// importacoes.ts). Quem quiser o número do Tesouro por cima clica no botão.

export type Fonte = "rgf" | "rreo" | "cnes" | "pncp-processos" | "pncp-contratos" | "obras" | "emendas-pix" | "obrasgov";

export const FONTES: { fonte: Fonte; nome: string; planos: PlanoAddon[]; precisa: "ibge" | "cnpj" | null; dias: number }[] = [
  { fonte: "rgf", nome: "Despesa com pessoal (RGF, Tesouro)", planos: ["gestao"], precisa: "ibge", dias: 7 },
  { fonte: "rreo", nome: "Despesa por função (RREO, Tesouro)", planos: ["gestao"], precisa: "ibge", dias: 7 },
  { fonte: "cnes", nome: "Rede de saúde (CNES)", planos: ["saude"], precisa: "ibge", dias: 7 },
  { fonte: "pncp-processos", nome: "Processos de compra (PNCP)", planos: ["licitacoes"], precisa: "cnpj", dias: 7 },
  { fonte: "pncp-contratos", nome: "Contratos (PNCP)", planos: ["licitacoes", "obras"], precisa: "cnpj", dias: 7 },
  { fonte: "obras", nome: "Obras a partir dos contratos", planos: ["obras"], precisa: null, dias: 7 },
  { fonte: "emendas-pix", nome: "Emendas Pix (Transferegov)", planos: ["gestao", "essencial"], precisa: "cnpj", dias: 7 },
  { fonte: "obrasgov", nome: "Obras federais no município (ObrasGov)", planos: ["obras", "saude", "educacao"], precisa: "ibge", dias: 7 },
];

export const EVENTO_OK = "importacao_ok";
export const EVENTO_FALHOU = "importacao_falhou";
export const idDaFonte = (prefeituraId: string, fonte: Fonte) => `importacao:${prefeituraId}:${fonte}`;

export type UltimaVez = { ok: string | null; falhou: string | null; resumo: string | null };

/** As fontes que vencem hoje para esta prefeitura. Pura: é o que os testes cobrem. */
export function fontesDevidas(
  planos: PlanoAddon[],
  ultimas: Partial<Record<Fonte, UltimaVez>>,
  hoje: Date,
  forcar = false
): Fonte[] {
  const horasDesde = (t: string) => (hoje.getTime() - dataDoBanco(t).getTime()) / 3_600_000;
  return FONTES.filter((f) => f.planos.some((p) => planos.includes(p)))
    .filter((f) => {
      if (forcar) return true;
      const u = ultimas[f.fonte];
      // Falhou nas últimas 20 horas: tenta de novo no dia seguinte, sem
      // martelar a fonte no mesmo dia.
      if (u?.falhou && horasDesde(u.falhou) < 20 && (!u.ok || dataDoBanco(u.ok) < dataDoBanco(u.falhou))) return false;
      if (!u?.ok) return true;
      // Meio dia de folga: a rotina roda no mesmo horário, e um minuto a
      // menos não pode empurrar a fonte para a semana seguinte.
      return horasDesde(u.ok) >= (f.dias - 0.5) * 24;
    })
    .map((f) => f.fonte);
}

export async function ultimasImportacoes(prefeituraId: string): Promise<Partial<Record<Fonte, UltimaVez>>> {
  const linhas = await db
    .select({ pedidoId: pedidoEventos.pedidoId, tipo: pedidoEventos.tipo, descricao: pedidoEventos.descricao, criadoEm: pedidoEventos.criadoEm })
    .from(pedidoEventos)
    .where(and(like(pedidoEventos.pedidoId, `importacao:${prefeituraId}:%`), inArray(pedidoEventos.tipo, [EVENTO_OK, EVENTO_FALHOU])))
    .orderBy(desc(pedidoEventos.criadoEm))
    .limit(200);
  const saida: Partial<Record<Fonte, UltimaVez>> = {};
  for (const l of linhas) {
    const fonte = l.pedidoId.split(":").pop() as Fonte;
    const u = (saida[fonte] ??= { ok: null, falhou: null, resumo: null });
    if (l.tipo === EVENTO_OK && !u.ok) {
      u.ok = l.criadoEm;
      u.resumo = l.descricao;
    }
    if (l.tipo === EVENTO_FALHOU && !u.falhou) u.falhou = l.criadoEm;
  }
  return saida;
}

async function registrar(prefeituraId: string, fonte: Fonte, ok: boolean, descricao: string) {
  await db.insert(pedidoEventos).values({
    id: gerarId("pev"),
    pedidoId: idDaFonte(prefeituraId, fonte),
    tipo: ok ? EVENTO_OK : EVENTO_FALHOU,
    descricao: descricao.slice(0, 500),
    autor: "importação automática",
  });
}

const plural = (n: number, um: string, muitos: string) => `${n} ${n === 1 ? um : muitos}`;

/** Roda uma fonte. Devolve o resumo para a linha do tempo, ou lança o erro. */
async function rodarFonte(
  fonte: Fonte,
  p: { id: string; codigoIbge: string | null; cnpj: string | null },
  hoje: Date
): Promise<string> {
  const ibge = p.codigoIbge;
  const cnpj = p.cnpj;
  switch (fonte) {
    case "rgf": {
      const r = await importarRgf(p.id, ibge!, { hoje, respeitarManual: true });
      if (!r.ok) throw new Error(r.erro);
      return r.gravou
        ? `RGF de ${r.mesReferencia}/${r.exercicio} importado: ${r.percentual.toFixed(1).replace(".", ",")}% da RCL`
        : `RGF de ${r.mesReferencia}/${r.exercicio} conferido, sem mudança`;
    }
    case "rreo": {
      // O bimestre mais recente que já deveria estar no Tesouro; se ainda não
      // está, o anterior. Período já importado não é refeito.
      let ultimoErro = "O Tesouro ainda não tem o RREO dos últimos bimestres";
      for (const { ano, bimestre } of bimestresVencidos(hoje, 2)) {
        const [ja] = await db
          .select({ id: investimentos.id })
          .from(investimentos)
          .where(and(eq(investimentos.prefeituraId, p.id), eq(investimentos.origem, "siconfi"), eq(investimentos.competencia, competenciaDoBimestre(ano, bimestre))))
          .limit(1);
        if (ja) return `RREO do ${bimestre}º bimestre de ${ano} já estava importado`;
        const r = await importarRreo(p.id, ibge!, ano, bimestre);
        if (r.ok) return `RREO do ${r.periodo} importado: ${plural(r.importados, "função", "funções")}`;
        ultimoErro = r.erro;
      }
      throw new Error(ultimoErro);
    }
    case "cnes": {
      const r = await sincronizarCnes(p.id, ibge!);
      if (!r.ok) throw new Error(r.erro);
      return `CNES: ${plural(r.novas, "unidade nova", "unidades novas")}, ${r.atualizadas} atualizada(s), ${r.desativadas} desativada(s)`;
    }
    case "pncp-processos": {
      const r = await importarProcessosPncp(p.id, cnpj!, hoje.getUTCFullYear());
      if (!r.ok) throw new Error(r.erro);
      return `PNCP: ${plural(r.importados, "processo novo", "processos novos")}`;
    }
    case "pncp-contratos": {
      const r = await importarContratosPncp(p.id, cnpj!, hoje.getUTCFullYear());
      if (!r.ok) throw new Error(r.erro);
      return `PNCP: ${plural(r.importados, "contrato novo", "contratos novos")}${r.completa ? "" : " (varredura parcial)"}`;
    }
    case "emendas-pix": {
      const emendas = await buscarEmendasPix(cnpj!, hoje);
      await gravarEmendas(p.id, emendas);
      return emendas.length
        ? `Transferegov: ${plural(emendas.length, "emenda Pix", "emendas Pix")} nos últimos anos`
        : "Transferegov: nenhuma emenda Pix para o CNPJ da prefeitura";
    }
    case "obrasgov": {
      const obras = await buscarObrasFederais(ibge!);
      await gravarObrasFederais(p.id, obras);
      return obras.length ? `ObrasGov: ${plural(obras.length, "obra federal", "obras federais")} no município` : "ObrasGov: nenhuma obra federal cadastrada no município";
    }
    case "obras": {
      const r = await importarObrasDosContratos(p.id);
      if (!r.ok) throw new Error(r.erro);
      return `Obras: ${plural(r.importados, "nova", "novas")}, ${plural(r.atualizados, "com prazo atualizado", "com prazo atualizado")}`;
    }
  }
}

export type RelatorioImportacao = { prefeituras: number; feitas: number; falhas: number; adiadas: number; erros: string[] };

/** Uma prefeitura. `forcar` roda todas as fontes do plano, sem olhar a última vez (ao reconhecer o município). */
export async function importarDaPrefeitura(
  prefeituraId: string,
  opcoes: { hoje?: Date; forcar?: boolean; ateMs?: number } = {}
): Promise<{ feitas: number; falhas: number; pendentes: number; erros: string[] }> {
  const hoje = opcoes.hoje ?? new Date();
  const saida = { feitas: 0, falhas: 0, pendentes: 0, erros: [] as string[] };
  const [p] = await db
    .select({ id: prefeituras.id, municipio: prefeituras.municipio, estado: prefeituras.estado, codigoIbge: prefeituras.codigoIbge, cnpj: prefeituras.cnpj, planos: prefeituras.planosContratados })
    .from(prefeituras)
    .where(eq(prefeituras.id, prefeituraId))
    .limit(1);
  if (!p || p.id === ID_PREFEITURA_DEMO || PREFEITURAS_INTERNAS.includes(p.id)) return saida;
  const planos = planosContratadosDe(p.planos);

  const devidas = fontesDevidas(planos, await ultimasImportacoes(p.id), hoje, opcoes.forcar);
  if (!devidas.length) return saida;

  // Conta suspensa por atraso não importa: a mesma trava das telas.
  const travada = !(await exigirPlano(p.id, planos[0])).ok;
  if (travada) return saida;

  let codigoIbge = p.codigoIbge;
  if (!codigoIbge && devidas.some((f) => FONTES.find((x) => x.fonte === f)?.precisa === "ibge")) {
    codigoIbge = await buscarCodigoIbge(p.municipio, p.estado).catch(() => null);
    if (codigoIbge) await db.update(prefeituras).set({ codigoIbge }).where(eq(prefeituras.id, p.id));
  }

  for (const [i, fonte] of devidas.entries()) {
    if (opcoes.ateMs && Date.now() > opcoes.ateMs) {
      saida.pendentes = devidas.length - i;
      break;
    }
    const precisa = FONTES.find((x) => x.fonte === fonte)!.precisa;
    if ((precisa === "ibge" && !codigoIbge) || (precisa === "cnpj" && !p.cnpj)) {
      saida.falhas++;
      await registrar(p.id, fonte, false, precisa === "ibge" ? "Município sem código IBGE reconhecido" : "Prefeitura sem CNPJ cadastrado");
      continue;
    }
    try {
      const resumo = await rodarFonte(fonte, { id: p.id, codigoIbge, cnpj: p.cnpj }, hoje);
      await registrar(p.id, fonte, true, resumo);
      saida.feitas++;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await registrar(p.id, fonte, false, msg);
      saida.falhas++;
      saida.erros.push(`${p.municipio} · ${fonte}: ${msg}`);
    }
  }
  return saida;
}

/** Todas as prefeituras clientes, em rodízio, até o orçamento de tempo. */
export async function rodarImportacaoAutomatica(opcoes: { orcamentoMs?: number; hoje?: Date } = {}): Promise<RelatorioImportacao> {
  const inicio = Date.now();
  const ate = inicio + (opcoes.orcamentoMs ?? 45_000);
  const hoje = opcoes.hoje ?? new Date();
  const r: RelatorioImportacao = { prefeituras: 0, feitas: 0, falhas: 0, adiadas: 0, erros: [] };

  const todas = await db
    .select({ id: prefeituras.id, planos: prefeituras.planosContratados })
    .from(prefeituras)
    .where(notInArray(prefeituras.id, [...PREFEITURAS_INTERNAS, ID_PREFEITURA_DEMO]));
  const clientes = todas.filter((p) => planosContratadosDe(p.planos).length > 0).sort((a, b) => a.id.localeCompare(b.id));
  const giro = Math.floor(hoje.getTime() / 86_400_000) % Math.max(1, clientes.length);
  const fila = [...clientes.slice(giro), ...clientes.slice(0, giro)];

  for (const [i, p] of fila.entries()) {
    if (Date.now() > ate) {
      r.adiadas = fila.length - i;
      break;
    }
    try {
      const s = await importarDaPrefeitura(p.id, { hoje, ateMs: ate });
      r.prefeituras++;
      r.feitas += s.feitas;
      r.falhas += s.falhas;
      r.erros.push(...s.erros);
    } catch (e) {
      r.erros.push(`${p.id}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  return r;
}
