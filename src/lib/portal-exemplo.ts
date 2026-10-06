import type { LinhaVoz } from "@/lib/voz-da-cidade";
import type { TipoAtendimento, StatusAtendimento } from "@/lib/atendimento";

// Mensagens da cidade fictícia (Bela Aurora): usadas pelo portal de exemplo
// (/transparencia/exemplo) e pela vitrine da home. Datas relativas a `agora`,
// para as "últimas mensagens" nunca envelhecerem.

const DIA = 86_400_000;
// Fora do componente: a página é refeita a cada pedido (force-dynamic).
export const instante = () => Date.now();

export function mensagensDeExemplo(agora: number): LinhaVoz[] {
  const tipos: TipoAtendimento[] = ["protocolo", "reclamacao", "elogio", "sugestao", "protocolo", "informacao", "reclamacao", "elogio", "denuncia", "protocolo"];
  const areas = ["saude", "obras", "educacao", "administracao", "obras", "saude", "assistencia", "educacao"];
  const linhas: LinhaVoz[] = [];
  for (let i = 0; i < 42; i++) {
    const criada = agora - (i * 2.6 + (i % 3) * 0.4) * DIA - (i % 5) * 3_600_000;
    const respondida = i % 7 !== 0 && i > 2;
    const prazo = 1 + ((i * 3) % 6);
    linhas.push({
      tipo: tipos[i % tipos.length],
      status: (respondida ? (i % 4 === 0 ? "encerrado" : "respondido") : i % 2 ? "em_analise" : "aberto") as StatusAtendimento,
      secretaria: areas[i % areas.length],
      createdAt: new Date(criada).toISOString(),
      respondidoEm: respondida ? new Date(criada + prazo * DIA).toISOString() : null,
    });
  }
  return linhas;
}

