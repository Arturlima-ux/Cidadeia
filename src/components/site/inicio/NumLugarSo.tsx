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
  // Compacto e um pouco translúcido: no computador ele fica abaixo do mapa
  // do Brasil, à direita, e não cobre o desenho (o mapa ocupa o alto da
  // coluna). O texto de cada módulo vai no title e na página do módulo.
  return (
    <div
      className="lg:mt-32 xl:mt-24 lg:ml-auto lg:max-w-[500px] rounded-3xl border border-border p-4 sm:p-5 backdrop-blur-md"
      style={{ background: "color-mix(in srgb, var(--card) 72%, transparent)" }}
    >
      <div className="flex items-baseline justify-between gap-3 flex-wrap">
        <p className="text-sm font-semibold tracking-[-0.01em]">Um sistema para a prefeitura inteira</p>
        <p className="text-xs text-muted">um acesso por pessoa</p>
      </div>
      <ul className="mt-3.5 grid grid-cols-2 sm:grid-cols-3 gap-2">
        {PARTES.map((p) => (
          <li key={p.chave}>
            <Link
              href={`/modulos/${p.chave}`}
              title={p.texto}
              className="group block rounded-xl border border-border hover:border-brand p-1.5 transition h-full"
              style={{ background: "var(--superficie)" }}
            >
              <IlustracaoArea area={p.chave} className="w-full h-auto rounded-lg" />
              <span className="block px-1 pt-1.5 pb-0.5 text-[13px] font-semibold leading-tight group-hover:text-brand-claro transition">
                {p.nome}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-[11px] text-muted leading-relaxed">
        Alimentado sozinho pelo Tesouro, IBGE, PNCP, DataSUS e INEP.
      </p>
    </div>
  );
}
