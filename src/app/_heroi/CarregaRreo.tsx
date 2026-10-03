import { connection } from "next/server";
import { montarRaioX, type ResultadoRaioX } from "@/lib/raio-x";
import { fatoDaAplicacao, fatoDosRelatorios } from "@/lib/fatos-do-municipio";
import FatoDoMunicipio from "@/components/site/FatoDoMunicipio";
import { podeConsultarPelaHome, AUSENCIA_POR_LIMITE } from "./limite-do-heroi";

// ── DOIS FATOS, UMA CONSULTA ──
//
// Aplicação em saúde e educação e relatórios que não constam saem do MESMO
// `montarRaioX`. O plano pedia um limite de Suspense por fato; eles ficam
// juntos porque separá-los faria a mesma consulta ao Tesouro duas vezes — é a
// lição que `raio-x/[uf]/[slug]/DadosDoTesouro.tsx` já registra.
//
// O que o spec pede é que o fato lento não segure o rápido, e isso continua
// valendo: o RGF tem limite próprio, e é ele o lento.

export default async function CarregaRreo({
  municipio,
  uf,
}: {
  municipio: string;
  uf: string;
}) {
  await connection();

  const agora = new Date().toISOString();

  if (!(await podeConsultarPelaHome())) {
    const barrado: ResultadoRaioX = { ok: false, erro: AUSENCIA_POR_LIMITE, municipioNaoEncontrado: false };
    return (
      <>
        <FatoDoMunicipio fato={{ ...fatoDaAplicacao(barrado, agora), ausencia: AUSENCIA_POR_LIMITE }} />
        <FatoDoMunicipio fato={{ ...fatoDosRelatorios(barrado, agora), ausencia: AUSENCIA_POR_LIMITE }} />
      </>
    );
  }

  let resultado: ResultadoRaioX;
  try {
    resultado = await montarRaioX(municipio, uf);
  } catch (e) {
    console.error(`[heroi/${uf}/${municipio}] RREO não respondeu:`, e);
    resultado = {
      ok: false,
      erro: "A consulta ao Tesouro falhou nesta visita.",
      municipioNaoEncontrado: false,
    };
  }

  return (
    <>
      <FatoDoMunicipio fato={fatoDaAplicacao(resultado, agora)} />
      <FatoDoMunicipio fato={fatoDosRelatorios(resultado, agora)} />
    </>
  );
}
