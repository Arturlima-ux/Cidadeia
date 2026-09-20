import Link from "next/link";
import { caminhoDoRaioX } from "@/lib/slug-municipio";
import { procurarMunicipioLocal } from "@/lib/municipios";

// ── O PORTAL MÍNIMO ──
//
// O que o endereço público mostra quando a prefeitura ainda não contratou
// o módulo Essencial: quem é a prefeitura, como falar com ela, e o que o
// Tesouro Nacional já publicou sobre o município. Tudo isso já é público;
// nada aqui foi digitado pela prefeitura. Não há formulário, porque não há
// protocolo nem ouvidoria por trás — e prometer canal que não responde é
// pior do que não ter canal.
//
// Para o cidadão, é uma página útil. Para a prefeitura, é o endereço que
// ela já tem — e que ganha protocolo, ouvidoria e publicações com o
// Essencial. A venda acontece no painel, não aqui.

export default function PortalMinimo({
  portal,
}: {
  portal: { nome: string; municipio: string; estado: string; prefeito: string | null; whatsappNumero: string | null };
}) {
  const local = procurarMunicipioLocal(portal.municipio, portal.estado);
  const raioX = local.ok ? caminhoDoRaioX({ uf: portal.estado, nome: local.municipio.nome }) : null;
  const populacao = local.ok ? local.municipio.populacao : null;

  return (
    <div className="tema-noite min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="max-w-5xl mx-auto px-4 sm:px-8 py-6">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-dark">Portal do município</p>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold mt-2">{portal.nome}</h1>
          <p className="text-muted text-sm mt-1.5">
            {portal.municipio} / {portal.estado}
            {portal.prefeito ? ` · Prefeito(a): ${portal.prefeito}` : ""}
            {populacao ? ` · ${new Intl.NumberFormat("pt-BR").format(populacao)} habitantes (IBGE)` : ""}
          </p>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-8 py-10 space-y-10">
        <section>
          <h2 className="font-serif text-2xl font-bold mb-1">Fale com a prefeitura</h2>
          <p className="text-sm text-muted mb-5 max-w-2xl leading-relaxed">
            Atendimento presencial na sede da prefeitura, em dias úteis.
            {portal.whatsappNumero ? " Ou pelo WhatsApp:" : ""}
          </p>
          {portal.whatsappNumero && (
            <a
              href={`https://wa.me/${portal.whatsappNumero}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block bg-brand hover:bg-brand-dark text-white font-semibold text-sm rounded-xl px-5 py-3 transition"
            >
              Falar pelo WhatsApp →
            </a>
          )}
        </section>

        <section>
          <h2 className="font-serif text-2xl font-bold mb-1">O que o município já publicou</h2>
          <p className="text-sm text-muted mb-5 max-w-2xl leading-relaxed">
            Receita, aplicação em saúde e educação e os relatórios obrigatórios que constam no Tesouro
            Nacional — dado público, enviado pela própria prefeitura ao SICONFI.
          </p>
          {raioX ? (
            <Link
              href={raioX}
              className="inline-block border border-border hover:border-brand font-semibold text-sm rounded-xl px-5 py-3 transition"
            >
              Ver o Raio-X de {portal.municipio} →
            </Link>
          ) : (
            <p className="text-sm text-muted">Consulta indisponível para este município.</p>
          )}
        </section>

        <section className="rounded-2xl border border-border bg-card p-6 max-w-2xl">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">Lei de Acesso à Informação</p>
          <p className="text-sm text-muted mt-2 leading-relaxed">
            Todo cidadão pode pedir informação a qualquer órgão público (Lei 12.527/2011, art. 10), e o
            órgão tem 20 dias para responder. O pedido pode ser feito no atendimento presencial da
            prefeitura ou pelos canais que ela divulgar.
          </p>
        </section>
      </main>

      <footer className="border-t border-border mt-8">
        <div className="max-w-5xl mx-auto px-4 sm:px-8 py-6 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-muted">Página pública da {portal.nome}</p>
          <Link href="/" className="text-xs font-semibold text-brand hover:underline">
            Feito com CidadeIA
          </Link>
        </div>
      </footer>
    </div>
  );
}
