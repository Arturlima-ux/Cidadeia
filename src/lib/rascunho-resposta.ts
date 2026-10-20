import type { TipoAtendimento } from "@/lib/atendimento";
import type { Area } from "@/lib/alerta-por-area";
import type { ItemDaCidade } from "@/lib/pergunte-a-cidade";

// ── O RASCUNHO DA RESPOSTA ──
//
// Responder é a parte que ainda depende de gente, e é onde o prazo legal se
// perde: o secretário abre o painel, não sabe por onde começar, fecha. Um
// rascunho pronto, no tom certo, com o que o portal já sabe sobre o assunto
// (o horário da UBS, a situação da obra, o serviço e o que levar), faz a
// resposta sair em dois minutos.
//
// O rascunho NUNCA sai sozinho. Ele só preenche a caixa de resposta; o
// secretário lê, completa o que está entre [colchetes] e envia. Nada é
// inventado: o que não está nos dados públicos da prefeitura vira
// [colchete] para quem sabe preencher.

const NOME_AREA: Record<Area, string> = {
  saude: "Secretaria de Saúde",
  educacao: "Secretaria de Educação",
  obras: "Secretaria de Obras e Serviços Urbanos",
  licitacoes: "Setor de Compras e Contratos",
};

export type DadosDoRascunho = {
  tipo: TipoAtendimento;
  nome: string | null;
  assunto: string;
  municipio: string;
  area: Area | null;
  /** O que o portal achou sobre o assunto (lib/pergunte-a-cidade.ts). */
  encontrados: ItemDaCidade[];
};

function bloco(encontrados: ItemDaCidade[]): string | null {
  if (!encontrados.length) return null;
  return encontrados
    .slice(0, 3)
    .map((i) => [`• ${i.titulo}: ${i.resposta}`, ...i.detalhes.slice(0, 3).map((d) => `  ${d}`)].join("\n"))
    .join("\n");
}

export function rascunhoDeResposta(d: DadosDoRascunho): string {
  const ola = d.nome ? `Olá, ${d.nome.trim().split(/\s+/)[0]}.` : "Olá.";
  const setor = d.area ? NOME_AREA[d.area] : "equipe responsável";
  const info = bloco(d.encontrados);
  const assunto = `"${d.assunto.trim()}"`;
  const fim = `Atenciosamente,\n${d.area ? NOME_AREA[d.area] : "Prefeitura"} de ${d.municipio}`;
  const partes: string[] = [ola];

  switch (d.tipo) {
    case "protocolo":
      partes.push(`Recebemos sua solicitação sobre ${assunto}, que foi encaminhada à ${setor}.`);
      partes.push("[Diga o que será feito e quando: por exemplo, \"a equipe fará a vistoria no local até o dia DD/MM\".]");
      if (info) partes.push(`Enquanto isso, estas informações podem ajudar:\n${info}`);
      partes.push("Assim que o serviço for concluído, atualizaremos este protocolo.");
      break;
    case "reclamacao":
      partes.push(`Lamentamos o transtorno e agradecemos por nos avisar sobre ${assunto}. Sua reclamação foi encaminhada à ${setor}.`);
      partes.push("[Explique o que aconteceu e o que será feito para resolver, com prazo.]");
      if (info) partes.push(`Informações relacionadas:\n${info}`);
      break;
    case "informacao":
      partes.push(`Em atenção ao seu pedido de informação sobre ${assunto}, feito com base na Lei de Acesso à Informação (Lei 12.527/2011), informamos:`);
      partes.push(info ?? "[Escreva aqui a informação pedida, ou indique onde ela está publicada.]");
      partes.push("Caso a resposta não atenda ao que foi pedido, você pode recorrer em até 10 dias, como prevê o art. 15 da Lei 12.527/2011.");
      break;
    case "sugestao":
      partes.push(`Obrigado pela sugestão sobre ${assunto}. Ela foi encaminhada à ${setor} para avaliação.`);
      partes.push("[Diga se a sugestão será adotada, estudada ou por que não é possível agora.]");
      break;
    case "elogio":
      partes.push(`Muito obrigado pelo elogio sobre ${assunto}. Ele foi repassado à ${setor} e às pessoas envolvidas no atendimento.`);
      partes.push("Reconhecimentos como o seu mostram o que está dando certo e precisa continuar.");
      break;
    case "denuncia":
      partes.push(`Sua denúncia sobre ${assunto} foi recebida e será apurada pelo órgão competente, com sigilo sobre a sua identidade.`);
      partes.push("[Informe o encaminhamento dado e, se for o caso, o prazo para conclusão da apuração.]");
      break;
  }
  partes.push(fim);
  return partes.join("\n\n");
}

/** O pedido para a IA só melhorar o texto, sem acrescentar fatos. */
export const SISTEMA_RASCUNHO =
  "Você revisa respostas de uma prefeitura brasileira a manifestações de cidadãos. " +
  "Reescreva o rascunho recebido em português claro, cordial e direto, como um servidor público atencioso escreveria. " +
  "Regras: não acrescente nenhum fato, número, data, nome ou promessa que não esteja no rascunho; " +
  "mantenha intactos os trechos entre [colchetes], que o servidor vai completar; " +
  "mantenha as informações da lista (endereços, telefones, horários) exatamente como estão; " +
  "não use markdown; responda só com o texto final.";
