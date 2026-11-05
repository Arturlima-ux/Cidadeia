"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { EdicaoDaCidade, EdicaoDoBrasil, Faixa, PrazoDaEdicao } from "@/lib/boletim-da-cidade";
import { oQueMudou, umaCasa } from "@/lib/boletim-da-cidade";
import { anunciarCidadeDaEdicao, EVENTO_ESCOLHA, guardarCidadeDaEdicao, lerCidadeDaEdicao } from "@/lib/edicao";
import { LIMITE_ALERTA, LIMITE_PESSOAL, LIMITE_PRUDENCIAL } from "@/lib/despesa-pessoal";
import { caminhoDoRaioX } from "@/lib/slug-municipio";

// ── A EDIÇÃO DE HOJE ──
// O que faz a pessoa voltar: a página lembra a cidade (só neste aparelho,
// lib/edicao.ts) e, a cada dia, abre a edição dela: quantos dias faltam para
// o RREO e o RGF, a despesa com pessoal do último RGF, o estado no Panorama e
// o que mudou desde a última visita. Sem cidade, a edição é a do Brasil.
// Tudo vem de /api/edicao, que só lê dado guardado no site: abre rápido.

const DATA_LONGA = new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
const DATA_CURTA = new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "long", timeZone: "UTC" });
const dia = (iso: string) => new Date(`${iso}T12:00:00Z`);
const num = (n: number) => n.toLocaleString("pt-BR");
const reais = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const diasTexto = (d: number) => (d === 0 ? "vence hoje" : d === 1 ? "falta 1 dia" : `faltam ${d} dias`);

const ROTULO_FAIXA: Record<Faixa, string> = {
  abaixo: "Abaixo do alerta",
  alerta: "No limite de alerta",
  prudencial: "No limite prudencial",
  acima: "Acima do limite da LRF",
};

type Estado = { tipo: "brasil" } | { tipo: "carregando"; nome: string } | { tipo: "cidade"; e: EdicaoDaCidade; mudou: string | null } | { tipo: "erro"; nome: string };

export default function EdicaoDeHoje({ brasil }: { brasil: EdicaoDoBrasil }) {
  const [estado, setEstado] = useState<Estado>({ tipo: "brasil" });

  useEffect(() => {
    let vivo = true;
    async function abrir(c: { codigo: string; nome: string; uf: string }) {
      setEstado({ tipo: "carregando", nome: c.nome });
      try {
        const r = await fetch(`/api/edicao/${c.codigo}`);
        if (!r.ok) throw new Error(String(r.status));
        const e = (await r.json()) as EdicaoDaCidade;
        if (!vivo) return;
        const antes = lerCidadeDaEdicao();
        const mudou = oQueMudou(antes?.codigo === e.municipio.codigo ? antes.lembranca ?? null : null, e);
        const p = e.pessoal;
        const cidade = {
          codigo: e.municipio.codigo,
          nome: e.municipio.nome,
          uf: e.municipio.uf,
          porte: e.municipio.porteChave,
          ...(e.sede ?? {}),
          lembranca: {
            codigo: e.municipio.codigo,
            visto: e.hoje,
            pct: p.situacao === "lida" ? p.pct : null,
            periodo: p.situacao === "lida" ? p.periodo : null,
          },
        };
        guardarCidadeDaEdicao(cidade);
        anunciarCidadeDaEdicao(cidade);
        setEstado({ tipo: "cidade", e, mudou });
      } catch {
        if (vivo) setEstado({ tipo: "erro", nome: c.nome });
      }
    }
    const ja = lerCidadeDaEdicao();
    if (ja) void abrir(ja);
    const aoEscolher = (ev: Event) => void abrir((ev as CustomEvent<{ codigo: string; nome: string; uf: string }>).detail);
    window.addEventListener(EVENTO_ESCOLHA, aoEscolher);
    return () => {
      vivo = false;
      window.removeEventListener(EVENTO_ESCOLHA, aoEscolher);
    };
  }, []);

  const hoje = estado.tipo === "cidade" ? estado.e.hoje : brasil.hoje;
  const prazos = estado.tipo === "cidade" ? estado.e.prazos : brasil.prazos;

  return (
    <div className="nv-eixo">
      <aside className="nv-notas" aria-label="Sobre esta edição">
        <p className="nv-data">{DATA_LONGA.format(dia(hoje))}</p>
        <p>Feita com o que a prefeitura declarou ao Tesouro Nacional (Siconfi) e com a população do IBGE.</p>
        <p>Despesa com pessoal relida em {DATA_CURTA.format(dia(estado.tipo === "cidade" ? estado.e.conferidoEm ?? brasil.conferidoEm : brasil.conferidoEm))}, como toda segunda e quinta.</p>
        {estado.tipo === "cidade" && <p>Esta página lembra {estado.e.municipio.nome} neste aparelho e abre nela amanhã. Nada vai para o nosso servidor.</p>}
      </aside>

      <div className="nv-edicao" aria-live="polite" data-estado={estado.tipo}>
        <h2 className="nv-h2">
          {estado.tipo === "cidade" ? `${estado.e.municipio.nome}, hoje` : estado.tipo === "carregando" ? `${estado.nome}, hoje` : "O Brasil, hoje"}
        </h2>

        {estado.tipo === "cidade" && estado.mudou && <p className="nv-mudou">{estado.mudou}</p>}
        {estado.tipo === "brasil" && (
          <p className="nv-lead">
            Escolha a sua cidade no alto da página e esta edição passa a ser dela: os prazos, a despesa com pessoal e o lugar do estado no
            mapa da LRF.
          </p>
        )}
        {estado.tipo === "erro" && <p className="nv-lead">Não foi possível abrir a edição de {estado.nome} agora. Tente de novo em instantes.</p>}

        <div className="nv-boletim" data-ui>
          <Prazos prazos={prazos} />
          {estado.tipo === "cidade" ? <Pessoal e={estado.e} /> : <Brasil b={brasil} carregando={estado.tipo === "carregando"} />}
        </div>

        {estado.tipo === "cidade" && (
          <div className="nv-acoes">
            <Link className="nv-botao" href={`/proposta?ibge=${estado.e.municipio.codigo}`}>
              Montar a proposta de {estado.e.municipio.nome}
            </Link>
            <Link className="nv-link" href={caminhoDoRaioX(estado.e.municipio)}>
              Abrir o Raio-X completo e receber por e-mail
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

function Prazos({ prazos }: { prazos: PrazoDaEdicao[] }) {
  const [primeiro, ...resto] = prazos;
  if (!primeiro) return null;
  return (
    <div className="nv-prazo">
      <p className="nv-prazo-num">
        {primeiro.dias}
        <span>{primeiro.dias === 1 ? "dia" : "dias"}</span>
      </p>
      <div className="nv-prazo-texto">
        <p>
          até o prazo do <b>{primeiro.sigla} do {primeiro.rotulo}</b>, em {DATA_CURTA.format(dia(primeiro.vencimento))}.
        </p>
        {resto.map((p) => (
          <p key={p.sigla} className="nv-suave">
            {p.sigla} do {p.rotulo}: {DATA_CURTA.format(dia(p.vencimento))}, {diasTexto(p.dias)}.
          </p>
        ))}
      </div>
    </div>
  );
}

function Regua({ pct, faixa }: { pct: number; faixa: Faixa }) {
  // A régua vai de 30% a 70%: é nessa faixa que os três limites e quase todas as prefeituras estão.
  const pos = (v: number) => `${Math.max(0, Math.min(100, ((v - 30) / 40) * 100))}%`;
  return (
    <div className="nv-regua" role="img" aria-label={`Despesa com pessoal em ${umaCasa(pct)}% da receita corrente líquida. Alerta em ${umaCasa(LIMITE_ALERTA)}%, prudencial em ${umaCasa(LIMITE_PRUDENCIAL)}%, máximo em ${LIMITE_PESSOAL}%.`}>
      <div className="nv-regua-trilho" data-faixa={faixa}>
        <span className="nv-regua-feito" style={{ width: pos(pct) }} />
        {[LIMITE_ALERTA, LIMITE_PRUDENCIAL, LIMITE_PESSOAL].map((l) => (
          <i key={l} style={{ left: pos(l) }} />
        ))}
      </div>
      <div className="nv-regua-marcas" aria-hidden>
        <span style={{ left: pos(LIMITE_ALERTA) }}>{umaCasa(LIMITE_ALERTA)}</span>
        <span style={{ left: pos(LIMITE_PRUDENCIAL) }}>{umaCasa(LIMITE_PRUDENCIAL)}</span>
        <span style={{ left: pos(LIMITE_PESSOAL) }}>{LIMITE_PESSOAL}</span>
      </div>
    </div>
  );
}

function Pessoal({ e }: { e: EdicaoDaCidade }) {
  const p = e.pessoal;
  return (
    <div className="nv-pessoal">
      {p.situacao === "lida" ? (
        <>
          <p className="nv-pessoal-cab">
            <span className="nv-pct">{umaCasa(p.pct)}%</span>
            <span>
              da receita corrente líquida vai para pessoal. <b data-faixa={p.faixa}>{ROTULO_FAIXA[p.faixa]}.</b>
            </span>
          </p>
          <Regua pct={p.pct} faixa={p.faixa} />
          <p className="nv-suave">
            {p.folgaAtePrudencial >= 0
              ? `Cabem mais ${reais(p.folgaAtePrudencial)} em doze meses até o limite prudencial, onde começam as vedações.`
              : `Passou do limite prudencial em ${reais(-p.folgaAtePrudencial)} em doze meses: as vedações do art. 22 da LRF já valem.`}{" "}
            Declarado no {p.periodo}.
          </p>
        </>
      ) : (
        <p className="nv-suave">
          {p.situacao === "sem-rgf"
            ? "O último RGF desta prefeitura ainda não aparece no Tesouro Nacional."
            : "O RGF declarado tem números que não fecham (despesa fora de 20% a 90% da receita): a edição não lê esse número."}
        </p>
      )}
      {e.estado.comNumero > 0 && (
        <p className="nv-estado">
          Em todo o estado ({e.estado.nome}), {num(e.estado.passaramDoAlerta)} das {num(e.estado.comNumero)} prefeituras com RGF lido passaram do
          limite de alerta.
        </p>
      )}
    </div>
  );
}

function Brasil({ b, carregando }: { b: EdicaoDoBrasil; carregando: boolean }) {
  return (
    <div className="nv-pessoal" aria-busy={carregando}>
      <p className="nv-pessoal-cab">
        <span className="nv-pct">{num(b.brasil.passaramDoAlerta)}</span>
        <span>
          prefeituras passaram do limite de alerta da despesa com pessoal, de {num(b.brasil.comNumero)} com o RGF lido.
        </span>
      </p>
      <p className="nv-suave">
        {num(b.brasil.acimaDoLimite)} estão acima do limite máximo de {LIMITE_PESSOAL}% da receita corrente líquida, e {num(b.brasil.rgfAtrasado)} estão com o
        RGF atrasado no Tesouro.
      </p>
    </div>
  );
}
