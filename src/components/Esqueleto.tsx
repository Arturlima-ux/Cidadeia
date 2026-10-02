// ── AS PEÇAS DE UM ESQUELETO ──
//
// O painel tinha UM esqueleto genérico para 34 telas. Ele cumpre o mínimo —
// a tela não fica branca —, mas um retângulo que não se parece com o destino
// diz só "espere". Um esqueleto com a geometria do que vem diz "já está
// vindo, e vai ser assim": o olho começa a montar a página antes de ela
// existir, e a chegada do dado vira preenchimento em vez de troca de tela.
//
// ── POR QUE PRIMITIVAS, E NÃO UM ESQUELETO POR TELA ESCRITO À MÃO ──
//
// Escrito à mão, cada esqueleto nasce parecido com a tela e envelhece
// sozinho: a tela ganha um cartão, o esqueleto não, e meses depois o
// conteúdo "pula" na chegada sem ninguém entender por quê. Com peças
// compartilhadas, o esqueleto de cada tela cabe em dez linhas e fica óbvio
// de corrigir quando a tela muda.
//
// ── A REGRA QUE ATRAVESSA TODAS ──
//
// Nada aqui anima além de `opacity` (via animate-pulse-soft), pela mesma
// disciplina do motor em globals.css. E nenhuma peça é anunciada ao leitor
// de tela: quem usa leitor recebe UMA frase dizendo o que está carregando,
// no componente Esqueleto, em vez de dezenas de "imagem" sem conteúdo.

export function Linha({
  largura = "w-full",
  altura = "h-4",
}: {
  largura?: string;
  altura?: string;
}) {
  return <div className={`${altura} ${largura} rounded-md bg-sutil animate-pulse-soft`} />;
}

/** Título de página ou de seção: uma linha grossa e uma fina embaixo. */
export function TituloEsqueleto({ comApoio = true }: { comApoio?: boolean }) {
  return (
    <div className="flex flex-col gap-2.5">
      <Linha largura="w-64 max-w-full" altura="h-7" />
      {comApoio && <Linha largura="w-full max-w-[52ch]" altura="h-3" />}
    </div>
  );
}

/** A fileira de números do topo — o formato mais repetido do produto. */
export function CartoesEsqueleto({ quantos = 4 }: { quantos?: number }) {
  return (
    <div className={`grid grid-cols-2 ${quantos === 3 ? "sm:grid-cols-3" : "sm:grid-cols-4"} gap-4`}>
      {Array.from({ length: quantos }).map((_, i) => (
        <div key={i} className="flex flex-col gap-2">
          <Linha largura="w-20" altura="h-7" />
          <Linha largura="w-14" altura="h-3" />
        </div>
      ))}
    </div>
  );
}

/** Um bloco de cartão com borda, como os painéis das secretarias. */
export function BlocoEsqueleto({
  altura = "h-32",
  children,
}: {
  altura?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="border border-border rounded-2xl p-5 sm:p-6" style={{ background: "var(--card)" }}>
      {children ?? <div className={`${altura} rounded-lg bg-sutil animate-pulse-soft`} />}
    </div>
  );
}

/** Lista de unidades, escolas, processos ou obras. */
export function ListaEsqueleto({ linhas = 3 }: { linhas?: number }) {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: linhas }).map((_, i) => (
        <div key={i} className="border border-border rounded-lg px-4 py-3.5 flex items-start gap-3">
          {/* o marcador de situação */}
          <div className="w-2.5 h-2.5 rounded-full bg-sutil animate-pulse-soft mt-1 shrink-0" />
          <div className="flex-1 flex flex-col gap-2">
            <Linha largura={i === 0 ? "w-56" : i === 1 ? "w-44" : "w-48"} altura="h-4" />
            <Linha largura="w-full max-w-[46ch]" altura="h-3" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * O envelope. Dá o espaçamento da tela e a única frase que o leitor de tela
 * recebe.
 *
 * Sem ela, quem usa leitor ouve o cabeçalho da página e conclui que acabou
 * ali — o esqueleto é invisível para ele, e o silêncio é indistinguível de
 * página vazia.
 */
export default function Esqueleto({
  oQue,
  children,
}: {
  /** "a Visão Geral", "a Secretaria da Saúde" — entra na frase "Carregando…". */
  oQue: string;
  children: React.ReactNode;
}) {
  return (
    <div className="max-w-4xl space-y-8" aria-busy="true" aria-live="polite">
      <p className="sr-only">Carregando {oQue}.</p>
      <div aria-hidden="true" className="space-y-8">
        {children}
      </div>
    </div>
  );
}
