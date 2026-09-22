import Link from "next/link";
import { contextoDashboard } from "@/lib/contexto-dashboard";
import BloqueioPlano from "@/components/BloqueioPlano";
import { buscarResultadosAps } from "../aps-actions";
import FormularioAps, { BotaoRemoverAps } from "./FormularioAps";
import {
  montarDesempenho,
  resumoDesempenho,
  quadrimestresRecentes,
  quadrimestreDe,
  rotuloQuadrimestre,
  prazoEnvioSiaps,
  ROTULO_SITUACAO_APS,
  NOME_BLOCO,
  INDICADORES_APS,
  type Quadrimestre,
} from "@/lib/aps";

// ── COMPONENTE DE QUALIDADE DA APS ──
//
// O repasse federal da Atenção Primária tem uma parte paga por desempenho
// (Portaria GM/MS 3.493/2024), apurada por quadrimestre. O painel do
// SIAPS mostra o número do quadrimestre corrente; o que ele não faz é
// guardar a série, comparar com a meta pactuada e dizer o que caiu.
//
// Nenhuma meta vem escrita no código: ela sai da ficha técnica do
// indicador e é informada aqui. Inventar meta seria vender certeza que a
// gente não tem.

export const metadata = { title: "Qualidade da APS" };
export const dynamic = "force-dynamic";

const COR = {
  abaixo: "var(--urgente)",
  perto: "var(--medio)",
  atingido: "var(--accent)",
  sem_meta: "var(--muted)",
} as const;

const SETA = { subiu: "↑", caiu: "↓", estavel: "→", sem_serie: "" } as const;

function anterior(q: Quadrimestre): Quadrimestre {
  return q.numero === 1 ? { ano: q.ano - 1, numero: 3 } : { ano: q.ano, numero: (q.numero - 1) as 1 | 2 };
}

export default async function ApsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const ctx = await contextoDashboard();
  if (!ctx.temPlano("saude")) return <BloqueioPlano plano="saude" />;

  const opcoes = quadrimestresRecentes();
  const { q } = await searchParams;
  const escolhido = opcoes.find((o) => `${o.ano}-${o.numero}` === q) ?? quadrimestreDe(new Date());
  const ant = anterior(escolhido);

  const [doQuadrimestre, doAnterior] = await Promise.all([
    buscarResultadosAps(ctx.sessao.prefeituraId, escolhido.ano, escolhido.numero),
    buscarResultadosAps(ctx.sessao.prefeituraId, ant.ano, ant.numero),
  ]);
  const linhas = montarDesempenho(doQuadrimestre, doAnterior);
  const idPorChave = new Map(doQuadrimestre.map((r) => [`${r.indicador}::${r.equipe ?? ""}`, r.id]));
  const resumo = resumoDesempenho(linhas, escolhido);
  const faltamLancar = INDICADORES_APS.filter((i) => i.bloco === "esf_eap" && !doQuadrimestre.some((r) => r.indicador === i.chave));

  const mesPassado = new Date();
  mesPassado.setUTCMonth(mesPassado.getUTCMonth() - 1);
  const prazo = prazoEnvioSiaps(mesPassado);
  const diasParaPrazo = Math.ceil((prazo.getTime() - Date.now()) / 86_400_000);

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <Link href="/dashboard/secretarias/saude" className="text-xs font-semibold text-muted hover:text-brand transition">
          ← Secretaria da Saúde
        </Link>
        <h1 className="font-serif text-2xl font-bold mt-2">Qualidade da APS</h1>
        <p className="text-muted text-sm mt-1.5 leading-relaxed max-w-2xl">
          O componente de qualidade do cofinanciamento federal (Portaria GM/MS 3.493/2024) paga conforme o
          resultado das equipes, apurado por quadrimestre. Lance aqui o que o painel do SIAPS mostra: o
          sistema guarda a série, compara com a meta pactuada e aponta o que caiu.
        </p>
      </div>

      {/* prazo do envio mensal */}
      {diasParaPrazo >= 0 && diasParaPrazo <= 12 && (
        <p
          className="text-sm rounded-xl px-4 py-3 border leading-relaxed"
          style={{ color: "var(--medio)", background: "var(--medio-tint)", borderColor: "var(--medio-borda)" }}
        >
          <strong>Envio ao SIAPS: {diasParaPrazo === 0 ? "hoje é o último dia" : `faltam ${diasParaPrazo} dia(s)`}</strong> — a
          transmissão do mês anterior vai até o 10º dia útil ({prazo.toLocaleDateString("pt-BR", { timeZone: "UTC" })}). Sem
          envio no prazo, o quadrimestre fecha com dado incompleto e o repasse cai.
        </p>
      )}

      {/* escolha do quadrimestre */}
      <div className="flex flex-wrap gap-2">
        {opcoes.map((o) => {
          const ativo = o.ano === escolhido.ano && o.numero === escolhido.numero;
          return (
            <Link
              key={`${o.ano}-${o.numero}`}
              href={`/dashboard/secretarias/saude/aps?q=${o.ano}-${o.numero}`}
              className={`text-xs font-semibold rounded-full px-3.5 py-1.5 border transition ${ativo ? "border-brand text-brand" : "border-border text-muted hover:border-brand"}`}
            >
              {rotuloQuadrimestre(o)}
            </Link>
          );
        })}
      </div>

      <p className="text-sm">{resumo}</p>

      {linhas.length > 0 && (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] font-mono uppercase tracking-[0.12em] text-muted border-b border-border">
                <th className="px-4 py-2.5 font-medium">Indicador</th>
                <th className="px-4 py-2.5 font-medium hidden sm:table-cell">Equipe</th>
                <th className="px-4 py-2.5 font-medium text-right">Resultado</th>
                <th className="px-4 py-2.5 font-medium text-right">Meta</th>
                <th className="px-4 py-2.5 font-medium">Situação</th>
                <th className="px-4 py-2.5 font-medium text-right">vs. anterior</th>
                <th className="px-2 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {linhas.map((l) => (
                <tr key={`${l.indicador.chave}-${l.equipe ?? ""}`} className="border-b border-border last:border-0">
                  <td className="px-4 py-2.5">
                    <span className="font-medium">{l.indicador.nome}</span>
                    <span className="block text-xs text-muted">{NOME_BLOCO[l.indicador.bloco]}</span>
                  </td>
                  <td className="px-4 py-2.5 text-muted hidden sm:table-cell">{l.equipe ?? "município"}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums font-semibold">{l.resultado}%</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-muted">{l.meta === null ? "—" : `${l.meta}%`}</td>
                  <td className="px-4 py-2.5 text-xs font-semibold" style={{ color: COR[l.situacao] }}>
                    {ROTULO_SITUACAO_APS[l.situacao]}
                    {l.distancia !== null && l.distancia > 0 && <span className="block font-normal">faltam {l.distancia} pontos</span>}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-xs">
                    {l.tendencia === "sem_serie" ? (
                      <span className="text-muted">—</span>
                    ) : (
                      <span style={{ color: l.tendencia === "caiu" ? "var(--urgente)" : l.tendencia === "subiu" ? "var(--accent)" : "var(--muted)" }}>
                        {SETA[l.tendencia]} {l.anterior !== null ? `${l.anterior}%` : ""}
                      </span>
                    )}
                  </td>
                  <td className="px-2 py-2.5 text-right">
                    {!ctx.sessao.demo && <BotaoRemoverAps id={idPorChave.get(`${l.indicador.chave}::${l.equipe ?? ""}`) ?? ""} />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {faltamLancar.length > 0 && (
        <p className="text-xs text-muted leading-relaxed">
          Ainda sem lançamento no {rotuloQuadrimestre(escolhido)}, entre os da eSF/eAP:{" "}
          {faltamLancar.map((i) => i.nome).join(" · ")}.
        </p>
      )}

      <div>
        <h2 className="font-semibold text-sm text-muted uppercase tracking-wide mb-2">Lançar resultado</h2>
        <FormularioAps quadrimestres={opcoes} selecionado={escolhido} />
      </div>

      <p className="text-xs text-muted leading-relaxed">
        Fonte dos números: SIAPS (Portaria GM/MS 7.639/2025), que substituiu o SISAB para fins de
        financiamento. Os 15 indicadores do componente de qualidade estão na lista oficial da SAPS/MS; as
        metas saem das fichas técnicas de cada indicador e por isso são informadas aqui, não fixadas pelo
        sistema.
      </p>
    </div>
  );
}
