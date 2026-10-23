import { ImageResponse } from "next/og";
import { URL_BASE } from "@/lib/seo";

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

// As mesmas cores do tema noite (globals.css, .tema-noite). Eram as da
// identidade antiga, azul e verde: o link no WhatsApp chegava com outra
// marca. ImageResponse não lê variável CSS, por isso o valor vai escrito.
const FUNDO = "#08090c";
const CARTAO = "#14161b";
const TEXTO = "#f3f4f6";
const MUDO = "#8b8f98";
const MARCA = "#7252f6";
const DESTAQUE = "#a68fff";

/** O endereço do site sem "https://": muda sozinho quando vier o domínio próprio. */
const DOMINIO = new URL(URL_BASE).host;

/** A marca Quadra compacta (components/site/MarcaQuadra.tsx), em divs. */
function Quadra({ tamanho }: { tamanho: number }) {
  const u = tamanho / 120;
  const bloco = (x: number, y: number, w: number, h: number, cor: string) => (
    <div
      style={{
        position: "absolute",
        left: x * u,
        top: y * u,
        width: w * u,
        height: h * u,
        borderRadius: 6 * u,
        background: cor,
        display: "flex",
      }}
    />
  );
  return (
    <div style={{ position: "relative", width: tamanho, height: tamanho, display: "flex" }}>
      {bloco(0, 0, 120, 34, MARCA)}
      {bloco(0, 41, 41, 79, MARCA)}
      {bloco(48, 86, 72, 34, DESTAQUE)}
    </div>
  );
}

// ── O ÍCONE QUADRADO DA MARCA ──
// O schema Organization apontava o logo para a imagem de compartilhamento,
// 1200×630; o Google pede logo quadrado. É também o ícone de aba e o da tela
// inicial do celular (app/icon.tsx e app/apple-icon.tsx).
export function iconeDaMarca(tamanho: number) {
  const margem = Math.round(tamanho * 0.18);
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: FUNDO,
          borderRadius: Math.round(tamanho * 0.2),
        }}
      >
        <Quadra tamanho={tamanho - margem * 2} />
      </div>
    ),
    { width: tamanho, height: tamanho }
  );
}

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
            <Quadra tamanho={40} />
            <div style={{ fontSize: 32, color: TEXTO, fontWeight: 700, letterSpacing: -1 }}>cidade</div>
            <div style={{ fontSize: 32, color: DESTAQUE, fontWeight: 700, letterSpacing: -1, marginLeft: -14 }}>ia</div>
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
          <div style={{ fontSize: 26, color: DESTAQUE, fontWeight: 700 }}>{DOMINIO}</div>
        </div>
      </div>
    ),
    { ...TAMANHO_OG }
  );
}
