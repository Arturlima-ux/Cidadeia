// ── ONDE O SECRETÁRIO PODE ENTRAR ──
//
// A regra era uma lista negativa: o proxy barrava configurações, histórico,
// central, prestação… e deixava passar o resto. Cada tela nova da prefeitura
// inteira nascia aberta ao secretário até alguém lembrar de pôr na lista. Em
// outubro de 2026 eram nove: financeiro (as faturas do contrato), despesa com
// pessoal, emendas, mapa da cidade com as obras e escolas das outras áreas,
// modo apresentação, publicações do portal, implantação. O menu escondia; o
// endereço digitado abria.
//
// É o mesmo erro que ehGestor() corrigiu nos cargos: pergunta negativa não
// sobrevive a uma tela nova. Agora a lista é do que ELE pode ver; o que não
// está aqui volta para a secretaria dele.

export const SECRETARIAS_VALIDAS = ["saude", "educacao", "obras", "licitacoes"] as const;

// Telas que o secretário usa e que filtram por área por conta própria.
const ROTAS_DO_SECRETARIO = [
  "/dashboard/ia", // o contexto da IA já é recortado pela área (lib/ia.ts)
  "/dashboard/alertas", // filtra por área (lib/alerta-por-area.ts)
  "/dashboard/atendimento", // filtra por área (lib/ouvidoria-avisos.ts)
  "/dashboard/conta",
];

// Só o endereço exato: a página explica que a exportação é do prefeito, e
// continua aberta porque é rota livre na trava financeira e a faixa de
// cobrança aponta para ela. A importação (/dashboard/dados/importar) não.
const ROTAS_EXATAS_DO_SECRETARIO = ["/dashboard/dados"];

// Os mínimos de 15% (saúde) e de 25% + FUNDEB (educação) fazem parte desses
// dois módulos: o painel de resultado da educação manda o secretário para lá.
const MINIMOS_POR_AREA = new Set(["saude", "educacao"]);

function dentro(caminho: string, rota: string): boolean {
  return caminho === rota || caminho.startsWith(`${rota}/`);
}

export function secretariaValida(secretaria: string | null | undefined): string | null {
  return secretaria && (SECRETARIAS_VALIDAS as readonly string[]).includes(secretaria) ? secretaria : null;
}

/** Para onde o secretário vai ao entrar e sempre que sai do seu canto. */
export function destinoDoSecretario(secretaria: string | null | undefined): string {
  const minha = secretariaValida(secretaria);
  // Sem secretaria válida não há painel de área; a conta é a única tela que
  // não depende dela. Antes o destino era "/dashboard", que o próprio proxy
  // barra para secretário: o navegador ficava num laço de redirecionamento.
  return minha ? `/dashboard/secretarias/${minha}` : "/dashboard/conta";
}

/**
 * null se o secretário pode abrir este caminho; senão, para onde mandá-lo.
 * Só vale para caminhos dentro de /dashboard.
 */
export function redirecionarSecretario(caminho: string, secretaria: string | null | undefined): string | null {
  const minha = secretariaValida(secretaria);
  if (minha && dentro(caminho, `/dashboard/secretarias/${minha}`)) return null;
  if (ROTAS_DO_SECRETARIO.some((r) => dentro(caminho, r))) return null;
  if (ROTAS_EXATAS_DO_SECRETARIO.includes(caminho)) return null;
  if (minha && MINIMOS_POR_AREA.has(minha) && dentro(caminho, "/dashboard/minimos")) return null;
  const destino = destinoDoSecretario(secretaria);
  return caminho === destino ? null : destino;
}
