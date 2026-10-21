// ── O MENU DO SITE, NO DESENHO DE EMPRESA ──
//
// Sete itens, na ordem de um site institucional (quem somos, produtos,
// notícias, governança, contato, carreiras, portal), pedida pelo fundador
// a partir do site da Cimed. Uma fonte só para o cabeçalho do computador e
// o menu do celular.
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
  { href: "/por-que-cidadeia", label: "Quem somos" },
  {
    href: "/solucoes",
    label: "Produtos",
    filhos: [
      {
        titulo: "Módulos",
        links: [
          { href: "/modulos/essencial", label: "Essencial", nota: "Portal, protocolo e ouvidoria" },
          { href: "/modulos/gestao", label: "Gestão", nota: "LRF, prazos e despesa com pessoal" },
          { href: "/modulos/saude", label: "Saúde", nota: "Mínimo de 15%, unidades e dengue" },
          { href: "/modulos/educacao", label: "Educação", nota: "Mínimo de 25%, FUNDEB e SIOPE" },
          { href: "/modulos/obras", label: "Obras", nota: "Prazo, medição e obras federais" },
          { href: "/modulos/licitacoes", label: "Licitações", nota: "Dispensas, contratos e PNCP" },
        ],
      },
      {
        titulo: "Conheça",
        links: [
          { href: "/raio-x", label: "Raio-X do meu município" },
          { href: "/demo", label: "Demonstração" },
          { href: "/panorama", label: "Panorama das prefeituras" },
          { href: "/como-contratar", label: "Como contratar" },
          { href: "/faq", label: "Perguntas frequentes" },
        ],
      },
    ],
  },
  { href: "/noticias", label: "Notícias" },
  { href: "/governanca", label: "Governança" },
  { href: "/fale-conosco", label: "Fale conosco" },
  { href: "/carreiras", label: "Carreiras" },
  { href: "/transparencia", label: "Portal da transparência", curto: "Transparência" },
];
