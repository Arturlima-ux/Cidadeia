// ── O ESQUELETO DO RAIO-X ──
//
// A página do município espera o Tesouro Nacional responder. Medido em
// produção: 2 a 5 segundos na PRIMEIRA visita de cada município — e com 5.570
// municípios e tráfego de cauda longa vindo de busca, quase todo visitante é o
// primeiro daquele município.
//
// Até aqui esses segundos eram tela branca, justamente na porta de entrada do
// funil. Agora o cabeçalho aparece de imediato (o nome e a população saem de
// dado local) e só este bloco fica esperando.
//
// ── POR QUE O ESQUELETO TEM A FORMA DO CONTEÚDO ──
//
// Um retângulo cinza genérico diz "espere". Um esqueleto com a geometria do
// que vai chegar diz "já está vindo, e vai ser assim" — o olho começa a
// montar a página antes de ela existir, e a chegada do dado parece
// preenchimento em vez de troca de tela.
//
// Por isso as proporções abaixo não são decorativas: são as do
// RaioXResultado. Se aquele componente mudar de forma, este precisa mudar
// junto, senão o conteúdo "pula" quando chega.

function Barra({ largura, altura = "h-4" }: { largura: string; altura?: string }) {
  return <div className={`${altura} ${largura} rounded-md bg-sutil animate-pulse-soft`} />;
}

export default function EsqueletoRaioX({ nome }: { nome: string }) {
  return (
    <div
      className="border border-border rounded-2xl p-6 sm:p-7"
      style={{ background: "var(--card)" }}
      // O leitor de tela não deve anunciar o esqueleto, mas precisa saber que
      // algo está carregando — senão ele lê o cabeçalho e conclui que a página
      // acabou ali.
      aria-busy="true"
      aria-live="polite"
    >
      <p className="sr-only">Consultando o Tesouro Nacional os dados de {nome}.</p>

      <div aria-hidden="true" className="flex flex-col gap-6">
        {/* título da seção */}
        <div className="flex flex-col gap-2">
          <Barra largura="w-52" altura="h-5" />
          <Barra largura="w-full max-w-[42ch]" altura="h-3" />
        </div>

        {/* os quatro números do topo */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-1">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-2">
              <Barra largura="w-24" altura="h-7" />
              <Barra largura="w-16" altura="h-3" />
            </div>
          ))}
        </div>

        {/* as linhas de aplicação por área */}
        <div className="flex flex-col gap-3 pt-2 border-t border-border">
          {[0.9, 0.75, 0.6].map((w, i) => (
            <div key={i} className="flex items-center gap-3">
              <Barra largura="w-28" altura="h-3" />
              <div className="flex-1 h-1.5 rounded-full bg-sutil overflow-hidden">
                <div
                  className="h-full rounded-full animate-pulse-soft"
                  style={{ width: `${w * 100}%`, background: "var(--border)" }}
                />
              </div>
              <Barra largura="w-12" altura="h-3" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
