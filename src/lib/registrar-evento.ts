import { after, connection } from "next/server";
import { headers } from "next/headers";
import { db } from "@/db";
import { eventos } from "@/db/schema";
import { gerarId } from "@/lib/id";
import {
  identificadorDoDia,
  dispositivoDe,
  origemDe,
  type TipoEvento,
} from "@/lib/analytics";

// ── O REGISTRO QUE NÃO ATRASA NINGUÉM ──
//
// Gravar um evento é uma escrita no banco, e o visitante não tem nada a ver
// com isso. `after()` executa depois que a resposta JÁ SAIU — a documentação
// do Next desta versão cita "logging and analytics" como o caso de uso. O
// custo para quem abriu a página é zero.
//
// ── E QUE NUNCA DERRUBA A PÁGINA ──
//
// Toda a função está dentro de try. Banco fora, cabeçalho estranho, qualquer
// coisa: o erro vai para o log e a página continua. Medição que quebra o
// produto medido é pior que não medir — e é um jeito particularmente burro de
// cair, porque a página funcionava perfeitamente antes de alguém querer
// contá-la.

/** Segredo do identificador diário. Sem ele, nada é registrado. */
function segredo(): string | null {
  // ANALYTICS_SALT é o nome próprio; AUTH_SECRET serve de reserva para o
  // registro funcionar desde o primeiro dia sem variável nova. São usos
  // distintos e idealmente segredos distintos.
  return process.env.ANALYTICS_SALT?.trim() || process.env.AUTH_SECRET?.trim() || null;
}

function enderecoDe(h: Headers): string {
  // Na Vercel o endereço real vem no primeiro item de x-forwarded-for; o
  // resto da lista são os proxies pelo caminho.
  const encaminhado = h.get("x-forwarded-for");
  if (encaminhado) return encaminhado.split(",")[0]!.trim();
  return h.get("x-real-ip")?.trim() || "desconhecido";
}

export type DadosDoEvento = {
  tipo: TipoEvento;
  caminho: string;
  uf?: string | null;
  codigoIbge?: string | null;
  municipio?: string | null;
  detalhe?: string | null;
};

/**
 * Registra um evento depois que a resposta sair.
 *
 * Chamável de componente de servidor, rota e ação. Não devolve nada e nunca
 * lança: quem chama não precisa tratar erro de medição.
 */
export async function registrarEvento(dados: DadosDoEvento): Promise<void> {
  const chave = segredo();
  if (!chave) return;

  try {
    // Ler cabeçalho torna a renderização dependente da requisição. Nas rotas
    // que são geradas estaticamente isso seria um erro em tempo de build, e
    // connection() deixa explícito que daqui para baixo só roda com pedido em
    // mãos.
    await connection();
    const h = await headers();
    const navegador = h.get("user-agent") ?? "";
    const dia = new Date().toISOString().slice(0, 10);

    const linha = {
      id: gerarId("ev"),
      tipo: dados.tipo,
      caminho: dados.caminho.slice(0, 300),
      uf: dados.uf ?? null,
      codigoIbge: dados.codigoIbge ?? null,
      municipio: dados.municipio ?? null,
      detalhe: dados.detalhe?.slice(0, 120) ?? null,
      visitante: identificadorDoDia(enderecoDe(h), navegador, dia, chave),
      origem: origemDe(h.get("referer")),
      dispositivo: dispositivoDe(navegador),
      criadoEm: new Date().toISOString(),
    };

    after(async () => {
      try {
        await db.insert(eventos).values(linha);
      } catch (e) {
        console.error("[analytics] não consegui gravar o evento:", e);
      }
    });
  } catch (e) {
    // Inclui o caso de a rota não poder ler cabeçalho. Não é motivo para a
    // página falhar.
    console.error("[analytics] não consegui montar o evento:", e);
  }
}
