import { Suspense } from "react";
import { registrarEvento } from "@/lib/registrar-evento";
import Link from "next/link";
import DadosDoTesouro from "./DadosDoTesouro";
import EsqueletoRaioX from "@/components/site/EsqueletoRaioX";
import { notFound } from "next/navigation";
import SiteHeader from "@/components/site/SiteHeader";
import SiteFooter from "@/components/site/SiteFooter";
import Olho from "@/components/site/Olho";
import RaioXResultado from "@/components/site/RaioXResultado";
import CapturaLeadRaioX from "@/components/site/CapturaLeadRaioX";
import SolucoesDoRaioX from "@/components/site/SolucoesDoRaioX";
import { municipioPorSlug, caminhoDoRaioX } from "@/lib/slug-municipio";
import { municipiosDaUf } from "@/lib/municipios";
import { montarRaioX } from "@/lib/raio-x";
import { porteDaPopulacao, PORTES } from "@/lib/precos";
import { ESTADOS, doEstado, type Estado } from "@/lib/estados";
import { compartilhamento, JsonLdScript, ldBreadcrumb, ldPrefeitura } from "@/lib/seo";
import { NOME_DOS_ESTADOS } from "@/lib/estados";
import MapaVivo from "@/components/site/inicio/MapaVivo";
import ReguaLrf from "@/components/site/inicio/ReguaLrf";
import CarregaRegua from "@/app/_heroi/CarregaRegua";
import { indiceNoMapa } from "@/lib/mapa-municipios-codigos";

// ── UMA PÁGINA PÚBLICA POR MUNICÍPIO ──
//
// /raio-x/pi/barro-duro: o que o Tesouro Nacional já publicou sobre a
// prefeitura, com o nome dela no título. Prefeito não pesquisa "software
// de gestão municipal" no Google — mas vereador, jornalista, contador e o
// próprio secretário pesquisam o nome do município. É por esse nome que o
// CidadeIA passa a ser encontrado, 5.571 vezes, sem anúncio.
//
// ── COMO NÃO DERRUBAR O TESOURO ──
// Nada é pré-construído: seriam 5.571 × várias chamadas ao SICONFI no
// build. Cada página é montada no primeiro acesso; a resposta do Tesouro
// fica guardada por sete dias, a página por um (ver abaixo o porquê da
// diferença). O Google rastreia aos poucos; o cache segura o resto. Se o
// Tesouro não responder, a página ainda existe — nome, UF, população, o
// que a consulta faria — e diz que os números virão na próxima visita.
//
// ── O QUE ELA NÃO DIZ ──
// Nada que o Raio-X do formulário já não diga. Os percentuais são indício,
// não cálculo de mínimo constitucional, e o texto continua avisando isso.
// Dado público, tom público: sem "descumpre", sem veredito.

// ── DOIS CACHES, E SÓ UM PROTEGE O TESOURO ──
//
// Este é o cache da PÁGINA. O que protege o SICONFI de ser martelado é
// outro: CACHE_TESOURO_SEGUNDOS, em lib/raio-x.ts, que segura a resposta
// do Tesouro por sete dias e sobrevive a deploy. Eram os dois em sete
// dias, e por isso uma mudança de texto ou de seção só aparecia numa
// página já visitada uma semana depois — foi o que confundiu o teste em
// 23/09/2026.
//
// Um dia aqui traz a mudança para o dia seguinte sem nenhuma consulta a
// mais ao Tesouro: a remontagem reaproveita o dado que já está em cache.
// ── POR QUE ESTA ROTA DEIXOU DE SER ESTÁTICA ──
//
// Era SSG: o build a classificava com ● e gerava cada município sob demanda
// como HTML estático, cacheado por um dia. Rápido a partir da segunda visita
// — e 2 a 5 segundos de tela BRANCA na primeira, que com 5.570 municípios e
// tráfego de busca de cauda longa é quase todo visitante.
//
// Página estática é bufferizada inteira antes de sair, então o limite de
// Suspense em DadosDoTesouro não tinha o que segurar. Medido: Content-Length
// fixo e 2,7s até o primeiro byte.
//
// Agora o cache sai da página e vai para o DADO: a consulta ao SICONFI já
// declara o próprio prazo em cada fetch, e "default-cache" garante que ela
// continue valendo mesmo depois do connection(). Sem essa linha, fetch
// depois de API de requisição deixaria de ser cacheado e TODA visita pagaria
// o Tesouro — pior que o problema original.
export const fetchCache = "default-cache";
export const maxDuration = 60;

// Nenhuma pré-construída (ver acima). A lista existe para o Next saber que
// os parâmetros são conhecidos e válidos, não para gerar no build.
function acharMunicipio(uf: string, slug: string) {
  const sigla = uf.toUpperCase();
  if (!(ESTADOS as readonly string[]).includes(sigla)) return null;
  return municipioPorSlug(sigla, slug);
}

export async function generateMetadata({ params }: { params: Promise<{ uf: string; slug: string }> }) {
  const { uf, slug } = await params;
  const m = acharMunicipio(uf, slug);
  if (!m) return { title: "Município não encontrado" };
  const pop = new Intl.NumberFormat("pt-BR").format(m.populacao ?? 0);
  return compartilhamento({
    titulo: `Raio-X da Prefeitura de ${m.nome}/${m.uf} — receita, saúde, educação e RREO no Tesouro`,
    descricao: `O que o Tesouro Nacional já publicou sobre ${m.nome} (${m.uf}, ${pop} habitantes): receita realizada, aplicação em saúde e educação, e quais relatórios obrigatórios constam. Dado público, sem cadastro.`,
    caminho: caminhoDoRaioX(m),
    imagemPropria: true,
  });
}

export default async function RaioXMunicipioPage({ params }: { params: Promise<{ uf: string; slug: string }> }) {
  const { uf, slug } = await params;
  const m = acharMunicipio(uf, slug);
  if (!m) notFound();

  // ── A MEDIÇÃO QUE DIZ QUAIS MUNICÍPIOS VIRAM PROPOSTA ──
  // Dois eventos: "visita" alimenta a base do funil, "raio_x" marca a
  // intenção sobre um município específico. Roda depois da resposta sair.
  await registrarEvento({ tipo: "visita", caminho: `/raio-x/${uf}/${slug}` });
  await registrarEvento({
    tipo: "raio_x",
    caminho: `/raio-x/${uf}/${slug}`,
    uf: m.uf,
    codigoIbge: m.codigo,
    municipio: m.nome,
  });

  const porte = PORTES.find((p) => p.chave === porteDaPopulacao(m.populacao));
  const vizinhos = municipiosDaUf(m.uf)
    .filter((x) => x.codigo !== m.codigo)
    .sort((a, b) => Math.abs((a.populacao ?? 0) - (m.populacao ?? 0)) - Math.abs((b.populacao ?? 0) - (m.populacao ?? 0)))
    .slice(0, 6);

  return (
    <div className="tema-noite min-h-screen overflow-x-clip">
      <JsonLdScript
        dados={[
          ldBreadcrumb([
            { nome: "Início", caminho: "/" },
            { nome: "Raio-X", caminho: "/raio-x" },
            { nome: NOME_DOS_ESTADOS[m.uf as Estado], caminho: `/raio-x/${m.uf.toLowerCase()}` },
            { nome: m.nome, caminho: caminhoDoRaioX(m) },
          ]),
          ldPrefeitura({ nome: m.nome, uf: m.uf, populacao: m.populacao, caminho: caminhoDoRaioX(m) }),
        ]}
      />
      <SiteHeader />
      <main id="conteudo">
        {/* ── O TOPO NO PADRÃO DA HOME ──
            Título grande, o país com este município aceso e a régua da LRF
            com o número que a prefeitura declarou. Nome, população e o ponto
            no mapa são dado local; só a régua espera o Tesouro, dentro do
            próprio Suspense. */}
        <section className="relative max-w-[1200px] mx-auto px-4 sm:px-8 pt-14 sm:pt-20 pb-12">
          <div className="grid lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)] gap-10 lg:gap-14 items-start">
            <div>
              <Olho>Raio-X do Tesouro Nacional</Olho>
              <h1 className="titulo-pagina mt-5">
                {m.nome}
                <span className="text-muted font-normal">, {m.uf}</span>
              </h1>
              <p className="inicio-lead text-muted mt-6 max-w-[44ch]">
                {new Intl.NumberFormat("pt-BR").format(m.populacao ?? 0)} habitantes, faixa de{" "}
                {porte?.rotulo.toLowerCase()}. Abaixo, o que a própria prefeitura publicou no
                Tesouro neste exercício. Nada aqui foi digitado por ninguém.
              </p>
              <div className="mt-10">
                {m.uf === "DF" ? (
                  <ReguaLrf dado={{ modo: "exemplo", aviso: "O DF segue limites da LRF de unidade da federação. Acima, um município de exemplo." }} />
                ) : (
                  <Suspense
                    key={m.codigo}
                    fallback={<ReguaLrf dado={{ modo: "carregando", municipio: m.nome }} />}
                  >
                    <CarregaRegua codigoIbge={m.codigo} municipio={m.nome} />
                  </Suspense>
                )}
              </div>
            </div>
            <div className="hidden lg:block relative h-[520px]" aria-hidden>
              <MapaVivo destaque={indiceNoMapa(m.codigo)} className="w-full h-full" />
            </div>
          </div>
        </section>

        {/* ── O QUE ESPERA O TESOURO FICA SOZINHO ESPERANDO ──
            A página inteira aguardava a consulta antes de pintar qualquer
            coisa: 2 a 5 segundos de tela branca na primeira visita de cada
            município, que é quase todo visitante vindo de busca.

            Acima deste ponto nada depende da rede — nome, população e porte
            saem de dado local. O limite de Suspense entra aqui, e só aqui. */}
        <section className="max-w-[1200px] mx-auto px-4 sm:px-8 pb-12">
          <div className="max-w-4xl">
          <Suspense fallback={<EsqueletoRaioX nome={m.nome} />}>
            <DadosDoTesouro nome={m.nome} uf={m.uf} codigoIbge={m.codigo} />
          </Suspense>
          </div>
        </section>

        <section className="max-w-[1200px] mx-auto px-4 sm:px-8 pb-12">
          <div className="max-w-4xl">
            <CapturaLeadRaioX codigoIbge={m.codigo} municipio={m.nome} />
          </div>
        </section>

        {/* ── A SEÇÃO QUE MORAVA AQUI ──
            "O que não aparece em base pública": o mesmo argumento da seção
            acima, com os mesmos dois botões. Depois que o Raio-X passou a
            puxar os módulos a partir dos achados DAQUELE município, este
            bloco virou a versão genérica do que já estava dito — e deixava
            "Montar proposta para X" duas vezes na mesma rolagem, que foi
            como o teste de tela o encontrou. Argumento repetido enfraquece
            os dois. */}

        {/* ── vizinhos de porte: navegação interna que o Google segue ── */}
        <section className="max-w-[1200px] mx-auto px-4 sm:px-8 py-12">
          <p className="text-sm font-medium text-muted mb-4">
            Municípios de porte parecido em {m.uf}
          </p>
          <div className="flex flex-wrap gap-2.5">
            {vizinhos.map((v) => (
              <Link
                key={v.codigo}
                href={caminhoDoRaioX(v)}
                className="text-sm font-medium rounded-full border border-border px-4 py-2 hover:border-brand hover:text-brand-claro transition"
              >
                {v.nome}
              </Link>
            ))}
          </div>
          <Link
            href={`/raio-x/${m.uf.toLowerCase()}`}
            className="inline-block mt-5 text-sm font-semibold text-brand hover:underline"
          >
            Todas as prefeituras {doEstado(m.uf as Estado)}
          </Link>
          <p className="text-xs text-muted mt-6 leading-relaxed max-w-[62ch]">
            Fonte: API pública do SICONFI, Tesouro Nacional, e estimativa de população do IBGE.
            Os percentuais da receita são indício, não cálculo de mínimo constitucional — a base
            legal do mínimo não é a receita total.
          </p>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
