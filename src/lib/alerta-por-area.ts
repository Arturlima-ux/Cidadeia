// ── O ALERTA VAI PARA QUEM RESOLVE ──
//
// Até aqui todo alerta ia para o prefeito. Isso tem dois defeitos: o prefeito
// recebe "2 itens acabam em até uma semana" na farmácia da UBS, que não é
// decisão dele, e o secretário de Saúde, que resolve, não fica sabendo. Em
// pouco tempo o prefeito aprende a ignorar o e-mail, e o urgente se perde no
// meio do resto.
//
// A regra:
//   - alerta de uma área (saúde, educação, obras, licitações) vai para o
//     secretário daquela área;
//   - o prefeito recebe dessas só o urgente;
//   - o administrador (quem opera o sistema pelo gabinete) recebe tudo;
//   - alerta do gabinete (pessoal, mínimos consolidados, prazo do cidadão,
//     Tesouro) vai para prefeito e administrador, como sempre;
//   - se a área não tem secretário com e-mail, o alerta sobe para o prefeito
//     inteiro: aviso sem destinatário é aviso perdido.

export const AREAS = ["saude", "educacao", "obras", "licitacoes"] as const;
export type Area = (typeof AREAS)[number];

const sem = (t: string) =>
  t
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

/**
 * A área de um alerta. Os da vigia já vêm com a chave ("saude"); os criados à
 * mão trazem texto livre ("Secretaria de Saúde", "Licitações e contratos").
 */
export function areaDoAlerta(secretaria: string | null | undefined): Area | null {
  if (!secretaria) return null;
  const t = sem(secretaria);
  if ((AREAS as readonly string[]).includes(t)) return t as Area;
  if (/\bsaude\b/.test(t)) return "saude";
  if (/\beduca/.test(t)) return "educacao";
  if (/\bobra/.test(t) || /\binfraestrutura\b/.test(t)) return "obras";
  if (/\blicita/.test(t) || /\bcontrat/.test(t) || /\bcompra/.test(t)) return "licitacoes";
  return null;
}

/** O secretário vê o alerta da própria área; prefeito e administrador veem todos. */
export function podeVerAlerta(
  sessao: { cargo: string; secretaria?: string | null },
  alerta: { secretaria: string | null }
): boolean {
  if (sessao.cargo === "prefeito" || sessao.cargo === "admin") return true;
  if (sessao.cargo !== "secretario" || !sessao.secretaria) return false;
  return areaDoAlerta(alerta.secretaria) === sessao.secretaria;
}

export type Pessoa = { email: string | null; cargo: string; secretaria: string | null };
export type ComoRecebe = "secretario" | "prefeito" | "admin";

/** Para cada e-mail, os alertas que ele recebe e em que papel. */
export function repartirAvisos<T extends { secretaria: string | null; prioridade: string }>(
  alertas: T[],
  pessoas: Pessoa[]
): Map<string, { papel: ComoRecebe; alertas: T[] }> {
  const saida = new Map<string, { papel: ComoRecebe; alertas: T[] }>();
  const dar = (email: string, papel: ComoRecebe, a: T) => {
    const atual = saida.get(email) ?? { papel, alertas: [] };
    // Quem tem dois papéis fica com o mais amplo.
    const ordem: Record<ComoRecebe, number> = { secretario: 0, prefeito: 1, admin: 2 };
    if (ordem[papel] > ordem[atual.papel]) atual.papel = papel;
    if (!atual.alertas.includes(a)) atual.alertas.push(a);
    saida.set(email, atual);
  };
  const comEmail = pessoas.filter((p): p is Pessoa & { email: string } => !!p.email);
  const prefeitos = comEmail.filter((p) => p.cargo === "prefeito");
  const admins = comEmail.filter((p) => p.cargo === "admin");

  for (const a of alertas) {
    const area = areaDoAlerta(a.secretaria);
    const secretarios = area ? comEmail.filter((p) => p.cargo === "secretario" && p.secretaria === area) : [];
    for (const adm of admins) dar(adm.email, "admin", a);
    if (area && secretarios.length) {
      for (const s of secretarios) dar(s.email, "secretario", a);
      if (a.prioridade === "urgente") for (const p of prefeitos) dar(p.email, "prefeito", a);
    } else {
      for (const p of prefeitos) dar(p.email, "prefeito", a);
    }
  }
  return saida;
}
