"use client";

import { useState, useTransition } from "react";
import { importarRgfDoSiconfi } from "./actions";
import { IconDownload } from "@/components/icons";

const MESES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

export default function BotaoImportar() {
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  function importar() {
    setErro(null);
    setOk(null);
    iniciar(async () => {
      const r = await importarRgfDoSiconfi();
      if (r.ok) {
        setOk(
          `Importado o período encerrado em ${MESES[r.mesReferencia - 1]} de ${r.exercicio}: ` +
            `${r.percentual.toFixed(2).replace(".", ",")}% da RCL ajustada.`
        );
      } else {
        setErro(r.erro);
      }
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={importar}
        disabled={pendente}
        className="self-start inline-flex items-center gap-2 bg-brand hover:bg-brand-dark text-white font-semibold text-sm rounded-lg px-5 py-2.5 transition disabled:opacity-50"
      >
        <IconDownload className="w-4 h-4" />
        {pendente ? "Buscando no Tesouro…" : "Importar do Tesouro (RGF)"}
      </button>

      <p className="text-xs text-muted leading-relaxed max-w-xl">
        Busca o Relatório de Gestão Fiscal mais recente que a prefeitura já
        publicou no SICONFI e preenche o período sozinho. São os mesmos números
        que o Tribunal de Contas olha. Sem cadastro, sem senha — o dado é
        público.
      </p>

      {erro && (
        <p
          className="text-sm rounded-lg px-3 py-2 max-w-xl leading-relaxed"
          style={{ background: "var(--urgente-tint)", color: "var(--urgente)" }}
        >
          {erro}
        </p>
      )}
      {ok && !erro && (
        <p
          className="text-sm rounded-lg px-3 py-2 max-w-xl leading-relaxed"
          style={{ background: "var(--info-tint)", color: "var(--info)" }}
        >
          {ok}
        </p>
      )}
    </div>
  );
}
