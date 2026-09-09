import SiteHeader from "@/components/site/SiteHeader";
import SiteFooter from "@/components/site/SiteFooter";
import Reveal from "@/components/site/Reveal";
import Link from "next/link";
import { VIGENCIA_DOCUMENTOS, type SecaoLegal } from "@/lib/documentos-legais";

// Molde das duas páginas legais. Existe para elas não divergirem em aparência
// nem na data de vigência — dois documentos jurídicos do mesmo site com datas
// diferentes é a primeira coisa que um revisor atento estranha.

export default function PaginaLegal({
  titulo,
  chamada,
  secoes,
  outroDocumento,
}: {
  titulo: string;
  chamada: string;
  secoes: SecaoLegal[];
  outroDocumento: { href: string; rotulo: string };
}) {
  return (
    <div className="tema-noite min-h-screen">
      <SiteHeader />

      <Reveal>
        <section className="max-w-2xl mx-auto px-4 sm:px-8 pt-16 pb-8">
          <h1 className="font-serif text-4xl font-bold">{titulo}</h1>
          <p className="text-muted text-base mt-4 leading-relaxed">{chamada}</p>
          <p className="text-xs font-mono text-muted mt-6">
            Última revisão: {VIGENCIA_DOCUMENTOS}
          </p>
        </section>
      </Reveal>

      <section className="max-w-2xl mx-auto px-4 sm:px-8 pb-12 flex flex-col gap-10">
        {secoes.map((s, i) => (
          <Reveal key={s.titulo} delay={Math.min(i, 5) * 60}>
            <div>
              <h2 className="font-serif text-xl font-bold">{s.titulo}</h2>
              <div className="flex flex-col gap-3 mt-3">
                {s.paragrafos.map((p) => (
                  <p key={p.slice(0, 40)} className="text-sm text-muted leading-relaxed">
                    {p}
                  </p>
                ))}
              </div>
            </div>
          </Reveal>
        ))}
      </section>

      <section className="max-w-2xl mx-auto px-4 sm:px-8 pb-20">
        <div className="border-t border-border pt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm">
          <Link
            href={outroDocumento.href}
            className="font-semibold text-brand hover:text-brand-claro transition"
          >
            {outroDocumento.rotulo}&nbsp;→
          </Link>
          {/* /sobre continua existindo e continua sendo útil: ela detalha COMO
              os dados são protegidos — hash da senha, isolamento, bloqueio por
              tentativa. É complemento técnico destes documentos, não
              substituto, e era justamente por ocupar o lugar deles no rodapé
              que a lacuna passava despercebida. */}
          <Link
            href="/sobre"
            className="font-semibold text-muted hover:text-foreground transition"
          >
            Como os dados são protegidos&nbsp;→
          </Link>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
