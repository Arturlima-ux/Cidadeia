import Link from "next/link";
import { MarcaCompleta } from "@/components/site/MarcaQuadra";
import { LIMITE_DISPENSA } from "@/lib/contratacao";
import { linhaIdentificacao } from "@/lib/empresa";

const COLUNAS = [
  {
    titulo: "Soluções",
    links: [
      { href: "/#solucoes", label: "Essencial" },
      { href: "/#solucoes", label: "Gestão" },
      { href: "/#solucoes", label: "Saúde" },
      { href: "/#solucoes", label: "Educação" },
      { href: "/#solucoes", label: "Obras" },
      { href: "/#solucoes", label: "Licitações" },
    ],
  },
  {
    titulo: "Contratação",
    links: [
      { href: "/diagnostico", label: "Diagnóstico gratuito" },
      { href: "/raio-x", label: "Raio-X do município" },
      { href: "/#como-contratar", label: "Como contratar" },
      { href: "/kit", label: "Kit de contratação" },
      { href: "/#conformidade", label: "Conformidade legal" },
      { href: "/precos", label: "Preços" },
    ],
  },
  {
    titulo: "Cidadão",
    links: [
      { href: "/transparencia", label: "Portal da Transparência" },
      { href: "/transparencia", label: "Consultar protocolo" },
      { href: "/transparencia", label: "Ouvidoria" },
    ],
  },
  {
    titulo: "Institucional",
    links: [
      { href: "/por-que-cidadeia", label: "Quem somos" },
      { href: "/sobre", label: "Segurança e LGPD" },
      { href: "/faq", label: "Dúvidas frequentes" },
      { href: "/suporte", label: "Suporte" },
    ],
  },
];

export default function SiteFooter() {
  return (
    <footer className="text-white/70" style={{ background: "var(--brand-profundo)" }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-8 pt-12 pb-8">
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-8 pb-8 border-b border-white/10">
          <div className="lg:col-span-1">
            <MarcaCompleta tamanho={26} cor="#5f9bf0" corAcento="#6ee7b0" corTexto="#ffffff" />
            <p className="text-sm mt-4 leading-relaxed max-w-xs">
              Sistema de gestão pública municipal, do gabinete ao balcão de
              atendimento.
            </p>
            {/* Aqui havia "[RAZÃO SOCIAL]" e "CNPJ [XX.XXX.XXX/0001-XX]"
                literalmente publicados. Num site que vende conformidade
                jurídica, o marcador de posição custa mais que a ausência: o
                jurídico da prefeitura rola até o fim antes de aprovar, e
                encontrava ali a prova de que ninguém tinha revisado a página.

                Enquanto o CNPJ não existir, não se mostra nada. Preenchido em
                lib/empresa.ts, aparece sozinho. */}
            {linhaIdentificacao() && (
              <p className="text-xs mt-4 leading-relaxed text-white/50">
                {linhaIdentificacao()}
              </p>
            )}
          </div>

          {COLUNAS.map((c) => (
            <div key={c.titulo}>
              <p className="text-xs font-bold uppercase tracking-wider text-white mb-3">
                {c.titulo}
              </p>
              <ul className="space-y-2">
                {c.links.map((l) => (
                  <li key={`${c.titulo}-${l.label}`}>
                    <Link href={l.href} className="text-sm hover:text-white transition">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="pt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <span>© {new Date().getFullYear()} CidadeIA. Todos os direitos reservados.</span>
          <div className="flex items-center gap-5">
            {/* Os dois apontavam para /sobre, que é "Segurança & LGPD" — uma
                página sobre COMO o dado é protegido, não um documento dizendo
                o que é coletado, com que base legal e por quanto tempo. Não é
                a mesma coisa, e é a primeira pasta que o jurídico da
                prefeitura abre antes de autorizar a contratação. */}
            <Link href="/privacidade" className="hover:text-white transition">
              Política de privacidade
            </Link>
            <Link href="/termos" className="hover:text-white transition">
              Termos de uso
            </Link>
          </div>
        </div>

        {/* Ressalva obrigatória: a página cita limite de contratação pública,
            que é reajustado por decreto todo ano. Sem isto o site parece
            afirmar um valor eterno. */}
        <p className="text-xs leading-relaxed text-white/45 mt-5 max-w-4xl">
          O CidadeIA é ferramenta de apoio à gestão; as informações publicadas no
          portal de transparência são de responsabilidade do município. Os limites
          de contratação citados seguem a Lei 14.133/2021, atualizados pelo{" "}
          {LIMITE_DISPENSA.atualizadoPor} e reajustados anualmente — confirme o
          valor vigente com a assessoria jurídica da prefeitura.
        </p>
      </div>
    </footer>
  );
}
