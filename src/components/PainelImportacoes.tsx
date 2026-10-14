import { planosContratadosDe } from "@/lib/planos";
import { FONTES, dataDoBanco, ultimasImportacoes } from "@/lib/importacao-automatica";

// ── O QUE ENTRA SOZINHO, E QUANDO ENTROU ──
// A rotina da madrugada importa toda semana o que é público (ver
// lib/importacao-automatica.ts). Esta lista mostra, fonte por fonte, a última
// vez que deu certo e o que veio; quando falha, o motivo, com as palavras do
// próprio portal. Sem isso, "entra sozinho" seria uma promessa que ninguém
// consegue conferir.

const dataCurta = (t: string) =>
  dataDoBanco(t).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "America/Sao_Paulo" });

export default async function PainelImportacoes({ prefeituraId, planosRaw }: { prefeituraId: string; planosRaw: string | null }) {
  const planos = planosContratadosDe(planosRaw);
  const fontes = FONTES.filter((f) => f.planos.some((p) => planos.includes(p)));
  if (!fontes.length) return null;
  const ultimas = await ultimasImportacoes(prefeituraId).catch(() => ({}) as Awaited<ReturnType<typeof ultimasImportacoes>>);

  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <h2 className="font-semibold text-base">O que entra sozinho</h2>
      <p className="text-sm text-muted mt-1 leading-relaxed max-w-xl">
        Toda semana, de madrugada, o CidadeIA busca nos portais públicos o que é dos módulos contratados. O que foi
        lançado à mão nunca é sobrescrito.
      </p>
      <ul className="mt-4 divide-y divide-border">
        {fontes.map((f) => {
          const u = ultimas[f.fonte];
          const falhouPorUltimo = u?.falhou && (!u.ok || dataDoBanco(u.falhou) > dataDoBanco(u.ok));
          return (
            <li key={f.fonte} className="py-3 flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
              <span className="text-sm font-medium">{f.nome}</span>
              <span className="text-xs text-muted sm:text-right">
                {u?.ok ? (
                  <>
                    {dataCurta(u.ok)} · {u.resumo}
                  </>
                ) : falhouPorUltimo ? null : (
                  "Na fila da próxima madrugada"
                )}
                {falhouPorUltimo && (
                  <span className="block" style={{ color: "var(--medio)" }}>
                    Última tentativa em {dataCurta(u!.falhou!)} não trouxe dado. Tenta de novo amanhã.
                  </span>
                )}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
