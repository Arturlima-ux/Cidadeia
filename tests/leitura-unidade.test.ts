import { describe, it, expect } from "vitest";
import { lerUnidade, mencionaUnidade } from "@/lib/leitura-unidade";

const hoje = new Date("2026-09-22T12:00:00Z");
const ha = (d: number) => new Date(hoje.getTime() - d * 86_400_000).toISOString();
const base = {
  unidade: { nome: "UBS Alto da Serra", ativo: true, cnesAtualizadoEm: ha(30).slice(0, 10), origem: "cnes", turno: null, atendeSus: true },
  ocorrenciasAbertas: [],
  estoque: [],
  mencoesOuvidoria: [],
};

describe("leitura automática da unidade", () => {
  it("sem nada aberto: normal, frase honesta", () => {
    const l = lerUnidade(base, hoje);
    expect(l.situacao).toBe("normal");
    expect(l.achados).toHaveLength(0);
    expect(l.resumo).toMatch(/Sem pendência/);
  });

  it("urgente vem antes, e a ação é concreta", () => {
    const l = lerUnidade(
      {
        ...base,
        unidade: { ...base.unidade, cnesAtualizadoEm: ha(410).slice(0, 10) },
        ocorrenciasAbertas: [{ tipo: "sem_medico", gravidade: "urgente", descricao: "Médico de licença.", createdAt: ha(3) }],
        estoque: [{ item: "Insulina NPH", saldo: 0, consumoMensal: 24, atualizadoEm: ha(1) }],
      },
      hoje
    );
    expect(l.situacao).toBe("urgente");
    expect(l.achados[0]!.gravidade).toBe("urgente");
    expect(l.achados.map((a) => a.fonte)).toEqual(expect.arrayContaining(["cnes", "ocorrencia", "estoque"]));
    expect(l.achados.every((a) => a.acao.length > 20)).toBe(true);
    expect(l.resumo).toContain(l.achados[0]!.titulo);
  });

  it("peso ordena unidades: a com mais problemas vem primeiro", () => {
    const leve = lerUnidade({ ...base, estoque: [{ item: "X", saldo: 5, consumoMensal: 30, atualizadoEm: ha(1) }] }, hoje);
    const grave = lerUnidade({ ...base, unidade: { ...base.unidade, ativo: false } }, hoje);
    expect(grave.peso).toBeGreaterThan(leve.peso);
  });

  it("ouvidoria: 3+ menções em 30 dias é atenção; menos é informativo", () => {
    const m = (n: number) => Array.from({ length: n }, (_, i) => ({ tipo: "reclamacao", assunto: `Fila ${i}`, createdAt: ha(i) }));
    expect(lerUnidade({ ...base, mencoesOuvidoria: m(3) }, hoje).situacao).toBe("atencao");
    expect(lerUnidade({ ...base, mencoesOuvidoria: m(1) }, hoje).situacao).toBe("normal");
  });

  it("reconhece a unidade citada pelo nome ou sem o prefixo", () => {
    expect(mencionaUnidade("Fui na UBS Alto da Serra e não tinha médico", "UBS Alto da Serra")).toBe(true);
    expect(mencionaUnidade("posto do alto da serra sem insulina", "UBS Alto da Serra")).toBe(true);
    expect(mencionaUnidade("Buraco na rua da matriz", "UBS Alto da Serra")).toBe(false);
    expect(mencionaUnidade("o hospital está lotado", "Hospital Municipal")).toBe(false);
  });
});
