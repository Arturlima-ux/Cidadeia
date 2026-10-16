"use client";

import { useEffect, useMemo, useState, useSyncExternalStore, useTransition } from "react";
import { abrirAtendimento, avaliarAtendimento, consultarAtendimento, type ResultadoConsulta } from "./actions";
import { NOTAS, rotuloDaNota, type Avaliacao, type Nota } from "@/lib/avaliacao-cidadao";
import { TIPOS, permiteAnonimo, linkWhatsApp, type TipoAtendimento } from "@/lib/atendimento";
import { OPCOES_DE_AREA } from "@/lib/ouvidoria-avisos";
import { EVENTO_PERGUNTAR } from "@/lib/eventos-do-portal";

const classeInput =
  "w-full rounded-lg border border-border px-3.5 py-2.5 text-sm outline-none focus:border-brand transition bg-card";

export default function FormularioCidadao({
  slug,
  whatsappNumero,
}: {
  slug: string;
  whatsappNumero: string | null;
}) {
  // O link do e-mail traz protocolo e chave: abre direto na consulta, já
  // preenchida e consultada. Lido no navegador, para a página continuar
  // estática (no servidor, a busca é vazia).
  const busca = useSyncExternalStore(
    () => () => {},
    () => window.location.search,
    () => ""
  );
  const doLink = useMemo(() => {
    const q = new URLSearchParams(busca);
    const protocolo = q.get("protocolo");
    const chave = q.get("chave");
    return protocolo && chave ? { protocolo, chave } : null;
  }, [busca]);
  const [abaEscolhida, setAba] = useState<"abrir" | "consultar" | null>(null);
  const aba = abaEscolhida ?? (doLink ? "consultar" : "abrir");

  // "Pergunte à cidade" sem resposta vira pedido de informação já
  // preenchido (components/portal/PergunteACidade.tsx manda o evento).
  const [preenchido, setPreenchido] = useState<{ assunto: string; vez: number } | null>(null);
  useEffect(() => {
    const ouvir = (e: Event) => {
      const assunto = (e as CustomEvent<{ assunto: string }>).detail?.assunto ?? "";
      setAba("abrir");
      setPreenchido((p) => ({ assunto: assunto.slice(0, 200), vez: (p?.vez ?? 0) + 1 }));
    };
    window.addEventListener(EVENTO_PERGUNTAR, ouvir);
    return () => window.removeEventListener(EVENTO_PERGUNTAR, ouvir);
  }, []);

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
        <Abrir
          key={preenchido?.vez ?? 0}
          slug={slug}
          whatsappNumero={whatsappNumero}
          inicial={preenchido ? { tipo: "informacao", assunto: preenchido.assunto } : null}
        />
      ) : (
        <Consultar key={doLink?.protocolo ?? "vazio"} inicial={doLink} />
      )}
    </div>
  );
}

function Abrir({
  slug,
  whatsappNumero,
  inicial = null,
}: {
  slug: string;
  whatsappNumero: string | null;
  inicial?: { tipo: TipoAtendimento; assunto: string } | null;
}) {
  const [tipo, setTipo] = useState<TipoAtendimento>(inicial?.tipo ?? "protocolo");
  const [anonimo, setAnonimo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<{ protocolo: string; chave: string; assunto: string; comEmail: boolean } | null>(null);
  const [pending, startTransition] = useTransition();

  const aceitaAnonimo = permiteAnonimo(tipo);

  function enviar(formData: FormData) {
    setErro(null);
    const assunto = String(formData.get("assunto") ?? "");
    const comEmail = !anonimo && String(formData.get("email") ?? "").trim() !== "";
    startTransition(async () => {
      const r = await abrirAtendimento(formData);
      if (r.ok) setSucesso({ protocolo: r.protocolo, chave: r.chave, assunto, comEmail });
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
          {sucesso.comEmail
            ? "Mandamos estes dois códigos para o seu e-mail, junto com o prazo de resposta. A resposta da prefeitura também chega por lá."
            : "Guarde estes dois códigos — eles são a única forma de acompanhar sua manifestação. Não é possível recuperá-los depois."}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
          <div className="bg-card border border-border rounded-lg p-3">
            <p className="text-xs font-semibold text-muted">Protocolo</p>
            <p className="font-mono text-lg font-bold tabular-nums mt-0.5">{sucesso.protocolo}</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-3">
            <p className="text-xs font-semibold text-muted">
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
        <label htmlFor="cid-tipo" className="block text-sm font-medium mb-1.5">Tipo de manifestação</label>
        <select
          id="cid-tipo" name="tipo"
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
        <label htmlFor="cid-assunto" className="block text-sm font-medium mb-1.5">Assunto</label>
        <input id="cid-assunto" name="assunto" required maxLength={200} defaultValue={inicial?.assunto} placeholder="ex: Poda de árvore na Rua X" className={classeInput} />
      </div>

      <div>
        <label htmlFor="cid-area" className="block text-sm font-medium mb-1.5">
          Área <span className="text-muted font-normal">(opcional)</span>
        </label>
        <select id="cid-area" name="secretaria" defaultValue="" className={classeInput}>
          <option value="">Não sei, ou outra área</option>
          {OPCOES_DE_AREA.map((o) => (
            <option key={o.valor} value={o.valor}>
              {o.nome}
            </option>
          ))}
        </select>
        <p className="text-xs text-muted mt-1.5">Ajuda a manifestação a chegar direto a quem resolve.</p>
      </div>

      <div>
        <label htmlFor="cid-mensagem" className="block text-sm font-medium mb-1.5">Mensagem</label>
        <textarea
          id="cid-mensagem" name="mensagem"
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
            <label htmlFor="cid-nome" className="block text-sm font-medium mb-1.5">Nome</label>
            <input id="cid-nome" name="nome" maxLength={120} className={classeInput} />
          </div>
          <div>
            <label htmlFor="cid-email" className="block text-sm font-medium mb-1.5">E-mail</label>
            <input id="cid-email" name="email" type="email" maxLength={160} className={classeInput} />
          </div>
          <div>
            <label htmlFor="cid-telefone" className="block text-sm font-medium mb-1.5">Telefone</label>
            <input id="cid-telefone" name="telefone" maxLength={30} className={classeInput} />
          </div>
        </div>
      )}

      {erro && (
        <p role="alert" aria-live="assertive"
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

function Consultar({ inicial }: { inicial: { protocolo: string; chave: string } | null }) {
  const [resultado, setResultado] = useState<ResultadoConsulta | null>(null);
  const [chaveUsada, setChaveUsada] = useState(inicial?.chave ?? "");
  const [pending, startTransition] = useTransition();

  function enviar(formData: FormData) {
    setChaveUsada(String(formData.get("chave") ?? ""));
    startTransition(async () => setResultado(await consultarAtendimento(formData)));
  }

  useEffect(() => {
    if (!inicial) return;
    const fd = new FormData();
    fd.set("protocolo", inicial.protocolo);
    fd.set("chave", inicial.chave);
    startTransition(async () => setResultado(await consultarAtendimento(fd)));
  }, [inicial]);

  return (
    <div className="space-y-4">
      <form action={enviar} className="arco-card bg-card border border-border p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="cid-protocolo" className="block text-sm font-medium mb-1.5">Número do protocolo</label>
            <input id="cid-protocolo" name="protocolo" required defaultValue={inicial?.protocolo} placeholder="202603-ABC123" className={classeInput} />
          </div>
          <div>
            <label htmlFor="cid-chave" className="block text-sm font-medium mb-1.5">Chave de consulta</label>
            <input id="cid-chave" name="chave" required defaultValue={inicial?.chave} placeholder="ABCD2345" className={classeInput} />
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
            <p className="text-xs font-semibold text-muted">
              {resultado.tipo}
            </p>
            <p className="font-medium text-sm mt-0.5">{resultado.assunto}</p>
            <p className="text-sm text-muted mt-1 whitespace-pre-line leading-relaxed">
              {resultado.mensagem}
            </p>
          </div>
          {resultado.resposta ? (
            <div className="border-t border-border pt-3">
              <p className="text-xs font-semibold text-brand">
                Resposta da prefeitura
              </p>
              <p className="text-sm mt-1 whitespace-pre-line leading-relaxed">
                {resultado.resposta}
              </p>
              {resultado.podeAvaliar && (
                <AvaliarResposta
                  key={resultado.protocolo}
                  protocolo={resultado.protocolo}
                  chave={chaveUsada}
                  inicial={resultado.avaliacao}
                />
              )}
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

// ── "A RESPOSTA RESOLVEU?" ── (lib/avaliacao-cidadao.ts)
function AvaliarResposta({ protocolo, chave, inicial }: { protocolo: string; chave: string; inicial: Avaliacao | null }) {
  const [dada, setDada] = useState<Avaliacao | null>(inicial);
  const [escolha, setEscolha] = useState<Nota | null>(null);
  const [comentario, setComentario] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function enviar(nota: Nota, texto: string) {
    setErro(null);
    const fd = new FormData();
    fd.set("protocolo", protocolo);
    fd.set("chave", chave);
    fd.set("nota", nota);
    fd.set("comentario", texto);
    startTransition(async () => {
      const r = await avaliarAtendimento(fd);
      if (r.ok) {
        setDada({ nota, comentario: texto.trim() || null });
        setEscolha(null);
        setComentario("");
      } else setErro(r.erro);
    });
  }

  if (dada && !escolha) {
    const cor = NOTAS.find((n) => n.valor === dada.nota)!.cor;
    return (
      <div className="mt-4 rounded-2xl border border-border p-4" role="status">
        <p className="text-sm">
          Você avaliou: <strong style={{ color: cor }}>{rotuloDaNota(dada.nota)}</strong>
        </p>
        <p className="text-xs text-muted mt-1">
          {dada.nota === "sim"
            ? "Obrigado. Sua avaliação entra na satisfação pública do portal."
            : "A equipe que respondeu já foi avisada. Sua avaliação entra na satisfação pública do portal."}
        </p>
        <button type="button" onClick={() => setEscolha(dada.nota)} className="text-xs font-semibold text-brand mt-2 underline-offset-2 hover:underline">
          Mudar avaliação
        </button>
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-2xl border border-border p-4">
      <p className="font-semibold text-sm">A resposta resolveu?</p>
      <p className="text-xs text-muted mt-0.5">Um toque. Vai direto a quem respondeu e entra na satisfação pública do portal.</p>
      <div className="flex flex-wrap gap-2 mt-3" role="group" aria-label="A resposta resolveu?">
        {NOTAS.map((n) => {
          const ativa = escolha === n.valor;
          return (
            <button
              key={n.valor}
              type="button"
              disabled={pending}
              aria-pressed={ativa}
              onClick={() => (n.valor === "sim" ? enviar("sim", "") : setEscolha(n.valor))}
              className="rounded-full border px-4 py-2 text-sm font-semibold transition disabled:opacity-60"
              style={{ borderColor: ativa ? n.cor : "var(--border)", color: ativa ? n.cor : undefined }}
            >
              {n.rotulo}
            </button>
          );
        })}
      </div>
      {escolha && escolha !== "sim" && (
        <div className="mt-3 space-y-2">
          <label htmlFor="cid-avaliacao" className="block text-xs font-medium">
            O que faltou? <span className="text-muted font-normal">(opcional)</span>
          </label>
          <textarea
            id="cid-avaliacao"
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
            maxLength={500}
            rows={3}
            className={classeInput}
            placeholder="Ex.: o buraco continua lá, ninguém veio."
          />
          <button
            type="button"
            disabled={pending}
            onClick={() => enviar(escolha, comentario)}
            className="bg-brand hover:bg-brand-dark text-white font-semibold text-sm rounded-full px-5 py-2 transition disabled:opacity-60"
          >
            {pending ? "Enviando..." : "Enviar avaliação"}
          </button>
        </div>
      )}
      {erro && (
        <p className="text-xs mt-2" style={{ color: "var(--urgente)" }} role="alert">
          {erro}
        </p>
      )}
    </div>
  );
}
