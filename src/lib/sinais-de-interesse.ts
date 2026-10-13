// ── QUEM ESTÁ OLHANDO, MESMO SEM DEIXAR O NOME ──
//
// A maior parte de quem estuda o CidadeIA nunca preenche formulário: abre o
// Raio-X da própria cidade, volta no dia seguinte, abre a proposta e some.
// Cada uma dessas visitas já é registrada (lib/registrar-evento.ts), com o
// código do município e um identificador anônimo que muda todo dia. Somadas
// por cidade, dizem onde há uma prefeitura estudando a compra.
//
// Nada aqui identifica pessoa: o visitante é um hash diário, sem IP. O que
// sai é "Teresina, 4 visitas em 3 dias, abriu a proposta", que é o bastante
// para a equipe saber que vale procurar a prefeitura de Teresina.

export type EventoDeInteresse = {
  tipo: string;
  codigoIbge: string | null;
  municipio: string | null;
  uf: string | null;
  visitante: string;
  criadoEm: string;
};

export type SinalDaCidade = {
  codigoIbge: string;
  municipio: string;
  uf: string;
  /** Pares visitante-dia distintos que abriram o Raio-X da cidade. */
  visitasRaioX: number;
  /** Pares visitante-dia distintos que abriram a proposta com a cidade. */
  propostasAbertas: number;
  /** Dias distintos com alguma visita: quem volta está decidindo. */
  dias: number;
  ultimaVisita: string;
  pontos: number;
  /** Já deixou contato ou já pediu proposta: aí o trabalho está na outra lista. */
  jaEmContato: boolean;
};

/** Pesos: abrir a proposta com a cidade escolhida vale três Raio-X. */
const PESO = { raio_x: 1, proposta_aberta: 3 } as const;

/** Abaixo disso é ruído (uma visita solta, um curioso). */
export const PONTOS_MINIMOS = 3;

export function sinaisPorCidade(
  eventos: EventoDeInteresse[],
  codigosEmContato: Set<string>,
  limite = 15
): SinalDaCidade[] {
  const porCidade = new Map<
    string,
    { municipio: string; uf: string; raio: Set<string>; proposta: Set<string>; dias: Set<string>; ultima: string }
  >();
  for (const e of eventos) {
    if (!e.codigoIbge || (e.tipo !== "raio_x" && e.tipo !== "proposta_aberta")) continue;
    const c =
      porCidade.get(e.codigoIbge) ??
      { municipio: e.municipio ?? e.codigoIbge, uf: e.uf ?? "", raio: new Set(), proposta: new Set(), dias: new Set(), ultima: "" };
    const dia = e.criadoEm.slice(0, 10);
    // O identificador já é diário; somar o dia evita contar duas vezes a
    // mesma pessoa que recarregou a página.
    (e.tipo === "raio_x" ? c.raio : c.proposta).add(`${e.visitante}|${dia}`);
    c.dias.add(dia);
    if (e.criadoEm > c.ultima) c.ultima = e.criadoEm;
    if (e.municipio) c.municipio = e.municipio;
    if (e.uf) c.uf = e.uf;
    porCidade.set(e.codigoIbge, c);
  }

  return [...porCidade.entries()]
    .map(([codigoIbge, c]) => {
      // Voltar em outro dia é o sinal mais forte de decisão em andamento.
      const pontos = c.raio.size * PESO.raio_x + c.proposta.size * PESO.proposta_aberta + Math.max(0, c.dias.size - 1);
      return {
        codigoIbge,
        municipio: c.municipio,
        uf: c.uf,
        visitasRaioX: c.raio.size,
        propostasAbertas: c.proposta.size,
        dias: c.dias.size,
        ultimaVisita: c.ultima,
        pontos,
        jaEmContato: codigosEmContato.has(codigoIbge),
      };
    })
    .filter((s) => s.pontos >= PONTOS_MINIMOS)
    .sort((a, b) => Number(a.jaEmContato) - Number(b.jaEmContato) || b.pontos - a.pontos || b.ultimaVisita.localeCompare(a.ultimaVisita))
    .slice(0, limite);
}

/** "4 visitas ao Raio-X em 3 dias, abriu a proposta 1 vez". */
export function descreverSinal(s: SinalDaCidade): string {
  const partes: string[] = [];
  if (s.visitasRaioX) partes.push(`${s.visitasRaioX} ${s.visitasRaioX === 1 ? "visita" : "visitas"} ao Raio-X`);
  if (s.propostasAbertas) partes.push(`abriu a proposta ${s.propostasAbertas} ${s.propostasAbertas === 1 ? "vez" : "vezes"}`);
  const dias = s.dias > 1 ? ` em ${s.dias} dias diferentes` : "";
  return partes.join(", ") + dias;
}
