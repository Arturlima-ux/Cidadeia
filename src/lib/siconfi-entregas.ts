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

/**
 * Períodos de RGF que a prefeitura (não a câmara) entregou nos anos pedidos,
 * do mais recente para o mais antigo. Null quando o extrato não respondeu.
 */
export async function rgfsEntregues(codigoIbge: string, anos: number[]): Promise<PeriodoRgf[] | null> {
  const porAno = await Promise.all(
    anos.map(async (ano) => ({
      ano,
      itens: await itensDoTesouro<LinhaExtrato>(`${URL_EXTRATO}?id_ente=${enteNoTesouro(codigoIbge).id}&an_referencia=${ano}`, SEIS_HORAS),
    }))
  );
  if (porAno.some((a) => a.itens === null)) return null;

  const vistos = new Set<string>();
  const periodos: PeriodoRgf[] = [];
  for (const { ano, itens } of porAno) {
    for (const i of itens!) {
      if (!/^Relat[oó]rio de Gest[aã]o Fiscal/i.test(i.entregavel ?? "")) continue;
      // A câmara entrega o RGF dela, com limite próprio. O que a tela mede é o
      // do Executivo.
      // Consórcio intermunicipal também aparece no extrato do município, com
      // RGF próprio, e não é a prefeitura.
      if (/c[aâ]mara|legislativ|cons[oó]rcio|tribunal|minist[eé]rio p|defensoria/i.test(i.instituicao ?? "")) continue;
      const periodicidade = i.periodicidade === "S" ? "S" : i.periodicidade === "Q" ? "Q" : null;
      if (!periodicidade || typeof i.periodo !== "number") continue;
      const chave = `${ano}${periodicidade}${i.periodo}`;
      if (vistos.has(chave)) continue;
      vistos.add(chave);
      periodos.push({ exercicio: ano, periodicidade, periodo: i.periodo, mesReferencia: mesDeReferencia(periodicidade, i.periodo) });
    }
  }
  return periodos.sort((a, b) => b.exercicio - a.exercicio || b.mesReferencia - a.mesReferencia);
}
