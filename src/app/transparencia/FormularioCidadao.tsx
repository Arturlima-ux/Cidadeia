"use client";

import { useState, useTransition } from "react";
import { abrirAtendimento, consultarAtendimento, type ResultadoConsulta } from "./actions";
import { TIPOS, permiteAnonimo, linkWhatsApp, type TipoAtendimento } from "@/lib/atendimento";

const classeInput =
  "w-full rounded-lg border border-border px-3.5 py-2.5 text-sm outline-none focus:border-brand transition bg-card";

export default function FormularioCidadao({
  slug,
  whatsappNumero,
}: {
  slug: string;
  whatsappNumero: string | null;
}) {
  const [aba, setAba] = useState<"abrir" | "consultar">("abrir");

  return (
    <div>
      <div className="flex gap-2 mb-5">
        <button
          type="button"
          onClick={() => setAba("abrir")}
          className={`text-sm font-semibold rounded-full px-4 py-2 transition border ${
            aba === "abrir"
              ? "bg-brand text-white border-brand"
              : "bg-card text-muted border-border hover:border-brand/40"
          }`}
        >
          Abrir manifestação
        </button>
        <button
          type="button"
          onClick={() => setAba("consultar")}
          className={`text-sm font-semibold rounded-full px-4 py-2 transition border ${
            aba === "consultar"
              ? "bg-brand text-white border-brand"
              : "bg-card text-muted border-border hover:border-brand/40"
          }`}
        >
          Consultar protocolo
        </button>
      </div>

      {aba === "abrir" ? (
        <Abrir slug={slug} whatsappNumero={whatsappNumero} />
      ) : (
        <Consultar />
      )}
    </div>
  );
}

function Abrir({ slug, whatsappNumero }: { slug: string; whatsappNumero: string | null }) {
  const [tipo, setTipo] = useState<TipoAtendimento>("protocolo");
  const [anonimo, setAnonimo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<{ protocolo: string; chave: string; assunto: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const aceitaAnonimo = permiteAnonimo(tipo);

  function enviar(formData: FormData) {
    setErro(null);
    const assunto = String(formData.get("assunto") ?? "");
    startTransition(async () => {
      const r = await abrirAtendimento(formData);
      if (r.ok) setSucesso({ protocolo: r.protocolo, chave: r.chave, assunto });
      else setErro(r.erro);
    });
  }

  if (sucesso) {
    const wa = linkWhatsApp(whatsappNumero, sucesso.protocolo, sucesso.assunto);
    return (
      <div
        className="arco-card border p-6"
        style={{ background: "var(--info-tint)", borderColor: "var(--info-borda)" }}
      >
        <p className="font-serif text-xl font-bold" style={{ color: "var(--info)" }}>
          Manifestação registrada
        </p>
        <p className="text-sm mt-2 leading-relaxed">
          Guarde estes dois códigos — eles são a única forma de acompanhar sua
          manifestação. Não é possível recuperá-los depois.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
          <div className="bg-card border border-border rounded-lg p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">Protocolo</p>
            <p className="font-mono text-lg font-bold tabular-nums mt-0.5">{sucesso.protocolo}</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
              Chave de consulta
            </p>
            <p className="font-mono text-lg font-bold tabular-nums mt-0.5">{sucesso.chave}</p>
          </div>
        </div>

        {wa && (
          <a
            href={wa}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 mt-4 bg-brand hover:bg-brand-dark text-white font-semibold text-sm rounded-full px-5 py-2.5 transition"
          >
            Enviar também por WhatsApp →
          </a>
        )}

        <button
          type="button"
          onClick={() => setSucesso(null)}
          className="block mt-4 text-sm font-semibold text-brand hover:underline"
        >
          Abrir outra manifestação
        </button>
      </div>
    );
  }

  return (
    <form action={enviar} className="arco-card bg-card border border-border p-5 space-y-4">
      <input type="hidden" name="slug" value={slug} />
      <input
        type="text"
        name="site"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="absolute -left-[9999px] w-px h-px opacity-0"
      />

      <div>
        <label className="block text-sm font-medium mb-1.5">Tipo de manifestação</label>
        <select
          name="tipo"
          value={tipo}
          onChange={(e) => {
            const novo = e.target.value as TipoAtendimento;
            setTipo(novo);
            if (!permiteAnonimo(novo)) setAnonimo(false);
          }}
          className={classeInput}
        >
          {TIPOS.map((t) => (
            <option key={t.chave} value={t.chave}>
              {t.nome}
            </option>
          ))}
        </select>
        <p className="text-xs text-muted mt-1">
          {TIPOS.find((t) => t.chave === tipo)?.descricao}
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1.5">Assunto</label>
        <input name="assunto" required maxLength={200} placeholder="ex: Poda de árvore na Rua X" className={classeInput} />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1.5">Mensagem</label>
        <textarea
          name="mensagem"
          required
          rows={5}
          maxLength={5000}
          placeholder="Descreva com o máximo de detalhe possível (local, quando aconteceu, o que você observou)."
          className={classeInput}
        />
      </div>

      {aceitaAnonimo && (
        <label className="flex items-start gap-2.5 text-sm cursor-pointer">
          <input
            type="checkbox"
            name="anonimo"
            checked={anonimo}
            onChange={(e) => setAnonimo(e.target.checked)}
            className="mt-0.5"
          />
          <span>
            Quero me manifestar de forma <strong>anônima</strong>
            <span className="block text-xs text-muted mt-0.5">
              Seus dados não serão registrados. A prefeitura não terá como
              responder diretamente — acompanhe pelo protocolo.
            </span>
          </span>
        </label>
      )}

      {!anonimo && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1.5">Nome</label>
            <input name="nome" maxLength={120} className={classeInput} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">E-mail</label>
            <input name="email" type="email" maxLength={160} className={classeInput} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Telefone</label>
            <input name="telefone" maxLength={30} className={classeInput} />
          </div>
        </div>
      )}

      {erro && (
        <p
          className="text-sm rounded-lg px-3 py-2 border"
          style={{
            color: "var(--urgente)",
            background: "var(--urgente-tint)",
            borderColor: "var(--urgente-borda)",
          }}
        >
          {erro}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="bg-brand hover:bg-brand-dark text-white font-semibold text-sm rounded-full px-6 py-3 transition disabled:opacity-60"
      >
        {pending ? "Registrando..." : "Registrar manifestação"}
      </button>
    </form>
  );
}

function Consultar() {
  const [resultado, setResultado] = useState<ResultadoConsulta | null>(null);
  const [pending, startTransition] = useTransition();

  function enviar(formData: FormData) {
    startTransition(async () => setResultado(await consultarAtendimento(formData)));
  }

  return (
    <div className="space-y-4">
      <form action={enviar} className="arco-card bg-card border border-border p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1.5">Número do protocolo</label>
            <input name="protocolo" required placeholder="202603-ABC123" className={classeInput} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Chave de consulta</label>
            <input name="chave" required placeholder="ABCD2345" className={classeInput} />
          </div>
        </div>
        <button
          type="submit"
          disabled={pending}
          className="bg-brand hover:bg-brand-dark text-white font-semibold text-sm rounded-full px-6 py-2.5 transition disabled:opacity-60"
        >
          {pending ? "Consultando..." : "Consultar"}
        </button>
      </form>

      {resultado && !resultado.ok && (
        <p
          className="text-sm rounded-lg px-3 py-2 border"
          style={{
            color: "var(--urgente)",
            background: "var(--urgente-tint)",
            borderColor: "var(--urgente-borda)",
          }}
        >
          {resultado.erro}
        </p>
      )}

      {resultado?.ok && (
        <div className="arco-card bg-card border border-border p-5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-mono font-bold">{resultado.protocolo}</p>
            <span className="text-xs font-semibold rounded-full px-2.5 py-1 bg-brand-tint text-brand">
              {resultado.status}
            </span>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
              {resultado.tipo}
            </p>
            <p className="font-medium text-sm mt-0.5">{resultado.assunto}</p>
            <p className="text-sm text-muted mt-1 whitespace-pre-line leading-relaxed">
              {resultado.mensagem}
            </p>
          </div>
          {resultado.resposta ? (
            <div className="border-t border-border pt-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-brand">
                Resposta da prefeitura
              </p>
              <p className="text-sm mt-1 whitespace-pre-line leading-relaxed">
                {resultado.resposta}
              </p>
            </div>
          ) : (
            <p className="text-xs text-muted border-t border-border pt-3">
              Ainda sem resposta da prefeitura.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
