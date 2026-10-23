import { describe, expect, it } from "vitest";
import { codigoConfere, gerarCodigo, loginComCodigoLigado, mascararEmail, resumoDoCodigo, DIGITOS } from "@/lib/codigo-login";

const S = "segredo-de-teste-com-mais-de-trinta-e-dois-caracteres";

describe("código de acesso por e-mail", () => {
  it("só liga com LOGIN_COM_CODIGO=1", () => {
    expect(loginComCodigoLigado({})).toBe(false);
    expect(loginComCodigoLigado({ LOGIN_COM_CODIGO: "0" })).toBe(false);
    expect(loginComCodigoLigado({ LOGIN_COM_CODIGO: "1" })).toBe(true);
  });

  it("gera sempre 6 dígitos, com zero à esquerda", () => {
    for (let i = 0; i < 200; i++) expect(gerarCodigo()).toMatch(new RegExp(`^\\d{${DIGITOS}}$`));
  });

  it("confere o certo, recusa o errado, o vencido e o de outro usuário", () => {
    const expiraEm = 1_000_000;
    const pendente = { usuarioId: "u1", expiraEm, resumo: resumoDoCodigo("042517", "u1", expiraEm, S) };
    expect(codigoConfere("042517", pendente, S, 999_000)).toBe("certo");
    expect(codigoConfere("042 517", pendente, S, 999_000)).toBe("certo");
    expect(codigoConfere("042518", pendente, S, 999_000)).toBe("errado");
    expect(codigoConfere("42517", pendente, S, 999_000)).toBe("errado");
    expect(codigoConfere("042517", pendente, S, 1_000_001)).toBe("vencido");
    expect(codigoConfere("042517", { ...pendente, usuarioId: "u2" }, S, 999_000)).toBe("errado");
    expect(codigoConfere("042517", pendente, "outro-segredo", 999_000)).toBe("errado");
  });

  it("o resumo não contém o código", () => {
    expect(resumoDoCodigo("042517", "u1", 1, S)).not.toContain("042517");
  });

  it("mascara o e-mail sem perder o domínio", () => {
    expect(mascararEmail("arturmlo2005@gmail.com")).toBe("a***********@gmail.com");
    expect(mascararEmail("ab@x.com")).toBe("a***@x.com");
    expect(mascararEmail("invalido")).toBe("o seu e-mail");
  });
});
