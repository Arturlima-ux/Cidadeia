import { IconVisaoGeral, IconHistorico, IconAlertas } from "@/components/icons";

// ── O QUE O MORADOR PODE FAZER, E A LEI QUE GARANTE ──
//
// Saiu da home para cá quando o conteúdo do cidadão ganhou entrada própria.
// Antes era um array dentro de `app/page.tsx`, e o único lugar que o exibia
// era uma seção no meio do funil comercial — o morador precisava atravessar
// hero de risco fiscal, módulos, tabela comparativa e calculadora de preço
// para chegar nele.
//
// A lei aparece ao lado de cada item de propósito: para o prefeito ela é
// conformidade a cumprir, para o cidadão é direito que já tem. Mesmo artigo,
// leitura oposta — e citá-lo muda o tom de "serviço que a prefeitura oferece"
// para "coisa que já é sua".

export const DIREITOS_CIDADAO = [
  {
    icone: IconVisaoGeral,
    titulo: "Ver para onde vai o dinheiro",
    texto:
      "Receita, despesa, obras em andamento e licitações do seu município, numa página que abre sem cadastro.",
    lei: "Lei 12.527/2011 · art. 8º",
  },
  {
    icone: IconHistorico,
    titulo: "Acompanhar seu pedido pelo número",
    texto:
      "Abriu um protocolo? Recebe número e chave na hora e acompanha o andamento sozinho, sem ligar para a prefeitura.",
    lei: "Lei 13.460/2017 · art. 10, VI",
  },
  {
    icone: IconAlertas,
    titulo: "Denunciar sem dizer quem você é",
    texto:
      "A ouvidoria aceita manifestação anônima, e o protocolo é aleatório — ninguém consegue descobrir quantas denúncias existem nem chegar às vizinhas.",
    lei: "Lei 13.460/2017 · art. 10",
  },
] as const;
