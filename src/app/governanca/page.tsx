import Link from "next/link";
import { fontesPorExtenso } from "@/lib/fontes-oficiais";
import SiteHeader from "@/components/site/SiteHeader";
import SiteFooter from "@/components/site/SiteFooter";
import Olho from "@/components/site/Olho";
import { compartilhamento } from "@/lib/seo";

export const metadata = compartilhamento({
  titulo: "Governança",
  descricao:
    "Como o CidadeIA trata dados, decide o que vira alerta e usa inteligência artificial: regras, documentos e onde conferir cada um.",
  caminho: "/governanca",
});

// ── GOVERNANÇA: AS REGRAS DA CASA, COM ONDE CONFERIR ──
//
// Uma empresa que vende conformidade a prefeituras precisa mostrar as
// próprias regras. Cada compromisso aqui já existe no produto ou num
// documento publicado no site, e o cartão leva até ele. Nada de selo,
// certificação ou auditoria externa que a empresa ainda não tem.

const COMPROMISSOS = [
  {
    titulo: "Só dado oficial, com a fonte ao lado",
    texto:
      `Os números vêm de ${fontesPorExtenso()}. Quando uma fonte não responde, a tela diz isso; o vazio nunca é preenchido com estimativa.`,
  },
  {
    titulo: "Regra com o artigo, e não opinião",
    texto:
      "Os avisos fiscais saem de regra fixa, com a base legal escrita ao lado. Quem decide o que fazer continua sendo quem tem a competência na prefeitura.",
  },
  {
    titulo: "A inteligência artificial só sugere",
    texto:
      "Nenhuma sugestão da IA vira alerta oficial sem uma pessoa aprovar, e ela só recebe o que a própria pessoa já pode ver: um secretário nunca expõe à IA dado de outra secretaria.",
  },
  {
    titulo: "Cada prefeitura só vê o que é seu",
    texto:
      "Toda consulta ao banco é filtrada pela prefeitura da sessão, e dentro dela cada secretário enxerga só a sua área. O alerta nunca é enviado a órgão de controle: vai para a prefeitura, e só para ela.",
  },
  {
    titulo: "O que foi feito fica registrado",
    texto:
      "O que se cria, altera, exclui ou importa no painel fica no registro de auditoria da prefeitura, com quem fez e quando.",
  },
  {
    titulo: "O cidadão é protegido na ouvidoria",
    texto:
      "Nome, contato e texto de quem se manifesta não vão nos avisos que a equipe do CidadeIA recebe, e a denúncia pode ser anônima.",
  },
];

const DOCUMENTOS = [
  { href: "/seguranca", titulo: "Segurança e LGPD", texto: "Senhas, sessão, isolamento entre prefeituras, banco e limites da IA." },
  { href: "/privacidade", titulo: "Política de privacidade", texto: "O que o CidadeIA coleta, com que base legal, com quem compartilha e por quanto tempo guarda." },
  { href: "/termos", titulo: "Termos de uso", texto: "As regras de uso do CidadeIA e do portal do cidadão." },
  { href: "/conformidade", titulo: "Conformidade legal", texto: "Cada exigência que o sistema confere, com a lei e o artigo." },
  { href: "/kit", titulo: "Kit de contratação", texto: "Termo de referência, minuta de contrato, tratamento de dados e nível de serviço." },
  { href: "/disponibilidade", titulo: "Disponibilidade", texto: "A verificação diária de que o sistema está no ar, em público." },
  { href: "/acessibilidade", titulo: "Acessibilidade", texto: "O que já existe, o que ainda falta e como avisar de uma barreira." },
];

export default function GovernancaPage() {
  return (
    <div className="tema-noite min-h-screen overflow-x-clip">
      <SiteHeader />
      <main id="conteudo">
        <section className="max-w-[1200px] mx-auto px-4 sm:px-8 pt-14 sm:pt-24 pb-14">
          <Olho>Governança</Olho>
          <h1 className="titulo-pagina mt-5 max-w-[20ch]">Quem vende conformidade mostra as próprias regras.</h1>
          <p className="mt-6 text-lg text-muted leading-relaxed max-w-[62ch]">
            Como o CidadeIA trata dados, decide o que vira alerta e usa inteligência artificial. Cada compromisso abaixo já
            está no produto ou num documento publicado, e você pode conferir antes de contratar.
          </p>
        </section>

        <section className="border-t border-border" style={{ background: "var(--superficie)" }}>
          <div className="max-w-[1200px] mx-auto px-4 sm:px-8 py-16 sm:py-24">
            <h2 className="inicio-h2 max-w-[18ch]">Os compromissos.</h2>
            <ul className="mt-10 grid md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-10">
              {COMPROMISSOS.map((c, i) => (
                <li key={c.titulo} className="border-t border-border pt-5">
                  <span className="text-sm font-semibold tabular-nums text-muted">{String(i + 1).padStart(2, "0")}</span>
                  <p className="mt-2 font-semibold tracking-[-0.01em]">{c.titulo}</p>
                  <p className="text-muted leading-relaxed mt-2">{c.texto}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="max-w-[1200px] mx-auto px-4 sm:px-8 py-16 sm:py-24">
          <h2 className="inicio-h2 max-w-[18ch]">Os documentos.</h2>
          <p className="text-muted mt-4 max-w-[60ch] leading-relaxed">
            Os mesmos que o jurídico da prefeitura vai pedir. Todos abertos, sem cadastro.
          </p>
          <ul className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {DOCUMENTOS.map((d) => (
              <li key={d.href}>
                <Link
                  href={d.href}
                  className="group block h-full rounded-2xl border border-border hover:border-brand p-6 transition"
                  style={{ background: "var(--card)" }}
                >
                  <p className="font-semibold">{d.titulo}</p>
                  <p className="text-sm text-muted leading-relaxed mt-2">{d.texto}</p>
                  <p className="text-sm mt-4" style={{ color: "var(--brand-claro)" }}>
                    Abrir <span className="inline-block transition-transform group-hover:translate-x-1">→</span>
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="max-w-[1200px] mx-auto px-4 sm:px-8 pb-20 sm:pb-28">
          <div className="rounded-[24px] border border-border p-6 sm:p-8 flex flex-wrap items-center justify-between gap-6" style={{ background: "var(--card)" }}>
            <div className="max-w-[56ch]">
              <p className="font-semibold">Achou algo errado, ou falta uma regra?</p>
              <p className="text-muted mt-1 leading-relaxed">
                Exigência desatualizada, dado que não confere ou dúvida do jurídico: é por aqui que a lista é corrigida.
              </p>
            </div>
            <Link href="/fale-conosco" className="elevar inline-block bg-brand hover:bg-brand-dark text-white font-semibold rounded-full px-6 py-3">
              Fale conosco
            </Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
