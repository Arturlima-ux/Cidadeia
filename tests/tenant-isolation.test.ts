import { describe, it, expect, beforeAll } from "vitest";
import { db } from "@/db";
import { prefeituras, alertas, alertasSugeridos, usuarios } from "@/db/schema";
import { buscarAlertas, buscarSugestoesAlertasPendentes, buscarUsuarios } from "@/lib/dados-prefeitura";
import { gerarId } from "@/lib/id";

// Garante que uma prefeitura nunca enxerga dado de outra — a defesa mais
// crítica do sistema, já que é multi-tenant e login é por CPF/CNPJ do usuário,
// não por sub-domínio.
describe("isolamento entre prefeituras", () => {
  const prefA = gerarId("pref");
  const prefB = gerarId("pref");

  beforeAll(async () => {
    await db.insert(prefeituras).values([
      { id: prefA, nome: "Prefeitura A", estado: "CE", municipio: "Cidade A", cnpj: "11111111000101" },
      { id: prefB, nome: "Prefeitura B", estado: "CE", municipio: "Cidade B", cnpj: "22222222000102" },
    ]);

    await db.insert(alertas).values([
      { id: gerarId("alerta"), prefeituraId: prefA, titulo: "Alerta só da A" },
      { id: gerarId("alerta"), prefeituraId: prefB, titulo: "Alerta só da B" },
    ]);

    await db.insert(alertasSugeridos).values([
      {
        id: gerarId("sug"),
        prefeituraId: prefA,
        titulo: "Sugestão só da A",
        justificativa: "teste",
      },
      {
        id: gerarId("sug"),
        prefeituraId: prefB,
        titulo: "Sugestão só da B",
        justificativa: "teste",
      },
    ]);

    await db.insert(usuarios).values([
      {
        id: gerarId("user"),
        prefeituraId: prefA,
        cpfCnpj: "52998224725",
        senhaHash: "hash",
        nome: "Usuário A",
        cargo: "prefeito",
      },
      {
        id: gerarId("user"),
        prefeituraId: prefB,
        cpfCnpj: "11122233396",
        senhaHash: "hash",
        nome: "Usuário B",
        cargo: "prefeito",
      },
    ]);
  });

  it("buscarAlertas só retorna alertas da própria prefeitura", async () => {
    const alertasA = await buscarAlertas(prefA);
    expect(alertasA).toHaveLength(1);
    expect(alertasA[0].titulo).toBe("Alerta só da A");
  });

  it("buscarSugestoesAlertasPendentes só retorna sugestões da própria prefeitura", async () => {
    const sugestoesB = await buscarSugestoesAlertasPendentes(prefB);
    expect(sugestoesB).toHaveLength(1);
    expect(sugestoesB[0].titulo).toBe("Sugestão só da B");
  });

  it("buscarUsuarios só retorna usuários da própria prefeitura", async () => {
    const usuariosA = await buscarUsuarios(prefA);
    expect(usuariosA).toHaveLength(1);
    expect(usuariosA[0].nome).toBe("Usuário A");
  });
});
