import Link from "next/link";
import Contador from "@/components/site/Contador";
import { TOTAL_MUNICIPIOS } from "@/lib/municipios";
import { EXIGENCIAS } from "@/lib/diagnostico";
import { LIMITE_DISPENSA } from "@/lib/contratacao";
import { PLANOS_ADDON } from "@/lib/planos";
import { TOTAL_ARTIGOS, TOTAL_NORMAS } from "@/lib/normas-verificadas";

// ── A FAIXA DE NÚMEROS ──
//
// Toda landing page tem uma. Quase todas mentem — "+10.000 usuários",
// "99,9% de satisfação", números sem origem que o visitante não tem como
// conferir e que, por isso, ele desconta mentalmente para zero.
//
// Aqui nenhum número é escrito à mão. Cada um sai de uma constante que o
// próprio sistema usa para funcionar:
//
//   TOTAL_MUNICIPIOS   vem do arquivo do IBGE que monta as páginas do Raio-X
//   EXIGENCIAS.length  é a lista que o diagnóstico de fato percorre
//   PLANOS_ADDON       é o catálogo que o montador de proposta lê
//   LIMITE_DISPENSA    é o valor do decreto, com base legal ao lado
//
// Se um deles mudar, a faixa muda sozinha. E cada um é clicável: o
// visitante confere em um clique, que é a única autoridade que temos.

export default function NumerosVerificaveis() {
  const numeros = [
    {
      valor: TOTAL_MUNICIPIOS,
      rotulo: "municípios com Raio-X pronto",
      detalhe: "Todo município do país tem página própria, com o dado que o Tesouro publicou.",
      href: "/raio-x",
      cor: "var(--brand-claro)",
    },
    {
      valor: EXIGENCIAS.length,
      rotulo: "exigências conferidas",
      detalhe: "LAI, Lei 13.460, LRF e LGPD — cada pendência sai com o artigo que a cria.",
      href: "/diagnostico",
      cor: "var(--accent-claro)",
    },
    {
      // O pedido original para esta faixa trazia "100.000+ processos
      // digitalizados" e "R$ 15M+ economizados aos cofres públicos". O produto
      // tem zero clientes: os dois seriam falsos, e numa venda B2G quem valida
      // é o procurador da prefeitura. Este número é grande, é verdadeiro, e
      // ninguém mais diz — a lista inteira está em lib/normas-verificadas.ts,
      // com o arquivo onde cada conta mora.
      valor: TOTAL_ARTIGOS,
      rotulo: "artigos de lei verificados",
      detalhe: `De ${TOTAL_NORMAS} normas federais. Cada um tem regra no código, não é citação de texto.`,
      href: "/conformidade",
      cor: "var(--brand-claro)",
    },
    {
      valor: PLANOS_ADDON.length,
      rotulo: "módulos independentes",
      detalhe: "Contrate só a área que precisa. Sem pacote fechado, sem cobrança por usuário.",
      href: "/solucoes",
      cor: "var(--brand-claro)",
    },
    {
      valor: LIMITE_DISPENSA.valor,
      rotulo: "o teto da dispensa",
      detalhe: `${LIMITE_DISPENSA.base} — contratação direta, sem edital, dentro desse valor no ano.`,
      href: "/como-contratar",
      cor: "var(--accent-claro)",
      moeda: true,
    },
  ];

  return (
    <section className="border-y border-border" style={{ background: "var(--superficie)" }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-8 py-12 sm:py-16">
        <p className="text-[11px] font-mono uppercase tracking-[0.14em] text-muted text-center">
          Quatro números, quatro links — confira cada um
        </p>

        <div className="cascata grid grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
          {numeros.map((n, i) => (
            <Link
              key={n.rotulo}
              href={n.href}
              style={{ "--i": i } as React.CSSProperties}
              className="group borda-viva rounded-2xl border border-border p-5 sm:p-6 flex flex-col gap-2 hover:border-brand transition"
            >
              <span
                className="font-serif text-[2rem] sm:text-[2.6rem] leading-none font-extrabold tracking-[-0.04em]"
                style={{ color: n.cor }}
              >
                {n.moeda ? (
                  <Contador ate={n.valor} prefixo="R$ " decimais={0} />
                ) : (
                  <Contador ate={n.valor} />
                )}
              </span>
              <span className="font-semibold text-sm leading-snug">{n.rotulo}</span>
              <span className="text-xs text-muted leading-relaxed flex-1">{n.detalhe}</span>
              <span className="text-xs font-bold text-brand opacity-0 group-hover:opacity-100 transition">
                conferir →
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
