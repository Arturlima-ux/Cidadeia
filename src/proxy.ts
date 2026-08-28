import { NextRequest, NextResponse } from "next/server";
import { verificarTokenSessao } from "@/lib/sessao";

const NOME_COOKIE = "cidadeia_sessao";

// Rotas que um usuário com cargo "secretario" NÃO pode acessar — são
// visões da prefeitura inteira (financeiro, outras secretarias, gestão de
// usuários), não da secretaria específica dele.
const ROTAS_RESTRITAS_A_PREFEITO_ADMIN = [
  "/dashboard/configuracoes",
  "/dashboard/alertas",
  "/dashboard/historico",
  "/dashboard/planos",
  "/dashboard/modulos",
  "/dashboard/central",
  "/dashboard/eficacia",
];

const SECRETARIAS_VALIDAS = ["saude", "educacao", "obras", "licitacoes"];

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Força HTTPS em produção — o proxy/CDN na frente já costuma redirecionar,
  // mas isso garante o comportamento mesmo se o app for exposto direto.
  const proto = request.headers.get("x-forwarded-proto");
  if (process.env.NODE_ENV === "production" && proto === "http") {
    const url = request.nextUrl.clone();
    url.protocol = "https:";
    return NextResponse.redirect(url, 308);
  }

  const precisaAuth = pathname.startsWith("/dashboard");
  if (!precisaAuth) return NextResponse.next();

  const token = request.cookies.get(NOME_COOKIE)?.value;
  const sessao = await verificarTokenSessao(token);

  if (!sessao) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  if (sessao.cargo === "secretario") {
    const minhaSecretaria =
      sessao.secretaria && SECRETARIAS_VALIDAS.includes(sessao.secretaria)
        ? sessao.secretaria
        : null;
    const destinoPadrao = minhaSecretaria
      ? `/dashboard/secretarias/${minhaSecretaria}`
      : "/dashboard";

    const acessandoOutraSecretaria =
      pathname.startsWith("/dashboard/secretarias/") &&
      !pathname.startsWith(`/dashboard/secretarias/${minhaSecretaria}`);

    const acessandoRotaRestrita = ROTAS_RESTRITAS_A_PREFEITO_ADMIN.some((r) =>
      pathname.startsWith(r)
    );

    const acessandoVisaoGeral = pathname === "/dashboard";

    if (acessandoOutraSecretaria || acessandoRotaRestrita || acessandoVisaoGeral) {
      const url = request.nextUrl.clone();
      url.pathname = destinoPadrao;
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
