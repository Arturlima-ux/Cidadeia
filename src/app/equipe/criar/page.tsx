import Link from "next/link";
import { MarcaCompleta } from "@/components/site/MarcaQuadra";
import FormularioEquipe from "./FormularioEquipe";

// Tela interna: fora do índice de busca e de qualquer link do site.
export const metadata = {
  title: "Conta da equipe",
  robots: { index: false, follow: false },
};

export default function CriarContaEquipePage() {
  return (
    <div className="tema-noite min-h-screen flex items-center justify-center px-4 py-16">
      <main id="conteudo" className="w-full max-w-md">
        <Link href="/" aria-label="CidadeIA, início" className="inline-block">
          <MarcaCompleta tamanho={28} />
        </Link>
        <h1 className="text-3xl font-semibold tracking-[-0.04em] mt-10">Conta da equipe</h1>
        <p className="text-muted mt-3 leading-relaxed">
          Acesso à mesa de pedidos e ao financeiro do CidadeIA. Não é conta de prefeitura: não pede
          município nem CNPJ.
        </p>
        <div className="mt-8 rounded-[22px] border border-border p-6 sm:p-7" style={{ background: "var(--card)" }}>
          <FormularioEquipe />
        </div>
      </main>
    </div>
  );
}
