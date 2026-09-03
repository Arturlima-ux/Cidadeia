// ── QUANDO FORÇAR HTTPS ──
//
// A regra existe porque o app pode ser exposto direto, sem CDN na frente, e aí
// ninguém redireciona HTTP para HTTPS por nós. Mas ela estava derrubando o
// teste local: `next start` roda com NODE_ENV=production e o próprio servidor
// do Next preenche `x-forwarded-proto: http`, então TODA rota respondia 308
// para `https://localhost:3000` — endereço onde não há TLS para atender. O
// site parecia fora do ar sem nunca ter caído.
//
// A correção não é afrouxar a regra, é reconhecer onde ela não faz sentido:
// endereço de loopback e faixa privada não são alcançáveis pela internet, não
// têm certificado, e redirecioná-los só quebra quem está testando.
//
// Separado do proxy para poder ser testado. A lógica é curta, mas errar nela
// derruba o acesso inteiro, e foi exatamente o que aconteceu.

/**
 * Hosts que nunca devem ser redirecionados para HTTPS.
 *
 * Loopback e as três faixas privadas da RFC 1918. Um endereço 192.168.x.x é o
 * que o Next anuncia como "Network" para testar do celular na mesma rede —
 * forçar HTTPS ali quebra justamente esse uso.
 */
export function ehEnderecoLocal(hostname: string): boolean {
  const host = hostname.trim().toLowerCase().replace(/^\[|\]$/g, "");

  if (host === "localhost" || host.endsWith(".localhost")) return true;
  if (host === "::1" || host === "0.0.0.0") return true;
  if (/^127\./.test(host)) return true;

  // RFC 1918: 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16.
  if (/^10\./.test(host)) return true;
  if (/^192\.168\./.test(host)) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(host)) return true;

  return false;
}

/**
 * Decide se a requisição deve ser redirecionada para HTTPS.
 *
 * `proto` é o cabeçalho `x-forwarded-proto` — ausente quando ninguém informa,
 * e nesse caso não redirecionamos: sem saber o esquema de origem, mandar para
 * HTTPS é chute, e o chute errado tira o app do ar.
 */
export function deveForcarHttps(entrada: {
  proto: string | null;
  hostname: string;
  ehProducao: boolean;
}): boolean {
  if (!entrada.ehProducao) return false;
  if (entrada.proto !== "http") return false;
  return !ehEnderecoLocal(entrada.hostname);
}
