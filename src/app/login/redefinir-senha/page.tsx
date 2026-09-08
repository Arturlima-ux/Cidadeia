import FormularioRedefinir from "./FormularioRedefinir";

// O token chega por link de e-mail, e era lido com `useSearchParams()` dentro
// de um `<Suspense fallback={null}>`. A página prerenderizava, mas o conteúdo
// dela não: o HTML servido trazia o fallback — ou seja, nada — e o formulário
// só aparecia depois do JavaScript executar.
//
// Aqui isso é pior que na home. Quem abre esta página está no meio de uma
// recuperação de senha, muitas vezes no celular, num link vindo do e-mail. Se
// o script falhar, ele vê uma tela vazia e conclui que o link expirou.
//
// Lendo o token no servidor, o formulário vem no HTML. Ver o comentário mais
// longo em app/login/page.tsx.

export const metadata = {
  title: "Redefinir senha — CidadeIA",
};

export default async function RedefinirSenhaPage({
  searchParams,
}: {
  searchParams: Promise<{ [chave: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const token = typeof params.token === "string" ? params.token : "";

  return <FormularioRedefinir token={token} />;
}
