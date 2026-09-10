import { lerSessao } from "@/lib/sessao";

// ── O QUE O SERVIDOR ENXERGA DO AMBIENTE ──
//
// Existe por um sintoma que não dava para diagnosticar de fora: a chave da
// Anthropic estava cadastrada na Vercel, marcada para Production, e mesmo
// assim o servidor não a via — a home continuava sem os selos "IA", que só
// aparecem quando `process.env.ANTHROPIC_API_KEY` existe.
//
// Sem enxergar o ambiente de dentro, as hipóteses (escopo errado, deploy
// antigo, nome com erro de digitação, valor vazio) são indistinguíveis, e
// testar uma por uma custa um deploy cada.
//
// ── O QUE ELE NUNCA DEVOLVE ──
//
// VALOR de variável. Nem trecho, nem primeiros caracteres. Só nome, se existe
// e o comprimento — o bastante para separar "não existe" de "existe vazia" de
// "existe com espaço sobrando", que são causas diferentes com a mesma
// aparência no painel.
//
// Exige sessão. Nome de variável de ambiente não é segredo, mas é mapa de
// arquitetura: diz quais serviços o sistema usa. Não precisa ficar aberto.

export const dynamic = "force-dynamic";

/** Variáveis que interessam ao diagnóstico, e só elas. */
const OBSERVADAS = [
  "ANTHROPIC_API_KEY",
  "DATABASE_URL",
  "DIRECT_URL",
  "AUTH_SECRET",
  "RESEND_API_KEY",
  "NEXT_PUBLIC_APP_URL",
];

export async function GET() {
  const sessao = await lerSessao();
  if (!sessao) {
    return Response.json({ erro: "Entre no sistema para ver isto." }, { status: 401 });
  }

  const estado = OBSERVADAS.map((nome) => {
    const valor = process.env[nome];
    return {
      nome,
      existe: valor !== undefined,
      // Zero com `existe: true` significa variável cadastrada em branco — que
      // no painel parece idêntica a uma preenchida.
      caracteres: valor?.length ?? 0,
      // Espaço ou quebra de linha no fim passa despercebido ao colar, e faz a
      // chave ser recusada pela API com erro que não menciona espaço nenhum.
      temEspacoSobrando: valor !== undefined && valor !== valor.trim(),
    };
  });

  // Nomes PARECIDOS com os esperados pegam erro de digitação: ANTROPIC sem o
  // "h", minúsculas, sufixo colado. No painel isso passa batido.
  const parecidas = Object.keys(process.env).filter(
    (n) => /anthropic|claude/i.test(n) && !OBSERVADAS.includes(n)
  );

  return Response.json({
    ambiente: {
      // VERCEL_ENV distingue production de preview — se vier "preview", a
      // variável certa está no escopo errado.
      vercel: process.env.VERCEL_ENV ?? "(fora da Vercel)",
      node: process.env.NODE_ENV,
      commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "(desconhecido)",
    },
    variaveis: estado,
    parecidasNaoEsperadas: parecidas,
  });
}
