import { IconDownload } from "@/components/icons";
import { BASE_LEGAL_PCA, PUBLICIDADE_PCA, type ItemPca, type Plano } from "@/lib/pca";

/**
 * ── O ANTÍDOTO DE RAIZ ──
 *
 * O módulo mostra o fim da história (fracionamento) e o começo dela (contrato
 * vencendo). Esta seção mostra o que impede a história de começar: a lista do
 * que vai precisar ser contratado e de quando o processo tem de sair do papel.
 *
 * Fracionamento quase nunca é má-fé — é calendário. O contrato venceu, ninguém
 * planejou a substituição, o serviço não podia parar, entrou dispensa
 * emergencial, e a emergencial virou três.
 *
 * ── SOBRE O QUE ESTA TELA AFIRMA ──
 *
 * Que o plano é FACULTATIVO, porque o art. 12, VII diz "poderão elaborar". Há
 * doutrina defendendo a obrigatoriedade pelo princípio do planejamento, e
 * doutrina em disputa não vira afirmação de tela. O que é obrigatório, e a tela
 * diz, é divulgar o plano depois de feito.
 *
 * Nenhum item é inventado: cada um nasce de um contrato com data ou de uma
 * compra que já se repetiu, e carrega a origem junto para o gestor conferir e
 * cortar. Plano com item que ninguém reconhece é plano que ninguém usa.
 */

const ROTULO_ORIGEM = {
  contrato_vencendo: "Contrato vencendo",
  compra_recorrente: "Compra que se repete",
  dispensas_agrupadas: "Dispensas a agrupar",
} as const;

const moeda = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const dataCurta = (iso: string) => iso.split("-").reverse().join("/");

function Item({ item }: { item: ItemPca }) {
  return (
    <li className="border border-border rounded-lg px-4 py-3.5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="font-semibold text-sm">{item.objeto}</p>
        <span className="text-xs text-muted shrink-0">{ROTULO_ORIGEM[item.origem]}</span>
      </div>

      <p className="text-sm text-muted mt-1.5 leading-relaxed">{item.justificativa}</p>

      <div className="flex flex-wrap gap-x-5 gap-y-1 mt-2 text-sm">
        {item.valorReferencia !== null ? (
          <span>
            <strong className="tabular-nums">{moeda(item.valorReferencia)}</strong>{" "}
            <span className="text-muted text-xs">de referência</span>
          </span>
        ) : (
          <span className="text-muted text-xs">Sem valor de referência</span>
        )}
        {item.comecarAte && (
          <span>
            começar até{" "}
            <strong className="tabular-nums">{dataCurta(item.comecarAte)}</strong>
          </span>
        )}
        {item.precisaEstarPronta && (
          <span className="text-muted">
            pronto em <span className="tabular-nums">{dataCurta(item.precisaEstarPronta)}</span>
          </span>
        )}
      </div>

      <p className="text-xs text-muted mt-1.5">{item.fundamentoDoValor}</p>
    </li>
  );
}

export default function PainelPca({
  plano,
  exercicioDeReferencia,
  baseDeContratos,
  baseDeProcessos,
}: {
  plano: Plano;
  exercicioDeReferencia: number;
  baseDeContratos: number;
  baseDeProcessos: number;
}) {
  const comData = plano.itens.filter((i) => i.precisaEstarPronta !== null);
  const sugestoes = plano.itens.filter((i) => i.precisaEstarPronta === null);

  return (
    <section className="bg-card border border-border arco-card p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-xl">
          <h2 className="font-serif text-lg font-bold">Plano de contratações {plano.ano}</h2>
          <p className="text-sm text-muted mt-1.5 leading-relaxed">
            Fracionamento quase nunca é má-fé: é calendário. O contrato vence, ninguém planejou a
            substituição, o serviço não pode parar, e entra a dispensa emergencial. Este rascunho
            sai do que já está no cadastro — contratos com data de fim, compras que se repetem e
            dispensas do mesmo ramo que somadas passaram do limite em {exercicioDeReferencia}.
          </p>
        </div>
        {plano.itens.length > 0 && (
          <a
            href={`/api/licitacoes/pca?ano=${plano.ano}`}
            className="group shrink-0 flex items-center gap-2 border border-border rounded-full px-4 py-2 text-sm font-semibold hover:border-brand hover:text-brand transition"
          >
            <IconDownload className="w-4 h-4 transition-transform duration-200 group-hover:translate-y-0.5" />
            Baixar em CSV
          </a>
        )}
      </div>

      {plano.itens.length === 0 ? (
        <p className="text-sm text-muted mt-5 leading-relaxed">
          Ainda não há histórico para montar um rascunho. O plano nasce de contratos com data de
          fim e de compras que já se repetiram — importe os processos e os contratos do PNCP e esta
          seção se preenche sozinha.
        </p>
      ) : (
        <>
          <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2 mt-5 pb-4 border-b border-border">
            <span className="text-sm">
              <strong className="tabular-nums">{plano.itens.length}</strong>{" "}
              {plano.itens.length === 1 ? "item" : "itens"}
            </span>
            <span className="text-sm">
              <strong className="tabular-nums">{moeda(plano.totalReferencia)}</strong>{" "}
              <span className="text-muted">de referência</span>
            </span>
            {plano.semValor > 0 && (
              <span className="text-sm text-muted">
                {plano.semValor} sem valor conhecido — o total acima não os inclui
              </span>
            )}
          </div>

          {comData.length > 0 && (
            <div className="mt-4">
              <h3 className="font-semibold text-sm text-muted uppercase tracking-wide mb-2.5">
                Com data definida
              </h3>
              <ul className="flex flex-col gap-3">
                {comData.map((i) => (
                  <Item key={i.chave} item={i} />
                ))}
              </ul>
            </div>
          )}

          {sugestoes.length > 0 && (
            <div className="mt-5">
              <h3 className="font-semibold text-sm text-muted uppercase tracking-wide mb-1">
                Sugestões, para confirmar ou riscar
              </h3>
              <p className="text-xs text-muted mb-2.5 leading-relaxed">
                Estas não têm data: saem de compras que aconteceram em mais de um exercício. Se a
                necessidade continuar, entram no plano; se não, são para tirar daqui.
              </p>
              <ul className="flex flex-col gap-3">
                {sugestoes.map((i) => (
                  <Item key={i.chave} item={i} />
                ))}
              </ul>
            </div>
          )}
        </>
      )}

      <p className="text-xs text-muted mt-5 pt-4 border-t border-border leading-relaxed">
        O {BASE_LEGAL_PCA} diz que os órgãos <strong>poderão</strong> elaborar plano de contratações
        anual — no texto literal é faculdade, ainda que parte da doutrina defenda a
        obrigatoriedade pelo princípio do planejamento. {PUBLICIDADE_PCA} As datas de
        &ldquo;começar até&rdquo; recuam apenas o prazo legal do edital (art. 55); o tempo do
        processo interno — termo de referência, pesquisa de preços, parecer jurídico — a lei não
        fixa, e esta tela não inventa. São o último instante possível, não uma data confortável.
        Base do rascunho: {baseDeContratos} contratos e {baseDeProcessos} processos no cadastro.
      </p>
    </section>
  );
}
