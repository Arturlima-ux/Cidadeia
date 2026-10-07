"use client";

import { useState } from "react";

// ── O PEDIDO PRONTO ──
//
// Todo morador pode pedir qualquer informação pública à prefeitura, sem
// explicar por quê (Lei 12.527/2011, art. 10, § 3º), e ela tem 20 dias para
// responder (art. 11). Quase ninguém pede, porque não sabe escrever o pedido.
// Aqui ele escolhe o assunto e o texto sai pronto, com o nome da cidade, para
// copiar e mandar.

const ASSUNTOS = [
  {
    chave: "folha",
    rotulo: "Salários dos servidores",
    pedido: (ano: number) =>
      `a relação dos servidores da Prefeitura, com cargo, local de trabalho e remuneração, referente ao mês mais recente de ${ano}`,
  },
  {
    chave: "saude",
    rotulo: "Gastos com saúde",
    pedido: (ano: number) => `os gastos da Secretaria de Saúde em ${ano}, por tipo de despesa e por fornecedor`,
  },
  {
    chave: "obras",
    rotulo: "Obras",
    pedido: (ano: number) =>
      `a lista das obras em andamento em ${ano}, com o valor do contrato, a empresa contratada, o prazo e quanto já foi executado`,
  },
  {
    chave: "merenda",
    rotulo: "Merenda escolar",
    pedido: (ano: number) =>
      `os contratos de compra da merenda escolar de ${ano}, com fornecedores e valores, e quanto foi comprado da agricultura familiar`,
  },
  {
    chave: "relatorios",
    rotulo: "Relatórios fiscais",
    pedido: () =>
      "o Relatório de Gestão Fiscal (RGF) e o Relatório Resumido da Execução Orçamentária (RREO) mais recentes, e a data em que foram publicados",
  },
] as const;

export default function PedidoLai({
  cidade,
  uf,
  assuntoInicial = "folha",
  linkPortal = null,
}: {
  cidade: string;
  uf: string;
  assuntoInicial?: (typeof ASSUNTOS)[number]["chave"];
  /** Quando a cidade tem portal no CidadeIA, o pedido pode ir direto por lá. */
  linkPortal?: string | null;
}) {
  const [assunto, setAssunto] = useState<string>(assuntoInicial);
  const [copiado, setCopiado] = useState(false);
  const ano = new Date().getFullYear();
  const escolhido = ASSUNTOS.find((a) => a.chave === assunto) ?? ASSUNTOS[0];

  const texto =
    `À Prefeitura Municipal de ${cidade} (${uf})\n` +
    `Assunto: Pedido de acesso à informação\n\n` +
    `Com base na Lei nº 12.527/2011 (Lei de Acesso à Informação), solicito ${escolhido.pedido(ano)}.\n\n` +
    `Peço que a resposta seja enviada em formato digital (planilha ou PDF), no prazo de 20 dias previsto no art. 11 da lei.\n\n` +
    `Nome:\nE-mail:\nData:`;

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch {
      setCopiado(false);
    }
  };

  return (
    <div className="grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] gap-6 lg:gap-10 items-start">
      <div>
        <p className="text-muted leading-relaxed">Escolha o que você quer saber:</p>
        <div className="flex flex-wrap gap-2 mt-4">
          {ASSUNTOS.map((a) => {
            const ativo = a.chave === escolhido.chave;
            return (
              <button
                key={a.chave}
                type="button"
                onClick={() => setAssunto(a.chave)}
                aria-pressed={ativo}
                className="rounded-full border px-4 py-2.5 text-sm font-medium transition"
                style={
                  ativo
                    ? { borderColor: "var(--brand)", background: "var(--brand-tint)", color: "var(--brand-claro)" }
                    : { borderColor: "var(--border)", color: "var(--muted)" }
                }
              >
                {a.rotulo}
              </button>
            );
          })}
        </div>
        <ol className="mt-7 space-y-3 text-sm leading-relaxed">
          {[
            linkPortal
              ? "Copie o texto e mande pelo portal da cidade, no botão de pedido."
              : "Copie o texto. No site da prefeitura, procure “Acesso à Informação” ou “e-SIC” e cole lá. Também vale entregar no protocolo da prefeitura.",
            "Guarde o número do protocolo que receber.",
            "A prefeitura tem 20 dias para responder (mais 10, se avisar). Sem resposta, você pode recorrer à autoridade acima e à Controladoria ou ao Tribunal de Contas do estado.",
          ].map((passo, i) => (
            <li key={i} className="flex gap-3">
              <span
                className="w-6 h-6 shrink-0 rounded-full flex items-center justify-center text-xs font-semibold"
                style={{ background: "var(--sutil)" }}
              >
                {i + 1}
              </span>
              <span className="text-muted">{passo}</span>
            </li>
          ))}
        </ol>
        <p className="text-xs text-muted mt-5">
          Você não precisa dizer por que quer a informação (Lei 12.527/2011, art. 10, § 3º).
        </p>
      </div>

      <div className="rounded-3xl border border-border overflow-hidden" style={{ background: "var(--superficie)" }}>
        <pre className="whitespace-pre-wrap font-sans text-[15px] leading-relaxed p-5 sm:p-6">{texto}</pre>
        <div className="flex flex-wrap gap-2 px-5 sm:px-6 pb-5 sm:pb-6">
          <button
            type="button"
            onClick={copiar}
            className="rounded-full px-5 py-3 font-semibold"
            style={{ background: "var(--brand)", color: "var(--sobre-forte)" }}
          >
            {copiado ? "Copiado ✓" : "Copiar o pedido"}
          </button>
          {linkPortal && (
            <a href={linkPortal} className="rounded-full border border-border px-5 py-3 font-medium hover:border-brand transition">
              Abrir o portal da cidade
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
