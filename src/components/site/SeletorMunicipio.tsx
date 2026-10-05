import { municipiosDaUf, type Municipio } from "@/lib/municipios";
import { ESTADOS } from "@/lib/estados";
import { regioesComoMunicipios } from "@/lib/regioes-df";
import EnviaAoTrocar from "@/components/site/EnviaAoTrocar";

// ── O GESTO ÚNICO DO HERÓI ──
//
// Formulário GET de verdade, e componente de SERVIDOR. A home é a porta do
// funil: precisa funcionar antes de hidratar, no celular ruim de um assessor
// em horário de pico, e o resultado precisa ser um endereço que a pessoa copia
// e manda para o prefeito.
//
// ── POR QUE NÃO É COMPONENTE DE CLIENTE ──
//
// A primeira versão era, com `useState` para filtrar a lista de municípios ao
// trocar de estado. `tests/tabela-fica-no-servidor.test.ts` derrubou: um
// arquivo "use client" que importa `@/lib/municipios` manda a tabela dos 5.570
// municípios inteira para o navegador — 200 KB de JSON na porta de entrada do
// funil, justamente a página onde isso custa mais caro.
//
// Aqui o servidor já tem a tabela e manda só os municípios do estado escolhido
// (umas duas centenas). Sem estado selecionado, a segunda caixa vem vazia e o
// visitante escolhe o estado primeiro — dois envios, nenhum JavaScript
// obrigatório. Com JavaScript, `EnviaAoTrocar` atualiza a página sozinho na
// troca do estado e do município, sem botão.

export default function SeletorMunicipio({
  uf,
  inicial,
}: {
  /** UF já escolhida, vinda de `?uf=`. */
  uf?: string | null;
  inicial?: Municipio | null;
}) {
  const ufAtual = uf ?? inicial?.uf ?? "";
  const municipios: Municipio[] = ufAtual ? municipiosDaUf(ufAtual) : [];

  return (
    <form method="get" action="/" className="flex flex-wrap items-end gap-3">
      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold text-muted">Estado</span>
        <select
          name="uf"
          defaultValue={ufAtual}
          className="rounded-lg border border-border bg-card px-3 py-2.5 text-sm outline-none focus:border-brand"
        >
          <option value="">Selecione</option>
          {ESTADOS.map((u) => (
            <option key={u} value={u}>
              {u}
            </option>
          ))}
        </select>
        <EnviaAoTrocar />
      </label>

      <label className="flex flex-col gap-1.5 min-w-0 flex-1">
        <span className="text-xs font-semibold text-muted">Município</span>
        <select
          key={ufAtual}
          name="m"
          defaultValue={inicial?.codigo ?? ""}
          disabled={municipios.length === 0}
          className="w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm outline-none focus:border-brand disabled:opacity-50"
        >
          <option value="">{ufAtual ? "Selecione" : "Primeiro o estado"}</option>
          {ufAtual === "DF" ? (
            // O DF são as 37 regiões, numa lista só e em ordem alfabética. O
            // "Brasília" do IBGE (o DF inteiro) não entra: duplicaria o Plano
            // Piloto e somaria 38 (lib/regioes-df.ts).
            regioesComoMunicipios().map((m) => (
              <option key={m.codigo} value={m.codigo}>
                {m.nome}
              </option>
            ))
          ) : (
            municipios.map((m) => (
              <option key={m.codigo} value={m.codigo}>
                {m.nome}
              </option>
            ))
          )}
        </select>
        <EnviaAoTrocar />
      </label>

      <button
        type="submit"
        className="elevar w-full sm:w-auto bg-brand hover:bg-brand-dark text-sm font-semibold rounded-lg px-5 py-2.5 transition"
        style={{ color: "var(--sobre-forte)" }}
      >
        Ver o Raio-X
      </button>
    </form>
  );
}
