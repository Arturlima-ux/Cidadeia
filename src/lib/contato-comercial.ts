// ── O CANAL RÁPIDO COM A EQUIPE ──
//
// Prefeitura resolve por telefone. O site só tinha formulário e e-mail, e o
// e-mail de confirmação nem sempre chega (ver lib/email.ts). Duas saídas:
//
//   · "Peça uma ligação": a pessoa deixa o telefone e a equipe liga. Funciona
//     sempre, porque o aviso vai para a própria equipe.
//   · WhatsApp comercial: liga sozinho quando WHATSAPP_COMERCIAL estiver
//     preenchido na Vercel (só números, com DDI e DDD: 5586999990000). Sem a
//     variável, nenhum botão de WhatsApp aparece, para não prometer o que não há.

export const DESTINO_EQUIPE_PADRAO = "arturmlo2005@gmail.com";

/** Para onde vão os avisos comerciais da equipe. */
export function destinoDaEquipe(): string {
  return process.env.PROPOSTA_DESTINO_EMAIL?.trim() || DESTINO_EQUIPE_PADRAO;
}

/** O número do WhatsApp comercial, só dígitos, ou null quando não há. */
export function whatsappComercial(valor = process.env.WHATSAPP_COMERCIAL): string | null {
  const digitos = (valor ?? "").replace(/\D/g, "");
  return digitos.length >= 12 && digitos.length <= 13 ? digitos : null;
}

/** Link do WhatsApp comercial com a mensagem pronta, ou null. */
export function linkWhatsappComercial(mensagem: string, valor?: string): string | null {
  const n = whatsappComercial(valor);
  return n ? `https://wa.me/${n}?text=${encodeURIComponent(mensagem)}` : null;
}

/** Telefone brasileiro com DDD: 10 ou 11 dígitos. Devolve formatado, ou null. */
export function telefoneValido(entrada: string): string | null {
  let d = entrada.replace(/\D/g, "");
  if (d.startsWith("55") && (d.length === 12 || d.length === 13)) d = d.slice(2);
  if (d.length !== 10 && d.length !== 11) return null;
  if (d[0] === "0") return null;
  return d.length === 11 ? `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}` : `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
}

export const CARGOS_LIGACAO = [
  "Prefeito(a)",
  "Secretário(a) de Finanças / Fazenda",
  "Contador(a) / contabilidade",
  "Controlador(a) interno(a)",
  "Outro cargo na prefeitura",
  "Assessoria / consultoria",
] as const;

export const HORARIOS_LIGACAO = ["De manhã", "À tarde", "Qualquer horário"] as const;
