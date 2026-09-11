import { Suspense } from "react";
import Link from "next/link";
import SiteHeader from "@/components/site/SiteHeader";
import SiteFooter from "@/components/site/SiteFooter";
import Reveal from "@/components/site/Reveal";
import ContatoEmail from "@/components/site/ContatoEmail";
import { IconIA } from "@/components/icons";
import { PORTES } from "@/lib/precos";
import { PLANOS_ADDON, type PlanoAddon } from "@/lib/planos";

export const metadata = {
  title: "Suporte — CidadeIA",
};

export default async function SuportePage({
  searchParams,
}: {
  searchParams: Promise<{ [chave: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const texto = (v: string | string[] | undefined) => (typeof v === "string" ? v : null);

  // Porte e módulos vêm do simulador pela URL. Só entram se existirem na
  // tabela — o resto é ignorado, não interpolado. Um link forjado com texto
  // livre aqui viraria um e-mail "do CidadeIA" com o conteúdo que o
  // atacante quisesse.
  const porteBruto = texto(params.porte);
  const porte = PORTES.find((p) => p.chave === porteBruto)?.chave ?? null;
  const modulosValidos = (texto(params.modulos) ?? "")
    .split(",")
    .filter((m): m is PlanoAddon => PLANOS_ADDON.some((p) => p.chave === m));
  const proposta = porte ? { porte, modulos: modulosValidos } : null;

  return (
    <div className="tema-noite min-h-screen">
      <SiteHeader />

      <Reveal>
        <section className="max-w-xl mx-auto px-4 sm:px-8 pt-16 pb-20 text-center">
          <div
            className="w-14 h-14 rounded-2xl text-white flex items-center justify-center mx-auto mb-6 animate-float"
            style={{ background: "var(--gradient-hero)" }}
          >
            <IconIA className="w-6 h-6" />
          </div>
          <h1 className="font-serif text-4xl font-bold">Precisa de ajuda?</h1>
          <p className="text-muted text-base mt-4 leading-relaxed">
            Manda sua dúvida, problema ou pedido de proposta que a gente responde o
            quanto antes.
          </p>

          <div className="bg-card border border-border rounded-2xl p-6 mt-8 text-left space-y-4">
            <Suspense fallback={null}>
              <ContatoEmail modulo={texto(params.modulo)} chave={texto(params.assunto)} proposta={proposta} />
            </Suspense>
            <div className="border-t border-border pt-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted mb-1">
                Antes de escrever
              </p>
              <p className="text-sm text-muted leading-relaxed">
                Dá uma olhada nas{" "}
                <Link href="/faq" className="text-brand hover:underline font-semibold">
                  perguntas frequentes
                </Link>{" "}
                — talvez sua dúvida já esteja respondida ali.
              </p>
            </div>
          </div>

          <p className="text-xs text-muted mt-6">
            Problema de acesso à sua conta? Descreva o que aconteceu e o CPF/CNPJ da
            conta, pra agilizar o atendimento.
          </p>
        </section>
      </Reveal>

      <SiteFooter />
    </div>
  );
}
