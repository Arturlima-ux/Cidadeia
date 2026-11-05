import { periodosDoExercicio, type PeriodoObrigacao } from "@/lib/obrigacoes-fiscais";

// ── O CALENDÁRIO DE PRAZOS DA CIDADE (novembro de 2026) ──
//
// Isca do Raio-X: quem pede o Raio-X por e-mail recebe junto um arquivo .ics
// com os prazos de publicação do RREO e do RGF da prefeitura nos próximos 12
// meses, com lembrete 7 dias antes. Abre na agenda do celular, do Google e do
// Outlook. Os prazos são os da LRF (30 dias depois de cada período, arts. 52 a
// 55), os mesmos de lib/obrigacoes-fiscais.ts e da página do município.
//
// RGF quadrimestral por padrão: a opção pelo semestral (art. 63, cidades com
// menos de 50 mil habitantes) é da prefeitura e o calendário não tem como
// saber; a descrição de cada RGF avisa.

const SIGLAS = new Set(["rreo", "rgf"]);
const DIA_MS = 86_400_000;

/** Os prazos do RREO e do RGF que vencem de hoje até 12 meses à frente. */
export function prazosDosProximos12Meses(hoje: string): PeriodoObrigacao[] {
  const ano = Number(hoje.slice(0, 4));
  const ate = new Date(Date.parse(`${hoje}T00:00:00Z`) + 365 * DIA_MS).toISOString().slice(0, 10);
  return [ano - 1, ano, ano + 1]
    .flatMap((exercicio) => periodosDoExercicio(exercicio))
    .filter((p) => SIGLAS.has(p.obrigacao.chave) && p.vencimento >= hoje && p.vencimento <= ate)
    .sort((a, b) => a.vencimento.localeCompare(b.vencimento) || a.obrigacao.sigla.localeCompare(b.obrigacao.sigla));
}

/** Texto de iCalendar: barra, ponto e vírgula, vírgula e quebra de linha escapados (RFC 5545, 3.3.11). */
function escapar(t: string): string {
  return t.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

/** Linhas de no máximo 75 bytes, continuadas com espaço (RFC 5545, 3.1). */
function dobrar(linha: string): string {
  const bytes = new TextEncoder();
  const partes: string[] = [];
  let atual = "";
  for (const ch of linha) {
    const limite = partes.length === 0 ? 75 : 74;
    if (bytes.encode(atual + ch).length > limite) {
      partes.push(atual);
      atual = ch;
    } else {
      atual += ch;
    }
  }
  partes.push(atual);
  return partes.join("\r\n ");
}

const semTracos = (iso: string) => iso.replace(/-/g, "");
const diaSeguinte = (iso: string) => new Date(Date.parse(`${iso}T00:00:00Z`) + DIA_MS).toISOString().slice(0, 10);

export function montarCalendario(c: {
  codigoIbge: string;
  municipio: string;
  uf: string;
  /** AAAA-MM-DD em Brasília. */
  hoje: string;
  /** Página do município, para conferir a entrega. */
  link: string;
  /** Carimbo do arquivo (UTC). Fixo nos testes. */
  agora?: Date;
}): string {
  const carimbo = (c.agora ?? new Date()).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const cidade = `${c.municipio}/${c.uf}`;
  const eventos = prazosDosProximos12Meses(c.hoje).flatMap((p) => {
    const sigla = p.obrigacao.sigla;
    const descricao = [
      `Último dia para a prefeitura de ${cidade} publicar o ${sigla} do ${p.rotulo} (${p.obrigacao.lei}, ${p.obrigacao.artigo}).`,
      `Se atrasar: ${p.obrigacao.consequencia}`,
      sigla === "RGF"
        ? "Prazo do RGF quadrimestral. Se a prefeitura optou pelo semestral (LRF, art. 63, cidades com menos de 50 mil habitantes), as datas são outras."
        : "",
      `Confira a entrega no Raio-X: ${c.link}`,
    ]
      .filter(Boolean)
      .join("\n");
    return [
      "BEGIN:VEVENT",
      `UID:${c.codigoIbge}-${p.obrigacao.chave}-${semTracos(p.fimDoPeriodo)}@cidadeia`,
      `DTSTAMP:${carimbo}`,
      `DTSTART;VALUE=DATE:${semTracos(p.vencimento)}`,
      `DTEND;VALUE=DATE:${semTracos(diaSeguinte(p.vencimento))}`,
      `SUMMARY:${escapar(`Prazo do ${sigla} (${p.rotulo}) · ${cidade}`)}`,
      `DESCRIPTION:${escapar(descricao)}`,
      `URL:${c.link}`,
      "TRANSP:TRANSPARENT",
      "BEGIN:VALARM",
      "ACTION:DISPLAY",
      `DESCRIPTION:${escapar(`Faltam 7 dias para o prazo do ${sigla} de ${cidade}`)}`,
      "TRIGGER:-P7D",
      "END:VALARM",
      "END:VEVENT",
    ];
  });
  return (
    [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//CidadeIA//Prazos da LRF//PT-BR",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      `X-WR-CALNAME:${escapar(`Prazos da LRF · ${cidade}`)}`,
      "X-WR-TIMEZONE:America/Sao_Paulo",
      ...eventos,
      "END:VCALENDAR",
    ]
      .map(dobrar)
      .join("\r\n") + "\r\n"
  );
}

/** Nome do arquivo anexado: "prazos-lrf-teresina-pi.ics". */
export function nomeDoCalendario(slug: string, uf: string): string {
  return `prazos-lrf-${slug}-${uf.toLowerCase()}.ics`;
}
