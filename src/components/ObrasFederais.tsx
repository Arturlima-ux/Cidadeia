import { lerObrasFederais } from "@/lib/obras-federais-servidor";
import { encerrada, obrasParadasNoEstado, type ObraFederal } from "@/lib/obras-federais";
import type { Area } from "@/lib/alerta-por-area";
import { dataDoBanco } from "@/lib/data-do-banco";

// As obras com dinheiro federal no município, lidas no ObrasGov toda semana
// (lib/obras-federais.ts). Na tela de Obras aparecem todas; nas de Saúde e
// Educação, só as da área.

const br = (iso: string | null) => (iso ? iso.split("-").reverse().join("/") : "—");
const reais = (v: number | null) => (v ? v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }) : null);

function cor(o: ObraFederal) {
  const s = (o.situacao ?? "").toLowerCase();
  if (s.includes("paralis") || s.includes("inacab")) return "var(--urgente)";
  if (encerrada(o.situacao)) return "var(--muted)";
  if (o.fimPrevisto && o.fimPrevisto < new Date().toISOString().slice(0, 10)) return "var(--medio)";
  return "var(--info)";
}

export default async function ObrasFederais({ prefeituraId, area, uf }: { prefeituraId: string; area?: Area; uf?: string }) {
  const lido = await lerObrasFederais(prefeituraId);
  const estado = uf ? obrasParadasNoEstado(uf) : null;
  if (!lido) {
    return (
      <section>
        <h2 className="font-semibold text-sm text-muted mb-3">Obras com dinheiro federal</h2>
        <p className="text-sm text-muted bg-card border border-border rounded-xl p-4">
          A leitura do ObrasGov acontece sozinha na madrugada. Na primeira vez, as obras federais do município aparecem aqui no dia seguinte.
        </p>
      </section>
    );
  }
  const obras = lido.obras.filter((o) => !area || o.area === area);
  const paradas = obras.filter((o) => /paralis|inacab/i.test(o.situacao ?? "")).length;
  return (
    <section>
      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
        <h2 className="font-semibold text-sm text-muted">
          Obras com dinheiro federal ({obras.length}){paradas ? ` · ${paradas} parada${paradas > 1 ? "s" : ""}` : ""}
        </h2>
        <p className="text-xs text-muted">
          ObrasGov · lido em {dataDoBanco(lido.conferidoEm).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}
        </p>
      </div>
      {estado && (
        <p className="text-xs text-muted mb-3">
          No {uf}, o ObrasGov tem {estado.paralisadas.toLocaleString("pt-BR")} obras federais paralisadas e {estado.inacabadas.toLocaleString("pt-BR")} inacabadas
          (contagem de {estado.geradoEm.split("-").reverse().join("/")}).
        </p>
      )}
      {obras.length === 0 ? (
        <p className="text-sm text-muted bg-card border border-border rounded-xl p-4">Nenhuma obra federal cadastrada no ObrasGov para o município{area ? " nesta área" : ""}.</p>
      ) : (
        <ul className="space-y-2">
          {obras.slice(0, 20).map((o) => (
            <li key={o.id} className="bg-card border border-border rounded-xl p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <p className="font-medium text-sm break-words min-w-0">{o.nome}</p>
                <span className="text-xs font-semibold inline-flex items-center gap-1.5" style={{ color: cor(o) }}>
                  <span className="w-2 h-2 rounded-full" style={{ background: cor(o) }} />
                  {o.situacao ?? "Sem situação"}
                </span>
              </div>
              {o.percentual !== null && (
                <div className="w-full h-1.5 bg-sutil rounded-full overflow-hidden mt-2">
                  <div className="h-full rounded-full" style={{ width: `${Math.min(100, o.percentual)}%`, background: cor(o) }} />
                </div>
              )}
              <p className="text-xs text-muted mt-2">
                {[
                  o.percentual !== null ? `${o.percentual.toFixed(0)}% executada` : null,
                  o.fimPrevisto ? `prevista até ${br(o.fimPrevisto)}` : null,
                  reais(o.pago) ? `${reais(o.pago)} pagos` : null,
                  o.responsavel,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
              {o.justificativa && <p className="text-xs mt-1" style={{ color: "var(--urgente)" }}>Motivo registrado: {o.justificativa}</p>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
