"use client";

import { useState, useTransition } from "react";
import { registrarDecisaoObra } from "./actions";
import {
  OPCOES_DECISAO,
  MINIMO_JUSTIFICATIVA,
  opcaoDe,
  type TipoDecisaoObra,
} from "@/lib/decisao-obra";

/**
 * ── ONDE A DECISÃO VIRA DOCUMENTO ──
 *
 * O radar aponta a obra cujo prazo acabou sem conclusão. Antes disto, o gestor
 * via o problema e não tinha onde registrar o que decidiu — e quando o
 * Tribunal de Contas perguntasse, dois anos depois, por que a obra ficou
 * parada, não haveria resposta escrita em lugar nenhum.
 *
 * ── AS OPÇÕES NÃO SÃO UM MENU INVENTADO ──
 *
 * Saem do art. 111 da Lei 14.133/2021. Obra é contratação de escopo
 * predefinido: a vigência prorroga automaticamente quando o objeto não é
 * concluído. O que não prorroga sozinho é a responsabilidade — culpa do
 * contratado o constitui em mora com sanções, e a Administração pode optar
 * pela extinção.
 *
 * Cada opção mostra o que está sendo afirmado e o dispositivo em que se apoia,
 * porque quem escolhe precisa saber o que assinou embaixo.
 */
export default function FormDecisao({
  obraId,
  prefeituraId,
  nomeDaObra,
}: {
  obraId: string;
  prefeituraId: string;
  nomeDaObra: string;
}) {
  const [aberto, setAberto] = useState(false);
  const [tipo, setTipo] = useState<TipoDecisaoObra>("prorrogacao_automatica");
  const [justificativa, setJustificativa] = useState("");
  const [novaPrevisao, setNovaPrevisao] = useState("");
  const [documento, setDocumento] = useState("");
  const [erros, setErros] = useState<{ campo: string; mensagem: string }[]>([]);
  const [avisoGeral, setAvisoGeral] = useState<string | null>(null);
  const [salvando, iniciar] = useTransition();

  const opcao = opcaoDe(tipo);
  const faltam = MINIMO_JUSTIFICATIVA - justificativa.trim().length;
  const erroDe = (campo: string) => erros.find((e) => e.campo === campo)?.mensagem;

  function salvar() {
    setErros([]);
    setAvisoGeral(null);
    iniciar(async () => {
      const r = await registrarDecisaoObra(prefeituraId, {
        obraId,
        tipo,
        justificativa,
        novaPrevisao: opcao.exigeData ? novaPrevisao || null : null,
        documento: documento || null,
      });
      if (r.ok) {
        setAberto(false);
        setJustificativa("");
        setDocumento("");
        return;
      }
      setErros(r.problemas ?? []);
      setAvisoGeral(r.problemas?.length ? null : r.erro);
    });
  }

  if (!aberto) {
    return (
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="mt-3 text-sm font-semibold border border-border rounded-lg px-4 py-2 hover:border-brand hover:text-brand transition"
      >
        Registrar decisão
      </button>
    );
  }

  return (
    <div className="mt-3 border border-border rounded-xl p-4">
      <p className="text-sm font-semibold">Decisão sobre {nomeDaObra}</p>
      <p className="text-xs text-muted mt-1 leading-relaxed">
        As opções abaixo são as hipóteses do art. 111 da Lei 14.133/2021, mais duas
        administrativas. A justificativa é o que responde ao Tribunal de Contas depois.
      </p>

      <fieldset className="mt-4">
        <legend className="text-xs font-medium mb-2">O que foi decidido</legend>
        <div className="flex flex-col gap-2">
          {OPCOES_DECISAO.map((o) => (
            <label
              key={o.tipo}
              className="flex gap-2.5 items-start cursor-pointer rounded-lg px-3 py-2.5 border transition"
              style={{
                borderColor: tipo === o.tipo ? "var(--brand)" : "var(--border)",
                background: tipo === o.tipo ? "var(--info-tint)" : undefined,
              }}
            >
              <input
                type="radio"
                name={`decisao-${obraId}`}
                checked={tipo === o.tipo}
                onChange={() => setTipo(o.tipo)}
                className="mt-1 shrink-0"
              />
              <span className="min-w-0">
                <span className="text-sm font-medium block">{o.rotulo}</span>
                <span className="text-xs text-muted block mt-0.5 leading-relaxed">
                  {o.significado}
                </span>
                {o.base && (
                  <span className="text-xs block mt-1" style={{ color: "var(--brand)" }}>
                    {o.base}
                  </span>
                )}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      {opcao.afirmaCulpa && (
        <p
          className="text-xs rounded-lg px-3 py-2.5 mt-3 leading-relaxed"
          style={{ background: "var(--medio-tint)", color: "var(--medio)" }}
        >
          Esta decisão afirma culpa do contratado e abre consequência para ele. A justificativa
          precisa sustentar isso — é ela que será lida se houver contestação.
        </p>
      )}

      <div className="mt-4">
        <label className="block text-xs font-medium mb-1" htmlFor={`just-${obraId}`}>
          Justificativa
        </label>
        <textarea
          id={`just-${obraId}`}
          value={justificativa}
          onChange={(e) => setJustificativa(e.target.value)}
          rows={4}
          className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-brand resize-y"
          placeholder="O que aconteceu, o que foi apurado e por que esta é a decisão."
        />
        <p className="text-xs text-muted mt-1">
          {faltam > 0
            ? `Faltam ${faltam} caracteres.`
            : `${justificativa.trim().length} caracteres.`}
        </p>
        {erroDe("justificativa") && (
          <p className="text-xs mt-1" style={{ color: "var(--urgente)" }}>
            {erroDe("justificativa")}
          </p>
        )}
      </div>

      <div className="grid sm:grid-cols-2 gap-3 mt-3">
        {opcao.exigeData && (
          <div>
            <label className="block text-xs font-medium mb-1" htmlFor={`data-${obraId}`}>
              {tipo === "concluida" ? "Concluída em" : "Previsão de conclusão"}
            </label>
            <input
              id={`data-${obraId}`}
              type="date"
              value={novaPrevisao}
              onChange={(e) => setNovaPrevisao(e.target.value)}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-brand"
            />
            {erroDe("novaPrevisao") && (
              <p className="text-xs mt-1" style={{ color: "var(--urgente)" }}>
                {erroDe("novaPrevisao")}
              </p>
            )}
          </div>
        )}
        <div>
          <label className="block text-xs font-medium mb-1" htmlFor={`doc-${obraId}`}>
            Processo ou ofício <span className="text-muted">(opcional)</span>
          </label>
          <input
            id={`doc-${obraId}`}
            value={documento}
            onChange={(e) => setDocumento(e.target.value)}
            className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-brand"
            placeholder="Processo 1234/2026"
          />
        </div>
      </div>

      {avisoGeral && (
        <p
          className="text-sm rounded-lg px-3 py-2.5 mt-3"
          style={{ background: "var(--urgente-tint)", color: "var(--urgente)" }}
        >
          {avisoGeral}
        </p>
      )}

      <div className="flex gap-2 mt-4">
        <button
          type="button"
          onClick={salvar}
          disabled={salvando}
          className="bg-brand hover:bg-brand-dark text-white font-semibold text-sm rounded-lg px-4 py-2 transition disabled:opacity-50"
        >
          {salvando ? "Registrando…" : "Registrar"}
        </button>
        <button
          type="button"
          onClick={() => setAberto(false)}
          className="text-sm font-semibold border border-border rounded-lg px-4 py-2 hover:border-brand transition"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
