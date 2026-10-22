import QRCode from "qrcode";
import BotaoImprimir from "@/components/BotaoImprimir";
import { textosDoAviso, type ObraParadaPublica } from "@/lib/obra-parada-publica";
import { formatarMoeda } from "@/lib/formatadores";

// ── A PLACA DA OBRA PARADA ──
//
// A lei pede o aviso também "em placa a ser afixada em local da obra de fácil
// visualização" (art. 115, § 6º, Lei 14.133/2021). A placa sai pronta, em A3
// deitado, com o mesmo texto do portal e um QR code que leva o morador ao
// aviso atualizado: se a prefeitura informar o reinício, quem lê o QR vê na
// hora, sem trocar a placa.

/** QR code como SVG que herda a cor do texto (sem cor fixa no código). */
function Qr({ texto, className }: { texto: string; className?: string }) {
  const { modules } = QRCode.create(texto, { errorCorrectionLevel: "M" });
  const n = modules.size;
  const quadros: string[] = [];
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (modules.get(y, x)) quadros.push(`M${x + 2} ${y + 2}h1v1h-1z`);
  return (
    <svg viewBox={`0 0 ${n + 4} ${n + 4}`} className={className} role="img" aria-label="QR code do aviso no portal" shapeRendering="crispEdges">
      <rect width={n + 4} height={n + 4} fill="var(--background)" />
      <path d={quadros.join("")} fill="currentColor" />
    </svg>
  );
}

export default function PlacaObraParada({
  obra,
  municipio,
  estado,
  endereco,
  exemplo = false,
}: {
  obra: ObraParadaPublica;
  municipio: string;
  estado: string;
  endereco: string;
  exemplo?: boolean;
}) {
  const t = textosDoAviso(obra);
  const linhas: [string, string][] = [
    ["Motivo da paralisação", t.motivo],
    ["Responsável pela inexecução", t.responsavel],
    ["Data prevista para o reinício", t.retomada.replace(/^Reinício previsto para /, "")],
  ];
  const andamento = [
    obra.executado !== null ? `${Math.round(obra.executado)}% executado` : null,
    obra.pagoPct !== null ? `${Math.round(obra.pagoPct)}% pago` : null,
    obra.valorBase !== null ? `${formatarMoeda(obra.valorBase)} ${obra.origem === "federal" ? "empenhados" : "no contrato"}` : null,
  ].filter(Boolean);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <style>{`@page { size: A3 landscape; margin: 10mm; } @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }`}</style>
      <div className="print:hidden max-w-[1100px] mx-auto px-4 sm:px-8 pt-6 flex items-center justify-between gap-4 flex-wrap">
        <p className="text-sm text-muted">
          {exemplo ? "Cidade fictícia, com dados de exemplo. " : ""}Placa gerada sozinha a partir do aviso no portal. Imprima em A3 deitado.
        </p>
        <BotaoImprimir />
      </div>

      <main id="conteudo" className="max-w-[1100px] mx-auto px-4 sm:px-8 py-6 print:p-0 print:max-w-none">
        <article className="rounded-3xl print:rounded-none border-[3px] overflow-hidden" style={{ borderColor: "var(--foreground)" }}>
          {/* div, não header/aside: a regra de impressão do site esconde header e aside. */}
          <div className="px-6 sm:px-10 py-5 sm:py-6 print:py-8 text-white" style={{ background: "var(--urgente)" }}>
            <p className="text-sm sm:text-base print:text-2xl font-semibold tracking-[0.12em] uppercase">Aviso público</p>
            <h1 className="text-3xl sm:text-5xl print:text-7xl font-bold tracking-[-0.03em] leading-none mt-1">{t.situacao.toUpperCase()}</h1>
          </div>

          <div className="px-6 sm:px-10 py-7 sm:py-9 grid md:grid-cols-[minmax(0,1fr)_220px] print:grid-cols-[minmax(0,1fr)_300px] gap-8">
            <div className="min-w-0">
              <p className="text-base print:text-2xl text-muted">
                Prefeitura de {municipio}
                {estado && estado !== "BR" ? ` · ${estado}` : ""}
              </p>
              <h2 className="text-2xl sm:text-4xl print:text-6xl font-semibold tracking-[-0.03em] leading-tight mt-1 break-words">{obra.nome}</h2>
              <p className="mt-2 text-base sm:text-lg print:text-3xl font-medium">{t.desde}</p>

              <dl className="mt-6 grid gap-4">
                {linhas.map(([rotulo, valor]) => (
                  <div key={rotulo} className="border-t-2 pt-3" style={{ borderColor: "var(--border)" }}>
                    <dt className="text-sm print:text-xl font-semibold uppercase tracking-[0.06em] text-muted">{rotulo}</dt>
                    <dd className="text-lg sm:text-xl print:text-4xl mt-1 leading-snug break-words">{valor}</dd>
                  </div>
                ))}
                {andamento.length > 0 && (
                  <div className="border-t-2 pt-3" style={{ borderColor: "var(--border)" }}>
                    <dt className="text-sm print:text-xl font-semibold uppercase tracking-[0.06em] text-muted">Andamento</dt>
                    <dd className="text-lg sm:text-xl print:text-4xl mt-1">{andamento.join(" · ")}</dd>
                  </div>
                )}
              </dl>
            </div>

            <div className="flex flex-col items-center text-center gap-3">
              <Qr texto={endereco} className="w-[200px] h-[200px] print:w-[280px] print:h-[280px]" />
              <p className="text-sm print:text-xl leading-snug">
                Aponte a câmera do celular para acompanhar esta obra no Portal da Transparência.
              </p>
            </div>
          </div>

          <footer className="px-6 sm:px-10 py-4 text-sm print:text-lg text-muted border-t-2 flex justify-between gap-4 flex-wrap" style={{ borderColor: "var(--border)" }}>
            <span>Aviso exigido pelo art. 115, § 6º, da Lei nº 14.133/2021.</span>
            <span>Fonte: {obra.fonte}</span>
          </footer>
        </article>
      </main>
    </div>
  );
}
