// A parte pura da caixa de saída (lib/caixa-de-saida.ts): o texto do e-mail
// e o rascunho do Gmail. Separada para ser testada sem banco.

/** O HTML dos nossos e-mails em texto corrido, com os links por extenso. */
export function htmlParaTexto(html: string): string {
  return html
    .replace(/<a\s[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, (_m, href: string, t: string) => {
      const rotulo = t.replace(/<[^>]+>/g, "").trim();
      return rotulo && rotulo !== href ? `${rotulo} (${href})` : href;
    })
    .replace(/<li[^>]*>/gi, "- ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|li|div|h\d)>/gi, "\n")
    .replace(/<hr\s*\/?>/gi, "\n—\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

type Rascunho = { para: string; assunto: string; texto: string };

/** Rascunho no Gmail já preenchido. O corpo é cortado para caber no endereço. */
export function linkRascunhoGmail(e: Rascunho): string {
  const corpo = e.texto.length > 1800 ? `${e.texto.slice(0, 1800)}\n[…]` : e.texto;
  const q = new URLSearchParams({ view: "cm", fs: "1", to: e.para, su: e.assunto, body: corpo });
  return `https://mail.google.com/mail/?${q.toString()}`;
}
