// ── OUVIR A PÁGINA ──
// O leitor de tela do celular existe, mas quase ninguém sabe ligar. O botão
// "Ouvir esta página" usa a voz que o próprio aparelho já tem (Web Speech),
// em português, sem nada instalado e sem custo. Aqui fica a parte pura: o
// texto que se lê e como ele é dividido. A voz do navegador costuma parar no
// meio de falas longas, então tudo vai em pedaços curtos, cortados no fim de
// frase.

/** Espaços e quebras viram um espaço só; símbolos que a voz soletra somem. */
export function limparParaFala(texto: string): string {
  return texto
    .replace(/[→←↗•·]/g, ", ")
    .replace(/\s+/g, " ")
    .replace(/\s+([,.;:!?])/g, "$1")
    .replace(/(,\s*){2,}/g, ", ")
    .replace(/\.(\s*\.)+/g, ".")
    .replace(/,\s*\./g, ".")
    .trim();
}

/** Pedaços de até `maximo` caracteres, cortados no fim de frase sempre que dá. */
export function dividirEmFalas(texto: string, maximo = 220): string[] {
  const limpo = limparParaFala(texto);
  if (!limpo) return [];
  const frases = limpo.match(/[^.!?]+[.!?]*/g) ?? [limpo];
  const falas: string[] = [];
  let atual = "";
  for (const bruta of frases) {
    const frase = bruta.trim();
    if (!frase) continue;
    if (frase.length > maximo) {
      if (atual) falas.push(atual);
      atual = "";
      // Frase gigante (lista sem ponto): corta na vírgula ou no espaço.
      let resto = frase;
      while (resto.length > maximo) {
        const corte = Math.max(resto.lastIndexOf(", ", maximo), resto.lastIndexOf(" ", maximo));
        const ponto = corte > maximo / 2 ? corte + 1 : maximo;
        falas.push(resto.slice(0, ponto).trim());
        resto = resto.slice(ponto).trim();
      }
      atual = resto;
      continue;
    }
    if ((atual ? `${atual} ${frase}` : frase).length > maximo) {
      falas.push(atual);
      atual = frase;
    } else {
      atual = atual ? `${atual} ${frase}` : frase;
    }
  }
  if (atual) falas.push(atual);
  return falas;
}
