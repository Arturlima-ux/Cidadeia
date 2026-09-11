import { describe, it, expect } from "vitest";
import {
  avaliarImplantacao,
  resumirImplantacao,
  fraseDeProgresso,
  type FatosImplantacao,
} from "@/lib/implantacao";

// ── O QUE ESTES TESTES TRAVAM ──
// Cada passo é derivado de dado real, nunca de uma marca. Um passo que
// aparecesse "feito" sem o dado existir seria a lista mentindo para o
// prefeito sobre o estado do próprio sistema.

const NADA: FatosImplantacao = {
  codigoIbge: null,
  temRgfImportado: false,
  qtdModulos: 0,
  qtdUsuarios: 1,
  temDadosDeSecretaria: false,
  portalAtivo: false,
};

describe("avaliarImplantacao", () => {
  it("prefeitura recém-cadastrada não tem nenhum passo feito", () => {
    const passos = avaliarImplantacao(NADA);
    expect(passos.every((p) => !p.feito)).toBe(true);
  });

  it("quem cadastrou não conta como 'secretário com acesso'", () => {
    // O cadastro cria um usuário: o prefeito. Um usuário só não é acesso
    // distribuído — é a mesma pessoa que já estava digitando tudo.
    const [, , , acessos] = avaliarImplantacao({ ...NADA, qtdUsuarios: 1 });
    expect(acessos.chave).toBe("acessos");
    expect(acessos.feito).toBe(false);

    const [, , , comSecretario] = avaliarImplantacao({ ...NADA, qtdUsuarios: 2 });
    expect(comSecretario.feito).toBe(true);
  });

  it("código IBGE vazio não é município reconhecido", () => {
    const [municipio] = avaliarImplantacao({ ...NADA, codigoIbge: "" });
    expect(municipio.feito).toBe(false);
  });

  it("cada fato liga exatamente o passo dele", () => {
    const casos: [Partial<FatosImplantacao>, string][] = [
      [{ codigoIbge: "2211001" }, "municipio"],
      [{ temRgfImportado: true }, "tesouro"],
      [{ qtdModulos: 1 }, "modulos"],
      [{ qtdUsuarios: 2 }, "acessos"],
      [{ temDadosDeSecretaria: true }, "dados"],
      [{ portalAtivo: true }, "portal"],
    ];
    for (const [fato, chave] of casos) {
      const passos = avaliarImplantacao({ ...NADA, ...fato });
      const feitos = passos.filter((p) => p.feito).map((p) => p.chave);
      expect(feitos, `fato ${JSON.stringify(fato)}`).toEqual([chave]);
    }
  });

  it("os dois passos que custam dinheiro ou decisão são marcados como externos", () => {
    const passos = avaliarImplantacao(NADA);
    const externos = passos.filter((p) => p.externo).map((p) => p.chave);
    expect(externos).toEqual(["modulos", "portal"]);
  });
});

describe("resumirImplantacao", () => {
  it("não deixa encerrar enquanto há passo interno pendente", () => {
    const r = resumirImplantacao(avaliarImplantacao(NADA));
    expect(r.prontoParaEncerrar).toBe(false);
    expect(r.pendentesInternos.map((p) => p.chave)).toEqual([
      "municipio",
      "tesouro",
      "acessos",
      "dados",
    ]);
  });

  it("libera o encerramento com só os externos pendentes", () => {
    // Módulo custa dinheiro e portal é decisão política: prender o prefeito
    // fora do painel até resolver isso é catraca, não orientação.
    const r = resumirImplantacao(
      avaliarImplantacao({
        ...NADA,
        codigoIbge: "2211001",
        temRgfImportado: true,
        qtdUsuarios: 2,
        temDadosDeSecretaria: true,
      })
    );
    expect(r.prontoParaEncerrar).toBe(true);
    expect(r.feitos).toBe(4);
    expect(r.total).toBe(6);
  });
});

describe("fraseDeProgresso", () => {
  it("conta sem inflar", () => {
    const passos = avaliarImplantacao({ ...NADA, codigoIbge: "2211001" });
    expect(fraseDeProgresso(resumirImplantacao(passos))).toBe("1 de 6 passos concluídos.");
  });

  it("no zero, aponta por onde começar", () => {
    expect(fraseDeProgresso(resumirImplantacao(avaliarImplantacao(NADA)))).toContain(
      "Comece pelo primeiro"
    );
  });
});
