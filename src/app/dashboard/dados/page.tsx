import { contextoDashboard } from "@/lib/contexto-dashboard";
import { contarLinhas } from "@/lib/dados-exportacao";
import { TABELAS_EXPORTAVEIS, TABELAS_NAO_EXPORTADAS } from "@/lib/exportacao";
import { IconDownload } from "@/components/icons";

export default async function MeusDadosPage() {
  const ctx = await contextoDashboard();

  if (ctx.sessao.cargo === "secretario") {
    return (
      <div className="max-w-lg mt-12 text-center border border-dashed border-border rounded-2xl p-8 mx-auto">
        <p className="text-sm text-muted">
          A exportação inclui o município inteiro — financeiro geral e usuários —
          então só o prefeito ou um administrador pode baixá-la.
        </p>
      </div>
    );
  }

  const contagens = await contarLinhas(ctx.sessao.prefeituraId);
  const total = Object.values(contagens).reduce((soma, n) => soma + n, 0);

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h1 className="font-serif text-2xl font-bold">Meus dados</h1>
        <p className="text-muted text-sm mt-1.5 leading-relaxed">
          Os dados cadastrados aqui são do município. Baixe todos, a qualquer
          momento, em formato aberto — sem pedir autorização e sem custo.
        </p>
      </div>

      {/* Exportação completa */}
      <div
        className="rounded-2xl p-6 text-white"
        style={{ background: "var(--gradient-hero)" }}
      >
        <div className="flex items-start justify-between gap-6 flex-wrap">
          <div className="min-w-0">
            <h2 className="font-serif text-xl font-bold">Exportação completa</h2>
            <p className="text-white/85 text-sm mt-2 leading-relaxed max-w-md">
              Um arquivo JSON com as {TABELAS_EXPORTAVEIS.length} tabelas do
              município — {total.toLocaleString("pt-BR")}{" "}
              {total === 1 ? "registro" : "registros"} no total. É o formato que
              outro sistema consegue ler para importar.
            </p>
          </div>
          <a
            href="/api/exportacao?formato=json"
            className="shrink-0 inline-flex items-center gap-2 bg-white text-brand font-semibold text-sm rounded-full px-5 py-2.5 hover:opacity-90 transition"
          >
            <IconDownload className="w-4 h-4" />
            Baixar tudo (JSON)
          </a>
        </div>
      </div>

      {/* Por tabela, em CSV */}
      <div className="bg-card border border-border rounded-2xl p-5">
        <h2 className="font-semibold text-sm mb-1">Tabela por tabela (CSV)</h2>
        <p className="text-xs text-muted mb-4 leading-relaxed">
          Para abrir direto no Excel ou no LibreOffice. Cada arquivo já sai com
          acentuação correta.
        </p>

        <div className="divide-y divide-border border-t border-border">
          {TABELAS_EXPORTAVEIS.map((t) => {
            const linhas = contagens[t.chave] ?? 0;
            const vazia = linhas === 0;
            return (
              <div
                key={t.chave}
                className="flex items-center justify-between gap-4 py-3"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-sm">{t.rotulo}</p>
                    <span className="text-xs text-muted tabular-nums">
                      {linhas.toLocaleString("pt-BR")}{" "}
                      {linhas === 1 ? "registro" : "registros"}
                    </span>
                  </div>
                  <p className="text-xs text-muted mt-1 leading-relaxed">
                    {t.descricao}
                  </p>
                  {t.camposRemovidos.length > 0 && (
                    <p className="text-xs mt-1" style={{ color: "var(--medio)" }}>
                      Não sai no arquivo: {t.camposRemovidos.join(", ")}
                    </p>
                  )}
                </div>

                {vazia ? (
                  <span className="shrink-0 text-xs text-muted">Sem dados</span>
                ) : (
                  <a
                    href={`/api/exportacao?formato=csv&tabela=${t.chave}`}
                    className="shrink-0 inline-flex items-center gap-1.5 border border-border rounded-full px-3.5 py-1.5 text-xs font-semibold hover:border-brand hover:text-brand transition"
                  >
                    <IconDownload className="w-3.5 h-3.5" />
                    CSV
                  </a>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* O que não sai, e por quê */}
      <div className="border border-dashed border-border rounded-2xl p-5">
        <h2 className="font-semibold text-sm mb-1">O que fica de fora</h2>
        <p className="text-xs text-muted mb-3 leading-relaxed">
          Nada disso é informação que a prefeitura produziu — é mecanismo interno
          do sistema.
        </p>
        <ul className="space-y-1.5">
          {TABELAS_NAO_EXPORTADAS.map((t) => (
            <li key={t.nome} className="text-xs text-muted leading-relaxed">
              <span className="font-medium text-foreground">{t.nome}</span> —{" "}
              {t.motivo}
            </li>
          ))}
        </ul>
        <p className="text-xs text-muted mt-3 leading-relaxed">
          Manifestações anônimas da ouvidoria saem sem identificação, como manda
          a Lei 13.460/2017 — nem para a própria prefeitura o anonimato é
          desfeito na exportação.
        </p>
      </div>
    </div>
  );
}
