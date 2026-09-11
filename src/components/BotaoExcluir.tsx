"use client";

import { useEffect, useState, useTransition } from "react";

/**
 * Exclusão em dois cliques, sem caixa de diálogo do navegador.
 *
 * O primeiro clique troca o botão por "Confirmar exclusão"; o segundo
 * executa. Se a pessoa não confirmar em alguns segundos, volta ao normal —
 * um botão armado esquecido na tela é como excluir sem querer mais tarde.
 *
 * Não há "desfazer" porque não há lixeira: o registro some do banco. Por isso
 * o primeiro clique nunca apaga nada.
 */
export default function BotaoExcluir({
  id,
  nome,
  acao,
}: {
  id: string;
  nome: string;
  /** Ação de servidor que recebe o id. Deve devolver erro em texto, ou null. */
  acao: (id: string) => Promise<{ erro: string | null }>;
}) {
  const [armado, setArmado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();

  useEffect(() => {
    if (!armado) return;
    const t = setTimeout(() => setArmado(false), 5000);
    return () => clearTimeout(t);
  }, [armado]);

  function clicar() {
    if (!armado) {
      setArmado(true);
      return;
    }
    iniciar(async () => {
      const r = await acao(id);
      if (r.erro) {
        setErro(r.erro);
        setArmado(false);
      }
    });
  }

  return (
    <span className="inline-flex items-center gap-2 shrink-0">
      {erro && (
        <span className="text-xs" style={{ color: "var(--urgente)" }}>
          {erro}
        </span>
      )}
      <button
        type="button"
        onClick={clicar}
        disabled={pendente}
        aria-label={armado ? `Confirmar exclusão de ${nome}` : `Excluir ${nome}`}
        className="text-xs font-semibold rounded-full px-2.5 py-1 border transition disabled:opacity-50"
        style={
          armado
            ? {
                color: "#fff",
                background: "var(--urgente)",
                borderColor: "var(--urgente)",
              }
            : {
                color: "var(--muted)",
                background: "transparent",
                borderColor: "var(--border)",
              }
        }
      >
        {pendente ? "Excluindo…" : armado ? "Confirmar exclusão" : "Excluir"}
      </button>
    </span>
  );
}
