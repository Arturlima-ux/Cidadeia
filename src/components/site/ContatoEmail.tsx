"use client";

import { useSearchParams } from "next/navigation";

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

export default function ContatoEmail() {
  const searchParams = useSearchParams();
  const modulo = searchParams.get("modulo");
  const chave = searchParams.get("assunto");

  // Módulo continua tendo precedência: veio de um card específico de preço.
  const escolhido = modulo ? null : chave ? ASSUNTOS[chave] : null;
  const assunto = modulo ? `Proposta para o módulo ${modulo}` : (escolhido?.assunto ?? PADRAO);
  const mailto = `mailto:${CONTATO_EMAIL}?subject=${encodeURIComponent(assunto)}`;

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted mb-1">E-mail</p>
      <a href={mailto} className="text-brand font-semibold hover:underline">
        {CONTATO_EMAIL}
      </a>
      {modulo && (
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
