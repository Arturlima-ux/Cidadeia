import { decodificarPontos } from "@/lib/mapa-municipios";
import { codigosNaOrdemDoMapa } from "@/lib/mapa-municipios-codigos";
import { municipioPorCodigo, procurarMunicipioLocal, type Municipio } from "@/lib/municipios";
import { paraMapa } from "@/lib/localizacao";
import { localPelaConexao, type PrefeituraDoLocal } from "@/lib/onde-esta";
import { pessoalConferido } from "@/lib/rgf-reserva";

// ── PERTO DE ONDE A PESSOA ESTÁ ──
//
// A home é estática (sai do cache) e não lê cabeçalho nenhum. Este endereço
// é o único que lê, e só os de localização aproximada que a Vercel põe em
// cada pedido (lib/onde-esta.ts). Devolve à própria pessoa e a mais
// ninguém: sem gravar, sem registrar evento, sem cache compartilhado.

export const dynamic = "force-dynamic";

const SEM_CACHE = { "Cache-Control": "private, no-store", Vary: "*" };

export async function GET(request: Request) {
  // Só a própria página pergunta.
  const site = request.headers.get("sec-fetch-site");
  if (site && site !== "same-origin") return new Response(null, { status: 403, headers: SEM_CACHE });

  const local = localPelaConexao(request.headers);
  if (!local) return new Response(null, { status: 204, headers: SEM_CACHE });
  return Response.json({ ...local, prefeitura: prefeituraDoLocal(local.lat, local.lng, local.cidade, local.uf) }, { headers: SEM_CACHE });
}

// ── A PREFEITURA DE QUEM ABRIU O SITE (nov/2026) ──
// Para o topo dizer, além de "você está em Teresina, PI", quanto aquela
// prefeitura gasta com pessoal (o número que faz o prefeito parar). A cidade
// vem pelo nome e estado da conexão; se o nome não bater, a sede mais perto
// das coordenadas, até ~40 km. O número é o último RGF conferido pela vigia
// (dados/rgf-reserva.json): nada é consultado na hora.
function prefeituraDoLocal(lat: number, lng: number, cidade: string | null, uf: string | null): PrefeituraDoLocal | null {
  let m: Municipio | null = null;
  if (cidade && uf) {
    const r = procurarMunicipioLocal(cidade, uf);
    if (r.ok) m = r.municipio;
  }
  if (!m) {
    const { x, y } = paraMapa(lat, lng);
    const pontos = decodificarPontos();
    let melhor = -1, menor = Infinity;
    for (let i = 0; i < pontos.length / 2; i++) {
      const d = (pontos[i * 2] - x) ** 2 + (pontos[i * 2 + 1] - y) ** 2;
      if (d < menor) { menor = d; melhor = i; }
    }
    // ~4 km por unidade do mapa: 10 unidades são uns 40 km.
    if (melhor >= 0 && menor <= 100) m = municipioPorCodigo(codigosNaOrdemDoMapa()[melhor]);
  }
  if (!m) return null;
  const p = pessoalConferido(m.codigo);
  return { codigo: m.codigo, nome: m.nome, uf: m.uf, pessoal: p?.pessoal ?? null, limite: p?.limite ?? null, periodo: p?.periodo ?? null };
}
