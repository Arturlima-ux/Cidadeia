import { describe, expect, it } from "vitest";
import { emTempoDeTrabalho, SEMANAS_DE_TRABALHO } from "@/lib/tempo-de-trabalho";

const porAno = (pessoas: number, horasSemana: number) => pessoas * horasSemana * SEMANAS_DE_TRABALHO;

describe("horas por ano numa medida que se enxerga", () => {
  it("1 pessoa, 1 h por semana: 48 h são 6 dias, e não '1 semana inteira'", () => {
    expect(porAno(1, 1)).toBe(48);
    expect(emTempoDeTrabalho(48)).toBe("6 dias");
  });

  it("até duas semanas, em dias; depois em semanas, com uma casa", () => {
    expect(emTempoDeTrabalho(8)).toBe("1 dia");
    expect(emTempoDeTrabalho(79)).toBe("9,9 dias");
    expect(emTempoDeTrabalho(80)).toBe("2 semanas");
    expect(emTempoDeTrabalho(porAno(2, 2))).toBe("4,8 semanas"); // 192 h
    expect(emTempoDeTrabalho(porAno(2, 4))).toBe("2,4 meses"); // 384 h, o padrão da calculadora
  });

  it("de dois meses a um ano, em meses; acima, em anos", () => {
    expect(emTempoDeTrabalho(320)).toBe("2 meses");
    expect(emTempoDeTrabalho(porAno(3, 5))).toBe("4,5 meses"); // 720 h
    expect(emTempoDeTrabalho(1920)).toBe("1 ano");
    expect(emTempoDeTrabalho(porAno(10, 20))).toBe("5 anos"); // 9.600 h
  });

  it("singular abaixo de 2, como se fala", () => {
    expect(emTempoDeTrabalho(60)).toBe("7,5 dias");
    expect(emTempoDeTrabalho(2880)).toBe("1,5 ano");
  });
});
