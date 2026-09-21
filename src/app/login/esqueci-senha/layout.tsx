// A página é um Client Component e não pode exportar metadata; o título
// mora aqui. Sem isto ela aparecia na aba como a home.
export const metadata = { title: "Recuperar senha" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
