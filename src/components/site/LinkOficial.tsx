import type { ReactNode } from "react";

/**
 * Link para fonte oficial (lib/links-oficiais.ts): abre em outra aba, sem
 * passar a página de origem, e sem "nofollow" — é citação, não anúncio.
 */
export default function LinkOficial({ href, children, className = "" }: { href: string; children: ReactNode; className?: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`underline decoration-[color:var(--border)] underline-offset-2 hover:decoration-current ${className}`}
    >
      {children}
    </a>
  );
}
