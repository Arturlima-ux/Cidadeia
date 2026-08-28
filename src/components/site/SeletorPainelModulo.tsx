"use client";

import { useState } from "react";
import PainelExecutivo from "@/components/PainelExecutivo";
import { PAINEIS_MODULOS } from "@/lib/paineis-modulos";

export default function SeletorPainelModulo() {
  const [ativo, setAtivo] = useState(0);
  const painel = PAINEIS_MODULOS[ativo];

  return (
    <div>
      <div className="flex flex-wrap items-center justify-center gap-2 mb-8">
        {PAINEIS_MODULOS.map((p, i) => (
          <button
            key={p.chave}
            type="button"
            onClick={() => setAtivo(i)}
            className={`text-xs font-semibold rounded-full px-4 py-2 transition border ${
              i === ativo
                ? "bg-brand text-white border-brand"
                : "bg-card text-muted border-border hover:border-brand/40 hover:text-foreground"
            }`}
          >
            {p.nomeModulo}
          </button>
        ))}
      </div>

      <PainelExecutivo
        key={painel.chave}
        nomePrefeitura="Prefeitura Modelo"
        metricas={painel.metricas}
        eficienciaPct={painel.eficienciaPct}
        eficienciaLabel={painel.eficienciaLabel}
        alerta={painel.alerta}
      />
      <p className="text-xs text-muted text-center mt-4">
        Exemplo ilustrativo com dados fictícios — mesmo painel, cada módulo mostra as métricas da própria área.
      </p>
    </div>
  );
}
