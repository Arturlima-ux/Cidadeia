// ── O PONTO DE SITUAÇÃO NÃO PODE SER SÓ COR ──
//
// As listas de rede (Saúde e Educação) marcavam a situação de cada unidade
// ou escola com um ponto colorido, `aria-hidden`, sem rótulo nenhum.
//
// O validador de paleta mostrou por que isso é grave: no tema noite, o par
// mais parecido de toda a paleta é justamente `--urgente` (#ff6b7a) contra
// `--accent` (#2fbf87) — ΔE 3,3 para deuteranopia. Ou seja, "urgente" e
// "sem pendência" são O MESMO PONTO para cerca de 8% dos homens. No tema
// claro o par pior é `--medio` contra `--urgente`: ΔE 0,1.
//
// Com visão normal as cores se distinguem (ΔE 16,6), então o defeito era
// invisível para quem escreveu a tela. É exatamente o tipo de coisa que só
// aparece quando se roda a conta em vez de olhar.
//
// A correção não é trocar a cor — o vermelho e o verde significam o que
// significam para quem enxerga. É acrescentar um segundo canal:
//
//   urgente  ●  preenchido, com anel
//   atenção  ●  preenchido
//   normal   ○  vazado
//
// Três estados distinguíveis sem cor nenhuma, mais um rótulo que o leitor
// de tela anuncia. A cor continua lá, fazendo o trabalho dela para quem a
// enxerga; ela só deixou de ser a ÚNICA informação.

export type SituacaoMarcador = "urgente" | "atencao" | "normal";

const COR: Record<SituacaoMarcador, string> = {
  urgente: "var(--urgente)",
  atencao: "var(--medio)",
  normal: "var(--accent)",
};

const ROTULO: Record<SituacaoMarcador, string> = {
  urgente: "Urgente",
  atencao: "Atenção",
  normal: "Sem pendência",
};

export default function MarcadorSituacao({
  situacao,
  className = "",
}: {
  situacao: SituacaoMarcador;
  className?: string;
}) {
  const cor = COR[situacao];
  return (
    <span className={`inline-flex shrink-0 ${className}`}>
      <span
        className="w-2.5 h-2.5 rounded-full"
        style={{
          // Vazado no estado normal: a ausência de preenchimento é o sinal.
          background: situacao === "normal" ? "transparent" : cor,
          border: `2px solid ${cor}`,
          // O anel só no urgente. Some em prefers-contrast: forced-colors
          // descarta box-shadow, e aí sobram o preenchimento e o rótulo.
          boxShadow: situacao === "urgente" ? `0 0 0 3px color-mix(in srgb, ${cor} 28%, transparent)` : undefined,
        }}
      />
      <span className="sr-only">{ROTULO[situacao]}</span>
    </span>
  );
}
