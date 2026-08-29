import Link from "next/link";

/**
 * 404 dentro do painel. Separado do 404 do site porque aqui o usuário já
 * está logado — mostrar o cabeçalho público com "Criar conta" seria
 * confuso. O layout do dashboard (menu lateral) continua em volta.
 */
export default function NaoEncontradaDashboard() {
  return (
    <div className="max-w-lg mx-auto mt-12 text-center arco-card border border-dashed border-border p-8">
      <p className="font-serif text-5xl font-bold text-brand tabular-nums">404</p>

      <h1 className="font-serif text-xl font-bold mt-3">
        Essa tela não existe no painel.
      </h1>

      <p className="text-sm text-muted mt-3 leading-relaxed">
        Pode ser um link antigo, ou uma área de um módulo que sua prefeitura
        ainda não contratou. Seus dados estão intactos.
      </p>

      <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/dashboard"
          className="group bg-brand hover:bg-brand-dark text-white font-semibold text-sm rounded-full px-5 py-2.5 transition inline-flex items-center gap-1.5"
        >
          Voltar ao painel
          <span className="inline-block transition-transform duration-200 group-hover:translate-x-1">
            →
          </span>
        </Link>
        <Link
          href="/dashboard/modulos"
          className="text-sm font-semibold text-foreground hover:text-brand transition border border-border rounded-full px-5 py-2.5"
        >
          Ver meus módulos
        </Link>
      </div>
    </div>
  );
}
