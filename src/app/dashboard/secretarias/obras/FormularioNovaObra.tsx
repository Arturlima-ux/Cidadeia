"use client";

import { useState } from "react";
import { criarObra } from "./actions";
import { LIMITES_BRASIL } from "@/lib/coordenadas";

// ── O CADASTRO DE OBRA ──
//
// Pedia "progresso esperado até hoje (%)", um número que ninguém tem: quem
// diz quanto a obra já deveria ter andado é o prazo. Agora o formulário pede
// as datas, e o painel calcula o esperado sozinho, todo dia (lib/obra-prazo.ts).
// O progresso medido começa vazio ("ainda não medido"), e não 0%: zero afirma
// que a obra está parada. E a localização vem do celular de quem está na obra,
// em vez de latitude digitada.

const STATUS = [
  ["planejada", "Planejada"],
  ["em_andamento", "Em andamento"],
  ["paralisada", "Paralisada"],
  ["concluida", "Concluída"],
] as const;

const campo = "w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-brand";
const rotulo = "block text-xs font-medium mb-1";
const dica = "text-[11px] text-muted mt-1 leading-snug";

export default function FormularioNovaObra() {
  const [inicio, setInicio] = useState("");
  const [local, setLocal] = useState<{ lat: string; lng: string } | null>(null);
  const [localizando, setLocalizando] = useState(false);
  const [erroLocal, setErroLocal] = useState<string | null>(null);

  function usarMinhaLocalizacao() {
    setErroLocal(null);
    if (!("geolocation" in navigator)) {
      setErroLocal("Este aparelho não informa a localização.");
      return;
    }
    setLocalizando(true);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setLocalizando(false);
        setLocal({ lat: p.coords.latitude.toFixed(6), lng: p.coords.longitude.toFixed(6) });
      },
      () => {
        setLocalizando(false);
        setErroLocal("Não foi possível pegar a localização. Confira se o navegador tem permissão, ou digite as coordenadas.");
      },
      { enableHighAccuracy: true, timeout: 15_000 }
    );
  }

  return (
    <form action={criarObra} className="bg-card border border-border rounded-2xl p-4 grid sm:grid-cols-2 gap-x-3 gap-y-4">
      <div className="sm:col-span-2">
        <label htmlFor="obra-nome" className={rotulo}>Nome da obra</label>
        <input id="obra-nome" name="nome" required minLength={2} placeholder="Ex.: Reforma da Praça Central" className={campo} />
      </div>
      <div>
        <label htmlFor="obra-bairro" className={rotulo}>Bairro ou localidade</label>
        <input id="obra-bairro" name="bairro" placeholder="Ex.: Centro" className={campo} />
      </div>
      <div>
        <label htmlFor="obra-empresa" className={rotulo}>Empresa contratada</label>
        <input id="obra-empresa" name="fornecedorNome" placeholder="Nome da construtora" className={campo} />
      </div>
      <div>
        <label htmlFor="obra-inicio" className={rotulo}>Início da obra</label>
        <input id="obra-inicio" name="vigenciaInicio" type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} className={campo} />
      </div>
      <div>
        <label htmlFor="obra-fim" className={rotulo}>Término previsto</label>
        <input id="obra-fim" name="vigenciaFim" type="date" min={inicio || undefined} className={campo} />
      </div>
      <p className={`${dica} sm:col-span-2 -mt-2`}>
        Com as duas datas, o painel calcula sozinho, todo dia, quanto a obra já deveria ter andado e avisa quando o progresso medido ficar para trás.
      </p>
      <div>
        <label htmlFor="obra-valor" className={rotulo}>Valor do contrato (R$)</label>
        <input id="obra-valor" name="valorContrato" inputMode="decimal" placeholder="Ex.: 1.250.000,00" pattern="[0-9.,\s]*" className={campo} />
      </div>
      <div>
        <label htmlFor="obra-progresso" className={rotulo}>Progresso medido (%)</label>
        <input
          id="obra-progresso"
          name="progressoAtual"
          type="number"
          inputMode="numeric"
          min={0}
          max={100}
          step={1}
          placeholder="Ainda não medido"
          className={campo}
        />
        <p className={dica}>Deixe em branco se a fiscalização ainda não mediu.</p>
      </div>
      <div>
        <label htmlFor="obra-status" className={rotulo}>Situação</label>
        <select id="obra-status" name="status" defaultValue="planejada" className={campo}>
          {STATUS.map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
      </div>

      <div className="sm:col-span-2 rounded-xl border border-border p-3 space-y-2">
        <p className="text-xs font-medium">Localização no mapa (opcional)</p>
        <input type="hidden" name="latitude" value={local?.lat ?? ""} />
        <input type="hidden" name="longitude" value={local?.lng ?? ""} />
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={usarMinhaLocalizacao}
            disabled={localizando}
            className="rounded-full border border-border px-4 py-2 text-sm font-medium hover:border-brand transition disabled:opacity-60"
          >
            {localizando ? "Pegando a localização…" : local ? "Atualizar localização" : "Estou na obra: usar minha localização"}
          </button>
          {local && (
            <span className="text-xs text-muted">
              Marcado: {local.lat.replace(".", ",")}, {local.lng.replace(".", ",")}{" "}
              <button type="button" onClick={() => setLocal(null)} className="underline">
                tirar
              </button>
            </span>
          )}
        </div>
        {erroLocal && <p className="text-xs text-danger">{erroLocal}</p>}
        <details>
          <summary className="text-xs text-muted cursor-pointer">Prefiro digitar as coordenadas</summary>
          <div className="grid grid-cols-2 gap-2 mt-2">
            <input
              aria-label="Latitude"
              inputMode="decimal"
              placeholder="Latitude (ex.: -7,0812)"
              onChange={(e) => {
                const lat = e.target.value.replace(",", ".");
                setLocal((l) => ({ lat, lng: l?.lng ?? "" }));
              }}
              title={`Latitude no Brasil: entre ${LIMITES_BRASIL.latitude.min} e ${LIMITES_BRASIL.latitude.max}`}
              className={campo}
            />
            <input
              aria-label="Longitude"
              inputMode="decimal"
              placeholder="Longitude (ex.: -41,4675)"
              onChange={(e) => {
                const lng = e.target.value.replace(",", ".");
                setLocal((l) => ({ lat: l?.lat ?? "", lng }));
              }}
              title={`Longitude no Brasil: entre ${LIMITES_BRASIL.longitude.min} e ${LIMITES_BRASIL.longitude.max}`}
              className={campo}
            />
          </div>
        </details>
      </div>

      <div className="sm:col-span-2">
        <button type="submit" className="w-full sm:w-auto bg-brand hover:bg-brand-dark text-white text-sm font-semibold rounded-full px-6 py-2.5 transition">
          Adicionar obra
        </button>
      </div>
    </form>
  );
}
