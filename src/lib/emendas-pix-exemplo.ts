import type { Emenda } from "@/lib/emendas-pix";

// Emendas de exemplo para a demonstração e para a tela vazia: parlamentares
// e valores fictícios, nenhuma emenda real. A do Senador(a) B ainda não tem
// plano de trabalho aprovado (por isso não tem prazo de execução e aparece
// como "aguardando plano de trabalho"); a de custeio do ano anterior deixa o
// percentual de capital daquele ano abaixo dos 70%, para a tela mostrar o
// indicador.
export function emendasDeExemplo(hoje: Date = new Date()): Emenda[] {
  const ano = hoje.getUTCFullYear();
  const em = (dias: number) => new Date(hoje.getTime() + dias * 86_400_000).toISOString().slice(0, 10);
  const base = { codigo: null, numeroEmenda: null, devolucoes: [] as Emenda["devolucoes"] };
  return [
    {
      ...base,
      id: 1,
      ano,
      parlamentar: "Deputado(a) de exemplo A",
      objeto: "Pavimentação de vias no bairro Centro",
      area: "Urbanismo",
      valor: 850_000,
      custeio: 0,
      investimento: 850_000,
      situacao: "Ciente",
      impedimento: null,
      planoTrabalho: { situacao: "Aprovado", inicio: em(-300), fim: em(42), aprovadoEm: em(-310), analisePendente: false },
      relatorios: [{ tipo: "Parcial", situacao: "Enviado", data: em(-120), executado: 410_000 }],
    },
    {
      ...base,
      id: 2,
      ano,
      parlamentar: "Senador(a) de exemplo B",
      objeto: "Aquisição de equipamentos para as unidades básicas de saúde",
      area: "Saúde",
      valor: 400_000,
      custeio: 0,
      investimento: 400_000,
      situacao: "Ciente",
      impedimento: "Dados bancários pendentes de validação",
      planoTrabalho: null,
      relatorios: [],
    },
    {
      ...base,
      id: 3,
      ano: ano - 1,
      parlamentar: "Deputado(a) de exemplo C",
      objeto: "Reforma da escola municipal do povoado",
      area: "Educação",
      valor: 300_000,
      custeio: 0,
      investimento: 300_000,
      situacao: "Ciente",
      impedimento: null,
      planoTrabalho: { situacao: "Aprovado", inicio: em(-500), fim: em(-20), aprovadoEm: em(-510), analisePendente: false },
      relatorios: [{ tipo: "Parcial", situacao: "Enviado", data: em(-200), executado: 180_000 }],
    },
    {
      ...base,
      id: 4,
      ano: ano - 1,
      parlamentar: "Deputado(a) de exemplo A",
      objeto: "Custeio da atenção básica",
      area: "Saúde",
      valor: 250_000,
      custeio: 250_000,
      investimento: 0,
      situacao: "Ciente",
      impedimento: null,
      planoTrabalho: { situacao: "Aprovado", inicio: em(-400), fim: em(-60), aprovadoEm: em(-410), analisePendente: false },
      relatorios: [{ tipo: "Final", situacao: "Enviado", data: em(-40), executado: 250_000 }],
    },
  ];
}
