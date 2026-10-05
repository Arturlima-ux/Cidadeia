import { connection } from "next/server";
import { buscarRgfMaisRecente, type ResultadoRgf } from "@/lib/siconfi-rgf";
import { avaliarDespesaPessoal } from "@/lib/despesa-pessoal";
import { rotuloDoPeriodoRgf } from "@/lib/fatos-do-municipio";
import ReguaLrf from "@/components/site/inicio/ReguaLrf";

// A régua do topo com o número do município escolhido.
//
// A consulta é a mesma de CarregaPessoal, com os mesmos argumentos: o fetch
// do Tesouro é memorizado na requisição e guardado por sete dias
// (lib/siconfi-rgf.ts), então isto não dobra as chamadas à API pública e não
// precisa contar de novo no limite por visitante.
//
// Sem RGF publicado, ou com a consulta falhando, a régua volta ao exemplo e
// diz por quê. Nunca inventa número para o município.
export default async function CarregaRegua({
  codigoIbge,
  municipio,
}: {
  codigoIbge: string;
  municipio: string;
}) {
  await connection();
  const agora = new Date();

  let resultado: ResultadoRgf;
  try {
    resultado = await buscarRgfMaisRecente(codigoIbge, agora.getFullYear(), agora.getMonth() + 1);
  } catch {
    resultado = { ok: false, erro: "", causa: "consulta_falhou", periodosProcurados: 0 };
  }

  const avaliacao = resultado.ok
    ? avaliarDespesaPessoal({ rcl: resultado.dados.rclAjustada, despesa: resultado.dados.despesaTotal })
    : null;

  if (!resultado.ok || !avaliacao) {
    return (
      <ReguaLrf
        dado={{
          modo: "exemplo",
          aviso: `O Tesouro não devolveu a despesa com pessoal de ${municipio} agora. Acima, um município de exemplo.`,
        }}
      />
    );
  }

  return (
    <ReguaLrf
      dado={{
        modo: "real",
        municipio,
        percentual: avaliacao.percentual,
        situacao: avaliacao.situacao,
        periodo: rotuloDoPeriodoRgf(resultado.dados.periodo),
        margemAtePrudencial: avaliacao.margemAtePrudencial,
        baseDeReserva: resultado.dados.rclVeioDeReserva,
      }}
    />
  );
}
