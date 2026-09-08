import FormularioLogin from "./FormularioLogin";

// ── POR QUE ESTA PÁGINA É DE SERVIDOR ──
//
// Ela era um Client Component inteiro e lia `?sessao=expirada` com
// `useSearchParams()`. Isso tem um custo que não aparece em teste nenhum:
// `useSearchParams` sem `<Suspense>` faz o Next DESISTIR de pré-renderizar a
// página. O HTML servido saía com o `<head>` e nada mais — sem formulário, sem
// campo de CPF, sem botão. Tudo dependia do JavaScript chegar e executar.
//
// Com JavaScript funcionando ninguém percebe. Sem ele — rede ruim de
// prefeitura, extensão que bloqueia script, um pedaço de bundle que falhou
// depois de um deploy — a tela de login fica EM BRANCO. E login em branco não
// é uma página feia: é um cliente com contrato que não consegue entrar.
//
// Ler o parâmetro aqui, no servidor, e passar como propriedade devolve a
// página ao HTML. O formulário continua sendo cliente, porque precisa de
// estado; o que ele não precisa é decidir sozinho se a sessão expirou.

export const metadata = {
  title: "Entrar — CidadeIA",
};

export default async function LoginPage({
  searchParams,
}: {
  // Promise nesta versão do Next — ver node_modules/next/dist/docs,
  // 03-file-conventions/page.md.
  searchParams: Promise<{ [chave: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;

  return <FormularioLogin sessaoExpirada={params.sessao === "expirada"} />;
}
