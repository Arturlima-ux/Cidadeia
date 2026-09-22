import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fraseDaAuditoria, limparResumo, NOME_ACAO, NOME_ENTIDADE } from "@/lib/auditoria";

// ── TODA AÇÃO QUE ESCREVE DEIXA TRILHA ──
// A tela de Auditoria promete "cada alteração feita no painel aparece
// aqui". Este teste lê as ações e exige que as que escrevem no banco
// chamem auditar(). Se alguém criar uma ação nova sem trilha, quebra.

const ACOES_QUE_ESCREVEM: [string, string[]][] = [
  ["src/app/dashboard/secretarias/obras/actions.ts", ["criarObra", "atualizarProgressoObra", "excluirObra"]],
  ["src/app/dashboard/secretarias/licitacoes/actions.ts", ["criarLicitacao", "excluirLicitacao"]],
  ["src/app/dashboard/secretarias/saude/actions.ts", ["criarUnidadeSaude", "atualizarIndicadorSaude", "excluirUnidadeSaude"]],
  ["src/app/dashboard/secretarias/educacao/actions.ts", ["criarEscola", "atualizarIndicadorEducacao", "excluirEscola"]],
  ["src/app/dashboard/actions.ts", ["atualizarSnapshot", "criarAlerta", "resolverAlerta", "aprovarSugestao"]],
  ["src/app/dashboard/atendimento/actions.ts", ["responderAtendimento", "prorrogarPrazo", "salvarConfigPublica"]],
  ["src/app/dashboard/publicacoes/actions.ts", ["salvarPublicacao", "alternarPublicado", "removerPublicacao"]],
  ["src/app/dashboard/configuracoes/actions.ts", ["criarUsuarioSecretario", "removerUsuario"]],
  ["src/app/dashboard/dados/importar/actions.ts", ["confirmarImportacao"]],
  ["src/app/dashboard/modulos/marketplace/actions.ts", ["pedirModuloDoPainel"]],
];

function corpoDaFuncao(fonte: string, nome: string): string {
  const ini = fonte.indexOf(`export async function ${nome}(`);
  if (ini < 0) return "";
  const fim = fonte.indexOf("\n}\n", ini);
  return fonte.slice(ini, fim);
}

describe("trilha de auditoria", () => {
  it("cada ação que escreve chama auditar()", () => {
    const faltando: string[] = [];
    for (const [arquivo, fns] of ACOES_QUE_ESCREVEM) {
      const fonte = readFileSync(arquivo, "utf8");
      for (const fn of fns) {
        const corpo = corpoDaFuncao(fonte, fn);
        if (!corpo) faltando.push(`${arquivo}: ${fn} (não encontrada)`);
        else if (!corpo.includes("auditar(")) faltando.push(`${arquivo}: ${fn}`);
      }
    }
    expect(faltando).toEqual([]);
  });

  it("a ativação de módulos pela equipe entra na trilha da prefeitura", () => {
    const fonte = readFileSync("src/app/admin/pedidos/actions.ts", "utf8");
    expect(fonte).toContain("db.insert(auditoria)");
    expect(fonte).toContain('acao: "ativar"');
  });

  it("a frase é legível e o resumo nunca estoura", () => {
    expect(fraseDaAuditoria({ usuarioNome: "Maria", usuarioCargo: "secretario", acao: "alterar", entidade: "obra", resumo: "progresso 45%" })).toBe(
      "Maria (secretario) alterou obra: progresso 45%"
    );
    expect(limparResumo("  a   b \n c ".repeat(200)).length).toBeLessThanOrEqual(400);
    for (const k of Object.keys(NOME_ACAO)) expect(NOME_ACAO[k as keyof typeof NOME_ACAO]).toMatch(/ou$|iu$|eu$/);
    expect(Object.keys(NOME_ENTIDADE).length).toBeGreaterThanOrEqual(10);
  });

  it("a trilha faz parte da exportação de dados", () => {
    expect(readFileSync("src/lib/exportacao.ts", "utf8")).toContain('chave: "auditoria"');
  });
});
