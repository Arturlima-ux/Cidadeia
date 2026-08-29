"use client";

import { useState, useTransition } from "react";
import type { ResultadoAcao } from "./actions";

type Config = {
  slug: string;
  portalAtivo: boolean;
  whatsappNumero: string | null;
  mostrarFinanceiro: boolean;
  mostrarObras: boolean;
  mostrarLicitacoes: boolean;
};

export default function ConfigPortal({
  acao,
  config,
}: {
  acao: (fd: FormData) => Promise<ResultadoAcao>;
  config: Config | null;
}) {
  const [aberto, setAberto] = useState(!config);
  const [erro, setErro] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function enviar(formData: FormData) {
    setErro(null);
    startTransition(async () => {
      const r = await acao(formData);
      if (r.ok) setAberto(false);
      else setErro(r.erro);
    });
  }

  const urlPortal = config ? `/transparencia/${config.slug}` : null;

  return (
    <div className="bg-card border border-border arco-card p-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <p className="font-semibold text-sm">Portal público do município</p>
          {config?.portalAtivo && urlPortal ? (
            <p className="text-xs text-muted mt-1">
              No ar em{" "}
              <a
                href={urlPortal}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-brand hover:underline break-all"
              >
                {urlPortal}
              </a>
            </p>
          ) : (
            <p className="text-xs text-muted mt-1">
              Desativado — o endereço público não responde e ninguém consegue
              abrir manifestação.
            </p>
          )}
        </div>
        {!aberto && (
          <button
            type="button"
            onClick={() => setAberto(true)}
            className="text-xs font-semibold text-brand hover:underline shrink-0"
          >
            Configurar
          </button>
        )}
      </div>

      {aberto && (
        <form action={enviar} className="mt-4 pt-4 border-t border-border space-y-4">
          <label className="flex items-start gap-2.5 text-sm cursor-pointer">
            <input
              type="checkbox"
              name="portalAtivo"
              defaultChecked={config?.portalAtivo ?? false}
              className="mt-0.5"
            />
            <span>
              <strong>Publicar o portal</strong>
              <span className="block text-xs text-muted mt-0.5">
                Deixa a página acessível a qualquer cidadão, sem login.
              </span>
            </span>
          </label>

          <div>
            <label className="block text-xs font-medium mb-1">
              WhatsApp da prefeitura (opcional)
            </label>
            <input
              name="whatsappNumero"
              defaultValue={config?.whatsappNumero ?? ""}
              placeholder="55 85 99999-8888"
              className="w-full sm:w-64 rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-brand"
            />
            <p className="text-xs text-muted mt-1 leading-relaxed">
              Com código do país e DDD. Após abrir a manifestação, o cidadão vê
              um botão que abre o WhatsApp com o protocolo já escrito.
              <br />
              <strong>Não é um robô:</strong> quem responde é uma pessoa da
              prefeitura, no próprio WhatsApp. Atendimento automatizado exigiria
              a API oficial do WhatsApp Business.
            </p>
          </div>

          <div>
            <p className="text-xs font-medium mb-2">O que exibir no portal</p>
            <div className="space-y-2">
              {[
                { nome: "mostrarFinanceiro", label: "Receita, despesas e saldo", padrao: config?.mostrarFinanceiro ?? true },
                { nome: "mostrarObras", label: "Obras públicas e progresso", padrao: config?.mostrarObras ?? true },
                { nome: "mostrarLicitacoes", label: "Processos licitatórios", padrao: config?.mostrarLicitacoes ?? true },
              ].map((c) => (
                <label key={c.nome} className="flex items-center gap-2.5 text-sm cursor-pointer">
                  <input type="checkbox" name={c.nome} defaultChecked={c.padrao} />
                  {c.label}
                </label>
              ))}
            </div>
            <p className="text-xs text-muted mt-2">
              O canal de manifestação fica sempre disponível quando o portal está no ar.
            </p>
          </div>

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

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={pending}
              className="bg-brand hover:bg-brand-dark text-white text-sm font-semibold rounded-full px-5 py-2 transition disabled:opacity-60"
            >
              {pending ? "Salvando..." : "Salvar configuração"}
            </button>
            {config && (
              <button
                type="button"
                onClick={() => setAberto(false)}
                className="text-sm text-muted hover:text-foreground transition"
              >
                Cancelar
              </button>
            )}
          </div>
        </form>
      )}
    </div>
  );
}
