import Esqueleto, {
  TituloEsqueleto,
  CartoesEsqueleto,
  BlocoEsqueleto,
  ListaEsqueleto,
  Linha,
} from "@/components/Esqueleto";

// A forma acompanha a tela de Licitações: título com o botão de relatório, insight
// da IA, os painéis do módulo e a lista da rede. Se a tela ganhar ou perder
// um bloco, este arquivo muda junto — esqueleto que não acompanha faz o
// conteúdo pular na chegada, que é pior que não ter esqueleto.
export default function CarregandoLicitacoes() {
  return (
    <Esqueleto oQue="Licitações">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <TituloEsqueleto />
        <Linha largura="w-44" altura="h-10" />
      </div>

      <BlocoEsqueleto altura="h-20" />

      <BlocoEsqueleto>
        <div className="flex flex-col gap-5">
          <Linha largura="w-52" altura="h-4" />
          <CartoesEsqueleto quantos={3} />
        </div>
      </BlocoEsqueleto>

      <ListaEsqueleto linhas={3} />
    </Esqueleto>
  );
}
