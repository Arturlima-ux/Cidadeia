// ── GUIAS: AS PERGUNTAS QUE LEVAM A PREFEITURA AO GOOGLE ──
//
// A auditoria de SEO (out/2026) achou o site sem nenhuma página para as
// dúvidas que um secretário de finanças, um controlador ou o jurídico
// digitam antes de saber que o CidadeIA existe: quando vence o RREO, como se
// calcula a despesa com pessoal, qual o prazo da LAI, se software cabe em
// dispensa. Cada guia responde uma, com o artigo e o link para o texto da lei,
// e leva ao Raio-X do município de quem lê.
//
// Regra: só o que está na lei ou no dado público, com data de revisão. Os
// valores que mudam (limite de dispensa, patamares da LRF) vêm das mesmas
// constantes do resto do site.

export type Guia = {
  slug: string;
  /** Título da aba e do Google, sem a marca. */
  titulo: string;
  /** Título grande da página. */
  chamada: string;
  descricao: string;
  /** AAAA-MM-DD da última revisão do texto. */
  revisadoEm: string;
};

export const GUIAS: Guia[] = [
  {
    slug: "prazos-rreo-rgf",
    titulo: "Prazos do RREO e do RGF: o calendário da prefeitura",
    chamada: "Quando vencem o RREO e o RGF da prefeitura",
    descricao:
      "RREO a cada bimestre e RGF a cada quadrimestre ou semestre, até 30 dias depois do período: as datas do ano, quem pode optar e o que acontece no atraso.",
    revisadoEm: "2026-10-23",
  },
  {
    slug: "despesa-com-pessoal-lrf",
    titulo: "Despesa com pessoal na LRF: 54%, prudencial e alerta",
    chamada: "Despesa com pessoal: os três limites da LRF para a prefeitura",
    descricao:
      "Como se calcula a despesa com pessoal da prefeitura, o limite de 54% da receita corrente líquida, o prudencial de 51,3% e o alerta de 48,6%.",
    revisadoEm: "2026-10-23",
  },
  {
    slug: "prazo-lai-ouvidoria",
    titulo: "Prazo de resposta da LAI e da ouvidoria (Lei 13.460)",
    chamada: "Quantos dias a prefeitura tem para responder o cidadão",
    descricao:
      "Pedido pela LAI: 20 dias, mais 10 com justificativa. Manifestação na ouvidoria pela Lei 13.460: 30 dias, prorrogáveis uma vez. Como contar o prazo.",
    revisadoEm: "2026-10-23",
  },
  {
    slug: "dispensa-de-licitacao-software",
    titulo: "Dispensa de licitação para software de gestão",
    chamada: "Quando a prefeitura pode contratar software por dispensa",
    descricao:
      "O limite do art. 75, II, da Lei 14.133, a soma do ano que evita o fracionamento, o aviso de três dias úteis e o que o processo precisa ter.",
    revisadoEm: "2026-10-23",
  },
  {
    slug: "minimo-saude-educacao",
    titulo: "Mínimo de saúde e educação: 15% e 25% do município",
    chamada: "Quanto a prefeitura tem de aplicar em saúde e em educação",
    descricao:
      "Saúde: 15% dos impostos e transferências (LC 141). Educação: 25% (art. 212 da Constituição). A base, onde se apura e o que acontece abaixo do mínimo.",
    revisadoEm: "2026-11-04",
  },
  {
    slug: "fundeb-70-por-cento",
    titulo: "Fundeb: os 70% para os profissionais da educação",
    chamada: "Os 70% do Fundeb: o que entra na conta e o que fica fora",
    descricao:
      "Pelo menos 70% do Fundeb vai para a remuneração dos profissionais da educação básica (Lei 14.113, art. 26). A base, quem conta e os 10% do ano seguinte.",
    revisadoEm: "2026-11-04",
  },
  {
    slug: "portal-da-transparencia-municipal",
    titulo: "Portal da transparência da prefeitura: o que é lei",
    chamada: "O que o portal da transparência da prefeitura tem de mostrar",
    descricao:
      "Receita e despesa em tempo real (LRF, art. 48-A), o que a LAI pede no site, a regra das cidades com até 10 mil habitantes e a sanção para quem não cumpre.",
    revisadoEm: "2026-11-04",
  },
];

export function guiaPor(slug: string): Guia | undefined {
  return GUIAS.find((g) => g.slug === slug);
}
