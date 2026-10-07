import { connection } from "next/server";
import { montarRaioX, type ResultadoRaioX } from "@/lib/raio-x";
import { proporcaoDaReceita } from "@/lib/raio-x-calculo";
import { podeConsultarPelaHome, AUSENCIA_POR_LIMITE } from "@/app/_heroi/limite-do-heroi";
import CartaoPergunta from "./CartaoPergunta";

// ── 2ª E 3ª PERGUNTAS: SAÚDE E EDUCAÇÃO, E SE A PREFEITURA PRESTA CONTAS ──
//
// Do RREO, o relatório de dois em dois meses. Em vez de "despesa liquidada
// da função 10", o que o morador entende: quanto foi para a saúde, quanto
// para a educação, e quanto isso dá por pessoa da cidade.

const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

function moeda(v: number) {
  if (v >= 1_000_000_000) return `R$ ${(v / 1_000_000_000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} bilhões`;
  if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} milhões`;
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}
const porPessoa = (v: number, pop: number) =>
  (v / pop).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

export default async function CarregaContas({
  municipio,
  uf,
  populacao,
}: {
  municipio: string;
  uf: string;
  populacao: number | null;
}) {
  await connection();
  const t2 = "Quanto foi para saúde e educação?";
  const t3 = "A prefeitura está prestando contas?";

  if (!(await podeConsultarPelaHome())) {
    return (
      <>
        <CartaoPergunta numero={2} titulo={t2} ausencia={AUSENCIA_POR_LIMITE} />
        <CartaoPergunta numero={3} titulo={t3} ausencia={AUSENCIA_POR_LIMITE} />
      </>
    );
  }

  let r: ResultadoRaioX;
  try {
    r = await montarRaioX(municipio, uf);
  } catch {
    r = { ok: false, erro: "", municipioNaoEncontrado: false };
  }

  if (!r.ok) {
    const texto = r.semPrefeitura
      ? r.erro
      : "O Tesouro Nacional não respondeu agora. Isso não diz nada sobre a prefeitura. Tente de novo em alguns minutos.";
    return (
      <>
        <CartaoPergunta numero={2} titulo={t2} ausencia={texto} />
        <CartaoPergunta numero={3} titulo={t3} ausencia={texto} />
      </>
    );
  }

  const x = r.raioX;
  const fonteRreo = x.bimestreReferencia
    ? `Relatório do ${x.bimestreReferencia}º bimestre de ${x.exercicio} (RREO) · Tesouro Nacional`
    : `Tesouro Nacional · ${x.exercicio}`;

  // ── 2 ──
  let saudeEducacao: React.ReactNode;
  const s = x.despesaSaude.valor;
  const e = x.despesaEducacao.valor;
  if (x.bimestreReferencia === null || (s === null && e === null)) {
    saudeEducacao = (
      <p className="text-lg leading-relaxed">
        Nenhum relatório deste ano com os gastos de saúde e educação consta no Tesouro Nacional ainda.
      </p>
    );
  } else {
    const ate = MESES[x.bimestreReferencia * 2 - 1];
    const ps = proporcaoDaReceita(s, x.receita.valor);
    const pe = proporcaoDaReceita(e, x.receita.valor);
    saudeEducacao = (
      <>
        <p className="text-muted">De janeiro a {ate} de {x.exercicio}, a prefeitura gastou:</p>
        <div className="grid grid-cols-2 gap-3 mt-4">
          {[
            { rotulo: "Saúde", v: s, p: ps, cor: "var(--brand-claro)" },
            { rotulo: "Educação", v: e, p: pe, cor: "var(--accent-claro)" },
          ].map((a) => (
            <div key={a.rotulo} className="rounded-2xl p-4" style={{ background: "var(--sutil)" }}>
              <p className="text-sm text-muted">{a.rotulo}</p>
              <p className="text-2xl sm:text-3xl font-semibold tracking-[-0.03em] mt-1" style={{ color: a.cor }}>
                {a.v === null ? "—" : moeda(a.v)}
              </p>
              {a.v !== null && populacao ? (
                <p className="text-sm mt-1">
                  <strong>{porPessoa(a.v, populacao)}</strong> <span className="text-muted">por morador</span>
                </p>
              ) : null}
            </div>
          ))}
        </div>
        {ps !== null && pe !== null && (
          <p className="text-lg leading-relaxed mt-5">
            De cada <strong>R$ 100</strong> que entraram, <strong style={{ color: "var(--brand-claro)" }}>R$ {Math.round(ps)}</strong> foram
            para a saúde e <strong style={{ color: "var(--accent-claro)" }}>R$ {Math.round(pe)}</strong> para a educação.
          </p>
        )}
        <p className="text-xs text-muted mt-3 leading-relaxed">
          Não é a conta dos mínimos da Constituição (15% e 25%), que usa só uma parte da receita.
        </p>
      </>
    );
  }

  // ── 3 ──
  let contas: React.ReactNode;
  if (x.rreoEsperados === 0) {
    contas = <p className="text-lg leading-relaxed">Nenhum relatório deste ano venceu ainda.</p>;
  } else if (x.rreoFaltando.length === 0 && x.rreoSemResposta.length === 0) {
    contas = (
      <>
        <p className="text-3xl font-semibold tracking-[-0.03em]" style={{ color: "var(--brand-claro)" }}>
          Sim.
        </p>
        <p className="text-lg leading-relaxed mt-2">
          Entregou ao Tesouro todos os {x.rreoEsperados} relatórios de gastos que já venceram neste ano.
        </p>
      </>
    );
  } else if (x.rreoFaltando.length > 0) {
    const n = x.rreoFaltando.length;
    contas = (
      <>
        <p className="text-3xl font-semibold tracking-[-0.03em]" style={{ color: "var(--urgente)" }}>
          {n === 1 ? "Falta 1 relatório." : `Faltam ${n} relatórios.`}
        </p>
        <p className="text-lg leading-relaxed mt-2">
          Dos {x.rreoEsperados} relatórios de gastos que já venceram neste ano, {x.rreoEntregues} constam entregues ao
          Tesouro. Não consta{n > 1 ? "m" : ""} o{n > 1 ? "s" : ""} do {x.rreoFaltando.map((b) => `${b}º`).join(", ")} bimestre.
        </p>
        <p className="text-sm text-muted mt-3 leading-relaxed">
          Enquanto falta, a cidade pode ficar sem receber dinheiro de convênios com o governo federal (Lei de
          Responsabilidade Fiscal, art. 51). Você pode cobrar a prefeitura pelo pedido de informação aqui embaixo.
        </p>
      </>
    );
  } else {
    contas = (
      <p className="text-lg leading-relaxed">
        O Tesouro Nacional não respondeu sobre o {x.rreoSemResposta.map((b) => `${b}º`).join(", ")} bimestre agora. Isso
        não diz nada sobre a prefeitura. Tente de novo em alguns minutos.
      </p>
    );
  }

  return (
    <>
      <CartaoPergunta numero={2} titulo={t2} fonte={fonteRreo}>
        {saudeEducacao}
      </CartaoPergunta>
      <CartaoPergunta numero={3} titulo={t3} fonte={`Relatórios bimestrais (RREO) de ${x.exercicio} · Tesouro Nacional`}>
        {contas}
      </CartaoPergunta>
    </>
  );
}
