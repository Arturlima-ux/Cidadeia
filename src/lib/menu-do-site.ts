// ── O MENU DO SITE, NO DESENHO DE EMPRESA ──
//
// Cinco itens: quem somos, produtos, como contratar, governança e contato.
// Eram sete, no desenho institucional da Cimed; a avaliação da home (Impeccable,
// outubro de 2026) mostrou que nove opções no topo de uma página de venda
// escondiam a busca e o "Receber proposta", e o fundador escolheu estes cinco.
// Notícias, Carreiras e o Portal da transparência seguem no rodapé. Uma fonte
// só para o cabeçalho do computador e a faixa do celular.
//
// O que era o menu de vendas (Raio-X, Demonstração, Como contratar,
// Panorama, FAQ) não sumiu: mora no submenu de Produtos, que é onde quem
// procura o produto olha, e o "Receber proposta" continua ao lado.

export type ItemMenu = {
  href: string;
  label: string;
  /** Rótulo para a faixa de 1024 a 1279px, onde os sete itens mal cabem. */
  curto?: string;
  /** Submenu. O item principal continua clicável e leva à página dele. */
  filhos?: { titulo: string; links: { href: string; label: string; nota?: string }[] }[];
};

export const MENU_DO_SITE: ItemMenu[] = [
  { href: "/quem-somos", label: "Quem somos" },
  {
    href: "/solucoes",
    label: "Produtos",
    filhos: [
      {
        titulo: "Módulos",
        links: [
          { href: "/modulos/essencial", label: "Essencial", nota: "Portal, protocolo e ouvidoria" },
          { href: "/modulos/gestao", label: "Gestão", nota: "Gabinete, finanças e mapa da cidade" },
          { href: "/modulos/saude", label: "Saúde", nota: "Unidades, estoque e indicadores" },
          { href: "/modulos/educacao", label: "Educação", nota: "Escolas, merenda e FUNDEB" },
          { href: "/modulos/obras", label: "Obras", nota: "Contratos, medição e obras federais" },
          { href: "/modulos/licitacoes", label: "Licitações", nota: "Compras e contratos do PNCP" },
        ],
      },
      {
        titulo: "Conheça",
        links: [
          { href: "/raio-x", label: "Raio-X do meu município" },
          { href: "/demo", label: "Demonstração" },
          { href: "/panorama", label: "Panorama das prefeituras" },
          { href: "/faq", label: "Perguntas frequentes" },
        ],
      },
    ],
  },
  { href: "/como-contratar", label: "Como contratar" },
  { href: "/governanca", label: "Governança" },
  { href: "/fale-conosco", label: "Fale conosco" },
];
