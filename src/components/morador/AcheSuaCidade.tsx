"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { decodificarPontos } from "@/lib/mapa-municipios";

// ── ACHE SUA CIDADE ──
//
// O morador não sabe (nem precisa saber) que a busca era "estado, depois
// município". Ele digita o nome da cidade, e pronto: as sugestões saem dos
// 5.571 municípios, no próprio celular, enquanto digita, sem acento, sem
// maiúscula. "boa esperanca es" também serve, para separar as seis Boas
// Esperanças do país.
//
// E há o atalho que nenhum portal tem: "Estou aqui". O celular diz onde a
// pessoa está, e a cidade sai do mapa da própria home, que já sabe a posição
// da sede de cada município. A localização não sai do aparelho: a conta é
// feita aqui, contra a lista, e nada é enviado a servidor nenhum.

type Linha = readonly [codigo: string, nome: string, uf: string, populacao: number];

let listaEmCache: Promise<Linha[]> | null = null;
function carregarLista(): Promise<Linha[]> {
  listaEmCache ??= fetch("/api/municipios/lista")
    .then((r) => (r.ok ? (r.json() as Promise<Linha[]>) : Promise.reject(new Error("lista"))))
    .catch((e) => {
      listaEmCache = null;
      throw e;
    });
  return listaEmCache;
}

const UFS = new Set("AC AL AM AP BA CE DF ES GO MA MG MS MT PA PB PE PI PR RJ RN RO RR RS SC SE SP TO".split(" "));

export const normalizar = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9 ]/g, " ").replace(/\s+/g, " ").trim().toLowerCase();

/** As melhores sugestões para o que foi digitado. Exportada para teste. */
export function sugerir(lista: readonly Linha[], digitado: string, quantas = 6): Linha[] {
  let termo = normalizar(digitado);
  if (!termo) return [];
  // "boa esperanca es": a última palavra, se for sigla de estado, filtra.
  let uf: string | null = null;
  const partes = termo.split(" ");
  if (partes.length > 1 && UFS.has(partes[partes.length - 1].toUpperCase())) {
    uf = partes.pop()!.toUpperCase();
    termo = partes.join(" ");
  }
  const pontuados: { l: Linha; nota: number }[] = [];
  for (const l of lista) {
    if (uf && l[2] !== uf) continue;
    const nome = normalizar(l[1]);
    let nota = -1;
    if (nome === termo) nota = 3;
    else if (nome.startsWith(termo)) nota = 2;
    else if (nome.includes(" " + termo)) nota = 1;
    else if (termo.length >= 3 && nome.includes(termo)) nota = 0;
    if (nota >= 0) pontuados.push({ l, nota });
  }
  // Empate se desfaz pela população: quem digita "santa" quer Santa Maria
  // antes de Santa Maria do Herval.
  pontuados.sort((a, b) => b.nota - a.nota || b.l[3] - a.l[3]);
  return pontuados.slice(0, quantas).map((p) => p.l);
}

// Mapa da home: projeção equirretangular calibrada nas sedes de dez capitais
// (erro abaixo de 1 unidade, uns 4 km). Ver lib/mapa-municipios.ts.
const paraMapa = (lat: number, lon: number) => ({ x: 24.0686 * lon + 1780.593, y: -24.8884 * lat + 137.0145 });

/** O município cuja sede está mais perto da posição. Exportada para teste. */
export function maisProximo(lat: number, lon: number, pontos: Float32Array): { indice: number; distanciaKm: number } {
  const { x, y } = paraMapa(lat, lon);
  let melhor = 0;
  let menor = Infinity;
  for (let i = 0; i < pontos.length / 2; i++) {
    const d = (pontos[i * 2] - x) ** 2 + (pontos[i * 2 + 1] - y) ** 2;
    if (d < menor) {
      menor = d;
      melhor = i;
    }
  }
  // Uma unidade do mapa ≈ 4,6 km (111 km por grau ÷ 24 unidades por grau).
  return { indice: melhor, distanciaKm: Math.sqrt(menor) * 4.6 };
}

const fmtPop = (n: number) =>
  n >= 1_000_000
    ? `${(n / 1_000_000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} milhão de moradores`.replace("milhão", n >= 2_000_000 ? "milhões" : "milhão")
    : n >= 1000
    ? `${Math.round(n / 1000).toLocaleString("pt-BR")} mil moradores`
    : `${n} moradores`;

export default function AcheSuaCidade({
  destino = (codigo) => `/?para=morador&m=${codigo}`,
  compacto = false,
}: {
  destino?: (codigo: string) => string;
  /** Versão menor, para trocar de cidade depois de escolhida. */
  compacto?: boolean;
}) {
  const router = useRouter();
  const [lista, setLista] = useState<Linha[] | null>(null);
  const [texto, setTexto] = useState("");
  const [aberto, setAberto] = useState(false);
  const [ativo, setAtivo] = useState(0);
  const [indo, setIndo] = useState<string | null>(null);
  const [local, setLocal] = useState<
    | { estado: "procurando" }
    | { estado: "achou"; linha: Linha }
    | { estado: "erro"; texto: string }
    | null
  >(null);
  const caixa = useRef<HTMLDivElement>(null);

  const preparar = () => {
    if (!lista) carregarLista().then(setLista).catch(() => undefined);
  };

  const sugestoes = useMemo(() => (lista ? sugerir(lista, texto) : []), [lista, texto]);

  useEffect(() => {
    const fora = (e: MouseEvent) => {
      if (caixa.current && !caixa.current.contains(e.target as Node)) setAberto(false);
    };
    document.addEventListener("mousedown", fora);
    return () => document.removeEventListener("mousedown", fora);
  }, []);

  const ir = (l: Linha) => {
    setIndo(l[1]);
    setAberto(false);
    setTexto(`${l[1]}, ${l[2]}`);
    router.push(destino(l[0]), { scroll: false });
    // A página muda logo abaixo; leva o olhar até ela.
    setTimeout(() => document.getElementById("sua-cidade")?.scrollIntoView({ behavior: "smooth", block: "start" }), 450);
  };

  const estouAqui = () => {
    if (!("geolocation" in navigator)) {
      setLocal({ estado: "erro", texto: "Este aparelho não informa a localização. Digite o nome da cidade." });
      return;
    }
    setLocal({ estado: "procurando" });
    preparar();
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const todas = lista ?? (await carregarLista());
          setLista(todas);
          const { indice, distanciaKm } = maisProximo(pos.coords.latitude, pos.coords.longitude, decodificarPontos());
          // Fora do Brasil (ou bem longe de qualquer sede): melhor perguntar.
          if (distanciaKm > 80) {
            setLocal({ estado: "erro", texto: "Parece que você está fora do Brasil agora. Digite o nome da cidade." });
            return;
          }
          setLocal({ estado: "achou", linha: todas[indice] });
        } catch {
          setLocal({ estado: "erro", texto: "Não deu para carregar a lista de cidades. Tente de novo." });
        }
      },
      (erro) =>
        setLocal({
          estado: "erro",
          texto:
            erro.code === erro.PERMISSION_DENIED
              ? "Sem permissão para ver a localização. Tudo bem: digite o nome da cidade."
              : "Não deu para achar a localização agora. Digite o nome da cidade.",
        }),
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 600_000 }
    );
  };

  const teclas = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!sugestoes.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setAberto(true);
      setAtivo((a) => (a + 1) % sugestoes.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setAtivo((a) => (a - 1 + sugestoes.length) % sugestoes.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      ir(sugestoes[ativo] ?? sugestoes[0]);
    } else if (e.key === "Escape") {
      setAberto(false);
    }
  };

  const altura = compacto ? "h-14 text-base" : "h-16 sm:h-[72px] text-lg sm:text-xl";

  return (
    <div ref={caixa} className="relative w-full">
      <div className="flex flex-col sm:flex-row gap-2.5">
        <label className="relative flex-1 block">
          <span className="sr-only">Nome da sua cidade</span>
          <svg aria-hidden viewBox="0 0 24 24" className="absolute left-5 top-1/2 -translate-y-1/2 w-6 h-6 text-muted pointer-events-none" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" strokeLinecap="round" />
          </svg>
          <input
            type="text"
            inputMode="search"
            autoComplete="off"
            enterKeyHint="search"
            role="combobox"
            aria-expanded={aberto && sugestoes.length > 0}
            aria-controls="sugestoes-cidade"
            aria-autocomplete="list"
            value={texto}
            placeholder="Digite o nome da sua cidade"
            onFocus={() => {
              preparar();
              setAberto(true);
            }}
            onChange={(e) => {
              setTexto(e.target.value);
              setAtivo(0);
              setAberto(true);
              preparar();
            }}
            onKeyDown={teclas}
            className={`campo-morador w-full rounded-full border border-border pl-14 pr-5 font-medium placeholder:text-muted ${altura}`}
            style={{ background: "var(--card)" }}
          />
        </label>
        <button
          type="button"
          onClick={estouAqui}
          className={`shrink-0 inline-flex items-center justify-center gap-2.5 rounded-full border px-6 font-semibold transition hover:opacity-90 ${compacto ? "h-14" : "h-16 sm:h-[72px]"}`}
          style={{ borderColor: "color-mix(in oklab, var(--brand) 50%, var(--border))", color: "var(--brand-claro)", background: "var(--brand-tint)" }}
        >
          <svg aria-hidden viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 21s-7-6.1-7-11.5a7 7 0 1 1 14 0C19 14.9 12 21 12 21Z" />
            <circle cx="12" cy="9.5" r="2.5" />
          </svg>
          {local?.estado === "procurando" ? "Procurando…" : "Estou aqui"}
        </button>
      </div>

      {aberto && texto.trim() && (
        <ul
          id="sugestoes-cidade"
          role="listbox"
          className="absolute z-20 left-0 right-0 sm:right-auto sm:w-[min(100%,560px)] mt-2 rounded-3xl border border-border overflow-hidden"
          style={{ background: "var(--card)", boxShadow: "var(--shadow-lg)" }}
        >
          {!lista && <li className="px-5 py-4 text-muted">Carregando as cidades…</li>}
          {lista && sugestoes.length === 0 && (
            <li className="px-5 py-4 text-muted">Nenhuma cidade com esse nome. Confira a escrita.</li>
          )}
          {sugestoes.map((l, i) => (
            <li key={l[0]} role="option" aria-selected={i === ativo}>
              <button
                type="button"
                onMouseEnter={() => setAtivo(i)}
                onClick={() => ir(l)}
                className="w-full text-left px-5 py-3.5 flex items-baseline justify-between gap-4 transition"
                style={i === ativo ? { background: "var(--brand-tint)" } : undefined}
              >
                <span className="font-semibold text-lg">
                  {l[1]} <span className="text-muted font-normal">· {l[2]}</span>
                </span>
                {l[3] > 0 && <span className="text-xs text-muted shrink-0">{fmtPop(l[3])}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}

      {local?.estado === "achou" && (
        <div
          className="mt-3 rounded-3xl border p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3"
          style={{ borderColor: "color-mix(in oklab, var(--brand) 45%, var(--border))", background: "var(--brand-tint)" }}
        >
          <p className="text-lg">
            Você está em <strong>{local.linha[1]}, {local.linha[2]}</strong>?
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => ir(local.linha)}
              className="rounded-full px-5 py-2.5 font-semibold"
              style={{ background: "var(--brand)", color: "var(--sobre-forte)" }}
            >
              Sim, é aqui
            </button>
            <button type="button" onClick={() => setLocal(null)} className="rounded-full px-5 py-2.5 font-medium text-muted hover:text-foreground">
              Não
            </button>
          </div>
        </div>
      )}
      {local?.estado === "erro" && <p className="mt-3 text-sm text-muted">{local.texto}</p>}
      {indo && <p className="sr-only" aria-live="polite">Abrindo {indo}…</p>}
    </div>
  );
}
