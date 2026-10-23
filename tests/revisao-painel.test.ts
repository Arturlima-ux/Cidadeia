import { describe, expect, it } from "vitest";
import { secaoAlertasParaIA } from "@/lib/alerta-por-area";
import { textoFilaVazia } from "@/lib/atendimento";

const alertas = [
  { titulo: "Remédio acabando na UBS", descricao: null, prioridade: "urgente", secretaria: "saude", resolvido: false },
  { titulo: "Reunião da licitação", descricao: "PE 014", prioridade: "medio", secretaria: "Licitações e contratos", resolvido: false },
  { titulo: "Prazo do RGF", descricao: null, prioridade: "urgente", secretaria: null, resolvido: false },
  { titulo: "Vacina reposta", descricao: null, prioridade: "info", secretaria: "Secretaria de Saúde", resolvido: true },
];

describe("alertas no contexto da IA seguem o recorte da tela", () => {
  it("o secretário vê os da própria área, como na tela de alertas", () => {
    const texto = secaoAlertasParaIA({ cargo: "secretario", secretaria: "saude" }, alertas);
    expect(texto).toContain("Alertas em aberto (1)");
    expect(texto).toContain("Remédio acabando na UBS");
    expect(texto).not.toContain("Reunião da licitação");
    expect(texto).not.toContain("Prazo do RGF");
    expect(texto).toContain("Alertas já resolvidos: 1");
    // Era "o filtro de alertas por secretaria ainda não existe".
    expect(texto).not.toContain("ainda não existe");
  });

  it("o prefeito vê todos, sem aviso de recorte", () => {
    const texto = secaoAlertasParaIA({ cargo: "prefeito" }, alertas);
    expect(texto).toContain("Alertas em aberto (3):");
    expect(texto).toContain("Prazo do RGF");
    expect(texto).not.toContain("só os da área");
  });

  it("cargo de uma instalação não recebe alerta nenhum", () => {
    expect(secaoAlertasParaIA({ cargo: "escola" }, alertas)).toContain("Alertas em aberto (0)");
  });
});

describe("fila vazia da ouvidoria", () => {
  it("não manda o secretário ativar um portal que ele não vê", () => {
    expect(textoFilaVazia(false, false)).not.toContain("acima");
    expect(textoFilaVazia(false, false)).toContain("gabinete");
    expect(textoFilaVazia(false, true)).toContain("sua secretaria");
  });

  it("o gestor continua sendo orientado a ativar o portal", () => {
    expect(textoFilaVazia(true, false)).toContain("Ative o portal público acima");
    expect(textoFilaVazia(true, true)).toContain("ela aparece aqui");
  });
});
