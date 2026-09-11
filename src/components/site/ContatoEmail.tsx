"use client";

import { montarProposta, PORTES, type PorteMunicipio } from "@/lib/precos";
import type { PlanoAddon } from "@/lib/planos";
import { LIMITE_DISPENSA, cabeNaDispensa } from "@/lib/contratacao";
import { formatarMoeda } from "@/lib/formatadores";

const CONTATO_EMAIL = "arturmlo2005@gmail.com";

// De onde a pessoa veio muda o que ela quer perguntar, e chegar com o
// assunto já escrito poupa a parte da mensagem que ninguém gosta de redigir.
//
// A lista é fechada de propósito. O parâmetro vem da URL, e é a URL que o
// visitante controla: interpolar o texto cru no assunto do e-mail deixaria
// qualquer um montar um link "do CidadeIA" com o assunto que quisesse.
const ASSUNTOS: Record<string, { assunto: string; nota: string }> = {
  proposta: {
    assunto: "Proposta para a minha prefeitura",
    nota: "Conte o município e o porte que a gente devolve o valor anual e o kit de contratação.",
  },
  diagnostico: {
    assunto: "Diagnóstico de conformidade — correção ou dúvida",
    nota: "Achou exigência errada, desatualizada ou faltando? É assim que a lista é corrigida.",
  },
  kit: {
    assunto: "Dúvida sobre o kit de contratação",
    nota: "Dúvida do setor jurídico sobre termo de referência, minuta ou base legal.",
  },
  suporte: {
    assunto: "Suporte — conta ou acesso",
    nota: "Descreva o que aconteceu e o CPF/CNPJ da conta, para agilizar.",
  },
};

const PADRAO = "Contato via site CidadeIA";

// `modulo` e `assunto` chegam por propriedade, do servidor.
//
// Liam a URL com useSearchParams, e isso fazia o Next desistir de
// pré-renderizar /suporte: o HTML saía sem o bloco de contato, que só existia
// depois do JavaScript rodar. Ver o comentário em app/login/page.tsx — mesmo
// defeito, mesma origem.
/**
 * Proposta montada no simulador: porte e módulos JÁ VALIDADOS pela página
 * contra a tabela (PORTES e PLANOS_ADDON). Daqui sai um assunto e um corpo
 * de e-mail com o que a pessoa escolheu — para o pedido não começar com
 * "qual o porte do seu município?" quando ela acabou de responder isso.
 */
export type PropostaMontada = {
  porte: PorteMunicipio;
  modulos: PlanoAddon[];
  /** Presente quando o município foi identificado no IBGE — e aí o porte veio dele. */
  municipio?: { nome: string; uf: string; populacao: number } | null;
};

function textoDaProposta(p: PropostaMontada): { assunto: string; corpo: string } {
  const proposta = montarProposta({ porte: p.porte, modulos: p.modulos });
  const nomes = proposta.itens.map((i) => i.nome);
  const porte = PORTES.find((x) => x.chave === p.porte);
  const rotuloPorte = porte ? `${porte.rotulo} ${porte.detalhe}` : p.porte;
  const m = p.municipio;
  const linhas = [
    m
      ? `Município: ${m.nome}/${m.uf} — ${new Intl.NumberFormat("pt-BR").format(m.populacao)} habitantes (IBGE) → porte ${rotuloPorte}`
      : `Porte informado: ${rotuloPorte} (município não identificado)`,
    `Módulos: ${nomes.join(", ") || "(nenhum)"}`,
  ];
  if (!proposta.incompleta && proposta.anual > 0) {
    linhas.push(`Mensal: ${formatarMoeda(proposta.mensal)} — 12 meses: ${formatarMoeda(proposta.anual)}`);
    linhas.push(
      cabeNaDispensa(proposta.anual)
        ? `Cabe na dispensa de licitação (${LIMITE_DISPENSA.base}).`
        : "Acima do limite de dispensa — caminho: pregão eletrônico."
    );
  }
  linhas.push("", "Gostaria de receber a proposta e o termo de referência.");
  return {
    assunto: `Proposta: ${nomes.join(" + ") || "módulos a definir"} — ${m ? `${m.nome}/${m.uf}` : rotuloPorte}`,
    corpo: linhas.join("\n"),
  };
}

export default function ContatoEmail({
  modulo,
  chave,
  proposta,
}: {
  modulo?: string | null;
  chave?: string | null;
  proposta?: PropostaMontada | null;
}) {
  // Precedência: proposta montada > módulo de um card > assunto genérico.
  const montada = proposta ? textoDaProposta(proposta) : null;
  const escolhido = modulo || montada ? null : chave ? ASSUNTOS[chave] : null;
  const assunto = montada
    ? montada.assunto
    : modulo
      ? `Proposta para o módulo ${modulo}`
      : (escolhido?.assunto ?? PADRAO);
  const mailto =
    `mailto:${CONTATO_EMAIL}?subject=${encodeURIComponent(assunto)}` +
    (montada ? `&body=${encodeURIComponent(montada.corpo)}` : "");

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted mb-1">E-mail</p>
      <a href={mailto} className="text-brand font-semibold hover:underline">
        {CONTATO_EMAIL}
      </a>
      {montada && (
        <div className="text-xs text-muted mt-1.5 leading-relaxed">
          <p>
            Assunto pré-preenchido: <strong>{montada.assunto}</strong>.
          </p>
          <pre className="mt-2 whitespace-pre-wrap font-sans rounded-lg border border-border px-3 py-2">
            {montada.corpo}
          </pre>
        </div>
      )}
      {modulo && !montada && (
        <p className="text-xs text-muted mt-1.5">
          Assunto pré-preenchido: proposta para o módulo <strong>{modulo}</strong>.
        </p>
      )}
      {escolhido && (
        <p className="text-xs text-muted mt-1.5 leading-relaxed">
          Assunto pré-preenchido: <strong>{escolhido.assunto}</strong>. {escolhido.nota}
        </p>
      )}
    </div>
  );
}
