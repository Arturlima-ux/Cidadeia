// ── A SAÚDE DE CADA CLIENTE, PARA A EQUIPE ──
//
// Prefeitura não cancela de um dia para o outro: para de abrir o painel, os
// alertas se acumulam sem ninguém mexer, o dado para de chegar, a fatura
// atrasa. Quando o contrato vence, a decisão já foi tomada meses antes, em
// silêncio. Esta é a lista de sinais que a equipe precisa ver a tempo de
// ligar, e não na hora de perguntar por que não renovaram.
//
// Parte pura: as regras. A coleta e o e-mail semanal à equipe estão em
// saude-do-cliente-servidor.ts.

export const EVENTO_ACESSO = "acesso";
/** O registro de acesso começou aqui; antes disso, "sem acesso" não quer dizer nada. */
export const INICIO_DO_REGISTRO_DE_ACESSO = "2026-10-14";

export const DIAS_SEM_ACESSO = 15;
export const DIAS_ALERTA_PARADO = 30;
export const FALHAS_SEGUIDAS = 3;

export type FatosDoCliente = {
  municipio: string;
  uf: string;
  /** Último acesso de qualquer pessoa da prefeitura, ou null se nunca. */
  ultimoAcesso: string | null;
  /** Último acesso do prefeito ou de um administrador. */
  ultimoAcessoGestor: string | null;
  usuarios: number;
  usuariosComEmail: number;
  /** Urgentes abertos há mais de DIAS_ALERTA_PARADO dias. */
  urgentesParados: number;
  /** Manifestações com prazo legal vencido, sem resposta. */
  manifestacoesVencidas: number;
  /** Fontes de importação que falharam nas últimas N tentativas. */
  fontesParadas: string[];
  /** Fatura em atraso, em dias (0 = em dia). */
  diasDeAtraso: number;
  /** Fim do contrato (contratadoEm + 12 meses), se conhecido. */
  fimDoContrato: string | null;
};

export type Sinal = { peso: 1 | 2 | 3; texto: string };
export type Risco = "alto" | "medio" | "baixo";

const dias = (de: string, hoje: Date) =>
  Math.floor((hoje.getTime() - new Date(`${de.slice(0, 10)}T12:00:00Z`).getTime()) / 86_400_000);

export function sinaisDoCliente(f: FatosDoCliente, hoje: Date = new Date()): Sinal[] {
  const s: Sinal[] = [];
  const registroRecente = dias(INICIO_DO_REGISTRO_DE_ACESSO, hoje) < DIAS_SEM_ACESSO;

  if (!registroRecente) {
    if (!f.ultimoAcesso) s.push({ peso: 3, texto: `Ninguém da prefeitura abriu o painel desde ${INICIO_DO_REGISTRO_DE_ACESSO.split("-").reverse().join("/")}` });
    else if (dias(f.ultimoAcesso, hoje) >= DIAS_SEM_ACESSO) s.push({ peso: 3, texto: `Ninguém abre o painel há ${dias(f.ultimoAcesso, hoje)} dias` });
    else if (!f.ultimoAcessoGestor || dias(f.ultimoAcessoGestor, hoje) >= 30) {
      s.push({ peso: 1, texto: "O gabinete não abre o painel há mais de 30 dias (só secretários usam)" });
    }
  }
  if (f.diasDeAtraso > 0) s.push({ peso: f.diasDeAtraso > 15 ? 3 : 2, texto: `Mensalidade em atraso há ${f.diasDeAtraso} dias` });
  if (f.urgentesParados > 0) {
    s.push({
      peso: 2,
      texto: `${f.urgentesParados === 1 ? "1 alerta urgente aberto" : `${f.urgentesParados} alertas urgentes abertos`} há mais de ${DIAS_ALERTA_PARADO} dias sem ninguém mexer`,
    });
  }
  if (f.fontesParadas.length) {
    s.push({ peso: 2, texto: `Dado parado: a importação de ${f.fontesParadas.join(", ")} falhou ${FALHAS_SEGUIDAS} vezes seguidas` });
  }
  if (f.manifestacoesVencidas >= 3) {
    s.push({ peso: 1, texto: `${f.manifestacoesVencidas} manifestações do cidadão com prazo vencido` });
  }
  if (f.usuarios <= 1) s.push({ peso: 1, texto: "Só uma pessoa cadastrada: nenhum secretário usa o sistema" });
  else if (f.usuariosComEmail === 0) s.push({ peso: 1, texto: "Ninguém tem e-mail cadastrado: os avisos não chegam a ninguém" });

  if (f.fimDoContrato) {
    const faltam = -dias(f.fimDoContrato, hoje);
    if (faltam >= 0 && faltam <= 90) s.push({ peso: 1, texto: `Contrato termina em ${faltam} dias: hora de falar da renovação` });
  }
  return s.sort((a, b) => b.peso - a.peso);
}

export function riscoDe(sinais: Sinal[]): Risco {
  const pontos = sinais.reduce((t, s) => t + s.peso, 0);
  if (sinais.some((s) => s.peso === 3) || pontos >= 5) return "alto";
  if (pontos >= 2) return "medio";
  return "baixo";
}

/** Falhou nas últimas N tentativas seguidas? (lista do mais recente para o mais antigo) */
export function parouDeImportar(tentativas: ("ok" | "falhou")[], n = FALHAS_SEGUIDAS): boolean {
  return tentativas.length >= n && tentativas.slice(0, n).every((t) => t === "falhou");
}
