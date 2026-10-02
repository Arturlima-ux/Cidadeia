import Esqueleto, {
  TituloEsqueleto,
  CartoesEsqueleto,
  BlocoEsqueleto,
  Linha,
} from "@/components/Esqueleto";

// ── A VISÃO GERAL ──
//
// É a primeira tela depois do login, e a que o prefeito abre todo dia. A
// forma aqui acompanha a de dashboard/page.tsx: saudação, painel de atenção,
// insight da IA, e as faixas por secretaria.
//
// Este arquivo também é a rede de segurança das 34 rotas internas do painel:
// a documentação do Next é explícita que loading.js envolve "the page.js file
// and any children below", então uma tela sem esqueleto próprio cai aqui. As
// que têm o seu são as mais pesadas, e estão nas pastas correspondentes.
export default function CarregandoPainel() {
  return (
    <Esqueleto oQue="a Visão Geral">
      <TituloEsqueleto />

      {/* painel de atenção: o que pede decisão hoje */}
      <BlocoEsqueleto>
        <div className="flex flex-col gap-3">
          <Linha largura="w-48" altura="h-4" />
          <Linha largura="w-full max-w-[56ch]" altura="h-3" />
          <Linha largura="w-full max-w-[48ch]" altura="h-3" />
        </div>
      </BlocoEsqueleto>

      {/* insight da IA */}
      <BlocoEsqueleto altura="h-20" />

      {/* as faixas por secretaria, cada uma com seus três números */}
      {[0, 1].map((i) => (
        <div key={i} className="space-y-3">
          <Linha largura="w-40" altura="h-3" />
          <BlocoEsqueleto>
            <CartoesEsqueleto quantos={3} />
          </BlocoEsqueleto>
        </div>
      ))}
    </Esqueleto>
  );
}
