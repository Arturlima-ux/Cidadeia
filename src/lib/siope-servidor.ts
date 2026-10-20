import tabela from "@/dados/municipios.json";
import { gravarFotografia, lerFotografia } from "@/lib/fotografia-servidor";
import {
  bimestresParaConferir,
  codigoSiope,
  lerIndicadores,
  prazoDoBimestre,
  resumirEstado,
  type DeclaracaoBimestre,
  type DeclaracaoCru,
  type FotografiaSiope,
  type IndicadorCru,
} from "@/lib/siope";

// ── O SIOPE, DO FNDE PARA O PAINEL ── (ver siope.ts)

const BASE = "https://www.fnde.gov.br/olinda-ide/servico/DADOS_ABERTOS_SIOPE/versao/v1/odata";
const PAGINA = 1000;
export const EVENTO_SIOPE = "siope";
export const idDoSiope = (prefeituraId: string) => `siope:${prefeituraId}`;

const MUNICIPIOS = (tabela as unknown as { municipios: [string, string, string, number | null][] }).municipios;
const UF = new Map(MUNICIPIOS.map((m) => [m[0], m[2]]));

/** Todas as linhas de um recurso do SIOPE (OData com os parâmetros como alias @). */
async function linhas<T>(recurso: string, ano: number, bimestre: number, uf: string, filtro: string, campos?: string[]): Promise<T[]> {
  const saida: T[] = [];
  for (let pular = 0; pular < 20 * PAGINA; pular += PAGINA) {
    // Montada à mão como na conferência ao vivo: "@" e "$" literais, só os valores codificados.
    const url =
      `${BASE}/${recurso}(Ano_Consulta=@Ano_Consulta,Num_Peri=@Num_Peri,Sig_UF=@Sig_UF)` +
      `?@Ano_Consulta=${ano}&@Num_Peri=${bimestre}&@Sig_UF='${uf}'&$format=json` +
      `&$filter=${encodeURIComponent(filtro)}&$top=${PAGINA}&$skip=${pular}` +
      (campos ? `&$select=${campos.join(",")}` : "");
    let pagina: T[] | null = null;
    for (let t = 0; t < 2 && !pagina; t++) {
      try {
        const r = await fetch(url, { headers: { accept: "application/json" }, signal: AbortSignal.timeout(30_000), cache: "no-store" });
        if (r.ok) {
          const corpo = (await r.json()) as { value?: T[] };
          if (Array.isArray(corpo.value)) pagina = corpo.value;
        }
      } catch {
        // tenta de novo
      }
    }
    if (!pagina) throw new Error("SIOPE (FNDE) não respondeu");
    saida.push(...pagina);
    if (pagina.length < PAGINA) break;
  }
  return saida;
}

export async function buscarSiope(codigoIbge: string, hoje: Date = new Date()): Promise<FotografiaSiope> {
  const uf = UF.get(codigoIbge);
  if (!uf) throw new Error("Município fora da tabela do IBGE");
  const cod = codigoSiope(codigoIbge);
  const totalNoEstado = MUNICIPIOS.filter((m) => m[2] === uf).length;

  // Quem declarou cada bimestre vencido: uma consulta por bimestre, o estado inteiro.
  const declaracoes: DeclaracaoBimestre[] = [];
  for (const { ano, bimestre } of bimestresParaConferir(hoje)) {
    const ds = await linhas<DeclaracaoCru>("Dados_Gerais_Siope", ano, bimestre, uf, "TIPO eq 'Municipal'", ["COD_MUNI", "DAT_DECL"]);
    const minha = ds.find((d) => String(d.COD_MUNI) === cod);
    declaracoes.push({ ano, bimestre, prazo: prazoDoBimestre(ano, bimestre), declaradoEm: minha ? (minha.DAT_DECL ?? "declarado") : null, noEstado: ds.length });
  }

  const doMunicipio = async (ano: number, bimestre: number) =>
    lerIndicadores(await linhas<IndicadorCru>("Indicadores_Siope", ano, bimestre, uf, `COD_MUNI eq ${cod}`), ano, bimestre);

  const anoAtual = hoje.getUTCFullYear();
  const declaradasNoAno = declaracoes.filter((d) => d.ano === anoAtual && d.declaradoEm);
  const ultima = declaradasNoAno[declaradasNoAno.length - 1];
  const parcial = ultima && ultima.bimestre < 6 ? await doMunicipio(ultima.ano, ultima.bimestre) : null;

  // O fechamento: o 6º bimestre mais recente que o município declarou.
  const fechou = [...declaracoes].reverse().find((d) => d.bimestre === 6 && d.declaradoEm);
  const fechamento = fechou ? await doMunicipio(fechou.ano, 6) : null;
  const anoFechado = fechou?.ano ?? anoAtual - 1;
  const estado = resumirEstado(
    await linhas<IndicadorCru>("Indicadores_Siope", anoFechado, 6, uf, "TIPO eq 'Municipal' and (COD_EXIB eq '1.1' or COD_EXIB eq '1.2')", [
      "TIPO",
      "COD_MUNI",
      "COD_EXIB",
      "NOM_INDI",
      "VAL_INDI",
    ]),
    anoFechado
  );

  return { codigo: cod, uf, totalNoEstado, declaracoes, parcial, fechamento, estado };
}

export const gravarSiope = (prefeituraId: string, f: FotografiaSiope) => gravarFotografia(idDoSiope(prefeituraId), EVENTO_SIOPE, f);

export async function lerSiope(prefeituraId: string): Promise<{ foto: FotografiaSiope; conferidoEm: string } | null> {
  const f = await lerFotografia<FotografiaSiope>(idDoSiope(prefeituraId), EVENTO_SIOPE);
  return f && Array.isArray(f.valor?.declaracoes) ? { foto: f.valor, conferidoEm: f.conferidoEm } : null;
}
