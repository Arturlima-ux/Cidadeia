import Link from "next/link";
import LinkOficial from "@/components/site/LinkOficial";
import { LEIS } from "@/lib/links-oficiais";
import { podeOptarPorSemestral, proximoVencimento } from "@/lib/obrigacoes-fiscais";
import { NOME_DOS_ESTADOS, type Estado } from "@/lib/estados";
import { PANORAMA, dataDoPanorama, numeroBr, passaramDoAlerta } from "@/lib/panorama";

// ── O QUE É SÓ DESTE MUNICÍPIO, MESMO SEM O TESOURO ──
//
// A auditoria de SEO (out/2026) achou a página de município com pouca parte
// própria: o bloco do Tesouro e, depois, texto igual nas 5.570 páginas. Aqui
// entram duas coisas que mudam de cidade para cidade e não dependem de
// consulta externa: os próximos prazos do RREO e do RGF (com a opção do
// semestral só para quem tem menos de 50 mil habitantes, LRF art. 63) e onde o
// estado está no Panorama da despesa com pessoal.

const DATA = new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
const dataPorExtenso = (iso: string) => DATA.format(new Date(`${iso}T00:00:00Z`));
const quando = (dias: number) => (dias === 0 ? "vence hoje" : dias === 1 ? "falta 1 dia" : `faltam ${dias} dias`);

export default function PrazosDoMunicipio({
  nome,
  uf,
  populacao,
  hoje,
}: {
  nome: string;
  uf: string;
  populacao: number | null;
  /** AAAA-MM-DD em Brasília. */
  hoje: string;
}) {
  const rreo = proximoVencimento("rreo", hoje);
  const rgf = proximoVencimento("rgf", hoje);
  const rgfSemestral = podeOptarPorSemestral(populacao)
    ? proximoVencimento("rgf", hoje, { periodicidadeRgf: "semestral" })
    : null;
  const doEstado = PANORAMA.porUf[uf];
  const nomeDoEstado = NOME_DOS_ESTADOS[uf as Estado];

  return (
    <div className="rounded-2xl border border-border p-6 sm:p-8" style={{ background: "var(--card)" }}>
      <h2 className="font-serif text-2xl font-semibold tracking-[-0.03em]">
        Os próximos prazos da prefeitura de {nome}
      </h2>
      <p className="text-sm text-muted leading-relaxed mt-2 max-w-[62ch]">
        Os dois relatórios da <LinkOficial href={LEIS.lrf.url}>LRF</LinkOficial> são publicados até 30 dias depois
        do fim de cada período (arts. 52 e 55). Atrasar impede a prefeitura de receber transferências voluntárias.{" "}
        <Link href="/guias/prazos-rreo-rgf" className="text-brand-claro hover:underline">
          O calendário do ano
        </Link>
      </p>

      <dl className="grid sm:grid-cols-2 gap-4 mt-6">
        {rreo && (
          <div className="rounded-xl border border-border p-4">
            <dt className="text-xs font-semibold text-muted">RREO · relatório bimestral</dt>
            <dd className="mt-1.5">
              <span className="font-semibold">{rreo.periodo.rotulo}</span>: até {dataPorExtenso(rreo.periodo.vencimento)}
              <span className="block text-sm text-muted mt-0.5">{quando(rreo.dias)}</span>
            </dd>
          </div>
        )}
        {rgf && (
          <div className="rounded-xl border border-border p-4">
            <dt className="text-xs font-semibold text-muted">RGF · relatório de gestão fiscal</dt>
            <dd className="mt-1.5">
              <span className="font-semibold">{rgf.periodo.rotulo}</span>: até {dataPorExtenso(rgf.periodo.vencimento)}
              <span className="block text-sm text-muted mt-0.5">{quando(rgf.dias)}</span>
              {rgfSemestral && (
                <span className="block text-sm text-muted mt-2 leading-relaxed">
                  Com {numeroBr(populacao ?? 0)} habitantes, {nome} pode ter optado pelo RGF semestral (LRF, art. 63):
                  aí o próximo é o do {rgfSemestral.periodo.rotulo}, até {dataPorExtenso(rgfSemestral.periodo.vencimento)}.
                </span>
              )}
            </dd>
          </div>
        )}
      </dl>

      {doEstado && (
        <p className="text-sm text-muted leading-relaxed mt-6 max-w-[62ch]">
          No {nomeDoEstado === "Distrito Federal" ? "DF" : `estado (${nomeDoEstado})`},{" "}
          <strong className="text-foreground font-semibold">
            {numeroBr(passaramDoAlerta(doEstado))} das {numeroBr(doEstado.comNumero)}
          </strong>{" "}
          prefeituras com RGF publicado já passaram do sinal de alerta da despesa com pessoal, pela conferência de{" "}
          {dataDoPanorama()}.{" "}
          <Link href={`/panorama/${uf.toLowerCase()}`} className="text-brand-claro hover:underline">
            Ver o panorama do estado
          </Link>
        </p>
      )}
    </div>
  );
}
