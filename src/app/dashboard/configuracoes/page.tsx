import Link from "next/link";
import { contextoDashboard } from "@/lib/contexto-dashboard";
import { buscarSistemasConectados, buscarUsuarios } from "@/lib/dados-prefeitura";
import { criarUsuarioSecretario, removerUsuario } from "./actions";
import FormularioUsuario from "./FormularioUsuario";
import BloqueioPlano from "@/components/BloqueioPlano";
import PilulaStatus from "@/components/PilulaStatus";
import { NOME_PLANO_ADDON, PLANOS_ADDON } from "@/lib/planos";

const LABEL_SISTEMA: Record<string, string> = {
  portal_transparencia: "Portal da Transparência",
  esus: "E-SUS",
  receita: "Receita",
  siafi: "SIAFI",
  tce: "TCE",
  diario_oficial: "Diário Oficial",
  google_analytics: "Google Analytics",
  meta: "Meta",
  camara_municipal: "Câmara Municipal",
  ouvidoria: "Ouvidoria",
  compras_publicas: "Compras Públicas",
};

export default async function ConfiguracoesPage() {
  const ctx = await contextoDashboard();
  if (!ctx.temPlano("gestao")) return <BloqueioPlano plano="gestao" />;

  // Antes eram dois `await` em sequência — não dependem um do outro.
  const [sistemas, usuarios] = await Promise.all([
    buscarSistemasConectados(ctx.sessao.prefeituraId),
    buscarUsuarios(ctx.sessao.prefeituraId),
  ]);
  const { prefeitura, planosAtivos } = ctx;

  async function remover(formData: FormData) {
    "use server";
    await removerUsuario(String(formData.get("id")));
  }

  return (
    <div className="max-w-2xl space-y-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-serif text-2xl font-bold">Configurações</h1>
          <p className="text-muted text-sm mt-1.5">
            Dados cadastrais da prefeitura, usuários e status das integrações.
          </p>
        </div>
        <Link
          href="/dashboard/conta"
          className="shrink-0 text-xs font-semibold text-brand hover:underline"
        >
          Editar meu perfil (e-mail, celular, senha) →
        </Link>
      </div>

      <div className="bg-card border border-border rounded-2xl p-5">
        <h2 className="font-semibold text-sm mb-4">Dados da prefeitura</h2>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <Item label="Nome" valor={prefeitura?.nome} />
          <Item label="Município" valor={`${prefeitura?.municipio} / ${prefeitura?.estado}`} />
          <Item label="CNPJ" valor={prefeitura?.cnpj} />
          <Item label="Prefeito(a)" valor={prefeitura?.prefeito} />
          <Item label="População" valor={prefeitura?.populacao?.toLocaleString("pt-BR")} />
        </dl>
      </div>

      <div className="bg-card border border-border rounded-2xl p-5">
        <div className="flex items-center justify-between mb-1">
          <h2 className="font-semibold text-sm">Planos contratados</h2>
          <Link
            href="/dashboard/modulos/marketplace"
            className="text-xs font-semibold text-brand hover:underline"
          >
            Contratar mais →
          </Link>
        </div>
        <p className="text-xs text-muted mb-4">
          Essencial (Protocolo via WhatsApp + Transparência + Ouvidoria) é a base,
          incluído para toda prefeitura. Cada secretaria e a Gestão são planos
          avulsos.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-sm">
            <span>Essencial</span>
            <PilulaStatus label="Incluso" tom="positivo" className="shrink-0" />
          </div>
          {PLANOS_ADDON.map((p) => {
            const ativo = planosAtivos.includes(p.chave);
            return (
              <div
                key={p.chave}
                className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-sm"
              >
                <span className="min-w-0 break-words">{NOME_PLANO_ADDON[p.chave]}</span>
                <PilulaStatus
                  label={ativo ? "Contratado" : "Não contratado"}
                  tom={ativo ? "positivo" : "neutro"}
                  className="shrink-0"
                />
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl p-5">
        <div className="flex items-center justify-between mb-1">
          <h2 className="font-semibold text-sm">Usuários ({usuarios.length})</h2>
          <FormularioUsuario acao={criarUsuarioSecretario} />
        </div>
        <p className="text-xs text-muted mb-4">
          Cada secretário só enxerga a própria secretaria — sem acesso ao
          financeiro geral nem às demais áreas.
        </p>
        <div className="space-y-2">
          {usuarios.map((u) => (
            <div
              key={u.id}
              className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm"
            >
              <div>
                <p className="font-medium">{u.nome}</p>
                <p className="text-xs text-muted">
                  {u.cargo === "prefeito"
                    ? "Prefeito(a) / acesso total"
                    : u.secretaria
                      ? `Secretário(a) — ${LABEL_SECRETARIA[u.secretaria] ?? u.secretaria}`
                      : "Admin"}
                </p>
              </div>
              {u.cargo !== "prefeito" && (
                <form action={remover}>
                  <input type="hidden" name="id" value={u.id} />
                  <button
                    type="submit"
                    className="text-xs font-semibold text-danger underline opacity-70 hover:opacity-100"
                  >
                    Remover
                  </button>
                </form>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl p-5">
        <h2 className="font-semibold text-sm mb-1">Sistemas conectados</h2>
        <p className="text-xs text-muted mb-4">
          A integração real de cada sistema é configurada com a nossa equipe — aqui
          você vê apenas o que foi sinalizado no cadastro.
        </p>
        {sistemas.length === 0 ? (
          <p className="text-sm text-muted">Nenhum sistema sinalizado no cadastro.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {sistemas.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-sm"
              >
                <span className="min-w-0 break-words">{LABEL_SISTEMA[s.sistema] ?? s.sistema}</span>
                {/* Antes o rótulo mudava mas a cor era sempre âmbar — um
                    sistema conectado aparecia com a cor de "pendente". */}
                <PilulaStatus
                  label={s.status === "conectado" ? "Conectado" : "Pendente"}
                  tom={s.status === "conectado" ? "positivo" : "atencao"}
                  className="shrink-0"
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const LABEL_SECRETARIA: Record<string, string> = {
  saude: "Saúde",
  educacao: "Educação",
  obras: "Obras",
  licitacoes: "Licitações",
};

function Item({ label, valor }: { label: string; valor?: string | null }) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="font-medium mt-0.5">{valor || "—"}</dd>
    </div>
  );
}
