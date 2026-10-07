import { connection } from "next/server";
import { buscarRgfMaisRecente, type ResultadoRgf } from "@/lib/siconfi-rgf";
import { fatoDoPessoal, frasesDoContexto, rotuloDoPeriodoRgf } from "@/lib/fatos-do-municipio";
import { podeConsultarPelaHome, AUSENCIA_POR_LIMITE } from "@/app/_heroi/limite-do-heroi";
import CartaoPergunta from "./CartaoPergunta";

// ── 1ª PERGUNTA: QUANTO VAI PARA PAGAR OS SERVIDORES? ──
//
// O mesmo RGF da home da prefeitura, dito como o morador entende: de cada
// R$ 100 que a prefeitura arrecada, quantos vão para a folha. Cem moedas na
// tela, as pintadas são a folha, e a linha vermelha é onde a lei para.
//
// Os limites são os que a própria prefeitura declarou no relatório quando
// vêm nele (é assim que o Distrito Federal, com limite de estado, sai certo);
// sem eles, os da lei para municípios.

const LIMITES_MUNICIPAIS = { alerta: 48.6, prudencial: 51.3, maximo: 54 };

function reais(v: number) {
  return v.toLocaleString("pt-BR", { maximumFractionDigits: 0 });
}

export default async function CarregaSalarios({ codigoIbge }: { codigoIbge: string }) {
  await connection();
  const titulo = "Quanto vai para pagar os servidores?";

  if (!(await podeConsultarPelaHome())) {
    return <CartaoPergunta numero={1} titulo={titulo} ausencia={AUSENCIA_POR_LIMITE} />;
  }

  let r: ResultadoRgf;
  try {
    const agora = new Date();
    r = await buscarRgfMaisRecente(codigoIbge, agora.getFullYear(), agora.getMonth() + 1);
  } catch {
    r = { ok: false, erro: "", causa: "consulta_falhou", periodosProcurados: 0 };
  }

  if (!r.ok) {
    return <CartaoPergunta numero={1} titulo={titulo} ausencia={fatoDoPessoal(r, new Date().toISOString()).ausencia} />;
  }

  const d = r.dados;
  const pct = (d.despesaTotal / d.rclAjustada) * 100;
  const declarado = (v: number | null) => (v !== null && !d.rclVeioDeReserva ? (v / d.rclAjustada) * 100 : null);
  const lim = {
    alerta: declarado(d.limiteAlerta) ?? LIMITES_MUNICIPAIS.alerta,
    prudencial: declarado(d.limitePrudencial) ?? LIMITES_MUNICIPAIS.prudencial,
    maximo: declarado(d.limiteMaximo) ?? LIMITES_MUNICIPAIS.maximo,
  };
  const situacao =
    pct > lim.maximo
      ? { cor: "var(--urgente)", texto: "Acima do limite da lei. A prefeitura é obrigada a cortar gastos com pessoal." }
      : pct >= lim.prudencial
      ? { cor: "var(--urgente)", texto: "No limite. A prefeitura fica proibida de contratar e de dar aumento." }
      : pct >= lim.alerta
      ? { cor: "var(--medio)", texto: "Perto do limite. O Tribunal de Contas já manda um aviso." }
      : { cor: "var(--brand-claro)", texto: "Dentro do limite da lei, com folga." };

  const pintadas = Math.round(pct);
  const linha = Math.round(lim.maximo);

  return (
    <CartaoPergunta
      numero={1}
      titulo={titulo}
      fonte={`${rotuloDoPeriodoRgf(d.periodo)} · entregue ao Tesouro Nacional`}
    >
      <p className="text-2xl sm:text-3xl font-semibold tracking-[-0.03em] leading-snug">
        De cada <span style={{ color: "var(--brand-claro)" }}>R$ 100</span> que a prefeitura arrecada,{" "}
        <span style={{ color: situacao.cor }}>R$ {reais(pct)}</span> vão para pagar os servidores.
      </p>
      <p className="text-muted mt-3 leading-relaxed">
        Salários, encargos e aposentadorias. A lei deixa ir até{" "}
        <strong className="text-foreground">R$ {reais(lim.maximo)}</strong>.
      </p>

      {/* As cem moedas. A borda vermelha marca as que passam do limite. */}
      <div className="grid grid-cols-10 gap-1.5 sm:gap-2 mt-6 max-w-[360px]" role="img" aria-label={`${pintadas} de 100 moedas vão para os servidores; o limite da lei é ${linha}.`}>
        {Array.from({ length: 100 }, (_, i) => {
          const cheia = i < pintadas;
          const alemDoLimite = i >= linha;
          return (
            <span
              key={i}
              className="aspect-square rounded-full"
              style={{
                background: cheia ? (alemDoLimite ? "var(--urgente)" : "var(--brand)") : "var(--sutil)",
                boxShadow: i === linha - 1 ? "0 0 0 2px var(--urgente)" : undefined,
                opacity: cheia ? 1 : 0.9,
              }}
            />
          );
        })}
      </div>
      <p className="flex items-center gap-2 text-xs text-muted mt-3">
        <span className="w-2.5 h-2.5 rounded-full" style={{ boxShadow: "0 0 0 2px var(--urgente)" }} /> a última moeda que a lei permite
      </p>

      <p className="mt-5 rounded-2xl px-4 py-3 font-medium" style={{ background: "var(--sutil)", color: situacao.cor }}>
        {situacao.texto}
      </p>
      {r.contexto && <p className="text-sm text-muted mt-4 leading-relaxed">{frasesDoContexto(r.contexto).trim()}</p>}
    </CartaoPergunta>
  );
}
