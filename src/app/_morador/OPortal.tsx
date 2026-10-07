import Link from "next/link";
import VitrinePortal from "@/components/site/VitrinePortal";

// ── O PORTAL QUE O CIDADEIA DÁ À CIDADE, VISTO PELO MORADOR ──
//
// O lado do morador mostrava as contas da cidade, mas não o que muda na vida
// dele quando a prefeitura contrata o CidadeIA: o portal da transparência,
// com o canal de pedidos, a voz da cidade, o dinheiro, as obras e as compras.
// Aqui ele vê a lista em português de morador e a vitrine funcionando (a
// cidade de exemplo, Bela Aurora, dita fictícia na própria vitrine).

export const O_QUE_O_PORTAL_DA = [
  {
    titulo: "Pedir, reclamar, sugerir ou denunciar",
    texto: "Pelo celular, com número de protocolo e prazo de resposta. Dá para denunciar sem dizer quem você é.",
  },
  {
    titulo: "Ver a cidade falando",
    texto: "Quantos pedidos chegaram, quantos a prefeitura respondeu e em quantos dias. Sem nome de ninguém.",
  },
  {
    titulo: "Para onde vai o dinheiro",
    texto: "De cada R$ 100 que entraram, quanto já foi gasto, e com o quê.",
  },
  {
    titulo: "Obras e compras à vista",
    texto: "Cada obra com o andamento, e cada compra da prefeitura aberta para qualquer pessoa conferir.",
  },
  {
    titulo: "No celular, sem cadastro",
    texto: "Abre como um site qualquer. Não precisa baixar aplicativo nem criar senha.",
  },
] as const;

export default function OPortal({
  titulo,
  subtitulo,
  acoes,
}: {
  titulo: React.ReactNode;
  subtitulo: string;
  /** Botões abaixo da lista (pedir o portal, ver o exemplo). */
  acoes?: React.ReactNode;
}) {
  return (
    <section className="max-w-[1200px] mx-auto px-4 sm:px-8 pt-20">
      <h2 className="text-3xl sm:text-4xl font-semibold tracking-[-0.04em] max-w-[22ch]">{titulo}</h2>
      <p className="text-lg text-muted mt-3 max-w-[60ch] leading-relaxed">{subtitulo}</p>

      <div className="grid grid-cols-[minmax(0,1fr)] lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] gap-8 lg:gap-12 mt-10 items-start">
        <div className="min-w-0">
          <ul className="space-y-5">
            {O_QUE_O_PORTAL_DA.map((item, i) => (
              <li key={item.titulo} className="flex gap-4">
                <span
                  className="w-8 h-8 shrink-0 rounded-full flex items-center justify-center text-sm font-semibold"
                  style={{ background: "var(--brand-tint)", color: "var(--brand-claro)" }}
                >
                  {i + 1}
                </span>
                <div>
                  <p className="font-semibold text-lg leading-snug">{item.titulo}</p>
                  <p className="text-muted mt-1 leading-relaxed">{item.texto}</p>
                </div>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-3 mt-8">
            {acoes ?? (
              <Link href="/transparencia/exemplo" className="rounded-full border border-border px-6 py-3.5 font-medium hover:border-brand transition">
                Abrir o portal de exemplo →
              </Link>
            )}
          </div>
        </div>
        <div className="min-w-0">
          <VitrinePortal />
        </div>
      </div>
    </section>
  );
}
