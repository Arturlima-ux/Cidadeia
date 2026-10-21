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
  return (
    <div className="rounded-[28px] border border-border p-5 sm:p-6" style={{ background: "var(--card)" }}>
      <div className="flex items-baseline justify-between gap-4 flex-wrap">
        <p className="font-semibold tracking-[-0.01em]">Um sistema para a prefeitura inteira</p>
        <p className="text-xs text-muted">um acesso por pessoa, cada uma na sua área</p>
      </div>
      <ul className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {PARTES.map((p) => (
          <li key={p.chave}>
            <Link
              href={`/modulos/${p.chave}`}
              className="group flex items-center gap-3 rounded-2xl border border-border hover:border-brand px-3 py-3 transition h-full"
              style={{ background: "var(--superficie)" }}
            >
              <IlustracaoArea area={p.chave} className="w-[88px] h-[55px] shrink-0 rounded-lg" />
              <span className="min-w-0">
                <span className="block text-sm font-semibold">
                  {p.nome}
                  {p.nome !== p.modulo && <span className="font-normal text-muted"> · {p.modulo}</span>}
                </span>
                <span className="block text-sm text-muted mt-0.5 leading-snug">{p.texto}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-xs text-muted leading-relaxed">
        Alimentado sozinho pelo Tesouro Nacional, IBGE, PNCP, DataSUS e INEP. Nada para instalar.
      </p>
    </div>
  );
}
