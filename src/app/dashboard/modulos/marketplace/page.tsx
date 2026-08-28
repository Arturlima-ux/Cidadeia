import { lerSessao } from "@/lib/sessao";
import { buscarPrefeitura } from "@/lib/dados-prefeitura";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  PLANOS_ADDON,
  planosContratadosDe,
  linkContratacao,
  HREF_PLANO_ADDON,
} from "@/lib/planos";
import AbasModulos from "../AbasModulos";

export default async function MarketplacePage() {
  const sessao = await lerSessao();
  if (!sessao) redirect("/login");
  if (sessao.cargo === "secretario") {
    return (
      <div className="max-w-lg mt-12 text-center border border-dashed border-border rounded-2xl p-8 mx-auto">
        <p className="text-sm text-muted">
          Apenas o prefeito ou um administrador pode gerenciar os módulos
          contratados.
        </p>
      </div>
    );
  }

  const prefeitura = await buscarPrefeitura(sessao.prefeituraId);
  const planosAtivos = planosContratadosDe(prefeitura?.planosContratados);

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-bold">Módulos</h1>
        <p className="text-muted text-sm mt-1.5 leading-relaxed">
          Cada área da prefeitura é um módulo independente — ative só o que
          você precisa.
        </p>
      </div>

      <AbasModulos ativa="marketplace" />

      <div className="rounded-xl border border-brand bg-brand-tint p-4 flex items-center justify-between gap-4">
        <div>
          <p className="font-semibold text-sm">Essencial</p>
          <p className="text-xs text-muted mt-1 leading-relaxed">
            Protocolo via WhatsApp + Transparência + Ouvidoria — incluso
            automaticamente pra toda prefeitura, sem custo adicional.
          </p>
        </div>
        <span className="shrink-0 text-xs font-semibold rounded-full px-2.5 py-1" style={{ color: "var(--info)", background: "var(--info-tint)" }}>
          Incluso
        </span>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {PLANOS_ADDON.map((p) => {
          const ativo = planosAtivos.includes(p.chave);
          const { url, ehExemplo } = linkContratacao(p.chave);
          return (
            <div
              key={p.chave}
              className={`rounded-xl border p-5 flex flex-col ${
                ativo ? "border-brand bg-brand-tint/40" : "border-border"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="font-semibold text-sm">{p.nome}</p>
                {ativo && (
                  <span className="shrink-0 text-xs font-semibold rounded-full px-2.5 py-1" style={{ color: "var(--info)", background: "var(--info-tint)" }}>
                    Ativo
                  </span>
                )}
              </div>
              <p className="text-xs text-muted mt-2 leading-relaxed flex-1">
                {p.descricao}
              </p>

              {ativo ? (
                <Link
                  href={HREF_PLANO_ADDON[p.chave]}
                  className="mt-4 text-center border border-border rounded-full px-4 py-2 text-sm font-semibold hover:border-brand hover:text-brand transition"
                >
                  Abrir módulo
                </Link>
              ) : (
                <>
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 text-center bg-brand hover:bg-brand-dark text-white text-sm font-semibold rounded-full px-4 py-2 transition"
                  >
                    Contratar
                  </a>
                  {ehExemplo && (
                    <p className="text-xs mt-2" style={{ color: "var(--medio)" }}>
                      ⚠ Link de exemplo — configure{" "}
                      {`CHECKOUT_URL_${p.chave.toUpperCase()}`} no .env.
                    </p>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-xs text-muted leading-relaxed">
        O botão "Contratar" abre o checkout em uma página externa. Depois do
        pagamento, a ativação do módulo nesta conta ainda é feita manualmente
        pela nossa equipe — ainda não temos integração automática (webhook)
        confirmando o pagamento em tempo real.
      </p>
    </div>
  );
}
