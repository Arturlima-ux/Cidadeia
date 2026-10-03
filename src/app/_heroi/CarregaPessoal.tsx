import { connection } from "next/server";
import { buscarRgfMaisRecente, type ResultadoRgf } from "@/lib/siconfi-rgf";
import { fatoDoPessoal } from "@/lib/fatos-do-municipio";
import { podeConsultarPelaHome, AUSENCIA_POR_LIMITE } from "./limite-do-heroi";
import FatoDoMunicipio from "@/components/site/FatoDoMunicipio";

// ── O FATO QUE ESPERA O RGF ──
//
// `buscarRgfMaisRecente` tenta até oito períodos em sequência contra a API do
// Tesouro. É a consulta mais lenta do herói, e fica sozinha no seu limite de
// Suspense justamente por isso: a manchete e o seletor não esperam por ela, e
// o fato do RREO também não.
//
// `connection()` corta a geração estática exatamente aqui — o que está acima
// continua sendo servido sem esperar rede nenhuma.

export default async function CarregaPessoal({ codigoIbge }: { codigoIbge: string }) {
  await connection();

  const agora = new Date();

  // O limite vem antes da rede, nunca depois: contar a consulta que já saiu
  // não protege ninguém.
  if (!(await podeConsultarPelaHome())) {
    return (
      <FatoDoMunicipio
        fato={{
          ...fatoDoPessoal(
            { ok: false, erro: AUSENCIA_POR_LIMITE, causa: "consulta_falhou", periodosProcurados: 0 },
            agora.toISOString()
          ),
          ausencia: AUSENCIA_POR_LIMITE,
        }}
      />
    );
  }

  let resultado: ResultadoRgf;
  try {
    resultado = await buscarRgfMaisRecente(
      codigoIbge,
      agora.getFullYear(),
      agora.getMonth() + 1
    );
  } catch (e) {
    // Tesouro fora não vira página de erro: vira ausência, que é um estado
    // previsto e já tem texto próprio.
    console.error(`[heroi/${codigoIbge}] RGF não respondeu:`, e);
    resultado = {
      ok: false,
      erro: "A consulta ao Tesouro falhou nesta visita.",
      causa: "consulta_falhou",
      periodosProcurados: 0,
    };
  }

  return <FatoDoMunicipio fato={fatoDoPessoal(resultado, agora.toISOString())} />;
}
