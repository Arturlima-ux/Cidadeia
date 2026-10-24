import Link from "next/link";
import { notFound } from "next/navigation";
import { contextoDashboard } from "@/lib/contexto-dashboard";
import BloqueioPlano from "@/components/BloqueioPlano";
import MarcadorSituacao from "@/components/MarcadorSituacao";
import { IconDownload } from "@/components/icons";
import { lerNotificacao } from "@/lib/notificacao-servidor";
import { dataBr, nomeDoCargo } from "@/lib/renovacao-contrato";
import type { Bloco } from "@/lib/kit-contratacao";
import { formatarMoedaExata } from "@/lib/formatadores";
import { dataHoraNumerica, dataNumerica, fusoDoEstado } from "@/lib/horario";
import AprovarNotificacao from "./AprovarNotificacao";

// ── A NOTIFICAÇÃO À CONTRATADA, MONTADA ──
//
// O painel de Obras aponta a obra que passou do prazo e deixa registrar a
// decisão. Esta tela é o passo do meio: o papel que pergunta à contratada o
// que aconteceu, e a anotação do fiscal. A lógica mora em
// lib/notificacao-obra.ts; aqui só se mostra.

export const metadata = { title: "Notificação à contratada" };
export const dynamic = "force-dynamic";

function BlocoNaTela({ bloco }: { bloco: Bloco }) {
  if (bloco.tipo === "paragrafo") return <p className="whitespace-pre-line">{bloco.texto}</p>;
  if (bloco.tipo === "lista") {
    return (
      <ul className="list-disc pl-5 space-y-1">
        {bloco.itens.map((i) => (
          <li key={i}>{i}</li>
        ))}
      </ul>
    );
  }
  // A tabela do registro é de duas colunas (campo e informação): no celular
  // ela quebra linha em vez de rolar de lado.
  return (
    <dl className="text-sm border-t border-border">
      {bloco.linhas.map((l, i) => (
        <div key={i} className="grid sm:grid-cols-[10rem_1fr] gap-x-4 gap-y-0.5 py-2 border-b border-border">
          <dt className="text-muted">{l[0]}</dt>
          <dd className="break-words">{l.slice(1).join(" · ")}</dd>
        </div>
      ))}
    </dl>
  );
}

function Fato({ rotulo, valor, nota }: { rotulo: string; valor: string; nota?: string }) {
  return (
    <div className="min-w-0 pr-3 sm:pr-4 sm:pl-4 sm:first:pl-0 sm:border-l sm:first:border-l-0 border-border">
      <dt className="text-xs text-muted">{rotulo}</dt>
      <dd className="text-sm font-semibold mt-0.5 tabular-nums break-words">{valor}</dd>
      {nota && <dd className="text-xs text-muted mt-0.5">{nota}</dd>}
    </div>
  );
}

export default async function NotificacaoObraPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await contextoDashboard();
  if (!ctx.temPlano("obras")) return <BloqueioPlano plano="obras" />;
  const { id } = await params;

  const leitura = await lerNotificacao(ctx.sessao, id);
  if (!leitura.ok && leitura.motivo === "nao_encontrado") notFound();

  const voltar = (
    <Link href="/dashboard/secretarias/obras" className="text-xs font-semibold text-muted hover:text-brand transition">
      ← Obras
    </Link>
  );

  if (!leitura.ok) {
    return (
      <div className="max-w-4xl space-y-4">
        {voltar}
        <h1 className="text-2xl font-semibold tracking-[-0.02em]">Notificação à contratada</h1>
        <div className="border border-border rounded-xl px-5 py-4 text-sm leading-relaxed">
          <p>{leitura.mensagem}</p>
          {leitura.motivo === "erro" && (
            <Link href={`/dashboard/secretarias/obras/${id}/notificacao`} className="inline-block mt-2 font-semibold text-brand-legivel hover:underline">
              Tentar de novo
            </Link>
          )}
        </div>
      </div>
    );
  }

  const { obra, contrato, leitura: l, pacote, aprovacao, prefeitura } = leitura.notificacao;
  const fuso = fusoDoEstado(prefeitura.estado);
  const valor = obra.valorContrato ?? contrato?.valorGlobal ?? null;
  const contratada = contrato?.fornecedorNome ?? obra.fornecedorNome;

  return (
    <div className="max-w-4xl space-y-8">
      <div>
        {voltar}
        <h1 className="text-2xl font-semibold tracking-[-0.02em] mt-2 break-words">Notificação à contratada</h1>
        <p className="text-sm text-muted mt-1.5 leading-relaxed break-words">
          {obra.nome}
          {contratada ? ` · ${contratada}` : ""}
        </p>
        <p className="text-sm mt-3 leading-relaxed flex items-start gap-2.5">
          <MarcadorSituacao situacao={pacote ? "urgente" : "normal"} className="mt-1" />
          <span>{l.texto}</span>
        </p>

        <dl className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-y-4 border-y border-border py-4">
          <Fato
            rotulo="Prazo do contrato"
            valor={obra.vigenciaFim ? `até ${dataBr(obra.vigenciaFim)}` : "Sem data de fim"}
            nota={obra.vigenciaInicio ? `desde ${dataBr(obra.vigenciaInicio)}` : undefined}
          />
          <Fato
            rotulo="Última medição"
            valor={obra.progressoAtual === null ? "Nenhuma" : `${Math.round(obra.progressoAtual)}%`}
            nota={obra.progressoAtual !== null && obra.atualizadoEm ? `em ${dataNumerica(obra.atualizadoEm, fuso)}` : undefined}
          />
          <Fato rotulo="Valor" valor={valor !== null ? formatarMoedaExata(valor) : "—"} />
          <Fato
            rotulo="Contrato"
            valor={contrato?.numeroContrato ?? (contrato ? "Sem número" : "Cadastro manual")}
            nota={contrato ? "do PNCP" : "sem contrato vinculado"}
          />
        </dl>
      </div>

      {!pacote ? (
        <section className="border border-border rounded-xl px-5 py-4 text-sm leading-relaxed">
          <p className="font-semibold">Esta obra não pede notificação agora.</p>
          <p className="text-muted mt-1">
            A notificação é para obra com o prazo do contrato encerrado sem conclusão, ou com a medição muito atrás do prazo. Quando
            for o caso, ela aparece montada aqui.
          </p>
        </section>
      ) : (
        <>
          <section aria-labelledby="estado" className="border border-border rounded-xl px-5 py-4">
            <h2 id="estado" className="sr-only">
              Estado da notificação
            </h2>
            {aprovacao.tipo === "aprovado" ? (
              <div className="text-sm leading-relaxed">
                <p className="font-semibold" style={{ color: "var(--info)" }}>
                  Conferida e aprovada para envio por {aprovacao.aprovacao.usuarioNome} (
                  {nomeDoCargo(aprovacao.aprovacao.usuarioCargo)}) em {dataHoraNumerica(aprovacao.aprovacao.createdAt, fuso)}.
                </p>
                <p className="text-muted mt-1">
                  Os arquivos baixados levam esta aprovação no topo. Aprovar não é assinar nem enviar: a entrega à contratada é no
                  processo, com o recibo que a notificação traz no fim. Ref. <span className="font-mono">{pacote.impressao}</span>.
                </p>
              </div>
            ) : (
              <div className="text-sm leading-relaxed">
                <p className="font-semibold">Rascunho: nada foi enviado nem assinado.</p>
                {aprovacao.tipo === "desatualizado" && (
                  <p className="mt-1" style={{ color: "var(--medio)" }}>
                    {aprovacao.aprovacao.usuarioNome} aprovou em {dataHoraNumerica(aprovacao.aprovacao.createdAt, fuso)} um texto que
                    não é mais este: a obra ou o contrato mudou depois da aprovação. Confira de novo.
                  </p>
                )}
                <p className="text-muted mt-1">
                  Montada pelo CidadeIA com a obra, o contrato do PNCP e a última medição. Leia, aprove para registrar que foi
                  conferida e leve ao processo.
                </p>
                <AprovarNotificacao obraId={obra.id} impressao={pacote.impressao} pendencias={pacote.pendencias.length} />
              </div>
            )}
          </section>

          {pacote.pendencias.length > 0 && (
            <details className="group border border-border rounded-xl">
              <summary className="cursor-pointer list-none px-5 py-4 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <span className="font-semibold">
                  O que só a prefeitura sabe <span className="text-muted font-normal tabular-nums">({pacote.pendencias.length})</span>
                </span>
                <span className="text-xs font-semibold text-muted group-open:hidden">Ver a lista</span>
                <span className="text-xs font-semibold text-muted hidden group-open:inline">Recolher</span>
              </summary>
              <div className="px-5 pb-5 border-t border-border">
                <p className="text-sm text-muted mt-3 leading-relaxed max-w-2xl">
                  Ficaram entre colchetes nos documentos. O prazo de resposta fica em branco de propósito: depende do contrato e do
                  que a fiscalização precisa ver, e um número sugerido acabaria virando o número usado.
                </p>
                <ul className="mt-3 grid sm:grid-cols-2 gap-x-6 text-sm">
                  {pacote.pendencias.map((m) => (
                    <li key={m} className="py-1.5 border-b border-border break-words">
                      {m.slice(1, -1)}
                    </li>
                  ))}
                </ul>
              </div>
            </details>
          )}

          <section aria-labelledby="documentos" className="space-y-3">
            <h2 id="documentos" className="font-semibold">
              Documentos
            </h2>
            {pacote.documentos.map((doc, i) => (
              <details key={doc.chave} open={i === 0} className="group border border-border rounded-xl bg-card">
                <summary className="cursor-pointer list-none px-5 py-4 flex flex-wrap items-start justify-between gap-3">
                  <span className="min-w-0">
                    <span className="block font-semibold text-sm">{doc.nome}</span>
                    <span className="block text-sm text-muted mt-0.5 leading-relaxed">{doc.resumo}</span>
                  </span>
                  <span className="text-xs font-semibold text-muted group-open:hidden">Ler</span>
                  <span className="text-xs font-semibold text-muted hidden group-open:inline">Recolher</span>
                </summary>
                <div className="px-5 pb-5 border-t border-border">
                  <div className="flex flex-wrap gap-2 pt-4">
                    <a
                      href={`/api/obras/notificacao/${obra.id}?documento=${doc.chave}`}
                      className="group/b inline-flex items-center gap-2 border border-border rounded-lg px-3.5 py-2 min-h-10 text-sm font-semibold hover:border-brand hover:text-brand transition"
                    >
                      <IconDownload className="w-4 h-4 transition-transform duration-200 group-hover/b:translate-y-0.5" />
                      Baixar para o Word
                    </a>
                    <a
                      href={`/api/obras/notificacao/${obra.id}?documento=${doc.chave}&formato=txt`}
                      className="inline-flex items-center rounded-lg px-3.5 py-2 min-h-10 text-sm text-muted hover:text-brand transition"
                    >
                      Texto puro
                    </a>
                  </div>
                  <div className="mt-4 space-y-5 text-[15px] leading-relaxed max-w-[70ch]">
                    {doc.clausulas.map((c) => (
                      <div key={c.titulo} className="space-y-2">
                        <h3 className="font-semibold text-sm">{c.titulo}</h3>
                        {c.blocos.map((b, j) => (
                          <BlocoNaTela key={j} bloco={b} />
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              </details>
            ))}
          </section>

          <section aria-labelledby="depois" className="border border-border rounded-xl px-5 py-4 text-sm leading-relaxed">
            <h2 id="depois" className="font-semibold">
              Depois da resposta
            </h2>
            <p className="text-muted mt-1 max-w-2xl">
              Com a resposta da contratada (ou sem ela, vencido o prazo), registre a decisão no painel de Obras: prorrogação por lei,
              mora da contratada, extinção ou conclusão. A mora não é registrada junto com esta aprovação porque afirma culpa, e culpa
              só se conclui depois de ouvir a empresa.
            </p>
            <Link href="/dashboard/secretarias/obras" className="inline-block mt-2 font-semibold text-brand-legivel hover:underline">
              Registrar a decisão em Obras
            </Link>
          </section>
        </>
      )}

      <p className="text-xs text-muted pt-4 border-t border-border leading-relaxed">
        Base legal usada nos documentos: Lei 14.133/2021, arts. 111 (prorrogação automática do contrato de escopo e mora do
        contratado), 117, § 1º (registro da fiscalização) e 155 a 163 (apuração de responsabilidade, com defesa própria). O prazo
        transcorrido citado é o da data da medição, não o de hoje, para que o texto aprovado não mude sozinho.
      </p>
    </div>
  );
}
