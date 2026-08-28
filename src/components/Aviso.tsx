import { estiloPrioridade } from "@/components/BadgePrioridade";

/**
 * Caixa de destaque para riscos/atrasos. Antes Obras e Licitações tinham
 * cada uma sua própria versão com cores cruas do Tailwind (bg-red-50,
 * bg-amber-50), fora do sistema de cores — o mesmo tipo de aviso aparecia
 * com tom diferente dependendo da tela.
 */
export default function Aviso({
  nivel = "medio",
  titulo,
  itens,
}: {
  nivel?: "urgente" | "medio" | "info";
  titulo: string;
  itens?: string[];
}) {
  const e = estiloPrioridade(nivel);

  return (
    <div
      className="arco-card-sm border p-4"
      style={{ background: e.fundo, borderColor: e.borda }}
    >
      <p className="text-sm font-semibold" style={{ color: e.cor }}>
        {titulo}
      </p>
      {itens && itens.length > 0 && (
        <ul className="text-sm mt-1.5 space-y-0.5" style={{ color: e.cor }}>
          {itens.map((t, i) => (
            <li key={i}>• {t}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
