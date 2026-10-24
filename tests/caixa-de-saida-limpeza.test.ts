// A caixa de saída da equipe guarda só o comercial. O que entrou antes da
// regra (código de login, troca de senha, ouvidoria) é apagado.

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { linhaPodeFicar } from "@/lib/caixa-de-saida";

const linha = (d: Record<string, unknown>) => JSON.stringify({ para: "x@y.gov.br", texto: "…", ...d });

describe("o que pode ficar na caixa de saída", () => {
  it("linha nova marcada como comercial fica", () => {
    expect(linhaPodeFicar(linha({ assunto: "Assunto que ainda não existe", comercial: true }))).toBe(true);
  });

  it.each([
    "Proposta do CidadeIA para Picos/PI",
    "Pedido recebido — proposta do CidadeIA para Picos/PI (protocolo 123)",
    "CidadeIA: pagamento confirmado, módulos ativos para Picos/PI",
    "Picos: o processo de contratação já vai pronto",
    "Picos: o que o painel mostraria por dentro",
    "Raio-X da Prefeitura de Picos/PI: o que o Tesouro já publicou",
    "Projeção da despesa com pessoal — Picos/PI",
  ])("comercial antigo fica: %s", (assunto) => {
    expect(linhaPodeFicar(linha({ assunto }))).toBe(true);
  });

  it.each([
    "CidadeIA: seu código de acesso é 123456",
    "Redefinir sua senha do CidadeIA",
    "Recebemos a sua manifestação",
    "Resposta da Prefeitura de Picos",
    "Alerta urgente — obra parada",
  ])("o resto sai: %s", (assunto) => {
    expect(linhaPodeFicar(linha({ assunto }))).toBe(false);
  });

  it("linha ilegível sai", () => {
    expect(linhaPodeFicar("{quebrado")).toBe(false);
  });

  it("a limpeza roda na rotina diária e ao abrir a caixa", () => {
    expect(readFileSync("src/app/api/manter-vivo/route.ts", "utf8")).toContain("limparPendentesSensiveis()");
    expect(readFileSync("src/lib/caixa-de-saida.ts", "utf8")).toMatch(/pendentesDaCaixaDeSaida[\s\S]*limparPendentesSensiveis\(\)/);
  });
});
