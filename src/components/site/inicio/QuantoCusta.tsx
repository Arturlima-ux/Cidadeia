import Inclinar from "@/components/site/inicio/Inclinar";

// ── QUANTO CUSTA ──
//
// A home não dizia nada sobre preço até o montador da proposta. Quem compra
// para prefeitura procura isso cedo, e a resposta honesta é que o valor
// depende do porte: sai pela faixa de habitantes do município (a população
// estimada pelo IBGE) e chega na proposta. Então a seção diz isso, com o
// "Sob consulta" no cartão de vidro (pedido do fundador, outubro de 2026).
//
// Os três cartões mínimos repetem só o que o site já afirma em outros
// lugares: módulo avulso, sem cobrança por usuário (home, mesa de módulos)
// e acréscimo ou retirada por termo aditivo (lib/documentos-legais.ts).
//
// Figma: "Preço · computador (1440)" e o componente "Preço em vidro".

const CONDICOES = [
  { titulo: "Por módulo", texto: "Sem pacote fechado: entra só o que a prefeitura usa." },
  { titulo: "Sem cobrança por usuário", texto: "Do gabinete à escola, todo mundo da prefeitura usa." },
  { titulo: "Mês a mês", texto: "Acrescentar ou retirar módulo é termo aditivo, como em qualquer contrato público." },
];

export default function QuantoCusta() {
  return (
    <section
      aria-labelledby="titulo-preco"
      className="tela-adiada max-w-[1200px] mx-auto px-4 sm:px-8 pt-28 sm:pt-36 pb-6 lg:pb-24"
    >
      <div className="grid lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-x-10">
        {/* O painel de pontos com o brilho. No computador o vidro fica por
            cima da borda direita e passa 72 px da de baixo (a sobreposição);
            no celular ele sobe 48 px sobre o pé do painel. O pb da seção
            existe por isso: tela-adiada contém a pintura, e o que passasse
            da borda da seção seria cortado. */}
        <div className="preco-painel surge rounded-[32px] px-6 pt-10 pb-20 sm:px-12 sm:pt-14 lg:pb-14 lg:col-[1/-1] lg:row-start-1">
          <div className="grade-pontos" aria-hidden />
          <h2 id="titulo-preco" className="inicio-h2">
            Quanto custa
          </h2>
          <p className="mt-5 max-w-[42ch] leading-relaxed" style={{ color: "color-mix(in oklab, var(--foreground) 76%, transparent)" }}>
            A prefeitura contrata só os módulos que usa. O valor sai pela faixa de habitantes do município, a população
            estimada pelo IBGE.
          </p>
          <ul className="surge-lista mt-8 grid sm:grid-cols-3 lg:grid-cols-3 gap-3 lg:max-w-[600px]">
            {CONDICOES.map((c, i) => (
              <li
                key={c.titulo}
                className="cartao-minimo rounded-[20px] px-5 py-5"
                style={{ "--i": i } as React.CSSProperties}
              >
                <p className="font-semibold tracking-[-0.015em] leading-snug">{c.titulo}</p>
                <p className="text-sm text-muted leading-relaxed mt-1.5">{c.texto}</p>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative z-[1] -mt-12 px-3 sm:px-8 lg:px-0 lg:mt-0 lg:col-start-2 lg:row-start-1 lg:self-end lg:translate-y-[72px] lg:mr-10">
          <Inclinar className="rounded-[28px]">
            <div className="preco-vidro rounded-[28px] px-7 py-8 sm:px-10 sm:py-10">
              <p className="text-[2.6rem] sm:text-5xl font-semibold tracking-[-0.045em] leading-none">Sob consulta</p>
              <p className="mt-4 text-[15px] leading-relaxed" style={{ color: "color-mix(in oklab, var(--foreground) 78%, transparent)" }}>
                Por módulo, por mês, pela faixa de habitantes. A proposta chega em até um dia útil, com o termo de referência
                pronto para o jurídico.
              </p>
              <a
                href="#proposta"
                className="mt-6 inline-flex items-center rounded-full px-5 py-3 text-[15px] font-semibold text-white bg-brand hover:bg-brand-dark transition-colors pressiona"
              >
                Receber proposta
              </a>
            </div>
          </Inclinar>
        </div>
      </div>
    </section>
  );
}
