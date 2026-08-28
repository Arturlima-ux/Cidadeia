import { describe, it, expect } from "vitest";
import { validarCPF, validarCNPJ, validarCpfOuCnpj, normalizarDocumento } from "@/lib/documento";

describe("validarCPF", () => {
  it("aceita um CPF válido", () => {
    expect(validarCPF("529.982.247-25")).toBe(true);
  });

  it("rejeita dígitos verificadores errados", () => {
    expect(validarCPF("529.982.247-26")).toBe(false);
  });

  it("rejeita todos os dígitos iguais", () => {
    expect(validarCPF("111.111.111-11")).toBe(false);
  });

  it("rejeita tamanho errado", () => {
    expect(validarCPF("123")).toBe(false);
  });
});

describe("validarCNPJ", () => {
  it("aceita um CNPJ válido", () => {
    expect(validarCNPJ("11.222.333/0001-81")).toBe(true);
  });

  it("rejeita dígitos verificadores errados", () => {
    expect(validarCNPJ("11.222.333/0001-82")).toBe(false);
  });
});

describe("validarCpfOuCnpj", () => {
  it("distingue CPF (11) de CNPJ (14) pelo tamanho", () => {
    expect(validarCpfOuCnpj("529.982.247-25")).toBe(true);
    expect(validarCpfOuCnpj("11.222.333/0001-81")).toBe(true);
  });

  it("rejeita tamanho que não é nem CPF nem CNPJ", () => {
    expect(validarCpfOuCnpj("123456")).toBe(false);
  });
});

describe("normalizarDocumento", () => {
  it("remove tudo que não é dígito", () => {
    expect(normalizarDocumento("529.982.247-25")).toBe("52998224725");
  });
});
