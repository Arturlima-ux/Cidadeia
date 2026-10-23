import Link from "next/link";
import { MarcaCompleta } from "@/components/site/MarcaQuadra";
import { LIMITE_DISPENSA } from "@/lib/contratacao";
import { linhaIdentificacao } from "@/lib/empresa";

const COLUNAS = [
  {
    titulo: "Produtos",
    links: [
      // Cada módulo tem página própria; os seis apontavam para a mesma âncora.
      { href: "/modulos/essencial", label: "Essencial" },
      { href: "/modulos/gestao", label: "Gestão" },
      { href: "/modulos/saude", label: "Saúde" },
      { href: "/modulos/educacao", label: "Educação" },
      { href: "/modulos/obras", label: "Obras" },
      { href: "/modulos/licitacoes", label: "Licitações" },
    ],
  },
  {
    titulo: "Para quem",
    links: [
      { href: "/para/prefeito", label: "Prefeito" },
      { href: "/para/financas", label: "Finanças e contabilidade" },
      { href: "/para/controle", label: "Controle interno" },
      { href: "/panorama", label: "Panorama das prefeituras" },
    ],
  },
  {
    titulo: "Contratação",
    links: [
      { href: "/raio-x", label: "Raio-X do município" },
      { href: "/como-contratar", label: "Como contratar" },
      { href: "/kit", label: "Kit de contratação" },
      { href: "/proposta/acompanhar", label: "Acompanhar pedido" },
      { href: "/conformidade", label: "Conformidade legal" },
      { href: "/solucoes", label: "Todos os produtos" },
    ],
  },
  {
    titulo: "Cidadão",
    links: [
      // Eram três links com o mesmo destino ("Portal", "Consultar protocolo"
      // e "Ouvidoria"). Protocolo e ouvidoria moram dentro do portal de cada
      // cidade, então o rodapé leva até ele e ao exemplo, que são lugares
      // diferentes de verdade.
      { href: "/transparencia", label: "Portal da sua cidade" },
      { href: "/transparencia/exemplo", label: "Ver um portal de exemplo" },
    ],
  },
  {
    titulo: "Institucional",
    links: [
      { href: "/quem-somos", label: "Quem somos" },
      { href: "/noticias", label: "Notícias" },
      { href: "/governanca", label: "Governança" },
      // Carreiras saiu do rodapé: sem vaga aberta, a página é honesta mas
      // quase vazia, e o rodapé a prometia em toda tela (revisão de outubro
      // de 2026). Continua no ar em /carreiras.
      { href: "/fale-conosco", label: "Fale conosco" },
      { href: "/seguranca", label: "Segurança e LGPD" },
      { href: "/acessibilidade", label: "Acessibilidade" },
      { href: "/faq", label: "Perguntas frequentes" },
      { href: "/suporte", label: "Suporte" },
    ],
  },
];

export default function SiteFooter() {
  return (
    <footer className="text-white/70" style={{ background: "var(--brand-profundo)" }}>
      <div className="max-w-[1200px] mx-auto px-4 sm:px-8 pt-12 pb-8">
        <div className="grid sm:grid-cols-2 lg:grid-cols-6 gap-8 pb-8 border-b border-white/10">
          <div className="lg:col-span-1">
            <MarcaCompleta tamanho={26} cor="#5f9bf0" corAcento="#6ee7b0" corTexto="#ffffff" />
            <p className="text-sm mt-4 leading-relaxed max-w-xs">
              A gestão municipal inteira, num lugar só: atendimento ao cidadão,
              secretarias, obras, saúde, educação e finanças, com o que é público
              lido das bases oficiais.
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
              <p className="text-xs font-bold text-white mb-3">
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
            <Link href="/privacidade" className="link-traco hover:text-white transition">
              Política de privacidade
            </Link>
            <Link href="/termos" className="link-traco hover:text-white transition">
              Termos de uso
            </Link>
            {/* O acordo de nível de serviço aponta para esta página em vez de
                prometer um percentual de disponibilidade. Promessa de
                publicação que o fiscal do contrato não acha de onde está
                navegando é promessa pela metade. */}
            <Link href="/disponibilidade" className="link-traco hover:text-white transition">
              Disponibilidade
            </Link>
          </div>
        </div>

        {/* Ressalva obrigatória: a página cita limite de contratação pública,
            que é reajustado por decreto todo ano. Sem isto o site parece
            afirmar um valor eterno. */}
        <p className="text-xs leading-relaxed text-white/55 mt-5 max-w-4xl">
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
