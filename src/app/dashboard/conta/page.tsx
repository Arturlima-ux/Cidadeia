import Link from "next/link";
import { lerSessao } from "@/lib/sessao";
import { buscarUsuarioPorId } from "@/lib/dados-prefeitura";
import { redirect } from "next/navigation";
import { atualizarPerfil, trocarSenha, atualizarFotoPerfil } from "./actions";
import { FormularioFoto, FormularioPerfil, FormularioSenha } from "./ContaCliente";
import { formatarCpfCnpj } from "@/lib/documento";

const LABEL_SECRETARIA: Record<string, string> = {
  saude: "Saúde",
  educacao: "Educação",
  obras: "Obras",
  licitacoes: "Licitações",
};

export default async function ContaPage() {
  const sessao = await lerSessao();
  if (!sessao) redirect("/login");

  const usuario = await buscarUsuarioPorId(sessao.usuarioId);
  if (!usuario) redirect("/login");

  const papel =
    usuario.cargo === "prefeito"
      ? "Prefeito(a) — acesso total"
      : usuario.cargo === "secretario"
        ? `Secretário(a) — ${LABEL_SECRETARIA[usuario.secretaria ?? ""] ?? usuario.secretaria}`
        : "Administrador(a)";

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="font-serif text-2xl font-bold">Minha conta</h1>
        <p className="text-muted text-sm mt-1.5">
          Seus dados pessoais de acesso — visíveis só para você.
        </p>
      </div>

      <div className="bg-card border border-border rounded-2xl p-5">
        <FormularioFoto acao={atualizarFotoPerfil} nome={usuario.nome} fotoUrlInicial={usuario.fotoUrl} />
      </div>

      <div className="bg-card border border-border rounded-2xl p-5">
        <h2 className="font-semibold text-sm mb-4">Perfil</h2>
        <FormularioPerfil
          acao={atualizarPerfil}
          nomeInicial={usuario.nome}
          celularInicial={usuario.celular ?? ""}
          emailInicial={usuario.email ?? ""}
        />
        <div className="mt-4 pt-4 border-t border-border grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs text-muted">CPF/CNPJ (login)</p>
            <p className="font-medium mt-0.5">{formatarCpfCnpj(usuario.cpfCnpj)}</p>
          </div>
          <div>
            <p className="text-xs text-muted">Papel</p>
            <p className="font-medium mt-0.5">{papel}</p>
          </div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl p-5">
        <h2 className="font-semibold text-sm mb-4">Senha</h2>
        <FormularioSenha acao={trocarSenha} />
      </div>

      <div className="bg-card border border-border rounded-2xl p-5">
        <h2 className="font-semibold text-sm mb-2">Privacidade</h2>
        <ul className="text-sm text-muted space-y-1.5 leading-relaxed list-disc pl-4">
          <li>Seus dados só são visíveis para usuários da sua própria prefeitura.</li>
          <li>
            {usuario.cargo === "secretario"
              ? "Como secretário(a), você só enxerga dados da sua secretaria — nunca o financeiro geral nem outras áreas."
              : "Dados de outras prefeituras nunca aparecem para você, e os seus nunca aparecem para elas."}
          </li>
          <li>Seu e-mail é usado só para recuperação de senha — nunca compartilhado.</li>
        </ul>
        <p className="text-xs text-muted mt-3">
          Para solicitar exportação ou exclusão dos seus dados, contate o suporte da CidadeIA.
        </p>
      </div>

      <div className="bg-card border border-border rounded-2xl p-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-sm">Planos e pagamento</h2>
            <p className="text-xs text-muted mt-1">
              Veja os módulos contratados pela sua prefeitura e contrate novos.
            </p>
          </div>
          <Link
            href={
              usuario.cargo === "secretario"
                ? "/dashboard/modulos"
                : "/dashboard/modulos/marketplace"
            }
            className="shrink-0 text-xs font-semibold text-brand hover:underline"
          >
            Ver módulos →
          </Link>
        </div>
      </div>
    </div>
  );
}
