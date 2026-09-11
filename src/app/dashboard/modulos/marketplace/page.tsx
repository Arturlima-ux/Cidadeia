import { lerSessao } from "@/lib/sessao";
import { buscarPrefeitura } from "@/lib/dados-prefeitura";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  PLANOS_ADDON,
  planosContratadosDe,
  linkContratacao,
  HREF_PLANO_ADDON,
} from "@/lib/planos";
import AbasModulos from "../AbasModulos";
import { PORTES, PRECO_MENSAL, porteDaPopulacao } from "@/lib/precos";
import { formatarMoeda } from "@/lib/formatadores";

export default async function MarketplacePage() {
  const sessao = await lerSessao();
  if (!sessao) redirect("/login");
  if (sessao.cargo === "secretario") {
    return (
      <div className="max-w-lg mt-12 text-center border border-dashed border-border rounded-2xl p-8 mx-auto">
        <p className="text-sm text-muted">
          Apenas o prefeito ou um administrador pode gerenciar os módulos
          contratados.
        </p>
      </div>
    );
  }

  const prefeitura = await buscarPrefeitura(sessao.prefeituraId);
  const planosAtivos = planosContratadosDe(prefeitura?.planosContratados);

  // ── O PORTE VEM DA POPULAÇÃO DO IBGE GRAVADA NA PREFEITURA ──
  // Nunca de um campo declarado. Sem população (Implantação não fez o passo
  // "Município reconhecido"), o painel não mostra preço nem monta pedido com
  // porte — e diz o que falta. O pedido leva o código IBGE, e o e-mail é o
  // servidor que escreve, com nome, UF e população.
  const populacao = prefeitura?.populacao ?? null;
  const porte = populacao ? porteDaPopulacao(populacao) : null;
  const rotuloPorte = porte ? PORTES.find((x) => x.chave === porte) : null;
  const codigoIbge = prefeitura?.codigoIbge ?? null;
  const linkProposta = (modulo: string) =>
    codigoIbge
      ? `/suporte?assunto=proposta&ibge=${codigoIbge}&modulos=${modulo}`
      : "/dashboard/implantacao";

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-bold">Módulos</h1>
        <p className="text-muted text-sm mt-1.5 leading-relaxed">
          Cada área da prefeitura é um módulo independente — ative só o que
          você precisa.
        </p>
      </div>

      <AbasModulos ativa="marketplace" />

      {porte && rotuloPorte && populacao ? (
        <p className="text-sm text-muted">
          Valores para o porte da {prefeitura?.nome}:{" "}
          <strong className="text-foreground">{rotuloPorte.rotulo} habitantes</strong> —{" "}
          {new Intl.NumberFormat("pt-BR").format(populacao)} hab. pela estimativa do IBGE.
        </p>
      ) : (
        <p
          className="text-sm rounded-lg px-3 py-2.5 border"
          style={{ color: "var(--medio)", background: "var(--medio-tint)", borderColor: "var(--medio-borda)" }}
        >
          Os valores dependem do porte do município, que vem da população do IBGE.{" "}
          <Link href="/dashboard/implantacao" className="font-semibold underline">
            Reconheça o município na Implantação
          </Link>{" "}
          para ver os valores e pedir proposta.
        </p>
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        {PLANOS_ADDON.map((p) => {
          const ativo = planosAtivos.includes(p.chave);
          const { url } = linkContratacao(p.chave);
          return (
            <div
              key={p.chave}
              className={`rounded-xl border p-5 flex flex-col ${
                ativo ? "border-brand bg-brand-tint/40" : "border-border"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="font-semibold text-sm">{p.nome}</p>
                {ativo && (
                  <span className="shrink-0 text-xs font-semibold rounded-full px-2.5 py-1" style={{ color: "var(--info)", background: "var(--info-tint)" }}>
                    Ativo
                  </span>
                )}
              </div>
              <p className="text-xs text-muted mt-2 leading-relaxed flex-1">
                {p.descricao}
                {porte && (
                  <span className="block mt-2 text-sm font-semibold text-foreground">
                    {PRECO_MENSAL[p.chave][porte] === null
                      ? "Valor sob consulta"
                      : `${formatarMoeda(PRECO_MENSAL[p.chave][porte] as number)}/mês`}
                  </span>
                )}
              </p>

              {ativo ? (
                <Link
                  href={HREF_PLANO_ADDON[p.chave]}
                  className="mt-4 text-center border border-border rounded-full px-4 py-2 text-sm font-semibold hover:border-brand hover:text-brand transition"
                >
                  Abrir módulo
                </Link>
              ) : (
                // Sem checkout configurado, o botão leva ao caminho que a
                // contratação pública de fato percorre — proposta, processo,
                // empenho — em vez de a um pagamento que a tesouraria não
                // faria. Antes daqui saía um link para uma URL inexistente, e
                // logo abaixo o CLIENTE lia um aviso pedindo para configurar
                // o .env.
                url ? (
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 text-center bg-brand hover:bg-brand-dark text-white text-sm font-semibold rounded-full px-4 py-2 transition"
                  >
                    Contratar
                  </a>
                ) : (
                  <Link
                    href={linkProposta(p.chave)}
                    className="mt-4 text-center bg-brand hover:bg-brand-dark text-white text-sm font-semibold rounded-full px-4 py-2 transition"
                  >
                    Pedir proposta
                  </Link>
                )
              )}
            </div>
          );
        })}
      </div>

      <p className="text-xs text-muted leading-relaxed">
        Contratação em prefeitura não passa por cartão: passa por proposta,
        processo de dispensa ou licitação, empenho e nota fiscal. O pedido de
        proposta abre esse caminho, e o módulo é ativado nesta conta assim que o
        contrato estiver assinado.
      </p>
    </div>
  );
}
