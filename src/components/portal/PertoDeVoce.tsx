"use client";

import { useMemo, useState } from "react";
import { m, useReducedMotion } from "motion/react";
import {
  bairrosDosLugares,
  descreverDistancia,
  distanciaMetros,
  linkDoCaminho,
  maisPerto,
  noBairro,
  type LugarComDistancia,
  type LugarPerto,
  type Ponto,
} from "@/lib/perto-de-voce";

// ── PERTO DE VOCÊ ── (regras em lib/perto-de-voce.ts)

type Modo = { tipo: "local"; ponto: Ponto; simulado: boolean } | { tipo: "bairro"; bairro: string } | null;

const GRUPOS: { chave: LugarPerto["grupo"]; titulo: string; vazio: string; cor: string }[] = [
  { chave: "saude", titulo: "Saúde", vazio: "Nenhuma unidade de saúde aqui.", cor: "var(--info)" },
  { chave: "escola", titulo: "Escolas e creches", vazio: "Nenhuma escola municipal aqui.", cor: "var(--accent)" },
  { chave: "obra", titulo: "Obras", vazio: "Nenhuma obra aqui agora.", cor: "var(--medio)" },
];

/** Mais longe que isto de tudo, a pessoa não está na cidade. */
const FORA_DA_CIDADE_M = 60_000;

function Cartao({ l, municipio }: { l: LugarComDistancia; municipio: string }) {
  const digitos = l.telefone?.replace(/\D/g, "") ?? "";
  return (
    <li className="rounded-2xl border border-border p-4" style={{ background: "var(--background)" }}>
      <p className="text-xs text-muted">{l.rotulo}</p>
      <p className="font-semibold leading-snug mt-0.5 break-words">{l.nome}</p>
      {l.metros !== null && (
        <p className="text-sm font-medium mt-1" style={{ color: "var(--brand-claro)" }}>
          {descreverDistancia(l.metros)}
        </p>
      )}
      <div className="text-sm text-muted mt-1.5 space-y-0.5">
        {l.endereco && <p>{l.endereco}</p>}
        {l.horario && <p>{l.horario}</p>}
      </div>
      <div className="flex flex-wrap gap-2 mt-3">
        {l.grupo !== "obra" && (
          <a
            href={linkDoCaminho(l, municipio)}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold hover:border-brand transition"
          >
            Como chegar →
          </a>
        )}
        {digitos.length >= 8 && (
          <a href={`tel:${digitos}`} className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold hover:border-brand transition">
            Ligar {l.telefone}
          </a>
        )}
      </div>
    </li>
  );
}

export default function PertoDeVoce({
  municipio,
  lugares,
  pontoSimulado = null,
}: {
  municipio: string;
  lugares: LugarPerto[];
  /** Na cidade de exemplo, a "sua localização" é um ponto no centro dela. */
  pontoSimulado?: Ponto | null;
}) {
  const [modo, setModo] = useState<Modo>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [buscando, setBuscando] = useState(false);
  const reduzir = useReducedMotion();
  const bairros = useMemo(() => bairrosDosLugares(lugares), [lugares]);
  const temCoordenada = lugares.some((l) => l.lat !== null);

  const resultado = useMemo(() => {
    if (!modo) return null;
    return modo.tipo === "local" ? maisPerto(lugares, modo.ponto) : noBairro(lugares, modo.bairro);
  }, [modo, lugares]);

  function usarLocalizacao() {
    setAviso(null);
    if (pontoSimulado) {
      setModo({ tipo: "local", ponto: pontoSimulado, simulado: true });
      return;
    }
    if (!("geolocation" in navigator)) {
      setAviso("Este aparelho não informa a localização. Escolha o bairro.");
      return;
    }
    setBuscando(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setBuscando(false);
        const ponto = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        const maisPerto = lugares
          .filter((l) => l.lat !== null && l.lng !== null)
          .reduce((m, l) => Math.min(m, distanciaMetros(ponto, { lat: l.lat!, lng: l.lng! })), Infinity);
        if (maisPerto > FORA_DA_CIDADE_M) {
          setAviso(`Você parece estar fora de ${municipio}. Escolha um bairro para ver o que tem lá.`);
          setModo(null);
          return;
        }
        setModo({ tipo: "local", ponto, simulado: false });
      },
      () => {
        setBuscando(false);
        setAviso("Sem permissão para a localização. Escolha o bairro.");
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 300_000 }
    );
  }

  return (
    <section aria-labelledby="perto-titulo">
      <div className="max-w-[720px]">
        <p className="text-xs font-semibold tracking-[0.14em] uppercase" style={{ color: "var(--brand-claro)" }}>
          Perto de você
        </p>
        <h2 id="perto-titulo" className="text-3xl sm:text-5xl font-semibold tracking-[-0.04em] leading-[1.05] mt-3">
          O posto, a escola e as obras <span style={{ color: "var(--brand-claro)" }}>do seu bairro.</span>
        </h2>
        <p className="text-muted text-base sm:text-lg leading-relaxed mt-4">
          Com endereço, telefone e o caminho até lá. Sua localização fica no seu celular: nada é enviado à prefeitura.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3 mt-8">
        {temCoordenada && (
          <button
            type="button"
            onClick={usarLocalizacao}
            disabled={buscando}
            className="inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
            style={{ background: "var(--brand)" }}
          >
            <svg aria-hidden viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21Z" />
              <circle cx="12" cy="9.5" r="2.5" />
            </svg>
            {buscando ? "Procurando você…" : "Usar minha localização"}
          </button>
        )}
        {bairros.length > 0 && (
          <label className="inline-flex items-center gap-2 text-sm">
            <span className="text-muted">{temCoordenada ? "ou escolha o bairro" : "Escolha o bairro"}</span>
            <select
              value={modo?.tipo === "bairro" ? modo.bairro : ""}
              onChange={(e) => {
                setAviso(null);
                setModo(e.target.value ? { tipo: "bairro", bairro: e.target.value } : null);
              }}
              className="rounded-full border border-border px-4 py-2.5 text-sm outline-none focus:border-brand"
              style={{ background: "var(--card)" }}
            >
              <option value="">Bairro…</option>
              {bairros.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      {aviso && (
        <p className="mt-4 text-sm" style={{ color: "var(--medio)" }} role="status">
          {aviso}
        </p>
      )}

      <div aria-live="polite">
        {resultado && (
          <m.div
            key={modo?.tipo === "bairro" ? modo.bairro : "local"}
            initial={reduzir ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="mt-8"
          >
            <p className="text-sm text-muted mb-4">
              {modo?.tipo === "local"
                ? modo.simulado
                  ? "Na cidade de exemplo, a sua localização é simulada no centro."
                  : "O mais perto de você, em linha reta."
                : `No bairro ${modo?.tipo === "bairro" ? modo.bairro : ""}.`}
            </p>
            <div className="grid md:grid-cols-3 gap-4">
              {GRUPOS.map((g) => (
                <div key={g.chave} className="rounded-3xl border border-border p-4 sm:p-5" style={{ background: "var(--card)" }}>
                  <h3 className="flex items-center gap-2 font-semibold">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: g.cor }} aria-hidden />
                    {g.titulo}
                  </h3>
                  {resultado[g.chave].length ? (
                    <ul className="mt-3 space-y-3">
                      {resultado[g.chave].map((l) => (
                        <Cartao key={l.id} l={l} municipio={municipio} />
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted mt-3">{g.vazio}</p>
                  )}
                </div>
              ))}
            </div>
          </m.div>
        )}
      </div>
    </section>
  );
}
