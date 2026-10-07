import { connection } from "next/server";
import Link from "next/link";
import { montarRaioX } from "@/lib/raio-x";
import { AVISO_DF, ehDistritoFederal } from "@/lib/regioes-df";
import RaioXResultado from "@/components/site/RaioXResultado";
import SolucoesDoRaioX from "@/components/site/SolucoesDoRaioX";
import Reveal from "@/components/site/Reveal";

// ── O QUE ESPERA O TESOURO, SEPARADO DO QUE NÃO ESPERA ──
//
// A página inteira aguardava `montarRaioX` antes de pintar qualquer coisa.
// Medido em produção: 2 a 5 segundos na PRIMEIRA visita de cada município —
// e com 5.570 municípios e tráfego de cauda longa vindo de busca, quase todo
// visitante é o primeiro daquele município. Eram 2 a 5 segundos de tela
// branca na porta de entrada do funil.
//
// Só este componente depende da consulta. O nome, a população e o porte saem
// de dado local e já estavam disponíveis — não havia motivo para eles
// esperarem o Tesouro.
//
// A documentação do Next desta versão diz exatamente isto: "using <Suspense>
// closer to the ... data access is recommended". O `loading.js` do segmento
// seguraria a página toda; o limite aqui segura só o bloco que de fato
// depende da rede.
//
// ── UMA CONSULTA, DOIS BLOCOS ──
//
// O resultado alimenta o painel de números E o bloco que liga cada achado ao
// módulo que o trata. Os dois ficam aqui porque dividir em dois limites de
// Suspense faria a mesma consulta duas vezes.

export default async function DadosDoTesouro({
  nome,
  uf,
  codigoIbge,
}: {
  nome: string;
  uf: string;
  codigoIbge: string;
}) {
  // O DF não presta contas como município (lib/regioes-df.ts): a consulta
  // voltaria vazia e a tela acusaria o GDF de não publicar relatórios.
  if (ehDistritoFederal(uf)) {
    return (
      <p
        className="rounded-2xl border px-5 py-4 text-sm leading-relaxed"
        style={{ borderColor: "var(--info-borda)", background: "var(--info-tint)" }}
      >
        {AVISO_DF}
      </p>
    );
  }

  // Corta a geração estática exatamente aqui: o que está acima deste
  // componente — cabeçalho, população, porte, vizinhos — deixa de esperar.
  await connection();

  let resultado: Awaited<ReturnType<typeof montarRaioX>> | null = null;
  try {
    resultado = await montarRaioX(nome, uf);
  } catch (e) {
    // Tesouro fora não pode virar página de erro: o cabeçalho e a captura de
    // contato continuam valendo, e o visitante fica sabendo o que aconteceu.
    console.error(`[raio-x/${uf}/${codigoIbge}] Tesouro não respondeu:`, e);
  }

  if (!resultado?.ok) {
    return (
      <Reveal delay={100}>
        <div className="border border-border rounded-2xl p-6" style={{ background: "var(--card)" }}>
          <h2 className="font-serif text-lg font-bold">
            {resultado && !resultado.ok && resultado.semPrefeitura ? "Sem prefeitura própria" : "O Tesouro não respondeu agora"}
          </h2>
          <p className="text-sm text-muted mt-2 leading-relaxed max-w-[62ch]">
            {resultado && !resultado.ok
              ? resultado.erro
              : `A consulta ao SICONFI falhou nesta visita. Os números de ${nome} aparecem aqui ` +
                "assim que o serviço responder — a página é refeita automaticamente."}
          </p>
          {!(resultado && !resultado.ok && resultado.semPrefeitura) && (
            <Link
              href="/raio-x"
              className="link-traco inline-block mt-4 text-sm font-semibold text-brand"
            >
              Consultar de novo agora →
            </Link>
          )}
        </div>
      </Reveal>
    );
  }

  const r = resultado.raioX;

  return (
    <>
      <Reveal delay={100}>
        <RaioXResultado raioX={r} semTitulo />
      </Reveal>

      {/* ── do diagnóstico para a solução ──
          Cada achado das finanças puxa o módulo que o trata. É o que
          transforma a página de consulta em início de conversa. */}
      <div className="pt-12">
        <Reveal>
          <SolucoesDoRaioX
            entrada={{
              municipio: r.municipio,
              codigoIbge: r.codigoIbge,
              receita: r.receita.valor,
              despesaSaude: r.despesaSaude.valor,
              despesaEducacao: r.despesaEducacao.valor,
              despesaObras: r.despesaObras.valor,
              rreoFaltando: r.rreoFaltando,
              rreoEsperados: r.rreoEsperados,
              bimestreReferencia: r.bimestreReferencia,
            }}
          />
        </Reveal>
      </div>
    </>
  );
}
