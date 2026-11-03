// ── COMO FUNCIONA, EM TRÊS LINHAS (novembro de 2026) ──
//
// Eram três cartões com um quadro ilustrado cada (as bases entrando, a
// conferência item a item, o trabalho pronto) e 2,2 telas no celular. Na home
// enxuta (pedido do fundador: "muita informação") ficam só os três passos,
// uma linha cada. O que o produto faz em detalhe está em /solucoes e em cada
// /modulos/....
//
// ── AUTOMAÇÃO, E NÃO AVISO ──
// Os três passos são o que o sistema faz sozinho, e o terceiro é o trabalho
// pronto: o CidadeIA faz o trabalho, não lembra alguém de fazê-lo (revisão de
// outubro de 2026).
const PASSOS = [
  { titulo: "Os dados entram sozinhos", texto: "Das bases oficiais, toda semana, sem digitar nem instalar nada." },
  { titulo: "A lei é conferida sozinha", texto: "Cada prazo e cada limite, com o artigo de lei ao lado." },
  { titulo: "O trabalho sai pronto", texto: "Ofício, aviso público e relatório montados. A equipe confere e assina." },
];

export default function ComoFunciona() {
  return (
    <section className="max-w-[1200px] mx-auto px-4 sm:px-8 pt-24 sm:pt-32">
      <div className="surge">
        <p className="inicio-sobre"><i aria-hidden />Como funciona</p>
        <h2 className="inicio-h2 max-w-[18ch]">Do dado público ao trabalho feito.</h2>
      </div>
      {/* Um fio em cima de cada passo, e não cartão: três linhas lidas de
          relance. A ordem está na lista (<ol>) e nos próprios títulos. */}
      <ol className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-6">
        {PASSOS.map((p) => (
          <li key={p.titulo} className="surge border-t border-border pt-5 min-w-0">
            <h3 className="text-lg font-semibold tracking-[-0.02em]">{p.titulo}</h3>
            <p className="mt-1.5 text-muted leading-relaxed max-w-[36ch]">{p.texto}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
