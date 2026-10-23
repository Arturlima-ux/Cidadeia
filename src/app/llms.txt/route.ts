import { URL_BASE } from "@/lib/seo";
import { FONTES_OFICIAIS, fontesPorExtenso, MUNICIPIOS_COM_PREFEITURA } from "@/lib/fontes-oficiais";
import { MODULOS_DETALHE } from "@/lib/modulos-detalhe";
import { PLANOS_ADDON } from "@/lib/planos";
import { GUIAS } from "@/lib/guias";

// ── /llms.txt ──
// Um mapa curto, em texto, para assistentes de IA acharem o que importa sem
// ler o menu. Não é usado pelo Google; ChatGPT, Perplexity e afins leem.
// Tudo vem das mesmas listas do site: nada escrito aqui à parte.

export const dynamic = "force-static";

export function GET() {
  const u = (c: string) => `${URL_BASE}${c}`;
  const modulos = MODULOS_DETALHE.map((m) => {
    const nome = PLANOS_ADDON.find((p) => p.chave === m.chave)?.nome ?? m.chave;
    return `- [${nome}](${u(`/modulos/${m.chave}`)}): ${m.descricaoBusca}`;
  }).join("\n");

  const texto = `# CidadeIA

> Sistema de gestão municipal para prefeituras brasileiras, contratado por módulo. Lê sozinho o dado público de ${FONTES_OFICIAIS.length} bases oficiais (${fontesPorExtenso()}) e acompanha prazos e limites da LRF, da LAI e da Lei 13.460.

O site também publica, sem cadastro, o que cada uma das ${MUNICIPIOS_COM_PREFEITURA.toLocaleString("pt-BR")} prefeituras declarou ao Tesouro Nacional: despesa com pessoal na régua da LRF, receita, saúde, educação e entrega do RREO e do RGF. Os percentuais sobre a receita são indício, não cálculo de mínimo constitucional.

## Dado público por município
- [Raio-X da prefeitura](${u("/raio-x")}): busca por cidade; cada município tem página em /raio-x/{uf}/{nome-do-municipio}, por exemplo ${u("/raio-x/pi/teresina")}
- [Panorama da despesa com pessoal](${u("/panorama")}): quantas prefeituras passaram do alerta, do prudencial e do limite da LRF, por estado, atualizado toda semana

## Módulos
${modulos}

## Contratação
- [Como contratar](${u("/como-contratar")}): dispensa por valor, pregão e adesão a ata, com a base legal
- [Kit de contratação](${u("/kit")}): termo de referência, minuta de contrato, acordo de tratamento de dados e acordo de nível de serviço
- [Conformidade legal](${u("/conformidade")}): o que a LAI, a Lei 13.460, a LRF e a LGPD exigem e o que o sistema entrega

## Guias
${GUIAS.map((g) => `- [${g.chamada}](${u(`/guias/${g.slug}`)}): ${g.descricao}`).join("\n")}

## Sobre
- [Perguntas frequentes](${u("/faq")})
- [Governança](${u("/governanca")}): regras de dados, alertas e uso de IA
- [Segurança e LGPD](${u("/seguranca")})
- [Notícias](${u("/noticias")}): o que mudou, com data
`;
  return new Response(texto, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
