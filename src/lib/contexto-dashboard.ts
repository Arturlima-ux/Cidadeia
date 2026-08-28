import { redirect } from "next/navigation";
import { lerSessao, type SessaoPayload } from "@/lib/sessao";
import { buscarPrefeitura } from "@/lib/dados-prefeitura";
import { planosContratadosDe, type PlanoAddon } from "@/lib/planos";

type Prefeitura = NonNullable<Awaited<ReturnType<typeof buscarPrefeitura>>>;

export type ContextoDashboard = {
  sessao: SessaoPayload;
  prefeitura: Prefeitura;
  planosAtivos: PlanoAddon[];
  /** true se o plano está contratado por esta prefeitura. */
  temPlano: (plano: PlanoAddon) => boolean;
};

/**
 * Carrega sessão + prefeitura + planos de uma vez para uma página do
 * dashboard. Existe pra dois motivos:
 *
 * 1. Elimina o `sessao!` que estava espalhado por 5 páginas — o layout
 *    garante a sessão em runtime, mas o TypeScript não sabia disso, então
 *    cada página usava non-null assertion (que viraria crash se a garantia
 *    do layout mudasse um dia).
 * 2. Junta as duas queries que quase toda página fazia em sequência.
 */
export async function contextoDashboard(): Promise<ContextoDashboard> {
  const sessao = await lerSessao();
  if (!sessao) redirect("/login");

  const prefeitura = await buscarPrefeitura(sessao.prefeituraId);
  // Sessão válida apontando pra prefeitura que não existe mais (troca de
  // banco, por exemplo) — o layout já trata isso, aqui é só o type guard.
  if (!prefeitura) redirect("/login");

  const planosAtivos = planosContratadosDe(prefeitura.planosContratados);

  return {
    sessao,
    prefeitura,
    planosAtivos,
    temPlano: (plano) => planosAtivos.includes(plano),
  };
}
