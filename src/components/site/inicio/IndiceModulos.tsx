import Link from "next/link";
import { modulosNaOrdemDaHome } from "@/lib/modulos-detalhe";

// Os seis módulos como um índice, não como seis cartões iguais. Cada linha
// é nome, uma frase e o caminho para a página do módulo. As duas bases vêm
// primeiro e dizem que são base; as secretarias vêm depois.
export default function IndiceModulos() {
  const modulos = modulosNaOrdemDaHome();

  return (
    <ul className="grid md:grid-cols-2 border-t border-border">
      {modulos.map(({ chave, nome, detalhe }, i) => {
        const base = chave === "essencial" || chave === "gestao";
        return (
          <li
            key={chave}
            className={`border-b border-border ${i % 2 === 0 ? "md:border-r" : ""}`}
          >
            <Link
              href={`/modulos/${chave}`}
              className={`inicio-linha-modulo group flex h-full flex-col gap-2 px-3 py-7 ${
                i % 2 === 0 ? "md:pl-3 md:pr-10" : "md:pl-10 md:pr-3"
              } focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brand`}
            >
              <span className="flex items-baseline justify-between gap-4">
                <span className="text-xl sm:text-2xl font-semibold tracking-[-0.03em]">{nome}</span>
                {base && (
                  <span className="text-xs text-muted">módulo base</span>
                )}
              </span>
              <span className="text-[15px] text-muted leading-relaxed max-w-[44ch]">
                {detalhe.resumo}
              </span>
              <span className="mt-2 text-sm font-medium text-brand-claro opacity-70 group-hover:opacity-100 transition-opacity">
                Ver o módulo
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
