import LandingPage, { metadata as metadataDaHome } from "../page";
import { lerSessao } from "@/lib/sessao";

// ── A HOME MONTADA A CADA PEDIDO ──
//
// Ninguém chega aqui pelo endereço: o proxy.ts reescreve para cá os pedidos
// de "/" que mudam a página (?m=, ?uf=, ?para= ou sessão; ver
// lib/home-montada.ts), e a barra do navegador continua mostrando "/". A
// página é a mesma da home (app/page.tsx), agora com o pedido em mãos: o
// município do Raio-X, a porta do morador e o cabeçalho de quem tem conta.
//
// A canônica é a da home, "/": quem abrir /inicio direto vê a mesma página e
// o buscador não a conta como outra.
export const metadata = metadataDaHome;

const texto = (v: string | string[] | undefined) => (typeof v === "string" ? v : undefined);

export default async function HomeMontada({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const p = await searchParams;
  const sessao = await lerSessao();
  return (
    <LandingPage
      pedido={{
        m: texto(p.m),
        uf: texto(p.uf),
        para: texto(p.para),
        // A sessão da demonstração não é cliente: com ela, o topo mostrava
        // "Ir para o painel" e levava ao painel fictício
        // (tests/sessao-demo-nao-e-cliente.test.ts).
        sessaoAtiva: Boolean(sessao) && !sessao?.demo,
      }}
    />
  );
}
