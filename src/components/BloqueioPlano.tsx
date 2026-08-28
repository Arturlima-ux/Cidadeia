import Link from "next/link";
import { NOME_PLANO_ADDON, PLANOS_ADDON, type PlanoAddon } from "@/lib/planos";

/**
 * Recebe só a chave do plano — antes cada página precisava fazer
 * `PLANOS_ADDON.find(p => p.chave === "gestao")!.descricao` na mão, o que
 * repetia a busca (e o `!`) em 6 lugares.
 */
export default function BloqueioPlano({ plano }: { plano: PlanoAddon }) {
  const descricao = PLANOS_ADDON.find((p) => p.chave === plano)?.descricao ?? "";

  return (
    <div className="max-w-lg mx-auto mt-12 text-center arco-card border border-dashed border-border p-8">
      <div
        className="arco-badge w-11 h-11 text-white flex items-center justify-center mx-auto mb-5"
        style={{ background: "var(--gradient-hero)" }}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.75}
          strokeLinecap="round"
          className="w-5 h-5"
        >
          <rect x="5" y="11" width="14" height="9" rx="2" />
          <path d="M8 11V7.5a4 4 0 0 1 8 0V11" />
        </svg>
      </div>
      <h1 className="font-serif text-xl font-bold mb-2">
        Módulo {NOME_PLANO_ADDON[plano]} não contratado
      </h1>
      <p className="text-sm text-muted leading-relaxed">{descricao}</p>
      <Link
        href="/dashboard/modulos"
        className="group inline-flex items-center gap-1.5 mt-6 bg-brand hover:bg-brand-dark text-white font-semibold text-sm rounded-full px-5 py-2.5 transition"
      >
        Ver módulos disponíveis
        <span className="inline-block transition-transform duration-200 group-hover:translate-x-1">
          →
        </span>
      </Link>
    </div>
  );
}
