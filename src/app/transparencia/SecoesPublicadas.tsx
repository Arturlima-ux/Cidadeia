import { montarSecoes, type Publicacao } from "@/lib/publicacoes";

/**
 * O lado do cidadão das publicações da prefeitura.
 *
 * Mesmo dado que o painel do gestor edita, renderizado somente para leitura —
 * não há botão, formulário nem ação nenhuma aqui. É a diferença que o produto
 * promete: quem governa publica, quem mora confere.
 */
export default function SecoesPublicadas({ publicacoes }: { publicacoes: Publicacao[] }) {
  const secoes = montarSecoes(publicacoes);
  if (secoes.length === 0) return null;

  return (
    <>
      {secoes.map((secao) => (
        <section key={secao.tipo} className="mb-12">
          <h2 className="font-serif text-2xl font-bold mb-1">{secao.titulo}</h2>
          {secao.lei && (
            <p className="text-xs font-mono text-muted mb-5">
              Publicação exigida por {secao.lei}, {secao.artigo}
            </p>
          )}

          <div className="flex flex-col gap-3">
            {secao.itens.map((item) => (
              <article
                key={item.id}
                className="bg-card border border-border rounded-xl p-5"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <h3 className="font-semibold">{item.titulo}</h3>
                  {item.secretaria && (
                    <span className="text-xs text-muted">{item.secretaria}</span>
                  )}
                </div>

                {/* whitespace-pre-line preserva a quebra de linha que o gestor
                    digitou. Sem isso, uma lista de documentos vira parágrafo
                    corrido e o cidadão não consegue ler. */}
                <p className="text-sm text-muted mt-2 leading-relaxed whitespace-pre-line">
                  {item.conteudo}
                </p>

                {(item.requisitos || item.prazo || item.contato) && (
                  <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-3 mt-4 pt-4 border-t border-border text-sm">
                    {item.requisitos && (
                      <div className="sm:col-span-2">
                        <dt className="text-xs font-semibold uppercase tracking-wide text-muted">
                          {secao.tipo === "servico" ? "O que levar" : "Endereço"}
                        </dt>
                        <dd className="mt-1 leading-relaxed whitespace-pre-line">
                          {item.requisitos}
                        </dd>
                      </div>
                    )}
                    {item.prazo && (
                      <div>
                        <dt className="text-xs font-semibold uppercase tracking-wide text-muted">
                          {secao.tipo === "servico" ? "Prazo" : "Horário"}
                        </dt>
                        <dd className="mt-1">{item.prazo}</dd>
                      </div>
                    )}
                    {item.contato && (
                      <div>
                        <dt className="text-xs font-semibold uppercase tracking-wide text-muted">
                          {secao.tipo === "servico" ? "Onde solicitar" : "Contato"}
                        </dt>
                        <dd className="mt-1 break-words">{item.contato}</dd>
                      </div>
                    )}
                  </dl>
                )}

                {item.linkExterno && (
                  <a
                    href={item.linkExterno}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block text-sm font-semibold text-brand hover:underline mt-4"
                  >
                    Abrir documento →
                  </a>
                )}
              </article>
            ))}
          </div>
        </section>
      ))}
    </>
  );
}
