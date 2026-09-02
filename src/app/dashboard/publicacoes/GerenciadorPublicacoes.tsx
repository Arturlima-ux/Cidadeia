"use client";

import { useState, useTransition } from "react";
import {
  salvarPublicacao,
  alternarPublicado,
  removerPublicacao,
} from "./actions";
import {
  TIPOS_PUBLICACAO,
  definicaoTipo,
  NOME_TIPO_PUBLICACAO,
  type Publicacao,
  type TipoPublicacao,
} from "@/lib/publicacoes";

const classeInput =
  "w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand transition";

export default function GerenciadorPublicacoes({
  publicacoes,
  slugPortal,
}: {
  publicacoes: Publicacao[];
  slugPortal: string | null;
}) {
  const [editando, setEditando] = useState<Publicacao | null>(null);
  const [criandoTipo, setCriandoTipo] = useState<TipoPublicacao | null>(null);

  const emFormulario = editando !== null || criandoTipo !== null;

  return (
    <div className="flex flex-col gap-6">
      {!emFormulario && (
        <div className="bg-card border border-border arco-card p-6">
          <h2 className="font-serif text-lg font-bold">Publicar algo novo</h2>
          <p className="text-sm text-muted mt-1.5 leading-relaxed">
            Escolha o que está publicando. O tipo não é etiqueta: é ele que diz
            qual exigência da lei aquele conteúdo atende.
          </p>
          <div className="grid sm:grid-cols-2 gap-3 mt-5">
            {TIPOS_PUBLICACAO.map((t) => (
              <button
                key={t.chave}
                type="button"
                onClick={() => setCriandoTipo(t.chave)}
                className="text-left border border-border rounded-xl p-4 hover:border-brand transition"
              >
                <p className="font-semibold text-sm">{t.nome}</p>
                <p className="text-xs text-muted mt-1 leading-relaxed">{t.descricao}</p>
                {t.lei && (
                  <p className="text-[11px] font-mono text-brand mt-2">
                    {t.lei}, {t.artigo}
                  </p>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {emFormulario && (
        <Formulario
          publicacao={editando}
          tipo={editando?.tipo ?? criandoTipo!}
          aoFechar={() => {
            setEditando(null);
            setCriandoTipo(null);
          }}
        />
      )}

      <Lista
        publicacoes={publicacoes}
        slugPortal={slugPortal}
        aoEditar={(p) => {
          setCriandoTipo(null);
          setEditando(p);
        }}
      />
    </div>
  );
}

function Formulario({
  publicacao,
  tipo,
  aoFechar,
}: {
  publicacao: Publicacao | null;
  tipo: TipoPublicacao;
  aoFechar: () => void;
}) {
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const definicao = definicaoTipo(tipo)!;

  function enviar(formData: FormData) {
    setErro(null);
    iniciar(async () => {
      const r = await salvarPublicacao(formData);
      if (r.ok) aoFechar();
      else setErro(r.erro);
    });
  }

  return (
    <form action={enviar} className="bg-card border border-brand arco-card p-6 flex flex-col gap-4">
      <input type="hidden" name="tipo" value={tipo} />
      {publicacao && <input type="hidden" name="id" value={publicacao.id} />}

      <div>
        <h2 className="font-serif text-lg font-bold">
          {publicacao ? "Editar" : "Nova"} · {definicao.nome}
        </h2>
        {definicao.lei && (
          <p className="text-xs font-mono text-brand mt-1">
            Atende {definicao.lei}, {definicao.artigo}
          </p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium mb-1.5" htmlFor="titulo">
          {tipo === "faq" ? "A pergunta" : tipo === "estrutura" ? "Nome da secretaria" : "Título"}
        </label>
        <input
          id="titulo"
          name="titulo"
          required
          defaultValue={publicacao?.titulo ?? ""}
          className={classeInput}
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1.5" htmlFor="conteudo">
          {tipo === "faq" ? "A resposta" : tipo === "servico" ? "O que é o serviço" : "Conteúdo"}
        </label>
        <textarea
          id="conteudo"
          name="conteudo"
          required
          rows={5}
          defaultValue={publicacao?.conteudo ?? ""}
          className={classeInput}
        />
      </div>

      {definicao.estruturado && (
        <>
          <div>
            <label className="block text-sm font-medium mb-1.5" htmlFor="requisitos">
              {tipo === "servico" ? "O que o cidadão precisa levar" : "Endereço"}
            </label>
            <textarea
              id="requisitos"
              name="requisitos"
              rows={2}
              defaultValue={publicacao?.requisitos ?? ""}
              placeholder={tipo === "servico" ? "Documentos, comprovantes, taxas" : "Rua, número, bairro"}
              className={classeInput}
            />
            {tipo === "servico" && (
              <p className="text-xs text-muted mt-1.5">
                A Lei 13.460 exige dizer os requisitos e o prazo — sem isso não é
                Carta de Serviços, é aviso.
              </p>
            )}
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5" htmlFor="prazo">
                {tipo === "servico" ? "Prazo de atendimento" : "Horário de atendimento"}
              </label>
              <input
                id="prazo"
                name="prazo"
                defaultValue={publicacao?.prazo ?? ""}
                placeholder={tipo === "servico" ? "até 15 dias úteis" : "seg a sex, 8h às 14h"}
                className={classeInput}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" htmlFor="contato">
                {tipo === "servico" ? "Onde solicitar" : "Telefone ou e-mail"}
              </label>
              <input
                id="contato"
                name="contato"
                defaultValue={publicacao?.contato ?? ""}
                className={classeInput}
              />
            </div>
          </div>
        </>
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1.5" htmlFor="secretaria">
            Secretaria responsável <span className="text-muted font-normal">(opcional)</span>
          </label>
          <input
            id="secretaria"
            name="secretaria"
            defaultValue={publicacao?.secretaria ?? ""}
            className={classeInput}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5" htmlFor="linkExterno">
            Link do documento <span className="text-muted font-normal">(opcional)</span>
          </label>
          <input
            id="linkExterno"
            name="linkExterno"
            type="url"
            defaultValue={publicacao?.linkExterno ?? ""}
            placeholder="https://"
            className={classeInput}
          />
        </div>
      </div>

      <label className="flex items-start gap-2.5 text-sm cursor-pointer border-t border-border pt-4">
        <input
          type="checkbox"
          name="publicado"
          defaultChecked={publicacao?.publicado ?? false}
          className="mt-0.5"
        />
        <span className="leading-relaxed">
          <strong>Publicar no portal agora</strong>
          <span className="block text-muted text-xs mt-0.5">
            Desmarcado, fica como rascunho e ninguém de fora vê. Publicar é ato
            deliberado — texto pela metade no endereço público é pior que
            seção vazia.
          </span>
        </span>
      </label>

      {erro && (
        <p
          className="text-sm rounded-lg px-3 py-2"
          style={{ background: "var(--urgente-tint)", color: "var(--urgente)" }}
        >
          {erro}
        </p>
      )}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={pendente}
          className="bg-brand hover:bg-brand-dark text-white font-semibold text-sm rounded-lg px-5 py-2.5 transition disabled:opacity-50"
        >
          {pendente ? "Salvando…" : "Salvar"}
        </button>
        <button
          type="button"
          onClick={aoFechar}
          className="text-sm font-semibold text-muted hover:text-foreground transition"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}

function Lista({
  publicacoes,
  slugPortal,
  aoEditar,
}: {
  publicacoes: Publicacao[];
  slugPortal: string | null;
  aoEditar: (p: Publicacao) => void;
}) {
  const [pendente, iniciar] = useTransition();

  if (publicacoes.length === 0) {
    return (
      <div className="border border-dashed border-border rounded-xl p-8 text-center">
        <p className="text-sm text-muted leading-relaxed">
          Nada publicado ainda. O portal do município já mostra orçamento, obras
          e licitações — o que você escrever aqui aparece junto.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <h2 className="font-serif text-lg font-bold">
        Publicado e em rascunho{" "}
        <span className="text-muted font-sans text-sm font-semibold">({publicacoes.length})</span>
      </h2>

      {publicacoes.map((p) => (
        <div
          key={p.id}
          className="border border-border rounded-xl p-4 flex flex-wrap items-start justify-between gap-x-4 gap-y-3"
          style={{ background: "var(--card)" }}
        >
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className="text-[10px] font-bold uppercase tracking-wider rounded-full px-2.5 py-0.5"
                style={{
                  background: p.publicado ? "var(--info-tint)" : "var(--medio-tint)",
                  color: p.publicado ? "var(--info)" : "var(--medio)",
                }}
              >
                {p.publicado ? "no portal" : "rascunho"}
              </span>
              <span className="text-xs text-muted">{NOME_TIPO_PUBLICACAO[p.tipo]}</span>
              {p.secretaria && <span className="text-xs text-muted">· {p.secretaria}</span>}
            </div>
            <p className="font-semibold text-sm mt-1.5">{p.titulo}</p>
            <p className="text-sm text-muted mt-1 leading-relaxed line-clamp-2">{p.conteudo}</p>
          </div>

          <div className="flex flex-wrap items-center gap-4 shrink-0">
            <button
              type="button"
              onClick={() => aoEditar(p)}
              className="text-sm font-semibold text-brand hover:underline"
            >
              Editar
            </button>
            <button
              type="button"
              disabled={pendente}
              onClick={() => iniciar(async () => void (await alternarPublicado(p.id, !p.publicado)))}
              className="text-sm font-semibold text-muted hover:text-foreground transition disabled:opacity-50"
            >
              {p.publicado ? "Tirar do ar" : "Publicar"}
            </button>
            <button
              type="button"
              disabled={pendente}
              onClick={() => {
                if (confirm(`Apagar "${p.titulo}" definitivamente?`)) {
                  iniciar(async () => void (await removerPublicacao(p.id)));
                }
              }}
              className="text-sm font-semibold text-muted hover:text-[color:var(--urgente)] transition disabled:opacity-50"
            >
              Apagar
            </button>
          </div>
        </div>
      ))}

      {slugPortal && (
        <p className="text-xs text-muted mt-2">
          O que está &ldquo;no portal&rdquo; aparece em{" "}
          <a
            href={`/transparencia/${slugPortal}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand font-semibold hover:underline"
          >
            /transparencia/{slugPortal}
          </a>
          , onde o cidadão só lê.
        </p>
      )}
    </div>
  );
}
