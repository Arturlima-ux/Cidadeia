import { eq } from "drizzle-orm";
import { db } from "@/db";
import { pedidosProposta } from "@/db/schema";
import FormularioCadastro, { type InicialDoPedido } from "./FormularioCadastro";

// ── O CADASTRO QUE NASCE DA PROPOSTA ──
//
// /cadastro?proposta=<id>: quem acabou de pedir a proposta chega aqui com
// município, nome e e-mail já no lugar. A conta criada fica amarrada ao
// pedido (cadastrarPrefeitura grava prefeitura_id no pedido), e é nela que
// os módulos ligam no dia da assinatura. Sem o parâmetro, é o cadastro de
// sempre.
//
// O id do pedido é a única chave: quem tem o link tem o pedido. É o mesmo
// nível de segredo de um protocolo — o link vai só para quem pediu, e o que
// ele revela (município, nome, e-mail) é o que a própria pessoa digitou.

export const dynamic = "force-dynamic";

export const metadata = { title: "Criar a conta da prefeitura" };

async function inicialDoPedido(propostaId: string | undefined): Promise<InicialDoPedido | null> {
  if (!propostaId || !/^prop_[A-Za-z0-9_-]{4,64}$/.test(propostaId)) return null;
  try {
    const [p] = await db
      .select({
        id: pedidosProposta.id,
        municipio: pedidosProposta.municipio,
        uf: pedidosProposta.uf,
        nome: pedidosProposta.nome,
        email: pedidosProposta.email,
        prefeituraId: pedidosProposta.prefeituraId,
      })
      .from(pedidosProposta)
      .where(eq(pedidosProposta.id, propostaId))
      .limit(1);
    // Pedido que já tem conta não gera outra.
    if (!p || p.prefeituraId) return null;
    return { propostaId: p.id, municipio: p.municipio, uf: p.uf, nome: p.nome, email: p.email };
  } catch (e) {
    console.error("[cadastro] não foi possível ler o pedido:", e);
    return null;
  }
}

export default async function CadastroPage({ searchParams }: { searchParams: Promise<{ proposta?: string }> }) {
  const { proposta } = await searchParams;
  const inicial = await inicialDoPedido(proposta);
  return <FormularioCadastro inicial={inicial} />;
}
