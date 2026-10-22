import Link from "next/link";
import IlustracaoArea from "@/components/site/IlustracaoArea";

// ── A GESTÃO MUNICIPAL INTEIRA, NUM LUGAR SÓ ──
//
// O lado direito do herói mostrava a régua da LRF do país: dizia, antes de
// qualquer outra coisa, que o CidadeIA é um sistema de alerta fiscal. O
// produto é a gestão inteira, e é isso que a primeira tela mostra agora: as
// seis partes da prefeitura que entram no mesmo sistema. A régua continua
// aparecendo quando a pessoa escolhe a cidade dela, e o panorama do país
// segue mais abaixo na página.
//
// Cada linha diz o que o módulo tem hoje (lib/modulos-detalhe.ts).

const PARTES = [
  { chave: "essencial", nome: "Atendimento", modulo: "Essencial", texto: "Portal do cidadão, protocolo e ouvidoria", cor: "var(--brand)" },
  { chave: "gestao", nome: "Gabinete e finanças", modulo: "Gestão", texto: "A prefeitura inteira na tela do prefeito", cor: "var(--accent)" },
  { chave: "saude", nome: "Saúde", modulo: "Saúde", texto: "Unidades do CNES, estoque e indicadores", cor: "var(--info)" },
  { chave: "educacao", nome: "Educação", modulo: "Educação", texto: "Escolas do INEP, merenda e FUNDEB", cor: "var(--medio)" },
  { chave: "obras", nome: "Obras", modulo: "Obras", texto: "Contratos, medição e mapa da cidade", cor: "var(--brand-claro)" },
  { chave: "licitacoes", nome: "Compras", modulo: "Licitações", texto: "Processos e contratos do PNCP", cor: "var(--urgente)" },
] as const;

export default function NumLugarSo() {
  // Compacto e um pouco translúcido: no computador fica abaixo do mapa do
  // Brasil, à direita, sem cobrir o desenho. Cada cartão mostra a descrição
  // embaixo do nome (antes ela só existia no title, que o toque não mostra),
  // e o rodapé de 11px saiu: a faixa das fontes vem logo abaixo na página.
  return (
    <div
      className="lg:mt-32 xl:mt-24 lg:ml-auto lg:max-w-[500px] rounded-3xl border border-border p-4 sm:p-5"
      style={{ background: "color-mix(in srgb, var(--card) 72%, transparent)" }}
    >
      <div>
        <p className="text-[19px] font-semibold tracking-[-0.015em] leading-tight">Um sistema para a prefeitura inteira</p>
        <p className="text-[13px] text-muted mt-1">cada área com o seu acesso</p>
      </div>
      <ul className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-2">
        {PARTES.map((p) => (
          <li key={p.chave}>
            <Link
              href={`/modulos/${p.chave}`}
              className="group block rounded-xl border border-border hover:border-brand p-1.5 transition h-full"
              style={{ background: "var(--superficie)" }}
            >
              <IlustracaoArea area={p.chave} className="w-full h-auto rounded-lg" />
              <span className="block px-1 pt-1.5 text-[13px] font-semibold leading-tight group-hover:text-brand-claro transition">
                {p.nome}
              </span>
              <span className="block px-1 pt-1 pb-1 text-xs text-muted leading-snug">{p.texto}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
