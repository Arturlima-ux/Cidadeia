import Link from "next/link";
import { notFound } from "next/navigation";
import { contextoDashboard } from "@/lib/contexto-dashboard";
import BloqueioPlano from "@/components/BloqueioPlano";
import MarcadorSituacao, { type SituacaoMarcador } from "@/components/MarcadorSituacao";
import { IconDownload } from "@/components/icons";
import { lerRenovacao } from "@/lib/renovacao-servidor";
import {
  NOME_CAMINHO,
  dataBr,
  nomeDoCargo,
  type CaminhoRenovacao,
  type DiagnosticoRenovacao,
  type SituacaoAprovacao,
} from "@/lib/renovacao-contrato";
import type { Bloco } from "@/lib/kit-contratacao";
import { formatarMoedaExata } from "@/lib/formatadores";
import { dataHoraNumerica, fusoDoEstado } from "@/lib/horario";
import type { SituacaoVigencia } from "@/lib/vigencia";
import AprovarRascunho from "./AprovarRascunho";

// ── A RENOVAÇÃO DE UM CONTRATO, MONTADA ──
//
// O radar de vigência apontava o contrato e parava. Esta tela faz o trabalho
// seguinte: os documentos dos dois caminhos possíveis, preenchidos com o que o
// PNCP já publicou, com o que falta preencher listado e a aprovação registrada.
// A lógica mora em lib/renovacao-contrato.ts; aqui só se mostra.

export const metadata = { title: "Renovação de contrato" };
export const dynamic = "force-dynamic";

const MARCADOR: Record<SituacaoVigencia, SituacaoMarcador> = {
  vencido: "urgente",
  sem_tempo_de_licitar: "urgente",
  apertado: "atencao",
  atencao: "atencao",
  sem_data: "atencao",
  ok: "normal",
};

const O_QUE_AFIRMA: Record<CaminhoRenovacao, string> = {
  prorrogar:
    "O serviço ou fornecimento é contínuo, o edital previu a prorrogação e os preços continuam vantajosos. Sai o ofício à contratada, o checklist e a minuta do aditivo.",
  licitar:
    "A necessidade continua e será atendida por uma nova contratação. Sai o documento de formalização de demanda e o estudo técnico preliminar.",
};

/**
 * O caminho aberto quando a URL não diz. Não é recomendação — a tela diz o
 * que cada um exige —, é só qual aba abre primeiro: a aprovada, se houver; a
 * prorrogação, quando o edital já não cabe; senão a nova contratação.
 */
function caminhoInicial(pedido: string | undefined, d: DiagnosticoRenovacao, a: SituacaoAprovacao): CaminhoRenovacao {
  const disponivel = (c: CaminhoRenovacao) => d.opcoes.find((o) => o.caminho === c)?.disponivel;
  if ((pedido === "prorrogar" || pedido === "licitar") && disponivel(pedido)) return pedido;
  if (a.tipo === "aprovado" && disponivel(a.caminho)) return a.caminho;
  if (d.editalAtrasado && disponivel("prorrogar")) return "prorrogar";
  return disponivel("licitar") ? "licitar" : "prorrogar";
}

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
  return (
    <div className="overflow-x-auto -mx-1 px-1">
      <table className="w-full text-sm border-collapse min-w-[30rem]">
        <thead>
          <tr>
            {bloco.cabecalho.map((c) => (
              <th key={c} className="text-left font-medium text-muted text-xs py-2 pr-3 border-b border-border align-bottom">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {bloco.linhas.map((l, i) => (
            <tr key={i} className="border-b border-border last:border-0">
              {l.map((c, j) => (
                <td key={j} className={`py-2 pr-3 align-top ${/^R\$/.test(c) ? "text-right tabular-nums whitespace-nowrap" : ""}`}>
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
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

export default async function RenovacaoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [k: string]: string | string[] | undefined }>;
}) {
  const ctx = await contextoDashboard();
  if (!ctx.temPlano("licitacoes")) return <BloqueioPlano plano="licitacoes" />;
  const { id } = await params;
  const pedido = (await searchParams).caminho;

  const leitura = await lerRenovacao(ctx.sessao, id);
  if (!leitura.ok && leitura.motivo === "nao_encontrado") notFound();

  const voltar = (
    <Link href="/dashboard/secretarias/licitacoes" className="text-xs font-semibold text-muted hover:text-brand transition">
      ← Licitações
    </Link>
  );

  if (!leitura.ok) {
    return (
      <div className="max-w-4xl space-y-4">
        {voltar}
        <h1 className="text-2xl font-semibold tracking-[-0.02em]">Renovação de contrato</h1>
        <div className="border border-border rounded-xl px-5 py-4 text-sm leading-relaxed">
          <p>{leitura.mensagem}</p>
          {leitura.motivo === "erro" && (
            <Link href={`/dashboard/secretarias/licitacoes/contratos/${id}`} className="inline-block mt-2 font-semibold text-brand-legivel hover:underline">
              Tentar de novo
            </Link>
          )}
        </div>
      </div>
    );
  }

  const { contrato, diagnostico: d, pacotes, aprovacao, historico, sucessor } = leitura.renovacao;
  const fuso = fusoDoEstado(leitura.renovacao.prefeitura.estado);
  const caminho = caminhoInicial(typeof pedido === "string" ? pedido : undefined, d, aprovacao);
  const pacote = pacotes[caminho];
  const opcaoAtual = d.opcoes.find((o) => o.caminho === caminho)!;
  const titulo = contrato.numeroContrato ? `Contrato ${contrato.numeroContrato}` : "Contrato sem número";
  const aprovadoEste = aprovacao.tipo === "aprovado" && aprovacao.caminho === caminho;
  const base = `/dashboard/secretarias/licitacoes/contratos/${contrato.id}`;
  const valor = contrato.valorGlobal !== null ? formatarMoedaExata(contrato.valorGlobal) : "—";

  return (
    <div className="max-w-4xl space-y-8">
      <div>
        {voltar}
        <h1 className="text-2xl font-semibold tracking-[-0.02em] mt-2 break-words">Renovação — {titulo}</h1>
        <p className="text-sm text-muted mt-1.5 leading-relaxed break-words">
          {contrato.fornecedorNome ?? "Contratado não informado"} · {contrato.objeto}
        </p>
        <p className="text-sm mt-3 leading-relaxed flex items-start gap-2.5">
          <MarcadorSituacao situacao={MARCADOR[d.vigencia.situacao]} className="mt-1" />
          <span>{d.vigencia.texto}</span>
        </p>

        <dl className={`mt-5 grid grid-cols-2 gap-y-4 ${d.ehObra ? "" : "sm:grid-cols-4"} border-y border-border py-4`}>
          <Fato
            rotulo="Vigência"
            valor={contrato.vigenciaFim ? `até ${dataBr(contrato.vigenciaFim)}` : "Sem data de fim"}
            nota={contrato.vigenciaInicio ? `desde ${dataBr(contrato.vigenciaInicio)}` : undefined}
          />
          <Fato rotulo="Valor global" valor={valor} />
          {!d.ehObra && (
            <>
          <Fato
            rotulo="Edital, se licitar"
            valor={d.editalAte ? `publicar até ${dataBr(d.editalAte)}` : "—"}
            nota={d.vigencia.prazo ? `${d.vigencia.prazo.dias} dias úteis (${d.vigencia.prazo.base})` : undefined}
          />
          <Fato
            rotulo="Teto de dez anos"
            valor={d.limiteDecenal ? dataBr(d.limiteDecenal) : "—"}
            nota="art. 107, pela data de início do PNCP"
          />
            </>
          )}
        </dl>
      </div>

      {d.ehObra ? (
        <section className="border border-border rounded-xl px-5 py-4 text-sm leading-relaxed">
          <p className="font-semibold">Contrato de obra não passa por aqui.</p>
          <p className="text-muted mt-1">{d.opcoes[0].observacao}</p>
          <Link href="/dashboard/secretarias/obras" className="inline-block mt-2 font-semibold text-brand-legivel hover:underline">
            Ir para Obras
          </Link>
        </section>
      ) : (
        <>
          {sucessor && (
            <p className="text-sm leading-relaxed rounded-xl px-4 py-3" style={{ background: "var(--medio-tint)", color: "var(--medio)" }}>
              Já há contrato posterior para o mesmo objeto
              {sucessor.numeroContrato ? ` (contrato ${sucessor.numeroContrato}` : " ("}
              {sucessor.vigenciaFim ? `, até ${dataBr(sucessor.vigenciaFim)})` : ")"}. Confira se a necessidade não está atendida por
              ele antes de montar outro processo.
            </p>
          )}

          <section aria-labelledby="caminho">
            <h2 id="caminho" className="font-semibold">Qual caminho</h2>
            <p className="text-sm text-muted mt-1 leading-relaxed max-w-2xl">
              A decisão é da Administração. Os dois rascunhos já estão montados; cada um afirma coisas diferentes, e é isso
              que a escolha assume.
            </p>
            <nav className="mt-3 grid sm:grid-cols-2 gap-3" aria-label="Caminho da renovação">
              {d.opcoes.map((o) => {
                const ativo = o.caminho === caminho;
                const conteudo = (
                  <>
                    <span className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-sm">{NOME_CAMINHO[o.caminho]}</span>
                      {aprovacao.tipo === "aprovado" && aprovacao.caminho === o.caminho && (
                        <span className="text-xs font-semibold rounded-full px-2 py-0.5" style={{ background: "var(--info-tint)", color: "var(--info)" }}>
                          Aprovado
                        </span>
                      )}
                    </span>
                    <span className="block text-sm text-muted mt-1 leading-relaxed">{O_QUE_AFIRMA[o.caminho]}</span>
                    {o.observacao && (
                      <span className="block text-sm mt-2 leading-relaxed" style={{ color: o.disponivel ? "var(--medio)" : "var(--muted)" }}>
                        {o.observacao}
                      </span>
                    )}
                  </>
                );
                const classe = `block rounded-xl border px-4 py-3.5 transition ${
                  ativo ? "border-brand bg-brand-tint/40" : "border-border"
                }`;
                return o.disponivel ? (
                  <Link
                    key={o.caminho}
                    href={`${base}?caminho=${o.caminho}`}
                    aria-current={ativo ? "page" : undefined}
                    scroll={false}
                    className={`${classe} ${ativo ? "" : "hover:border-brand"}`}
                  >
                    {conteudo}
                  </Link>
                ) : (
                  <div key={o.caminho} aria-disabled="true" className={`${classe} opacity-70`}>
                    {conteudo}
                  </div>
                );
              })}
            </nav>
          </section>

          <section aria-labelledby="estado" className="border border-border rounded-xl px-5 py-4">
            <h2 id="estado" className="sr-only">
              Estado do rascunho
            </h2>
            {aprovadoEste && aprovacao.tipo === "aprovado" ? (
              <div className="text-sm leading-relaxed">
                <p className="font-semibold" style={{ color: "var(--info)" }}>
                  Conferido e aprovado por {aprovacao.aprovacao.usuarioNome} ({nomeDoCargo(aprovacao.aprovacao.usuarioCargo)}) em{" "}
                  {dataHoraNumerica(aprovacao.aprovacao.createdAt, fuso)}.
                </p>
                <p className="text-muted mt-1">
                  Os arquivos baixados levam esta aprovação no topo. Aprovar não é assinar: cada documento segue para o processo
                  e é enviado ou assinado por quem a lei manda. Ref. <span className="font-mono">{pacote.impressao}</span>.
                </p>
              </div>
            ) : (
              <div className="text-sm leading-relaxed">
                <p className="font-semibold">Rascunho — nada foi enviado, publicado ou assinado.</p>
                {aprovacao.tipo === "desatualizado" && (
                  <p className="mt-1" style={{ color: "var(--medio)" }}>
                    {aprovacao.aprovacao.usuarioNome} aprovou em {dataHoraNumerica(aprovacao.aprovacao.createdAt, fuso)} um texto
                    que não é mais este: o contrato mudou depois da aprovação. Confira de novo.
                  </p>
                )}
                {aprovacao.tipo === "aprovado" && !aprovadoEste && (
                  <p className="mt-1 text-muted">
                    O caminho aprovado foi outro ({NOME_CAMINHO[aprovacao.caminho].toLowerCase()}, por {aprovacao.aprovacao.usuarioNome}).
                    Aprovar este registra a mudança de decisão.
                  </p>
                )}
                <p className="text-muted mt-1">
                  Montado pelo CidadeIA a partir do contrato publicado no PNCP. Leia os documentos, aprove para registrar que foram
                  conferidos e leve ao processo.
                </p>
                {opcaoAtual.disponivel && (
                  <AprovarRascunho
                    contratoId={contrato.id}
                    caminho={caminho}
                    impressao={pacote.impressao}
                    pendencias={pacote.pendencias.length}
                  />
                )}
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
                  Ficaram entre colchetes nos documentos. O sistema não estima nenhum deles: quantidade, preço, vantajosidade e
                  dotação dependem de quem tem o processo na mão.
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
                      href={`/api/licitacoes/renovacao/${contrato.id}?caminho=${caminho}&documento=${doc.chave}`}
                      className="group/b inline-flex items-center gap-2 border border-border rounded-lg px-3.5 py-2 min-h-10 text-sm font-semibold hover:border-brand hover:text-brand transition"
                    >
                      <IconDownload className="w-4 h-4 transition-transform duration-200 group-hover/b:translate-y-0.5" />
                      Baixar para o Word
                    </a>
                    <a
                      href={`/api/licitacoes/renovacao/${contrato.id}?caminho=${caminho}&documento=${doc.chave}&formato=txt`}
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

          <section aria-labelledby="historico">
            <h2 id="historico" className="font-semibold">
              O que o município já contratou para isto
            </h2>
            {historico.length === 0 ? (
              <p className="mt-2 text-sm text-muted border border-dashed border-border rounded-lg px-4 py-3">
                Nenhum outro contrato de objeto semelhante entre os importados do PNCP.
              </p>
            ) : (
              <ul className="mt-2">
                {historico.map((h) => (
                  <li key={h.id} className="py-2.5 border-b border-border last:border-0 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 text-sm">
                    <span className="min-w-0">
                      <span className="font-medium">{h.fornecedorNome ?? "Contratado não informado"}</span>
                      {h.mesmoFornecedor && <span className="text-muted"> · a mesma contratada</span>}
                      <span className="block text-xs text-muted mt-0.5 break-words">
                        {h.numeroContrato ? `Contrato ${h.numeroContrato} · ` : ""}
                        {h.vigenciaInicio && h.vigenciaFim ? `${dataBr(h.vigenciaInicio)} a ${dataBr(h.vigenciaFim)} · ` : ""}
                        {h.objeto}
                      </span>
                    </span>
                    <span className="tabular-nums font-semibold whitespace-nowrap">
                      {h.valorGlobal !== null ? formatarMoedaExata(h.valorGlobal) : "—"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}

      <p className="text-xs text-muted pt-4 border-t border-border leading-relaxed">
        Base legal usada nos documentos: Lei 14.133/2021, arts. 12, VII; 18; 23; 53; 55; 91, § 4º; 94; 107 e 111. A data-limite do
        edital desconta sábados e domingos, não feriados municipais: o prazo real é igual ou mais curto. O teto de dez anos conta
        da data de início que o PNCP registra; se o contrato original começou antes, o teto é anterior.
      </p>
    </div>
  );
}
