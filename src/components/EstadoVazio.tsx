import {
  IconCaixaVazia,
  IconAlertas,
  IconVisaoGeral,
  IconSaude,
  IconEducacao,
  IconObras,
  IconLicitacoes,
} from "@/components/icons";

const ICONES = {
  vazio: IconCaixaVazia,
  alertas: IconAlertas,
  indicadores: IconVisaoGeral,
  saude: IconSaude,
  educacao: IconEducacao,
  obras: IconObras,
  licitacoes: IconLicitacoes,
} as const;

/**
 * `icone` é uma chave, não um emoji: emoji renderiza diferente em cada
 * sistema operacional (e alguns nem existem em Windows), então o mesmo
 * estado vazio aparecia de um jeito no Mac e de outro no Windows.
 */
export default function EstadoVazio({
  icone = "vazio",
  titulo,
  descricao,
}: {
  icone?: keyof typeof ICONES;
  titulo: string;
  descricao?: string;
}) {
  const Icone = ICONES[icone] ?? IconCaixaVazia;

  return (
    <div className="border border-dashed border-border arco-card p-8 text-center bg-brand-tint/25">
      <div className="arco-badge w-11 h-11 bg-brand-tint text-brand flex items-center justify-center mx-auto mb-4">
        <Icone className="w-5 h-5" />
      </div>
      <p className="text-sm font-medium">{titulo}</p>
      {descricao && (
        <p className="text-xs text-muted mt-1.5 max-w-xs mx-auto leading-relaxed">{descricao}</p>
      )}
    </div>
  );
}
