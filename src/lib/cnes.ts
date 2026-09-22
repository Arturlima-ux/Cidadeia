// ── A REDE DE SAÚDE DO MUNICÍPIO, PELO CNES ──
//
// O Cadastro Nacional de Estabelecimentos de Saúde é a fonte oficial: toda
// UBS, posto, hospital, UPA, CAPS, clínica e laboratório do país está lá,
// com tipo, endereço, coordenadas, turno e a data em que a própria
// prefeitura atualizou o registro. O Ministério publica por API aberta.
//
// Antes o módulo pedia para a prefeitura DIGITAR as unidades. Ninguém
// digita — e o que ninguém digita não existe no painel. Agora a rede nasce
// da fonte e se mantém sozinha.
//
// ── O QUE ENTRA ──
// Estabelecimentos municipais, ou que atendem SUS, ou hospitalares. Clínica
// privada que não atende SUS fica de fora: o secretário não gere aquilo.
//
// ── DATA DE ATUALIZAÇÃO ──
// É o campo mais valioso. Unidade que a prefeitura não atualiza no CNES há
// meses trava repasse federal e ninguém percebe até o dinheiro não cair.

export const URL_CNES = "https://apidadosabertos.saude.gov.br/cnes/estabelecimentos";
const TIMEOUT_MS = 25_000;

export type TipoUnidadeSaude =
  | "ubs"
  | "posto"
  | "hospital"
  | "samu"
  | "upa"
  | "caps"
  | "clinica"
  | "laboratorio"
  | "farmacia"
  | "vigilancia"
  | "outro";

export const NOME_TIPO_UNIDADE: Record<TipoUnidadeSaude, string> = {
  ubs: "UBS",
  posto: "Posto de saúde",
  hospital: "Hospital",
  samu: "SAMU / urgência móvel",
  upa: "UPA / pronto atendimento",
  caps: "CAPS / saúde mental",
  clinica: "Clínica / centro de especialidades",
  laboratorio: "Laboratório / diagnóstico",
  farmacia: "Farmácia",
  vigilancia: "Vigilância / apoio",
  outro: "Outro",
};

// Tabela oficial "tipo de unidade" do CNES (TP_UNID). Os códigos mais
// comuns em município pequeno e médio. O que não estiver aqui vira "outro"
// — aparece, com a descrição que o CNES der.
const TIPO_POR_CODIGO: Record<number, TipoUnidadeSaude> = {
  1: "posto", // Posto de saúde
  2: "ubs", // Centro de saúde / Unidade básica
  4: "clinica", // Policlínica
  5: "hospital", // Hospital geral
  7: "hospital", // Hospital especializado
  15: "hospital", // Unidade mista
  20: "clinica", // Pronto socorro geral
  21: "clinica", // Pronto socorro especializado
  22: "clinica", // Consultório isolado
  36: "clinica", // Clínica/centro de especialidade
  39: "laboratorio", // Unidade de apoio diagnose e terapia
  40: "samu", // Unidade móvel terrestre
  42: "samu", // Unidade móvel de nível pré-hospitalar
  43: "farmacia", // Farmácia
  50: "vigilancia", // Unidade de vigilância em saúde
  61: "clinica", // Centro de parto normal
  62: "hospital", // Hospital dia
  64: "clinica", // Central de regulação
  68: "vigilancia", // Secretaria de saúde
  69: "vigilancia", // Centro de atenção hemoterapia
  70: "caps", // Centro de atenção psicossocial
  71: "clinica", // Centro de apoio à saúde da família
  72: "clinica", // Unidade de atenção à saúde indígena
  73: "upa", // Pronto atendimento
  74: "vigilancia", // Polo academia da saúde
  76: "vigilancia", // Central de regulação médica das urgências
  77: "clinica", // Serviço de atenção domiciliar
  78: "vigilancia", // Unidade de atenção em regime residencial
  79: "clinica", // Oficina ortopédica
  80: "laboratorio", // Laboratório de saúde pública
  81: "vigilancia", // Central de regulação do acesso
  82: "clinica", // Central de notificação, captação e distribuição de órgãos
  83: "vigilancia", // Polo de prevenção de doenças e agravos
};

/** Linha como o CNES devolve (só os campos que usamos). */
export type EstabelecimentoCnes = {
  codigo_cnes: number;
  nome_fantasia: string | null;
  nome_razao_social: string | null;
  codigo_tipo_unidade: number | null;
  descricao_esfera_administrativa: string | null;
  endereco_estabelecimento: string | null;
  numero_estabelecimento: string | null;
  bairro_estabelecimento: string | null;
  numero_telefone_estabelecimento: string | null;
  latitude_estabelecimento_decimo_grau: number | null;
  longitude_estabelecimento_decimo_grau: number | null;
  descricao_turno_atendimento: string | null;
  estabelecimento_faz_atendimento_ambulatorial_sus: string | null;
  estabelecimento_possui_atendimento_hospitalar: number | null;
  estabelecimento_possui_centro_cirurgico: number | null;
  estabelecimento_possui_centro_obstetrico: number | null;
  data_atualizacao: string | null;
};

/** O que gravamos por unidade. */
export type UnidadeDoCnes = {
  codigoCnes: string;
  nome: string;
  tipo: TipoUnidadeSaude;
  codigoTipoUnidade: number | null;
  esfera: string | null;
  endereco: string | null;
  bairro: string | null;
  telefone: string | null;
  latitude: number | null;
  longitude: number | null;
  turno: string | null;
  atendeSus: boolean;
  hospitalar: boolean;
  centroCirurgico: boolean;
  centroObstetrico: boolean;
  cnesAtualizadoEm: string | null; // AAAA-MM-DD
};

/** O CNES usa o código IBGE de 6 dígitos (sem o verificador). */
export function codigoMunicipioCnes(codigoIbge7: string): string {
  return codigoIbge7.slice(0, 6);
}

export function tipoDoCodigo(codigo: number | null | undefined): TipoUnidadeSaude {
  if (codigo === null || codigo === undefined) return "outro";
  return TIPO_POR_CODIGO[codigo] ?? "outro";
}

/** Entra na rede do secretário: municipal, ou atende SUS, ou é hospital. */
export function interessaAoMunicipio(e: EstabelecimentoCnes): boolean {
  const esfera = (e.descricao_esfera_administrativa ?? "").toUpperCase();
  if (esfera === "MUNICIPAL") return true;
  if ((e.estabelecimento_faz_atendimento_ambulatorial_sus ?? "").toUpperCase() === "SIM") return true;
  if (e.estabelecimento_possui_atendimento_hospitalar === 1) return true;
  return false;
}

function titulo(nome: string): string {
  // O CNES vem em CAIXA ALTA: "UBS 1 DE BERTOLINIA". Fica legível sem
  // perder siglas.
  const siglas = new Set(["UBS", "UPA", "CAPS", "SAMU", "PSF", "ESF", "USF", "SMS", "CEO", "CTA", "PS", "II", "III", "IV", "DE", "DA", "DO", "DAS", "DOS", "E"]);
  return nome
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map((p, i) => {
      const up = p.toUpperCase();
      if (siglas.has(up)) return ["DE", "DA", "DO", "DAS", "DOS", "E"].includes(up) && i > 0 ? p : up;
      return p.charAt(0).toUpperCase() + p.slice(1);
    })
    .join(" ");
}

export function paraUnidade(e: EstabelecimentoCnes): UnidadeDoCnes {
  const nomeBruto = e.nome_fantasia?.trim() || e.nome_razao_social?.trim() || `CNES ${e.codigo_cnes}`;
  const endereco = [e.endereco_estabelecimento?.trim(), e.numero_estabelecimento?.trim()].filter((x) => x && x !== "S/N").join(", ") || e.endereco_estabelecimento?.trim() || null;
  return {
    codigoCnes: String(e.codigo_cnes),
    nome: titulo(nomeBruto),
    tipo: tipoDoCodigo(e.codigo_tipo_unidade),
    codigoTipoUnidade: e.codigo_tipo_unidade ?? null,
    esfera: e.descricao_esfera_administrativa ?? null,
    endereco,
    bairro: e.bairro_estabelecimento ? titulo(e.bairro_estabelecimento) : null,
    telefone: e.numero_telefone_estabelecimento ?? null,
    latitude: e.latitude_estabelecimento_decimo_grau ?? null,
    longitude: e.longitude_estabelecimento_decimo_grau ?? null,
    turno: e.descricao_turno_atendimento ? e.descricao_turno_atendimento.charAt(0) + e.descricao_turno_atendimento.slice(1).toLowerCase() : null,
    atendeSus: (e.estabelecimento_faz_atendimento_ambulatorial_sus ?? "").toUpperCase() === "SIM",
    hospitalar: e.estabelecimento_possui_atendimento_hospitalar === 1,
    centroCirurgico: e.estabelecimento_possui_centro_cirurgico === 1,
    centroObstetrico: e.estabelecimento_possui_centro_obstetrico === 1,
    cnesAtualizadoEm: e.data_atualizacao ? e.data_atualizacao.slice(0, 10) : null,
  };
}

/** Dias desde a última atualização no CNES; null quando o CNES não informa. */
export function diasSemAtualizarNoCnes(cnesAtualizadoEm: string | null, hoje: Date = new Date()): number | null {
  if (!cnesAtualizadoEm) return null;
  const d = new Date(cnesAtualizadoEm + "T00:00:00Z");
  if (Number.isNaN(d.getTime())) return null;
  return Math.max(0, Math.floor((hoje.getTime() - d.getTime()) / 86_400_000));
}

/** A partir de quantos dias sem atualização a unidade merece alerta. */
export const DIAS_CNES_DESATUALIZADO = 180;

export type ResultadoCnes =
  | { ok: true; unidades: UnidadeDoCnes[]; ignoradas: number }
  | { ok: false; erro: string };

/** Busca todos os estabelecimentos do município (pagina de 100 em 100). */
export async function buscarRedeNoCnes(codigoIbge7: string): Promise<ResultadoCnes> {
  const codigo = codigoMunicipioCnes(codigoIbge7);
  const todos: EstabelecimentoCnes[] = [];
  try {
    for (let offset = 0; offset < 5000; offset += 100) {
      const url = `${URL_CNES}?codigo_municipio=${codigo}&limit=100&offset=${offset}`;
      const r = await fetch(url, {
        headers: { accept: "application/json" },
        signal: AbortSignal.timeout(TIMEOUT_MS),
        next: { revalidate: 86_400 },
      });
      if (!r.ok) return { ok: false, erro: `O CNES respondeu ${r.status}.` };
      const json = (await r.json()) as { estabelecimentos?: EstabelecimentoCnes[] };
      const lote = json.estabelecimentos ?? [];
      todos.push(...lote);
      if (lote.length < 100) break;
    }
  } catch (e) {
    return { ok: false, erro: e instanceof Error && e.name === "TimeoutError" ? "O CNES demorou demais para responder." : "Não foi possível falar com o CNES agora." };
  }
  const relevantes = todos.filter(interessaAoMunicipio);
  return { ok: true, unidades: relevantes.map(paraUnidade), ignoradas: todos.length - relevantes.length };
}
