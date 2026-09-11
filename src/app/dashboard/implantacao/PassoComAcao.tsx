"use client";

import { useState, useTransition } from "react";
import { confirmarMunicipio } from "./actions";
import { importarRgfDoSiconfi } from "../pessoal/actions";
import type { ChavePasso } from "@/lib/implantacao";

const MESES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

/**
 * Botão dos dois passos que se resolvem na própria tela — reconhecer o
 * município no IBGE e buscar o RGF no Tesouro. Os demais passos levam a
 * outra tela, e são um <Link> simples na página.
 *
 * Reaproveita a MESMA ação que a tela de Despesa com pessoal usa para
 * importar o RGF. Não é cópia: se a regra de importação mudar lá, muda aqui.
 */
export default function PassoComAcao({
  chave,
  rotulo,
  desabilitado,
}: {
  chave: Extract<ChavePasso, "municipio" | "tesouro">;
  rotulo: string;
  desabilitado?: boolean;
}) {
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  function executar() {
    setErro(null);
    setOk(null);
    iniciar(async () => {
      if (chave === "municipio") {
        const r = await confirmarMunicipio();
        if (r.ok) setOk(`Encontrado: ${r.municipio}/${r.estado}, código IBGE ${r.codigoIbge}.`);
        else setErro(r.erro);
        return;
      }
      const r = await importarRgfDoSiconfi();
      if (r.ok) {
        setOk(
          `Importado o período encerrado em ${MESES[r.mesReferencia - 1]} de ${r.exercicio}: ` +
            `${r.percentual.toFixed(2).replace(".", ",")}% da RCL ajustada com pessoal.`
        );
      } else {
        setErro(r.erro);
      }
    });
  }

  return (
    <div className="flex flex-col gap-2.5">
      <button
        type="button"
        onClick={executar}
        disabled={pendente || desabilitado}
        className="self-start bg-brand hover:bg-brand-dark text-white font-semibold text-sm rounded-full px-4 py-2 transition disabled:opacity-50"
      >
        {pendente ? (chave === "municipio" ? "Consultando o IBGE…" : "Buscando no Tesouro…") : rotulo}
      </button>
      {erro && (
        <p
          className="text-sm rounded-lg px-3 py-2 leading-relaxed"
          style={{ background: "var(--urgente-tint)", color: "var(--urgente)" }}
        >
          {erro}
        </p>
      )}
      {ok && !erro && (
        <p
          className="text-sm rounded-lg px-3 py-2 leading-relaxed"
          style={{ background: "var(--info-tint)", color: "var(--info)" }}
        >
          {ok}
        </p>
      )}
    </div>
  );
}
