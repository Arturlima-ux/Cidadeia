import Link from "next/link";

// ── UM MÓDULO, POR DENTRO ──
//
// A home dizia "seis módulos" e mandava embora. Quem nunca abriu o
// produto lia isso como seis telas de cadastro, que é o que quase todo
// sistema municipal entrega — e não há como diferenciar preço sem
// diferenciar o que se vende.
//
// Esta seção abre UM módulo e mostra a corrente inteira: o que entra, o
// que o sistema faz sozinho, e o documento que sai do outro lado. É o
// argumento mais difícil de copiar, porque não é design: é conhecimento
// do domínio, com o artigo da lei ao lado de cada passo.
//
// Educação, e não Saúde, por dois motivos. O primeiro: a Saúde tem API
// pública (CNES) e soa como integração; a Educação não tem, e o que
// resolve ali é produto. O segundo: os dois desfechos — dinheiro do
// FUNDEB e ofício ao Conselho Tutelar — são coisas que o prefeito
// reconhece como problema dele antes de qualquer demonstração.

type Passo = {
  n: string;
  titulo: string;
  texto: string;
  lei?: string;
  saida?: boolean;
};

const PASSOS: Passo[] = [
  {
    n: "01",
    titulo: "Um arquivo, e a rede inteira entra",
    texto:
      "Educação não tem CNES: MEC, INEP e dados.gov.br são fechados a consulta automática. O município exporta o Catálogo de Escolas do INEP e solta aqui — o leitor aceita os dois formatos que o INEP publica, nos dois encodings, e separa sozinho o que é do município mesmo quando o arquivo é do estado inteiro.",
  },
  {
    n: "02",
    titulo: "Cada escola ganha ficha, e a direção ganha acesso",
    texto:
      "Quem vê a cadeira vazia é a diretora, não o secretário. Ela entra com o próprio CPF e enxerga só a escola dela: registra professor que faltou, ônibus que quebrou, merenda que acabou — pelo celular, na hora.",
  },
  {
    n: "03",
    titulo: "O sistema soma o que ninguém soma",
    texto:
      "Toda ocorrência que custou aula entra no contador dos dias letivos. A matrícula que a escola tem hoje é comparada com a que foi declarada ao Censo, e a diferença vira reais. As compras da merenda viram o percentual da agricultura familiar, com projeção de onde o ano fecha.",
    lei: "LDB art. 24 · Lei 11.947/2009 art. 14",
  },
  {
    n: "04",
    titulo: "E sai um documento que ninguém queria escrever",
    texto:
      "Aluno fora da escola há semanas vira ofício ao Conselho Tutelar, montado com o que a escola já tentou — e só com o que ela tentou. Se o contato com a família não foi registrado, ele não aparece no documento. É essa lista datada que a lei chama de recursos escolares esgotados.",
    lei: "ECA art. 56, II",
    saida: true,
  },
];

export default function PorDentro() {
  return (
    <section className="border-y border-border" style={{ background: "var(--superficie)" }}>
      <div className="max-w-[1200px] mx-auto px-4 sm:px-8 py-16 sm:py-24">
        <div className="grid lg:grid-cols-[0.85fr_1.15fr] gap-10 lg:gap-16">
          {/* A coluna da esquerda gruda enquanto os passos passam ao lado.
              O leitor não perde o contexto do que está lendo. */}
          <div className="lg:sticky lg:top-28 lg:self-start">
            <p className="text-xs text-muted font-medium">
              Um módulo, por dentro
            </p>
            <h2 className="titulo-secao mt-5 max-w-[15ch]">
              Não é um cadastro com gráfico em cima.
            </h2>
            <p className="text-muted leading-relaxed mt-5 max-w-[44ch]">
              Sistema municipal costuma ser uma tela de cadastro e um relatório
              no fim do mês. Abrimos a Educação inteira aqui para você ver a
              diferença — do arquivo que entra ao ofício que sai, com o artigo
              da lei em cada passo.
            </p>

            <div
              className="rounded-2xl border p-5 mt-7"
              style={{ background: "var(--accent-tint)", borderColor: "var(--info-borda)" }}
            >
              <p className="text-sm leading-relaxed">
                <span className="font-semibold">O que isso vale em dinheiro:</span> o
                FUNDEB paga por aluno declarado ao Censo. Aluno que a escola
                atende e não declarou é repasse que o município não recebe — e
                paga a despesa do mesmo jeito.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-x-6 gap-y-3 mt-7">
              <Link
                href="/modulos/educacao"
                className="text-sm font-bold text-brand hover:text-brand-claro transition"
              >
                O módulo Educação inteiro →
              </Link>
              <Link href="/demo" className="text-sm font-semibold text-muted hover:text-foreground transition">
                Ver funcionando na demonstração
              </Link>
            </div>
          </div>

          {/* Os passos. A linha que os liga é desenhada conforme a seção
              entra — ver `.traco-anima` em globals.css. */}
          <ol className="relative cascata flex flex-col gap-4">
            {/* A linha vertical fica atrás dos números, desenhando-se de
                cima para baixo. `preserveAspectRatio` desligado porque ela
                estica na altura, não proporcionalmente. */}
            <svg
              aria-hidden="true"
              className="pointer-events-none absolute left-[19px] top-6 bottom-6 w-px hidden sm:block"
              viewBox="0 0 1 100"
              preserveAspectRatio="none"
            >
              <line
                className="traco-anima"
                x1="0.5"
                y1="0"
                x2="0.5"
                y2="100"
                stroke="var(--brand)"
                strokeWidth="1"
                strokeOpacity="0.45"
                style={{ "--traco": 100 } as React.CSSProperties}
              />
            </svg>

            {PASSOS.map((p, i) => (
              <li
                key={p.n}
                style={{ "--i": i } as React.CSSProperties}
                className="relative grid sm:grid-cols-[40px_1fr] gap-x-4 gap-y-3"
              >
                <span
                  className="w-10 h-10 rounded-full grid place-items-center font-serif text-sm font-semibold shrink-0 border"
                  style={{
                    background: p.saida ? "var(--accent)" : "var(--superficie)",
                    color: p.saida ? "var(--sobre-acento)" : "var(--brand-claro)",
                    borderColor: p.saida ? "var(--accent)" : "var(--border)",
                  }}
                >
                  {p.n}
                </span>
                <div
                  className="rounded-2xl border border-border p-5 sm:p-6 borda-viva"
                  style={{ background: "var(--card)" }}
                >
                  <h3 className="font-serif text-lg font-bold leading-snug">{p.titulo}</h3>
                  <p className="text-sm text-muted leading-relaxed mt-2.5">{p.texto}</p>
                  {p.lei && (
                    <p
                      className="text-xs mt-3.5 pt-3.5 border-t border-border font-medium"
                      style={{ color: "var(--brand-claro)" }}
                    >
                      {p.lei}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
