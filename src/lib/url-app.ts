// Endereço público da aplicação, usado para montar links que saem por
// e-mail (redefinição de senha, notificação de alerta).
//
// A variável se chamava NEXT_PUBLIC_APP_URL, mas o prefixo `NEXT_PUBLIC_`
// nunca fez sentido: o valor só é lido no servidor, nunca no navegador. Pior,
// a Vercel bloqueia salvar variável com esse prefixo como "Secret" e não
// permite convertê-la depois — ou seja, o nome errado impedia configurar o
// valor pelo painel. `APP_URL` é o nome correto e destrava isso.
//
// O nome antigo continua sendo aceito para não quebrar ambiente que ainda
// esteja configurado com ele. Quando não houver mais nenhum, dá para tirar.

const PADRAO_LOCAL = "http://localhost:3000";

/**
 * Sempre sem barra no final, porque quem chama concatena "/caminho" — com
 * barra, o link sairia com "//" no meio e alguns clientes de e-mail
 * transformam isso em endereço inválido.
 */
export function urlApp(): string {
  const bruto = process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? PADRAO_LOCAL;
  const limpo = bruto.trim();
  if (limpo === "") return PADRAO_LOCAL;
  return limpo.replace(/\/+$/, "");
}

/** Monta um link absoluto da aplicação a partir de um caminho. */
export function linkApp(caminho: string): string {
  const comBarra = caminho.startsWith("/") ? caminho : `/${caminho}`;
  return `${urlApp()}${comBarra}`;
}
