import Link from "next/link";
import { solucoesParaORaioX, resumoDasSolucoes, type EntradaSolucoes } from "@/lib/raio-x-solucoes";
import { NOME_PLANO_ADDON } from "@/lib/planos";

// ── O QUE FAZER COM ISSO ──
//
// O Raio-X terminava no número. Quem lia ficava com o problema na mão e
// um menu genérico de "Soluções" do outro lado da tela — que não responde
// à pergunta que o próprio Raio-X acabou de levantar.
//
// Aqui cada achado daquele município puxa o módulo que trata exatamente
// aquilo, citando o número que apareceu acima. Quem chegou pelo nome da
// cidade no Google sai sabendo o que existe para o caso dele.

export default function SolucoesDoRaioX({ entrada }: { entrada: EntradaSolucoes }) {
  const solucoes = solucoesParaORaioX(entrada);
  const resumo = resumoDasSolucoes(entrada);

  return (
    <section className="border-t border-border pt-10">
      <p className="text-[11px] font-mono uppercase tracking-[0.14em] text-muted">O que fazer com isso</p>
      <h2 className="font-serif text-2xl sm:text-[1.9rem] font-extrabold tracking-[-0.03em] mt-3 leading-tight">
        Do diagnóstico para a mesa de quem decide
      </h2>
      <p className="text-muted text-base leading-relaxed mt-4 max-w-[60ch]">{resumo}</p>

      <ol className="mt-8 flex flex-col gap-3">
        {solucoes.map((s, i) => (
          <li
            key={`${s.modulo}-${i}`}
            className="border border-border rounded-2xl p-5 sm:p-6"
            style={{ background: "var(--card)" }}
          >
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h3 className="font-semibold text-[1.02rem] leading-snug">{s.achado}</h3>
              <span className="text-[11px] font-mono uppercase tracking-[0.12em] text-brand-claro shrink-0">
                módulo {NOME_PLANO_ADDON[s.modulo]}
              </span>
            </div>
            <p className="text-sm text-muted leading-relaxed mt-2.5 max-w-[68ch]">{s.porque}</p>
            <p className="text-sm leading-relaxed mt-3 max-w-[68ch]">
              <span className="text-[11px] font-bold uppercase tracking-wider text-brand-claro mr-1.5">No CidadeIA</span>
              {s.resolve}
            </p>
          </li>
        ))}
      </ol>

      <div className="flex flex-wrap gap-3 mt-8">
        <Link
          href={`/proposta?ibge=${entrada.codigoIbge}`}
          className="bg-brand hover:bg-brand-dark text-white font-bold text-sm rounded-xl px-6 py-3.5 transition shadow-elevated"
        >
          Montar proposta para {entrada.municipio}&nbsp;&nbsp;→
        </Link>
        <Link
          href="/solucoes"
          className="border border-border font-semibold text-sm rounded-xl px-5 py-3.5 transition hover:border-brand"
        >
          Ver todos os módulos e o que cada um entrega
        </Link>
        <Link
          href="/demo"
          className="border border-border font-semibold text-sm rounded-xl px-5 py-3.5 transition hover:border-brand"
        >
          Abrir o painel de demonstração
        </Link>
      </div>

      <p className="text-xs text-muted mt-6 leading-relaxed max-w-[62ch]">
        Os percentuais citados acima são indício sobre a receita total, não cálculo de mínimo
        constitucional — a base legal do mínimo é outra. Dentro do painel, quem informa essa base é o
        contador da prefeitura.
      </p>
    </section>
  );
}
