import { redirect } from "next/navigation";
import Link from "next/link";
import { lerSessao, encerrarSessao } from "@/lib/sessao";
import { buscarPrefeitura, buscarUsuarioPorId } from "@/lib/dados-prefeitura";
import { sair } from "@/app/login/actions";
import { planosContratadosDe, NOME_PLANO_ADDON, type PlanoAddon } from "@/lib/planos";
import { type NavItem } from "@/components/SidebarNav";
import DashboardSidebar from "@/components/DashboardSidebar";

const NAV_ITEMS_SECRETARIA: Record<string, NavItem> = {
  saude: { href: "/dashboard/secretarias/saude", label: "Saúde", icone: "saude" },
  educacao: { href: "/dashboard/secretarias/educacao", label: "Educação", icone: "educacao" },
  obras: { href: "/dashboard/secretarias/obras", label: "Obras", icone: "obras" },
  licitacoes: {
    href: "/dashboard/secretarias/licitacoes",
    label: "Licitações",
    icone: "licitacoes",
  },
};

function montarGrupos(
  sessao: { cargo: string; secretaria?: string | null },
  planosAtivos: PlanoAddon[]
): { titulo: string; itens: NavItem[] }[] {
  const temGestao = planosAtivos.includes("gestao");
  const secretariasAtivas = Object.entries(NAV_ITEMS_SECRETARIA)
    .filter(([chave]) => planosAtivos.includes(chave as PlanoAddon))
    .map(([, item]) => item);

  if (sessao.cargo === "secretario") {
    const minha =
      sessao.secretaria && planosAtivos.includes(sessao.secretaria as PlanoAddon)
        ? NAV_ITEMS_SECRETARIA[sessao.secretaria]
        : null;
    return [
      {
        titulo: "Principal",
        itens: [
          { href: "/dashboard/ia", label: "IA Central", icone: "ia" },
          ...(minha ? [minha] : []),
        ],
      },
    ];
  }

  const grupos: { titulo: string; itens: NavItem[] }[] = [
    {
      titulo: "Principal",
      itens: [
        ...(temGestao
          ? [{ href: "/dashboard", label: "Visão Geral", icone: "visao-geral" as const }]
          : []),
        { href: "/dashboard/ia", label: "IA Central", icone: "ia" },
      ],
    },
  ];

  if (planosAtivos.includes("essencial")) {
    // Os dois lados do portal ficam juntos, e nesta ordem: o gestor publica e
    // logo abaixo responde quem escreveu de volta. Separá-los em grupos
    // diferentes faria parecer que são funcionalidades distintas, quando são
    // as duas metades da mesma relação com o cidadão.
    grupos[0].itens.push(
      {
        href: "/dashboard/publicacoes",
        label: "Publicações do portal",
        icone: "visao-geral",
      },
      {
        href: "/dashboard/atendimento",
        label: "Atendimento",
        icone: "alertas",
      }
    );
  }

  if (secretariasAtivas.length > 0) {
    grupos.push({ titulo: "Secretarias", itens: secretariasAtivas });
  }

  if (temGestao) {
    grupos.push({
      titulo: "Gestão",
      itens: [
        { href: "/dashboard/central", label: "Central Inteligente", icone: "central" },
        { href: "/dashboard/mapa", label: "Mapa da cidade", icone: "visao-geral" },
        { href: "/dashboard/apresentacao", label: "Modo apresentação", icone: "visao-geral" },
        { href: "/dashboard/minimos", label: "Mínimos constitucionais", icone: "visao-geral" },
        { href: "/dashboard/eficacia", label: "Investimento × Resultado", icone: "visao-geral" },
        { href: "/dashboard/historico", label: "Histórico", icone: "historico" },
        { href: "/dashboard/alertas", label: "Alertas", icone: "alertas" },
        { href: "/dashboard/configuracoes", label: "Configurações", icone: "configuracoes" },
      ],
    });
  }

  grupos.push({
    titulo: "Conta",
    itens: [
      { href: "/dashboard/modulos", label: "Módulos", icone: "modulos" },
      // Fora de qualquer trava de plano: a exportação existe justamente para
      // a prefeitura poder sair levando os dados dela.
      { href: "/dashboard/dados", label: "Meus dados", icone: "download" },
    ],
  });

  return grupos;
}

function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/);
  const primeira = partes[0]?.[0] ?? "";
  const ultima = partes.length > 1 ? partes[partes.length - 1][0] : "";
  return (primeira + ultima).toUpperCase();
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const sessao = await lerSessao();
  if (!sessao) redirect("/login");

  const prefeitura = await buscarPrefeitura(sessao.prefeituraId);
  if (!prefeitura) {
    // Sessão válida (assinatura ok) mas apontando pra um registro que não
    // existe mais — cookie de uma troca de banco, por exemplo. Limpa antes
    // de mandar pro login, senão o usuário fica preso nesse mesmo loop.
    await encerrarSessao();
    redirect("/login");
  }

  const usuarioAtual = await buscarUsuarioPorId(sessao.usuarioId);
  const planosAtivos = planosContratadosDe(prefeitura.planosContratados);

  return (
    <div className="min-h-screen bg-background flex">
      <DashboardSidebar
        grupos={montarGrupos(sessao, planosAtivos)}
        prefeituraNome={prefeitura.nome}
        sairAction={sair}
      />

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="shadow-elevated relative z-10 border-b border-border bg-card pl-16 pr-4 sm:pl-8 sm:pr-8 py-3.5 flex items-center justify-between gap-3">
          <Link href="/dashboard/conta" className="flex items-center gap-3 min-w-0 group">
            <div
              className="w-9 h-9 rounded-full text-white flex items-center justify-center text-xs font-bold shrink-0 bg-cover bg-center"
              style={
                usuarioAtual?.fotoUrl
                  ? { backgroundImage: `url(${usuarioAtual.fotoUrl})` }
                  : { background: "var(--gradient-hero)" }
              }
            >
              {!usuarioAtual?.fotoUrl && iniciais(sessao.nome)}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-sm truncate group-hover:text-brand transition">
                {sessao.nome}
              </p>
              <p className="text-xs text-muted truncate">
                {prefeitura.municipio} / {prefeitura.estado}
              </p>
            </div>
          </Link>
          <div className="flex items-center gap-1.5 flex-wrap justify-end">
            {planosAtivos.length === 0 && (
              <span className="text-[11px] font-semibold uppercase tracking-wide text-muted bg-black/5 border border-border px-2.5 py-1 rounded-md">
                Nenhum módulo contratado
              </span>
            )}
            {planosAtivos.map((p) => (
              <span
                key={p}
                className="text-[11px] font-semibold uppercase tracking-wide text-brand-dark bg-brand-tint border border-brand/15 px-2.5 py-1 rounded-md"
              >
                {NOME_PLANO_ADDON[p]}
              </span>
            ))}
          </div>
        </header>
        <main className="flex-1 px-4 sm:px-8 py-6 sm:py-8 animate-fade-in-up">{children}</main>
      </div>
    </div>
  );
}
