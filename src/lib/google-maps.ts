// ── CARREGAMENTO DA MAPS JAVASCRIPT API ──
//
// Sem pacote a mais: o script oficial do Google, com `loading=async`, expõe
// `google.maps.importLibrary`, e cada parte (mapa, marcador, geocodificação)
// é pedida só quando o componente precisa dela.
//
// A chave é NEXT_PUBLIC_ de propósito: o navegador precisa dela para pedir o
// mapa, e ela fica visível no código da página de qualquer jeito. A proteção
// é a restrição por domínio (referenciador HTTP) no Google Cloud — ver
// .env.example.

let carregando: Promise<void> | null = null;

const NOME_CALLBACK = "__cidadeiaMapsPronto";

export function carregarGoogleMaps(chave: string): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Google Maps só carrega no navegador."));
  }
  // Os tipos dizem que `google` sempre existe; antes do script, não existe.
  if ((window as { google?: typeof google }).google?.maps?.importLibrary !== undefined) return Promise.resolve();
  if (carregando) return carregando;

  carregando = new Promise<void>((resolver, rejeitar) => {
    const w = window as unknown as Record<string, unknown>;
    w[NOME_CALLBACK] = () => {
      delete w[NOME_CALLBACK];
      resolver();
    };

    const parametros = new URLSearchParams({
      key: chave,
      v: "weekly",
      loading: "async",
      language: "pt-BR",
      region: "BR",
      callback: NOME_CALLBACK,
    });

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?${parametros}`;
    script.async = true;
    script.onerror = () => {
      // Libera nova tentativa: a falha costuma ser rede da prefeitura, e
      // recarregar a tela depois não pode cair na promessa já rejeitada.
      carregando = null;
      script.remove();
      rejeitar(new Error("Não foi possível carregar o Google Maps."));
    };
    document.head.appendChild(script);
  });

  return carregando;
}
