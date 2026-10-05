import { desc } from "drizzle-orm";
import { db } from "@/db";
import { medicoesBanco } from "@/db/schema";
import { apurar, frase, latenciaPiorou, type Medicao } from "@/lib/disponibilidade";
import SiteHeader from "@/components/site/SiteHeader";
import SiteFooter from "@/components/site/SiteFooter";
import Reveal from "@/components/site/Reveal";

// ── A DISPONIBILIDADE QUE SE CONFERE ──
//
// O acordo de nível de serviço pedia um percentual de disponibilidade mínima
// mensal. Procurar um número defensável levou ao contrário: o Supabase não
// oferece SLA nos planos Free, Pro ou Team — só no Enterprise. Prometer seria
// assumir sozinho um risco que o fornecedor não cobre, com multa atrelada.
//
// Quase todo fornecedor de software público resolve copiando "99,9%" de um
// modelo e torcendo. Esta página é a alternativa: a cláusula aponta para cá, e
// quem vai assinar confere em vez de acreditar.
//
// É pública e sem cadastro de propósito. Página de disponibilidade atrás de
// login serve ao fornecedor, não ao cliente.

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Disponibilidade",
  description:
    "Verificação diária automática do banco de dados da CidadeIA, com o histórico aberto. " +
    "A cláusula de nível de serviço aponta para esta página em vez de prometer um percentual.",
};

/** Um ano de verificações é o bastante para a frase do contrato. */
const LIMITE_DE_LINHAS = 400;

function dataCurta(iso: string) {
  return iso.slice(0, 10).split("-").reverse().join("/");
}

export default async function DisponibilidadePage() {
  let medicoes: Medicao[] = [];
  let bancoRespondeu = true;

  try {
    const linhas = await db
      .select({
        verificadoEm: medicoesBanco.verificadoEm,
        ok: medicoesBanco.ok,
        ms: medicoesBanco.ms,
        detalhe: medicoesBanco.detalhe,
      })
      .from(medicoesBanco)
      .orderBy(desc(medicoesBanco.verificadoEm))
      .limit(LIMITE_DE_LINHAS);
    medicoes = linhas;
  } catch (e) {
    // ── A IRONIA ESTÁ PREVISTA ──
    // Esta página lê o banco para falar do banco. Se ele estiver fora, ela
    // diz isso — que é, em si, a informação mais honesta que ela poderia dar
    // naquele momento.
    console.error("[disponibilidade] leitura:", e);
    bancoRespondeu = false;
  }

  const a = apurar(medicoes);
  const degradando = latenciaPiorou(medicoes);
  const ultimas = medicoes.slice(0, 30);

  return (
    <div className="tema-noite min-h-screen">
      <SiteHeader />
      <main id="conteudo">
        <section className="max-w-4xl mx-auto px-4 sm:px-8 pt-16 pb-10">
          <Reveal>
            <span className="text-xs text-white/50 font-medium">
              Transparência da operação
            </span>
            <h1 className="titulo-pagina mt-5">
              A disponibilidade é medida, não prometida
            </h1>
            <p className="text-white/80 text-base sm:text-lg leading-relaxed mt-4 max-w-2xl">
              Todo dia, de forma automática, o sistema executa uma consulta ao banco de dados e
              registra se ele respondeu e em quanto tempo. O histórico está abaixo, inteiro.
            </p>
          </Reveal>
        </section>

        <section className="max-w-4xl mx-auto px-4 sm:px-8 pb-16 space-y-6">
          {!bancoRespondeu && (
            <Reveal>
              <div
                className="rounded-2xl px-5 py-4 text-sm leading-relaxed"
                style={{ background: "var(--urgente-tint)", color: "var(--urgente)" }}
              >
                O banco de dados não respondeu agora — e esta página o consulta para falar dele.
                Este aviso é, neste instante, a informação mais honesta disponível. O histórico
                abaixo não pôde ser carregado.
              </div>
            </Reveal>
          )}

          {/* ── O NÚMERO, COM O QUE ELE SIGNIFICA ── */}
          <Reveal>
            <div className="bg-card border border-border rounded-2xl p-6">
              <p className="text-lg sm:text-xl leading-relaxed">{frase(a)}</p>
              {a.primeira && a.ultima && (
                <p className="text-sm text-muted mt-2">
                  Período apurado: de {dataCurta(a.primeira)} a {dataCurta(a.ultima)}.
                </p>
              )}

              {a.diasVerificados > 0 && (
                <div className="grid sm:grid-cols-3 gap-4 mt-6 pt-5 border-t border-border">
                  <div>
                    <p className="text-2xl font-bold tabular-nums">{a.diasSemFalha}</p>
                    <p className="text-xs text-muted mt-0.5">dias em que respondeu</p>
                  </div>
                  <div>
                    <p
                      className="text-2xl font-bold tabular-nums"
                      style={{ color: a.diasComFalha > 0 ? "var(--urgente)" : undefined }}
                    >
                      {a.diasComFalha}
                    </p>
                    <p className="text-xs text-muted mt-0.5">dias com falha</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold tabular-nums">
                      {a.latenciaMediana === null ? "—" : `${a.latenciaMediana} ms`}
                    </p>
                    <p className="text-xs text-muted mt-0.5">
                      tempo de resposta típico
                      {a.latenciaPior !== null && ` · pior: ${a.latenciaPior} ms`}
                    </p>
                  </div>
                </div>
              )}

              {degradando && (
                <p
                  className="text-sm rounded-lg px-4 py-3 mt-5 leading-relaxed"
                  style={{ background: "var(--medio-tint)", color: "var(--medio)" }}
                >
                  O tempo de resposta da última semana está mais de duas vezes acima do da semana
                  anterior. Não é queda, mas é o sinal que costuma vir antes de uma.
                </p>
              )}
            </div>
          </Reveal>

          {/* ── O QUE ESTA MEDIÇÃO NÃO É ── */}
          <Reveal>
            <div className="bg-card border border-border rounded-2xl p-6">
              <h2 className="font-semibold text-sm mb-2">O que esta medição não é</h2>
              <p className="text-sm text-muted leading-relaxed">
                É <strong className="text-foreground">uma verificação por dia</strong>, não um
                monitoramento minuto a minuto. Uma indisponibilidade de quarenta minutos entre duas
                verificações não aparece aqui, e seria desonesto apresentar isto como
                &ldquo;uptime&rdquo;.
              </p>
              <p className="text-sm text-muted leading-relaxed mt-3">
                O que a verificação diária detecta bem é a falha que mais ameaça um sistema desta
                natureza: o banco de dados pausado por inatividade, que dura dias. Já aconteceu uma
                vez, e foi o que motivou criar a verificação.
              </p>
              <p className="text-sm text-muted leading-relaxed mt-3">
                Nenhum percentual aparece antes de trinta dias de histórico. Com cinco amostras,
                uma falha viraria &ldquo;80%&rdquo; — um número com cara de precisão e conteúdo de
                ruído.
              </p>
            </div>
          </Reveal>

          {/* ── O HISTÓRICO, LINHA A LINHA ── */}
          {ultimas.length > 0 && (
            <Reveal>
              <div className="bg-card border border-border rounded-2xl p-6">
                <h2 className="font-semibold text-sm mb-1">Últimas verificações</h2>
                <p className="text-xs text-muted mb-4">
                  Da mais recente para trás. É sobre estas linhas que a contagem acima é feita.
                </p>
                <ul className="flex flex-col divide-y divide-border">
                  {ultimas.map((v) => (
                    <li
                      key={v.verificadoEm}
                      className="flex items-center justify-between gap-4 py-2 text-sm"
                    >
                      <span className="tabular-nums text-muted">{dataCurta(v.verificadoEm)}</span>
                      <span className="flex items-center gap-2">
                        {v.ok ? (
                          <>
                            <span className="tabular-nums text-muted">{v.ms} ms</span>
                            <span style={{ color: "var(--accent)" }}>respondeu</span>
                          </>
                        ) : (
                          <span style={{ color: "var(--urgente)" }}>
                            não respondeu{v.detalhe ? ` (${v.detalhe})` : ""}
                          </span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          )}

          {a.datasComFalha.length > 0 && (
            <Reveal>
              <div
                className="rounded-2xl px-5 py-4"
                style={{ background: "var(--urgente-tint)" }}
              >
                <h2 className="font-semibold text-sm" style={{ color: "var(--urgente)" }}>
                  Dias com falha no período
                </h2>
                <p className="text-sm text-muted mt-1.5 leading-relaxed">
                  {a.datasComFalha.map((d) => d.split("-").reverse().join("/")).join(" · ")}
                </p>
                <p className="text-xs text-muted mt-2 leading-relaxed">
                  Ficam aqui permanentemente. Uma página de disponibilidade que apaga os dias ruins
                  não serve para o que foi feita.
                </p>
              </div>
            </Reveal>
          )}
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
