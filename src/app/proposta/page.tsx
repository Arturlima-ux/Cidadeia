import Link from "next/link";
import SiteHeader from "@/components/site/SiteHeader";
import SiteFooter from "@/components/site/SiteFooter";
import Reveal from "@/components/site/Reveal";
import Olho from "@/components/site/Olho";
import MontadorProposta from "@/components/site/MontadorProposta";
import FormularioProposta from "./FormularioProposta";
import { buscarMunicipioPorCodigo, ehCodigoIbge } from "@/lib/populacao-ibge";
import { porteDaPopulacao, PORTES } from "@/lib/precos";
import { PLANOS_ADDON, type PlanoAddon } from "@/lib/planos";
import { IconCheck } from "@/components/icons";

export const metadata = {
  title: "Pedir proposta",
  description:
    "Peça a proposta e o termo de referência para o seu município: porte pela população do IBGE, módulos escolhidos, valor anual e o caminho de contratação.",
};

// ── A PÁGINA DO CLIENTE PEDINDO A PROPOSTA DELE ──
//
// "Receber esta proposta" levava à tela de suporte — "Precisa de ajuda?" —
// com um endereço de e-mail. Não é ajuda: é o cliente pedindo a proposta
// dele. Esta página existe para isso e para mais nada.
//
// Com código IBGE na URL, mostra o resumo do que foi montado e o
// formulário. Sem código, mostra o simulador — é ele que produz o código.
// O porte é resolvido AQUI, no servidor, contra a tabela: não existe
// parâmetro que o declare.

export default async function PropostaPage({
  searchParams,
}: {
  searchParams: Promise<{ [chave: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const texto = (v: string | string[] | undefined) => (typeof v === "string" ? v : null);
  const codigo = texto(params.ibge);
  const municipio = ehCodigoIbge(codigo) ? await buscarMunicipioPorCodigo(codigo) : null;
  const modulos = (texto(params.modulos) ?? "")
    .split(",")
    .filter((m): m is PlanoAddon => PLANOS_ADDON.some((p) => p.chave === m));

  if (!municipio) {
    return (
      <div className="tema-noite min-h-screen">
        <SiteHeader />
        <main>
          <Reveal>
            <section className="max-w-5xl mx-auto px-4 sm:px-8 pt-14 sm:pt-20 pb-16">
              <div className="text-center mb-8">
                <Olho centrado>Proposta</Olho>
                <h1 className="font-serif text-3xl sm:text-4xl font-bold mt-4">Monte a sua proposta</h1>
                <p className="text-muted mt-3 leading-relaxed max-w-lg mx-auto">
                  Informe o município e marque os módulos. O porte sai da população do IBGE
                  — não é uma escolha — e o pedido segue na tela seguinte.
                </p>
              </div>
              <MontadorProposta modulosIniciais={modulos.length > 0 ? modulos : undefined} />
            </section>
          </Reveal>
        </main>
        <SiteFooter />
      </div>
    );
  }

  const porte = porteDaPopulacao(municipio.populacao);
  const rotuloPorte = PORTES.find((p) => p.chave === porte);

  return (
    <div className="tema-noite min-h-screen">
      <SiteHeader />
      <main>
        <section className="max-w-5xl mx-auto px-4 sm:px-8 pt-14 sm:pt-20 pb-16">
          <Reveal>
            <div className="max-w-2xl mb-10">
              <Olho>Proposta</Olho>
              <h1 className="font-serif text-3xl sm:text-4xl font-bold mt-4">
                Proposta para {municipio.nome}/{municipio.uf}
              </h1>
              <p className="text-muted mt-3 leading-relaxed">
                Confira o que você montou, diga para quem enviar, e a proposta vai com o
                termo de referência pronto para o jurídico conferir.
              </p>
            </div>
          </Reveal>

          <div className="grid lg:grid-cols-[1fr_1.1fr] gap-8 items-start">
            {/* ── o que foi montado ── */}
            <Reveal>
              <div
                className="rounded-2xl p-6 sm:p-7 text-white flex flex-col gap-4"
                style={{ background: "var(--brand-profundo)" }}
              >
                <h2 className="font-serif font-bold text-base">O que você montou</h2>

                <div className="rounded-xl border border-white/20 bg-white/[0.06] p-4">
                  <p className="text-xs text-white/60">Município</p>
                  <p className="font-semibold mt-0.5">
                    {municipio.nome}/{municipio.uf}
                  </p>
                  <p className="text-xs text-white/70 mt-1">
                    {new Intl.NumberFormat("pt-BR").format(municipio.populacao)} habitantes (IBGE) →
                    porte <strong className="text-white">{rotuloPorte?.rotulo} habitantes</strong>
                  </p>
                </div>

                {modulos.length === 0 ? (
                  <p className="text-sm text-white/70 leading-relaxed">
                    Nenhum módulo marcado. A proposta vai com os seis para você escolher —
                    ou{" "}
                    <Link href="/solucoes" className="underline hover:no-underline">
                      volte e marque os que interessam
                    </Link>
                    .
                  </p>
                ) : (
                  <ul className="flex flex-col gap-2 text-sm text-white/80">
                    {PLANOS_ADDON.filter((p) => modulos.includes(p.chave)).map((p) => (
                      <li key={p.chave} className="flex items-center gap-2">
                        <IconCheck className="w-3.5 h-3.5 shrink-0" strokeWidth={3} style={{ color: "var(--accent)" }} />
                        {p.nome}
                      </li>
                    ))}
                  </ul>
                )}

                <div className="h-px bg-white/15" />

                {/* Sem valor aqui: a tabela é interna. O que a pessoa recebe é
                    a proposta, por módulo e pela faixa do município. */}
                <p className="text-xs text-white/70 leading-relaxed">
                  O valor vem na proposta, por módulo e pela faixa de{" "}
                  {rotuloPorte?.rotulo} habitantes, com o termo de referência pronto para o
                  jurídico — em até um dia útil.
                </p>

                <Link
                  href={`/precos`}
                  className="text-xs font-semibold text-white/70 hover:text-white transition mt-1"
                >
                  ← Alterar município ou módulos
                </Link>
              </div>
            </Reveal>

            {/* ── quem pede ── */}
            <Reveal delay={120}>
              <FormularioProposta codigoIbge={municipio.codigo} modulos={modulos} />
            </Reveal>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
