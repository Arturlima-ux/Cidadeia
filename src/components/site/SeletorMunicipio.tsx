"use client";

import { useMemo, useState } from "react";
import { municipiosDaUf, type Municipio } from "@/lib/municipios";
import { ESTADOS } from "@/lib/estados";

// ── O GESTO ÚNICO DO HERÓI ──
//
// É um `<form method="get">` de verdade, e não um componente que navega por
// JavaScript. A home é a porta do funil: ela precisa funcionar antes de
// hidratar, no celular ruim de um assessor em horário de pico, e o resultado
// precisa ser um endereço que a pessoa copia e manda para o prefeito.
//
// O estado local existe só para a segunda caixa saber quais municípios listar.
// Sem JavaScript, a lista vem vazia e o visitante digita o código; com
// JavaScript, ele escolhe pelo nome. Nos dois casos o envio é o mesmo GET.

export default function SeletorMunicipio({ inicial }: { inicial?: Municipio | null }) {
  const [uf, setUf] = useState(inicial?.uf ?? "");
  const municipios = useMemo<Municipio[]>(() => (uf ? municipiosDaUf(uf) : []), [uf]);

  return (
    <form method="get" action="/" className="flex flex-wrap items-end gap-3">
      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted">Estado</span>
        <select
          name="uf"
          value={uf}
          onChange={(e) => setUf(e.target.value)}
          className="rounded-lg border border-border bg-card px-3 py-2.5 text-sm outline-none focus:border-brand"
        >
          <option value="">Selecione</option>
          {ESTADOS.map((u) => (
            <option key={u} value={u}>
              {u}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1.5 min-w-0 flex-1">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted">Município</span>
        <select
          name="m"
          defaultValue={inicial?.codigo ?? ""}
          disabled={municipios.length === 0}
          className="w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm outline-none focus:border-brand disabled:opacity-50"
        >
          <option value="">{uf ? "Selecione" : "Escolha o estado primeiro"}</option>
          {municipios.map((m) => (
            <option key={m.codigo} value={m.codigo}>
              {m.nome}
            </option>
          ))}
        </select>
      </label>

      <button
        type="submit"
        className="elevar bg-brand hover:bg-brand-dark text-white text-sm font-semibold rounded-lg px-5 py-2.5 transition"
        style={{ color: "var(--sobre-forte)" }}
      >
        Ver os números
      </button>
    </form>
  );
}
