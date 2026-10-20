import { EMPRESA, type DadosEmpresa } from "@/lib/empresa";

// ── O MODELO DOS E-MAILS ──
//
// Todo e-mail do CidadeIA sai daqui: o mesmo cabeçalho, os mesmos blocos, o
// mesmo rodapé. Antes, cada aviso montava seus próprios <p> soltos, sem marca,
// sem rodapé, sem dizer por que a pessoa estava recebendo, e o remetente
// chegava como "onboarding". Para quem compra de uma empresa que vende
// conformidade, o e-mail É a empresa: um aviso que parece rascunho faz
// duvidar do resto.
//
// Três vozes:
//   - "cidadeia": o CidadeIA falando com a prefeitura (proposta, Raio-X,
//     fatura, a Segunda do prefeito, os alertas da vigia);
//   - "prefeitura": a ouvidoria da prefeitura falando com o cidadão. A marca
//     é a da prefeitura; o CidadeIA aparece só no rodapé, como a plataforma;
//   - "equipe": os avisos internos da equipe comercial.
//
// Regras de e-mail que pesam aqui:
//   - tabelas e estilo em linha: o Outlook ignora quase todo CSS moderno, e o
//     Gmail descarta o <style> em vários casos. Só o ajuste de celular fica
//     no <style>, como melhoria;
//   - largura máxima de 600 px, e tudo ainda legível em 320 px;
//   - texto de prévia (o que aparece ao lado do assunto na caixa de entrada);
//   - nenhuma imagem: imagem bloqueada por padrão vira caixa vazia no topo
//     do e-mail. A marca é texto;
//   - a versão em texto puro sai deste mesmo HTML (lib/email.ts); o que é só
//     enfeite fica entre <!--sem-texto--> e não entra nela.
//
// Todo conteúdo dinâmico passa por h`...`, que escapa o que não é Html.
// Nome de cidadão, assunto de manifestação, título de alerta: nada entra cru.

// ── HTML SEGURO ──
export class Html {
  constructor(readonly valor: string) {}
  toString() {
    return this.valor;
  }
}

export const esc = (t: string) =>
  t.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c);

function emHtml(v: unknown): string {
  if (v instanceof Html) return v.valor;
  if (Array.isArray(v)) return v.map(emHtml).join("");
  if (v === null || v === undefined || v === false) return "";
  return esc(String(v));
}

/** Template que escapa tudo o que for interpolado, menos o que já é Html. */
export function h(partes: TemplateStringsArray, ...valores: unknown[]): Html {
  let s = partes[0];
  valores.forEach((v, i) => {
    s += emHtml(v) + partes[i + 1];
  });
  return new Html(s);
}

/** Texto com quebras de linha do usuário, em parágrafos. */
export function paragrafosDe(texto: string): Html {
  return new Html(
    texto
      .replace(/\r\n?/g, "\n")
      .trim()
      .split(/\n{2,}/)
      .map((p) => `<p style="margin:0 0 12px">${esc(p).replace(/\n/g, "<br>")}</p>`)
      .join("")
  );
}

export type Conteudo = string | Html;

// ── CORES ──
// Os tons do painel (globals.css), escolhidos para manter contraste AA sobre
// branco e não depender de modo escuro.
const C = {
  marca: "#5233d9",
  marcaEscura: "#3f28a8",
  fundo: "#f3f1f9",
  cartao: "#ffffff",
  borda: "#e6e3f0",
  texto: "#1d1b26",
  suave: "#55516a",
  tenue: "#86829a",
};

export type Tom = "marca" | "urgente" | "atencao" | "ok" | "neutro";
const TOM: Record<Tom, { cor: string; fundo: string; borda: string }> = {
  marca: { cor: "#3f28a8", fundo: "#f4f1fe", borda: "#ddd6fe" },
  urgente: { cor: "#b42318", fundo: "#fef3f2", borda: "#fecdca" },
  atencao: { cor: "#8a5a00", fundo: "#fffaeb", borda: "#fedf89" },
  ok: { cor: "#1f7a4d", fundo: "#ecfdf3", borda: "#abefc6" },
  neutro: { cor: "#1d1b26", fundo: "#f8f7fb", borda: "#e6e3f0" },
};

const FONTE = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

// ── BLOCOS ──
export type Item = {
  titulo: Conteudo;
  detalhe?: Conteudo | null;
  /** Rótulo pequeno acima do título ("URGENTE · Saúde"). */
  etiqueta?: string | null;
  tom?: Tom;
};

export type Bloco =
  | { p: Conteudo }
  | { secao: string; tom?: Tom }
  | { destaque: Conteudo; titulo?: string; tom: Tom }
  | { dados: [string, Conteudo][] }
  | { itens: Item[] }
  | { lista: Conteudo[] }
  | { citacao: Conteudo; rotulo?: string }
  | { botao: string; link: string; depois?: { texto: string; link: string } }
  | { nota: Conteudo }
  | { divisor: true };

const P = `margin:0 0 16px;font-size:15px;line-height:1.6;color:${C.texto}`;

function bloco(b: Bloco): string {
  if ("p" in b) return `<p style="${P}">${emHtml(b.p)}</p>`;
  if ("secao" in b) {
    const cor = b.tom ? TOM[b.tom].cor : C.texto;
    return `<h2 style="margin:28px 0 12px;font-size:13px;line-height:1.4;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:${cor}">${esc(b.secao)}</h2>`;
  }
  if ("destaque" in b) {
    const t = TOM[b.tom];
    return (
      `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 20px"><tr>` +
      `<td style="background:${t.fundo};border:1px solid ${t.borda};border-radius:10px;padding:16px 18px;font-size:15px;line-height:1.55;color:${C.texto}">` +
      (b.titulo ? `<div style="font-weight:700;color:${t.cor};margin:0 0 6px">${esc(b.titulo)}</div>` : "") +
      `${emHtml(b.destaque)}</td></tr></table>`
    );
  }
  if ("dados" in b) {
    const linhas = b.dados
      .map(
        ([rotulo, valor], i) =>
          `<tr><td style="padding:10px 16px;${i ? `border-top:1px solid ${C.borda};` : ""}font-size:13px;color:${C.suave};white-space:nowrap;vertical-align:top">${esc(rotulo)}<!--:--></td>` +
          `<td style="padding:10px 16px;${i ? `border-top:1px solid ${C.borda};` : ""}font-size:15px;font-weight:600;color:${C.texto};text-align:right;vertical-align:top">${emHtml(valor)}</td></tr>`
      )
      .join("");
    return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 20px;background:${TOM.neutro.fundo};border:1px solid ${C.borda};border-radius:10px;border-collapse:separate">${linhas}</table>`;
  }
  if ("itens" in b) {
    return (
      `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 16px">` +
      b.itens
        .map((it) => {
          const t = TOM[it.tom ?? "neutro"];
          const barra = it.tom && it.tom !== "neutro" ? t.cor : C.borda;
          return (
            `<tr><td style="padding:0 0 10px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>` +
            `<td style="border:1px solid ${C.borda};border-left:4px solid ${barra};border-radius:8px;padding:12px 16px;background:${C.cartao}">` +
            (it.etiqueta ? `<div style="font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:${t.cor};margin:0 0 4px">${esc(it.etiqueta)}</div>` : "") +
            `<div style="font-size:15px;font-weight:600;line-height:1.45;color:${C.texto}">${emHtml(it.titulo)}</div>` +
            (it.detalhe ? `<div style="font-size:14px;line-height:1.55;color:${C.suave};margin-top:4px">${emHtml(it.detalhe)}</div>` : "") +
            `</td></tr></table></td></tr>`
          );
        })
        .join("") +
      `</table>`
    );
  }
  if ("lista" in b) {
    return (
      `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 16px">` +
      b.lista
        .map(
          (l) =>
            `<tr><td width="20" style="vertical-align:top;padding:0 0 8px;font-size:15px;line-height:1.6;color:${C.marca}">&#8226;&nbsp;</td>` +
            `<td style="vertical-align:top;padding:0 0 8px;font-size:15px;line-height:1.6;color:${C.texto}">${emHtml(l)}</td></tr>`
        )
        .join("") +
      `</table>`
    );
  }
  if ("citacao" in b) {
    return (
      (b.rotulo ? `<div style="font-size:13px;font-weight:600;color:${C.suave};margin:0 0 8px">${esc(b.rotulo)}</div>` : "") +
      `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 20px"><tr>` +
      `<td style="border-left:4px solid ${C.marca};background:${TOM.marca.fundo};border-radius:0 10px 10px 0;padding:16px 18px;font-size:15px;line-height:1.6;color:${C.texto}">${emHtml(b.citacao)}</td>` +
      `</tr></table>`
    );
  }
  if ("botao" in b) {
    return (
      `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 ${b.depois ? "12px" : "24px"}"><tr>` +
      `<td style="border-radius:8px;background:${C.marca}">` +
      `<a href="${esc(b.link)}" style="display:inline-block;padding:13px 26px;font-family:${FONTE};font-size:15px;font-weight:600;line-height:1.2;color:#ffffff;text-decoration:none;border-radius:8px">${esc(b.botao)}</a>` +
      `</td></tr></table>` +
      (b.depois
        ? `<p style="margin:0 0 24px;font-size:14px;line-height:1.5"><a href="${esc(b.depois.link)}" style="color:${C.marca};font-weight:600;text-decoration:none">${esc(b.depois.texto)} &rarr;</a></p>`
        : "")
    );
  }
  if ("nota" in b) return `<p style="margin:0 0 14px;font-size:13px;line-height:1.55;color:${C.tenue}">${emHtml(b.nota)}</p>`;
  return `<!--sem-texto--><hr style="border:0;border-top:1px solid ${C.borda};margin:24px 0"><!--/sem-texto-->`;
}

// ── QUEM FALA ──
export type Remetente =
  | { tipo: "cidadeia" }
  | { tipo: "prefeitura"; municipio: string; uf?: string | null; setor: string }
  | { tipo: "equipe" };

const MARCA = `<span style="font-family:${FONTE};font-size:20px;font-weight:800;letter-spacing:-0.02em;color:${C.texto}">Cidade<span style="color:${C.marca}">IA</span></span>`;

function cabecalho(r: Remetente): string {
  if (r.tipo === "prefeitura") {
    return (
      `<div style="font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:${C.tenue}">Prefeitura Municipal de</div>` +
      `<div style="font-size:20px;font-weight:800;letter-spacing:-0.01em;color:${C.texto};margin-top:2px">${esc(r.municipio)}${r.uf ? `<span style="color:${C.tenue};font-weight:600"> &middot; ${esc(r.uf)}</span>` : ""}</div>` +
      `<div style="font-size:13px;font-weight:600;color:${C.marca};margin-top:2px">${esc(r.setor)}</div>`
    );
  }
  if (r.tipo === "equipe") {
    return `${MARCA}<span style="display:inline-block;margin-left:10px;padding:3px 8px;border-radius:999px;background:${TOM.neutro.fundo};border:1px solid ${C.borda};font-size:11px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;color:${C.suave};vertical-align:3px">Equipe interna</span>`;
  }
  return MARCA;
}

function assinaturaPadrao(r: Remetente): string | null {
  if (r.tipo === "prefeitura") return `${r.setor}\nPrefeitura Municipal de ${r.municipio}`;
  if (r.tipo === "cidadeia") return "Equipe CidadeIA";
  return null;
}

const site = () => (process.env.APP_URL ?? "https://cidadeia.vercel.app").replace(/\/$/, "");

function rodape(r: Remetente, motivo: string | undefined, cancelar: string | null | undefined, e: DadosEmpresa): string {
  const linha = (t: string) => `<p style="margin:0 0 8px;font-size:12px;line-height:1.6;color:${C.tenue}">${t}</p>`;
  const partes: string[] = [];
  if (r.tipo === "prefeitura") {
    partes.push(
      linha(
        `Mensagem automática da ${esc(r.setor)} da Prefeitura de ${esc(r.municipio)}. ` +
          `Por favor, não responda a este e-mail: para falar com a prefeitura, use o link de acompanhamento da sua manifestação.`
      )
    );
    if (motivo) partes.push(linha(esc(motivo)));
    partes.push(linha(`Enviado por meio do <a href="${esc(site())}" style="color:${C.tenue}">CidadeIA</a>, a plataforma de gestão usada pela prefeitura.`));
  } else {
    if (motivo) partes.push(linha(esc(motivo)));
    const empresa = [e.razaoSocial ?? "CidadeIA", e.cnpj ? `CNPJ ${e.cnpj}` : null, e.endereco].filter(Boolean).map((x) => esc(String(x)));
    partes.push(linha(empresa.join(" &middot; ")));
    const contato = [
      `<a href="${esc(site())}" style="color:${C.tenue}">${esc(site().replace(/^https?:\/\//, ""))}</a>`,
      e.emailSuporte ? `<a href="mailto:${esc(e.emailSuporte)}" style="color:${C.tenue}">${esc(e.emailSuporte)}</a>` : null,
      e.telefoneSuporte ? esc(e.telefoneSuporte) : null,
    ].filter(Boolean);
    if (r.tipo === "cidadeia") partes.push(linha(contato.join(" &middot; ")));
  }
  if (cancelar) partes.push(linha(`<a href="${esc(cancelar)}" style="color:${C.tenue};text-decoration:underline">Parar de receber estes e-mails</a>`));
  return partes.join("");
}

export type EmailMontado = { html: string };

export function montarEmail(o: {
  remetente: Remetente;
  /** O texto que aparece ao lado do assunto na caixa de entrada. */
  previa: string;
  etiqueta?: { texto: string; tom?: Tom } | null;
  titulo: string;
  saudacao?: string | null;
  blocos: (Bloco | null | false | undefined)[];
  /** null tira a assinatura; ausente usa a da voz. */
  assinatura?: string | null;
  /** Por que a pessoa recebe: uma frase, no rodapé. */
  motivo?: string;
  cancelar?: string | null;
  empresa?: DadosEmpresa;
}): string {
  const r = o.remetente;
  const assinatura = o.assinatura === undefined ? assinaturaPadrao(r) : o.assinatura;
  const etiqueta = o.etiqueta
    ? `<div style="font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:${TOM[o.etiqueta.tom ?? "marca"].cor};margin:0 0 8px">${esc(o.etiqueta.texto)}</div>`
    : "";
  const corpo = o.blocos.filter((b): b is Bloco => !!b).map(bloco).join("\n");
  const [quem, ...resto] = (assinatura ?? "").split("\n");
  const assinado = assinatura
    ? `<p style="margin:24px 0 0;font-size:15px;line-height:1.5;color:${C.texto}">Atenciosamente,<br><strong>${esc(quem)}</strong>` +
      resto.map((l) => `<br><span style="color:${C.suave}">${esc(l)}</span>`).join("") +
      `</p>`
    : "";
  // Espaço invisível depois da prévia: sem ele o Gmail completa a prévia com o começo do corpo.
  const enchimento = "&#847;&zwnj;&nbsp;".repeat(60);

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${esc(o.titulo)}</title>
<style>
@media (max-width:620px){.cx{padding-left:20px!important;padding-right:20px!important}.tt{font-size:21px!important}.ex{padding-left:12px!important;padding-right:12px!important}}
a{color:${C.marca}}
</style>
</head>
<body style="margin:0;padding:0;background:${C.fundo};-webkit-text-size-adjust:100%">
<!--sem-texto--><div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${esc(o.previa)}${enchimento}</div><!--/sem-texto-->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.fundo}">
<tr><td align="center" class="ex" style="padding:32px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;font-family:${FONTE}">
<tr><td class="cx" style="padding:0 8px 18px">
<!--sem-texto-->${cabecalho(r)}<!--/sem-texto-->
</td></tr>
<tr><td style="background:${C.cartao};border:1px solid ${C.borda};border-top:4px solid ${C.marca};border-radius:12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td class="cx" style="padding:32px 36px 32px">
${etiqueta}<h1 class="tt" style="margin:0 0 20px;font-size:23px;line-height:1.3;font-weight:700;letter-spacing:-0.01em;color:${C.texto}">${esc(o.titulo)}</h1>
${o.saudacao ? `<p style="${P}">${esc(o.saudacao)}</p>` : ""}
${corpo}
${assinado}
</td></tr></table>
</td></tr>
<tr><td class="cx" style="padding:20px 8px 0">
${rodape(r, o.motivo, o.cancelar, o.empresa ?? EMPRESA)}
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

/** "Olá, Ana." com o primeiro nome; sem nome, "Olá.". */
export function saudacao(nome: string | null | undefined): string {
  const primeiro = nome?.trim().split(/\s+/)[0];
  return primeiro ? `Olá, ${primeiro}.` : "Olá.";
}

// ── O TEXTO PURO ──
//
// A outra metade do e-mail (multipart/alternative). Filtros de spam
// desconfiam de e-mail só com HTML, e há leitores de tela e relógios que só
// mostram o texto. Sai do mesmo HTML, para as duas versões nunca divergirem.
export function textoDoHtml(html: string): string {
  const entidades: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', "#39": "'", nbsp: " ", middot: "·", rarr: "→", zwnj: "" };
  return html
    .replace(/<!--sem-texto-->[\s\S]*?<!--\/sem-texto-->/g, "")
    .replace(/<!--:-->/g, ":")
    .replace(/<(head|style|title)[\s\S]*?<\/\1>/gi, "")
    .replace(/<a\s[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, (_, href: string, rotulo: string) => {
      const r = rotulo.replace(/<[^>]+>/g, "").trim();
      const url = href.replace(/&amp;/g, "&");
      if (url.startsWith("mailto:")) return r;
      return r && r !== url && r.replace(/&amp;/g, "&") !== url ? `${r} (${url})` : url;
    })
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<\/(p|h1|h2|h3|tr|table|div|li|pre)>/gi, "\n")
    .replace(/<\/td>/gi, " ")
    .replace(/<h1[^>]*>/gi, "\n")
    .replace(/<h2[^>]*>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&(#\d+|[a-z]+);/gi, (m, n: string) => {
      if (n in entidades) return entidades[n];
      if (n.startsWith("#")) return String.fromCodePoint(Number(n.slice(1)));
      return m;
    })
    .split("\n")
    .map((l) => l.replace(/[ \t ]+/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
