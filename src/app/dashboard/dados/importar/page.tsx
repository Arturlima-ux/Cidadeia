import Link from "next/link";
import { contextoDashboard } from "@/lib/contexto-dashboard";
import { TABELAS_IMPORTAVEIS } from "@/lib/importacao";
import FormularioImportacao from "./FormularioImportacao";

export const metadata = {
  title: "Importar dados — CidadeIA",
};

export default async function ImportarPage() {
  const ctx = await contextoDashboard();

  if (ctx.sessao.cargo === "secretario") {
    return (
      <div className="max-w-lg mt-12 text-center border border-dashed border-border rounded-2xl p-8 mx-auto">
        <p className="text-sm text-muted">
          Apenas o prefeito ou um administrador pode importar dados para a
          prefeitura.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-7">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-serif text-2xl font-bold">Importar dados</h1>
          <p className="text-muted text-sm mt-1.5 leading-relaxed max-w-xl">
            Traga o que já está no sistema atual da prefeitura. Você confere o
            resultado antes de gravar — nada entra sem a sua confirmação.
          </p>
        </div>
        <Link
          href="/dashboard/dados"
          className="shrink-0 text-xs font-semibold text-brand hover:underline"
        >
          ← Meus dados
        </Link>
      </div>

      <FormularioImportacao />

      {/* O que cada planilha precisa ter — evita a ida e volta de descobrir
          a coluna faltando só depois de enviar o arquivo. */}
      <div className="border border-dashed border-border rounded-2xl p-5">
        <h2 className="font-semibold text-sm mb-1">O que cada planilha precisa ter</h2>
        <p className="text-xs text-muted mb-4 leading-relaxed">
          O cabeçalho não precisa bater exatamente: acento, maiúscula e nomes
          parecidos são reconhecidos. Colunas a mais são ignoradas.
        </p>
        <div className="space-y-4">
          {TABELAS_IMPORTAVEIS.map((t) => (
            <div key={t.chave}>
              <p className="font-medium text-sm">{t.rotulo}</p>
              <p className="text-xs text-muted mt-1 leading-relaxed">
                {t.campos.map((c, i) => (
                  <span key={c.chave}>
                    {i > 0 && " · "}
                    <span className={c.obrigatorio ? "font-semibold text-foreground" : ""}>
                      {c.rotulo}
                    </span>
                  </span>
                ))}
              </p>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted mt-4 leading-relaxed">
          Em <span className="font-semibold text-foreground">negrito</span>, o que
          é obrigatório. O sistema antigo pode continuar rodando durante a
          transição — a importação não desliga nada.
        </p>
      </div>
    </div>
  );
}
