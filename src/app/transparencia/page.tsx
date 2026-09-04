import Link from "next/link";
import { listarPortaisPublicados } from "@/lib/portais";
import SiteHeader from "@/components/site/SiteHeader";
import SiteFooter from "@/components/site/SiteFooter";
import { IconVisaoGeral } from "@/components/icons";
import { DIREITOS_CIDADAO } from "@/lib/direitos-cidadao";

// Esta página existia como link em toda parte — no topo utilitário de todas
// as páginas públicas ("Portal do cidadão") e na seção de prova da home
// ("Abrir um portal publicado") — mas o arquivo nunca foi escrito, e o
// endereço respondia 404. O argumento inteiro do site é "não peça fé, abra e
// confira": um 404 aqui derruba justamente esse argumento.
//
// O acesso ao banco é em tempo de requisição de propósito. Prerenderizar
// exigiria banco disponível durante o build, e uma indisponibilidade
// momentânea quebraria o deploy de uma página que só lista portais.
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Portais da transparência — CidadeIA",
  description:
    "Os portais de transparência publicados no CidadeIA. Abrem sem cadastro e sem login.",
};

export default async function IndicePortais() {
  const { portais, falhou } = await listarPortaisPublicados();

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <section className="max-w-4xl mx-auto px-4 sm:px-8 pt-14 pb-10">
        <h1 className="font-serif text-4xl sm:text-[3rem] leading-[1.02] font-extrabold tracking-[-0.04em]">
          Portais da transparência
        </h1>
        <p className="text-muted text-base leading-relaxed mt-5 max-w-[56ch]">
          Os municípios com portal publicado no CidadeIA. Todos abrem sem
          cadastro e sem login — receita, despesa, obras, licitações, protocolo
          e ouvidoria.
        </p>
      </section>

      {/* ── O QUE É SEU POR DIREITO ──
          Este bloco vinha da home, onde ocupava uma seção inteira no meio do
          funil comercial. O morador que chegava até ele já tinha atravessado
          hero de risco fiscal, módulos, tabela comparativa e calculadora de
          preço — conteúdo escrito para quem assina contrato, não para quem
          quer consultar um protocolo.

          Aqui ele está no lugar certo: é a página que o morador de fato abre,
          e o texto explica o que ele pode fazer ANTES da lista de municípios.
          A lei fica ao lado de cada item de propósito — para o prefeito é
          conformidade a cumprir, para o cidadão é direito que já tem. Mesmo
          artigo, leitura oposta. */}
      <section className="max-w-4xl mx-auto px-4 sm:px-8 pb-16">
        <div className="flex flex-col gap-3">
          {DIREITOS_CIDADAO.map((d) => {
            const Icone = d.icone;
            return (
              <div
                key={d.titulo}
                className="flex gap-4 rounded-2xl border border-border p-5 sm:p-6"
                style={{ background: "var(--card)" }}
              >
                <span
                  className="w-11 h-11 arco-card-sm flex items-center justify-center shrink-0"
                  style={{ background: "var(--brand-tint)", color: "var(--brand-claro)" }}
                >
                  <Icone className="w-5 h-5" />
                </span>
                <div className="min-w-0">
                  <h2 className="font-semibold leading-snug">{d.titulo}</h2>
                  <p className="text-sm text-muted mt-1.5 leading-relaxed">{d.texto}</p>
                  <p className="text-xs font-mono text-muted mt-2.5">{d.lei}</p>
                </div>
              </div>
            );
          })}
        </div>

        <p className="text-xs text-muted mt-5">
          Sem cadastro · sem login · sem instalar aplicativo
        </p>
      </section>

      <section className="max-w-4xl mx-auto px-4 sm:px-8 pb-20">
        {portais.length > 0 ? (
          <>
            <p className="text-xs font-mono uppercase tracking-wider text-muted mb-4">
              {portais.length} {portais.length === 1 ? "portal no ar" : "portais no ar"}
            </p>
            <ul className="grid sm:grid-cols-2 gap-3">
              {portais.map((p) => (
                <li key={p.slug}>
                  <Link
                    href={`/transparencia/${p.slug}`}
                    className="h-full flex items-center gap-4 bg-card border border-border rounded-2xl p-5 card-interactive hover:border-brand transition"
                  >
                    <span
                      className="w-11 h-11 arco-card-sm flex items-center justify-center shrink-0"
                      style={{ background: "var(--brand-tint)", color: "var(--brand)" }}
                    >
                      <IconVisaoGeral className="w-5 h-5" />
                    </span>
                    <span className="min-w-0">
                      <span className="block font-semibold">
                        {p.municipio} <span className="text-muted font-normal">· {p.estado}</span>
                      </span>
                      <span className="block text-xs text-muted mt-0.5 truncate">{p.nome}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <div className="bg-card border border-border rounded-2xl p-7 sm:p-9">
            <h2 className="font-serif text-xl font-bold">
              {falhou ? "Não foi possível carregar a lista agora" : "Nenhum portal publicado ainda"}
            </h2>
            <p className="text-muted text-sm leading-relaxed mt-3 max-w-[54ch]">
              {falhou
                ? "Se você já tem o endereço do portal do seu município, ele continua respondendo direto — esta página só monta a lista."
                : "Assim que uma prefeitura ativa o portal, o endereço público dela passa a responder e aparece aqui."}
            </p>
            {/* O botão CHEIO daqui dizia "Conhecer o CidadeIA" e levava para a
                home. Um morador que veio procurar o portal da cidade dele
                recebia, com o maior destaque da tela, um convite para a página
                de vendas — o funil comercial tomando conta da única página que
                não é dele.

                Agora a ação principal é a que serve a quem está aqui: o Raio-X
                responde sobre qualquer município do país, com dado federal
                público, mesmo sem portal publicado. Os caminhos comerciais
                continuam, rebaixados, para o servidor que caiu nesta página. */}
            <div className="flex flex-wrap gap-3 mt-6">
              <Link
                href="/raio-x"
                className="bg-brand hover:bg-brand-dark text-white font-bold text-sm rounded-xl px-5 py-3 transition shadow-elevated"
              >
                Ver o Raio-X da minha cidade
              </Link>
              <Link
                href="/"
                className="border border-border font-semibold text-sm rounded-xl px-5 py-3 transition hover:bg-superficie"
              >
                Conhecer o CidadeIA
              </Link>
            </div>
          </div>
        )}

        <p className="text-xs text-muted leading-relaxed mt-8 max-w-[60ch]">
          É servidor de uma prefeitura e quer publicar o portal do seu
          município?{" "}
          <Link href="/#proposta" className="text-brand font-semibold hover:underline">
            Veja o valor
          </Link>{" "}
          ou{" "}
          <Link href="/diagnostico" className="text-brand font-semibold hover:underline">
            faça o diagnóstico de conformidade
          </Link>
          .
        </p>
      </section>

      <SiteFooter />
    </div>
  );
}
