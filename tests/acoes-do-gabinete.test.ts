import { describe, it, expect, vi, beforeEach } from "vitest";

// Ação de servidor é chamada pelo id, não pela tela: o botão escondido não
// protege nada. Estas duas não conferiam cargo — qualquer conta logada
// sobrescrevia os indicadores do prefeito e apagava as sugestões da IA.

const estado = vi.hoisted(() => ({
  sessao: null as null | Record<string, unknown>,
  plano: true,
  inseridos: 0,
  apagados: 0,
  iaChamada: 0,
}));

vi.mock("@/lib/sessao", async (original) => {
  const real = await original<typeof import("@/lib/sessao")>();
  return { ...real, lerSessao: async () => estado.sessao };
});
vi.mock("@/lib/exigir-plano", () => ({ exigirPlano: async () => ({ ok: estado.plano }) }));
vi.mock("@/db", () => ({
  db: {
    insert: () => ({ values: async () => { estado.inseridos++; } }),
    delete: () => ({ where: async () => { estado.apagados++; } }),
  },
}));
vi.mock("@/db/schema", () => ({ dashboardSnapshots: {}, alertas: {}, alertasSugeridos: { prefeituraId: "prefeitura_id" } }));
vi.mock("@/lib/ia", () => ({
  gerarSugestoesAlertas: async () => {
    estado.iaChamada++;
    return { ok: true, sugestoes: [] };
  },
}));
vi.mock("@/lib/auditoria", () => ({ auditar: async () => {} }));
vi.mock("@/lib/notificacoes", () => ({ notificarAlertaUrgente: async () => {} }));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));

import { atualizarSnapshot, gerarSugestoes } from "@/app/dashboard/actions";

const base = { usuarioId: "u", prefeituraId: "p", nome: "X" };
const formulario = () => {
  const f = new FormData();
  f.set("receita", "100");
  f.set("despesas", "50");
  return f;
};

beforeEach(() => {
  estado.plano = true;
  estado.inseridos = 0;
  estado.apagados = 0;
  estado.iaChamada = 0;
});

describe("indicadores do prefeito", () => {
  for (const cargo of [
    { cargo: "secretario", secretaria: "saude" },
    { cargo: "escola", escolaId: "e1" },
    { cargo: "unidade", unidadeId: "u1" },
  ]) {
    it(`${cargo.cargo} não sobrescreve receita e despesa`, async () => {
      estado.sessao = { ...base, ...cargo };
      await expect(atualizarSnapshot(formulario())).rejects.toThrow();
      expect(estado.inseridos).toBe(0);
    });
  }

  it("o prefeito atualiza", async () => {
    estado.sessao = { ...base, cargo: "prefeito" };
    await atualizarSnapshot(formulario());
    expect(estado.inseridos).toBe(1);
  });

  it("sem o plano Gestão, nem o prefeito", async () => {
    estado.sessao = { ...base, cargo: "prefeito" };
    estado.plano = false;
    await expect(atualizarSnapshot(formulario())).rejects.toThrow(/Gestão/);
    expect(estado.inseridos).toBe(0);
  });
});

describe("sugestões de alerta da IA", () => {
  it("secretário não apaga as sugestões do gabinete nem chama a IA", async () => {
    estado.sessao = { ...base, cargo: "secretario", secretaria: "obras" };
    const r = await gerarSugestoes();
    expect(r.ok).toBe(false);
    expect(estado.apagados).toBe(0);
    expect(estado.iaChamada).toBe(0);
  });

  it("o prefeito gera (e as novas substituem as pendentes)", async () => {
    estado.sessao = { ...base, cargo: "prefeito" };
    const r = await gerarSugestoes();
    expect(r.ok).toBe(true);
    expect(estado.iaChamada).toBe(1);
    expect(estado.apagados).toBe(1);
  });
});
