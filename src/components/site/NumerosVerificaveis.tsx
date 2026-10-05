import Link from "next/link";
import Contador from "@/components/site/Contador";
import { TOTAL_MUNICIPIOS } from "@/lib/municipios";
import { EXIGENCIAS } from "@/lib/diagnostico";
import { LIMITE_DISPENSA } from "@/lib/contratacao";

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
//   LIMITE_DISPENSA    é o valor do decreto, com base legal ao lado
//
// Se um deles mudar, a faixa muda sozinha. E cada um é clicável: o
// visitante confere em um clique, que é a única autoridade que temos.

// ── TRÊS, NÃO CINCO ──
//
// Eram cinco números numa grade de quatro colunas, e o quinto ficava órfão
// na segunda linha do desktop. Dois deles (artigos verificados, quantidade de
// módulos) falavam de nós, não do que o secretário ganha. Ficaram os três que
// respondem a ele: o meu município está aí, o que é conferido, e se dá para
// contratar sem licitar. Os artigos continuam contados em /conformidade.

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
      valor: LIMITE_DISPENSA.valor,
      rotulo: "o teto da dispensa",
      detalhe: `${LIMITE_DISPENSA.base} — contratação direta, sem edital, dentro desse valor no ano.`,
      href: "/como-contratar",
      cor: "var(--accent-claro)",
      moeda: true,
    },
  ];

  return (
    // ── SEM MOLDURA, SEM TÍTULO, EM CORPO GIGANTE ──
    //
    // Era uma <section> com borda em cima e embaixo, fundo próprio e um
    // título explicando a faixa. Isso a transformava num bloco separado, que
    // é como ela lia: rodapé de seção. Em GANNET e AuraVox os números SÃO a
    // dobra — grandes, sem caixa em volta, com o rótulo pequeno embaixo.
    //
    // O título saiu porque a faixa não precisa ser apresentada: quatro
    // números enormes com "conferir" embaixo dizem sozinhos o que são.
    <section>
      <div className="max-w-[1200px] mx-auto px-4 sm:px-8">
        <div className="cascata grid grid-cols-1 sm:grid-cols-3 gap-x-8 gap-y-8 max-w-4xl mx-auto">
          {numeros.map((n, i) => (
            <Link
              key={n.rotulo}
              href={n.href}
              style={{ "--i": i } as React.CSSProperties}
              /* Sem cartão: borda e fundo em volta de cada número os
                 transformava em quatro caixinhas, e o conjunto lia como
                 tabela. Sem caixa, os quatro valores formam uma linha só. */
              className="group flex flex-col gap-2 transition"
            >
              <span
                className="font-serif numero-gigante tabular-nums"
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
