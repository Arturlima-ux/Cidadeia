import { ImageResponse } from "next/og";

// ── A IMAGEM QUE APARECE NO WHATSAPP ──
//
// Um só desenho para o site inteiro: fundo escuro do tema público, a marca,
// uma linha de destaque e o texto que a página passar. Como cada página de
// município tem nome próprio, a imagem também tem — é o que faz o link de
// Barro Duro parecer feito para Barro Duro.
//
// Sem fonte carregada de arquivo: `ImageResponse` usa a fonte padrão e isso
// mantém a geração barata (são 5.598 páginas). O peso do desenho está na
// composição, não na tipografia.

export const TAMANHO_OG = { width: 1200, height: 630 };
export const TIPO_OG = "image/png";

const FUNDO = "#090c13";
const CARTAO = "#131a26";
const TEXTO = "#eef2f8";
const MUDO = "#8794a8";
const MARCA = "#3d86f0";
const DESTAQUE = "#2fbf87";

export function imagemDeCompartilhamento({
  olho,
  titulo,
  linha,
}: {
  /** Etiqueta pequena no topo (ex.: "Raio-X · dado público do Tesouro"). */
  olho: string;
  /** O que a página é (ex.: "Prefeitura de Barro Duro"). */
  titulo: string;
  /** Uma linha de apoio (ex.: "PI · 6.542 habitantes"). */
  linha?: string;
}) {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: FUNDO,
          padding: "72px 80px",
          position: "relative",
        }}
      >
        {/* faixa da marca, à esquerda */}
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: 14,
            background: MARCA,
            display: "flex",
          }}
        />
        <div style={{ display: "flex", flexDirection: "column", gap: 26 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 18, height: 18, background: DESTAQUE, display: "flex" }} />
            <div style={{ fontSize: 30, color: TEXTO, fontWeight: 700, letterSpacing: -0.5 }}>Cidade</div>
            <div style={{ fontSize: 30, color: MARCA, fontWeight: 700, letterSpacing: -0.5, marginLeft: -13 }}>IA</div>
          </div>
          <div style={{ fontSize: 24, color: MUDO, letterSpacing: 2, textTransform: "uppercase" }}>{olho}</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div
            style={{
              fontSize: titulo.length > 42 ? 62 : 78,
              color: TEXTO,
              fontWeight: 800,
              letterSpacing: -2.5,
              lineHeight: 1.05,
              maxWidth: 1000,
            }}
          >
            {titulo}
          </div>
          {linha ? <div style={{ fontSize: 32, color: MUDO, maxWidth: 950 }}>{linha}</div> : null}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderTop: `2px solid ${CARTAO}`,
            paddingTop: 26,
          }}
        >
          <div style={{ fontSize: 26, color: MUDO }}>Dado público do Tesouro Nacional e do IBGE</div>
          <div style={{ fontSize: 26, color: DESTAQUE, fontWeight: 700 }}>cidadeia.vercel.app</div>
        </div>
      </div>
    ),
    { ...TAMANHO_OG }
  );
}
