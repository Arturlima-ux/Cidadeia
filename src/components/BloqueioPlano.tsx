import Link from "next/link";
import { NOME_PLANO_ADDON, PLANOS_ADDON, type PlanoAddon } from "@/lib/planos";
import { lerSessao, ehGestor } from "@/lib/sessao";

/**
 * Recebe só a chave do plano — antes cada página precisava fazer
 * `PLANOS_ADDON.find(p => p.chave === "gestao")!.descricao` na mão, o que
 * repetia a busca (e o `!`) em 6 lugares.
 *
 * ── O BECO SEM SAÍDA QUE ISTO FECHA ──
 *
 * O botão mandava todo mundo para /dashboard/modulos, e lá só entra prefeito
 * ou administrador. Um secretário que clicasse num módulo não contratado batia
 * numa parede e, ao seguir o único caminho oferecido, batia na segunda — sem
 * nenhuma indicação do que fazer. Quem decide contratação em prefeitura não é
 * ele, e a tela precisa dizer isso em vez de fingir que é.
 *
 * A sessão é lida aqui dentro, e não recebida por propriedade, porque o
 * componente aparece em mais de vinte telas: passar a mesma informação vinte
 * vezes garante que uma delas esqueça.
 */
export default async function BloqueioPlano({ plano, nota }: { plano: PlanoAddon; nota?: React.ReactNode }) {
  const descricao = PLANOS_ADDON.find((p) => p.chave === plano)?.descricao ?? "";
  const sessao = await lerSessao();
  const podeContratar = sessao ? ehGestor(sessao) : false;

  return (
    <div className="max-w-lg mx-auto mt-12 text-center arco-card border border-dashed border-border p-8">
      <div
        className="arco-badge w-11 h-11 text-white flex items-center justify-center mx-auto mb-5"
        style={{ background: "var(--gradient-hero)" }}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.75}
          strokeLinecap="round"
          className="w-5 h-5"
        >
          <rect x="5" y="11" width="14" height="9" rx="2" />
          <path d="M8 11V7.5a4 4 0 0 1 8 0V11" />
        </svg>
      </div>
      <h1 className="text-xl font-semibold mb-2 tracking-[-0.02em]">
        Módulo {NOME_PLANO_ADDON[plano]} não contratado
      </h1>
      <p className="text-sm text-muted leading-relaxed">{descricao}</p>
      {nota && <p className="text-sm text-muted leading-relaxed mt-3">{nota}</p>}

      {podeContratar ? (
        <Link
          href="/dashboard/modulos/marketplace"
          className="group inline-flex items-center gap-1.5 mt-6 bg-brand hover:bg-brand-dark text-white font-semibold text-sm rounded-full px-5 py-2.5 transition"
        >
          Ver como contratar
          <span className="inline-block transition-transform duration-200 group-hover:translate-x-1">
            →
          </span>
        </Link>
      ) : (
        // Sem botão: não há para onde mandar quem não decide. O que serve a
        // ele é saber de quem é a decisão — e poder dizer o nome do módulo
        // para essa pessoa.
        <p className="text-sm text-muted leading-relaxed mt-6 pt-5 border-t border-border">
          A contratação de módulos é feita pelo prefeito ou por um administrador da conta. Se este
          módulo resolveria algo na sua secretaria, vale levar o pedido a essa pessoa pelo nome:{" "}
          <strong className="text-ink">{NOME_PLANO_ADDON[plano]}</strong>.
        </p>
      )}
    </div>
  );
}
