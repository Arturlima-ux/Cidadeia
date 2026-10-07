import { itensDoTesouro } from "@/lib/tesouro-http";
import { enteNoTesouro } from "@/lib/siconfi-tipos";
import { mesDeReferencia, type PeriodoRgf } from "@/lib/siconfi-rgf";

// ── O EXTRATO DE ENTREGAS ──
//
// O Tesouro publica, por município e ano, a lista do que cada instituição
// entregou: RREO, RGF, DCA, MSC, com período e situação. É a fonte que diz
// QUAL RGF a prefeitura entregou, comum ou simplificado, quadrimestral ou
// semestral.
//
// Sem ela, a busca do RGF tentava às cegas até oito períodos, cada um nos dois
// tipos: dezesseis perguntas por visita. Era isso que fazia o Tesouro recusar
// consultas em sequência, e o cidadão ficava sem o número. Com o extrato, é
// uma pergunta para saber onde está e duas para buscar.
//
// O extrato é atalho, nunca veredito: se ele não ajudar (não respondeu, ou a
// prefeitura aparece com outro nome), a busca completa continua valendo, e só
// ela pode concluir que nada foi publicado.

const URL_EXTRATO = "https://apidatalake.tesouro.gov.br/ords/siconfi/tt/extrato_entregas";
const SEIS_HORAS = 6 * 3600;

type LinhaExtrato = {
  instituicao?: string;
  entregavel?: string;
  periodo?: number;
  periodicidade?: string;
};

/** Uma entrega da prefeitura, como o extrato do Tesouro registra. */
export type EntregaRegistrada = {
  relatorio: "rreo" | "rgf";
  /** "B" bimestral, "Q" quadrimestral, "S" semestral. */
  periodicidade: "B" | "Q" | "S";
  periodo: number;
  /** Tipo comum ou simplificado. */
  simplificado: boolean;
};

/**
 * RREO e RGF que a PREFEITURA entregou no ano, segundo o extrato de entregas.
 * Null quando o extrato não respondeu: aí nada se afirma sobre entrega.
 *
 * Câmara, consórcio e órgãos de controle aparecem no mesmo extrato, com
 * relatórios próprios, e não contam.
 */
export async function entregasDaPrefeitura(codigoIbge: string, ano: number): Promise<EntregaRegistrada[] | null> {
  const itens = await itensDoTesouro<LinhaExtrato>(
    `${URL_EXTRATO}?id_ente=${enteNoTesouro(codigoIbge).id}&an_referencia=${ano}`,
    SEIS_HORAS
  );
  if (itens === null) return null;
  const vistas = new Set<string>();
  const entregas: EntregaRegistrada[] = [];
  for (const i of itens) {
    const nome = i.entregavel ?? "";
    const relatorio = /^Relat[oó]rio de Gest[aã]o Fiscal/i.test(nome)
      ? "rgf"
      : /^Relat[oó]rio Resumido/i.test(nome)
      ? "rreo"
      : null;
    if (!relatorio) continue;
    if (/c[aâ]mara|legislativ|cons[oó]rcio|tribunal|minist[eé]rio p|defensoria/i.test(i.instituicao ?? "")) continue;
    const periodicidade = i.periodicidade === "B" || i.periodicidade === "Q" || i.periodicidade === "S" ? i.periodicidade : null;
    if (!periodicidade || typeof i.periodo !== "number") continue;
    const chave = `${relatorio}${periodicidade}${i.periodo}`;
    if (vistas.has(chave)) continue;
    vistas.add(chave);
    entregas.push({ relatorio, periodicidade, periodo: i.periodo, simplificado: /simplificado/i.test(nome) });
  }
  return entregas;
}

/**
 * Períodos de RGF que a prefeitura (não a câmara) entregou nos anos pedidos,
 * do mais recente para o mais antigo. Null quando o extrato não respondeu.
 */
export async function rgfsEntregues(codigoIbge: string, anos: number[]): Promise<PeriodoRgf[] | null> {
  const porAno = await Promise.all(anos.map(async (ano) => ({ ano, entregas: await entregasDaPrefeitura(codigoIbge, ano) })));
  if (porAno.some((a) => a.entregas === null)) return null;
  const periodos: PeriodoRgf[] = [];
  for (const { ano, entregas } of porAno) {
    for (const e of entregas!) {
      if (e.relatorio !== "rgf" || e.periodicidade === "B") continue;
      if (periodos.some((p) => p.exercicio === ano && p.periodicidade === e.periodicidade && p.periodo === e.periodo)) continue;
      periodos.push({ exercicio: ano, periodicidade: e.periodicidade, periodo: e.periodo, mesReferencia: mesDeReferencia(e.periodicidade, e.periodo) });
    }
  }
  return periodos.sort((a, b) => b.exercicio - a.exercicio || b.mesReferencia - a.mesReferencia);
}
