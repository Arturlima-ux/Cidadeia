import { db } from "@/db";
import { configPublica, prefeituras } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { planosContratadosDe } from "@/lib/planos";

// Os portais publicados são a única prova que o visitante consegue conferir
// sozinho, sem falar com ninguém. Por isso a leitura fica aqui e não dentro
// de uma página: a home usa o número no herói e o índice usa a lista, e as
// duas precisam contar a mesma coisa — inclusive a regra de que portal sem
// o módulo Essencial não responde.

export type PortalPublicado = {
  slug: string;
  municipio: string;
  estado: string;
  nome: string;
};

export type ListaPortais = {
  portais: PortalPublicado[];
  /** true quando o banco não respondeu — diferente de "não existe nenhum". */
  falhou: boolean;
};

export async function listarPortaisPublicados(): Promise<ListaPortais> {
  try {
    const linhas = await db
      .select({
        slug: configPublica.slug,
        municipio: prefeituras.municipio,
        estado: prefeituras.estado,
        nome: prefeituras.nome,
        planosContratados: prefeituras.planosContratados,
      })
      .from(configPublica)
      .innerJoin(prefeituras, eq(prefeituras.id, configPublica.prefeituraId))
      .where(eq(configPublica.portalAtivo, true))
      .orderBy(asc(prefeituras.municipio));

    // Mesma regra da página do portal: o endereço público faz parte do
    // Essencial. Listar um município que não o contratou levaria a um 404.
    return {
      portais: linhas
        .filter((l) => planosContratadosDe(l.planosContratados).includes("essencial"))
        .map(({ slug, municipio, estado, nome }) => ({ slug, municipio, estado, nome })),
      falhou: false,
    };
  } catch {
    // Nem o índice nem a home podem virar tela de erro por causa disto: um
    // é porta de entrada do cidadão, o outro é a primeira impressão. Quem
    // chama decide o que mostrar quando a lista não veio.
    return { portais: [], falhou: true };
  }
}
