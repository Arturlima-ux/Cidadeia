"use client";

import { useState } from "react";
import Link from "next/link";

// ── ESCOLHA QUEM VOCÊ É ──
//
// A mesma prefeitura vista por cinco pessoas. Quem abre "Quem somos" quer
// saber se a empresa entende o dia dele, e não o de um cliente genérico.
// Cada cena é o que o sistema já faz hoje (lib/cargos.ts, as notícias, os
// módulos): nenhuma promessa entra aqui só para a cena ficar bonita.

type Pessoa = {
  chave: string;
  rotulo: string;
  antes: string;
  momentos: { quando: string; texto: string }[];
  cta: { href: string; rotulo: string };
};

const PESSOAS: Pessoa[] = [
  {
    chave: "prefeito",
    rotulo: "Prefeito(a)",
    antes:
      "Fica sabendo que a despesa com pessoal passou do limite pelo alerta do Tribunal, quando as nomeações já foram assinadas.",
    momentos: [
      { quando: "Segunda, de manhã", texto: "Chega por e-mail a Segunda do prefeito: as decisões e os prazos da semana, numa página só." },
      { quando: "No painel", texto: "Despesa com pessoal na régua da LRF, protocolos abertos e obras no prazo, com aviso antecipado quando o ritmo leva a um limite." },
      { quando: "Antes de assinar", texto: "Sabe se a nomeação ainda cabe: o painel mostra as vedações que já valem na faixa em que a prefeitura está." },
    ],
    cta: { href: "/para/prefeito", rotulo: "Ver o que muda para o prefeito" },
  },
  {
    chave: "financas",
    rotulo: "Finanças e contabilidade",
    antes: "Controla os prazos do RREO e do RGF numa planilha e descobre o atraso quando a transferência voluntária trava.",
    momentos: [
      { quando: "Todo dia", texto: "O sistema confere no Tesouro o que já consta entregue, no tipo comum ou simplificado." },
      { quando: "15 dias antes do prazo", texto: "Chega o aviso. No dia do atraso, chega outro, e o alerta some sozinho quando a entrega aparece." },
      { quando: "Quando o RGF entra", texto: "Se os números não fecham entre si, o aviso vem antes de virar apontamento e retificação." },
    ],
    cta: { href: "/para/financas", rotulo: "Ver o que muda nas finanças" },
  },
  {
    chave: "controle",
    rotulo: "Controle interno",
    antes:
      "Junta alertas espalhados em e-mails e planilhas para montar o parecer, sabendo que quem soube e não comunicou responde junto.",
    momentos: [
      { quando: "Numa lista só", texto: "Os alertas de todas as secretarias reunidos, cada um com o artigo de lei ao lado." },
      { quando: "Nas licitações", texto: "Dispensas do mesmo objeto somadas contra o limite anual, e contrato que não consta no PNCP." },
      { quando: "Na hora do parecer", texto: "Relatório em PDF pronto para instruir, sem montar planilha." },
    ],
    cta: { href: "/para/controle", rotulo: "Ver o que muda no controle" },
  },
  {
    chave: "secretario",
    rotulo: "Secretário(a) de área",
    antes: "Recebe a cobrança do gabinete sem saber de onde veio o número, e responde depois de procurar em três sistemas.",
    momentos: [
      { quando: "Só a sua pasta", texto: "Cada secretário tem o próprio acesso e recebe os alertas da sua área, não os de todo mundo." },
      { quando: "Saúde e educação", texto: "Dengue da cidade e das vizinhas pela Fiocruz, e os mínimos de 25% e do FUNDEB pelo número declarado ao FNDE." },
      { quando: "Obras", texto: "Quanto cada obra já deveria ter andado, calculado todo dia pelo prazo do contrato." },
    ],
    cta: { href: "/solucoes", rotulo: "Ver os módulos por área" },
  },
  {
    chave: "morador",
    rotulo: "Morador(a)",
    antes: "Liga, vai ao balcão, deixa o pedido e não sabe se ele andou nem quando vai ter resposta.",
    momentos: [
      { quando: "Pergunte à cidade", texto: "Pergunta em uma frase e recebe endereço, telefone e link. Sem resposta, vira pedido de informação já preenchido." },
      { quando: "Protocolo", texto: "Cada manifestação com número e prazo legal contado, e a confirmação de cada etapa por e-mail." },
      { quando: "Depois da resposta", texto: "Diz em um toque se a resposta resolveu, e o \"não resolveu\" chega na hora a quem respondeu." },
    ],
    cta: { href: "/transparencia", rotulo: "Abrir o portal do cidadão" },
  },
];

export default function QuemVoceE() {
  const [ativa, setAtiva] = useState(PESSOAS[0].chave);
  const p = PESSOAS.find((x) => x.chave === ativa)!;

  return (
    <div>
      <div role="tablist" aria-label="Quem é você na prefeitura" className="flex flex-wrap gap-2">
        {PESSOAS.map((x) => (
          <button
            key={x.chave}
            role="tab"
            id={`aba-${x.chave}`}
            aria-selected={ativa === x.chave}
            aria-controls="painel-pessoa"
            onClick={() => setAtiva(x.chave)}
            className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
              ativa === x.chave ? "border-transparent text-white" : "border-border text-muted hover:text-foreground hover:border-brand"
            }`}
            style={ativa === x.chave ? { background: "var(--brand)" } : undefined}
          >
            {x.rotulo}
          </button>
        ))}
      </div>

      <div
        id="painel-pessoa"
        role="tabpanel"
        aria-labelledby={`aba-${p.chave}`}
        key={p.chave}
        className="mt-6 grid lg:grid-cols-[minmax(0,4fr)_minmax(0,7fr)] gap-4 motion-safe:animate-[fade-in-up_.4s_ease-out_both]"
      >
        <div className="rounded-[24px] border border-border p-6 sm:p-7" style={{ background: "var(--superficie)" }}>
          <p className="text-sm font-medium text-muted">Hoje, sem aviso</p>
          <p className="mt-3 text-lg leading-relaxed">{p.antes}</p>
        </div>
        <div className="rounded-[24px] border p-6 sm:p-7" style={{ background: "var(--card)", borderColor: "var(--brand)" }}>
          <p className="text-sm font-medium" style={{ color: "var(--brand-claro)" }}>
            Com o CidadeIA
          </p>
          <ol className="mt-4 grid gap-5">
            {p.momentos.map((m) => (
              <li key={m.quando} className="grid sm:grid-cols-[150px_minmax(0,1fr)] gap-1 sm:gap-5">
                <span className="text-sm font-semibold">{m.quando}</span>
                <span className="text-muted leading-relaxed">{m.texto}</span>
              </li>
            ))}
          </ol>
          <Link href={p.cta.href} className="inicio-sublinhado inline-block mt-6 text-sm">
            {p.cta.rotulo}
          </Link>
        </div>
      </div>
    </div>
  );
}
