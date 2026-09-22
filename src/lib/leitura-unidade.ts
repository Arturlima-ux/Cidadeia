import { diasSemAtualizarNoCnes, DIAS_CNES_DESATUALIZADO } from "@/lib/cnes";
import { diasAberta, rotuloOcorrencia } from "@/lib/ocorrencias-saude";
import { diasDeCobertura, situacaoDoItem, contagemVelha } from "@/lib/estoque-saude";

// ── A LEITURA AUTOMÁTICA DE UMA UNIDADE ──
//
// Junta o que o sistema sabe de cada UBS ou hospital — cadastro no CNES,
// ocorrências abertas, estoque, o que o cidadão disse na ouvidoria — e
// devolve, por regra, o que mais importa agora e o que fazer. Sem modelo,
// sem rede: cada frase é explicável ao Tribunal de Contas.
//
// A pontuação é para ORDENAR unidades (qual precisa de você primeiro), não
// para virar nota. Fica interna.

export type Achado = {
  gravidade: "urgente" | "atencao" | "info";
  titulo: string;
  detalhe: string;
  acao: string;
  /** Peso para ordenar unidades. */
  peso: number;
  fonte: "cnes" | "ocorrencia" | "estoque" | "ouvidoria" | "cadastro";
};

export type LeituraUnidade = {
  situacao: "urgente" | "atencao" | "normal";
  achados: Achado[];
  /** Uma frase pronta para a lista da secretaria. */
  resumo: string;
  peso: number;
};

export type EntradaLeitura = {
  unidade: { nome: string; ativo: boolean; cnesAtualizadoEm: string | null; origem: string; turno: string | null; atendeSus: boolean | null };
  ocorrenciasAbertas: { tipo: string; gravidade: string; descricao: string; createdAt: string }[];
  estoque: { item: string; saldo: number; consumoMensal: number; atualizadoEm: string }[];
  /** Manifestações da ouvidoria dos últimos 30 dias que mencionam a unidade. */
  mencoesOuvidoria: { tipo: string; assunto: string; createdAt: string }[];
};

export function lerUnidade(e: EntradaLeitura, hoje: Date = new Date()): LeituraUnidade {
  const achados: Achado[] = [];
  const u = e.unidade;

  // ── cadastro ──
  if (!u.ativo) {
    achados.push({
      gravidade: "urgente",
      titulo: "Não consta mais no CNES",
      detalhe: "A unidade sumiu do cadastro nacional. Sem CNES ativo não há produção reconhecida nem repasse.",
      acao: "Confirmar com a coordenação se a unidade funciona; se sim, reativar o cadastro no CNES.",
      peso: 40,
      fonte: "cnes",
    });
  } else {
    const dias = diasSemAtualizarNoCnes(u.cnesAtualizadoEm, hoje);
    if (dias !== null && dias >= DIAS_CNES_DESATUALIZADO) {
      achados.push({
        gravidade: dias >= 365 ? "urgente" : "atencao",
        titulo: `CNES sem atualização há ${dias} dias`,
        detalhe: "A Portaria GM/MS 1.883/2018 exige atualização mensal do cadastro. Cadastro parado trava habilitações e pode reter repasse.",
        acao: "Pedir ao responsável pelo CNES na secretaria que revise e atualize o cadastro desta unidade.",
        peso: dias >= 365 ? 30 : 15,
        fonte: "cnes",
      });
    }
  }

  // ── ocorrências ──
  const urgentes = e.ocorrenciasAbertas.filter((o) => o.gravidade === "urgente");
  for (const o of urgentes) {
    const d = diasAberta(o.createdAt, hoje);
    achados.push({
      gravidade: d >= 2 ? "urgente" : "atencao",
      titulo: `${rotuloOcorrencia(o.tipo)} — urgente há ${d} dia(s)`,
      detalhe: o.descricao,
      acao:
        o.tipo === "sem_medico" || o.tipo === "sem_profissional"
          ? "Remanejar profissional de outra unidade ou acionar substituto; avisar a população do horário reduzido."
          : o.tipo === "equipamento_quebrado"
            ? "Abrir chamado de manutenção com prazo e transferir o que depende do equipamento (vacinas, exames)."
            : "Resolver na origem e registrar como resolvida na ficha.",
      peso: d >= 2 ? 35 : 20,
      fonte: "ocorrencia",
    });
  }
  const atencoes = e.ocorrenciasAbertas.filter((o) => o.gravidade !== "urgente");
  if (atencoes.length >= 3) {
    achados.push({
      gravidade: "atencao",
      titulo: `${atencoes.length} ocorrências de atenção abertas`,
      detalhe: atencoes.slice(0, 3).map((o) => rotuloOcorrencia(o.tipo)).join(", ") + (atencoes.length > 3 ? "…" : ""),
      acao: "Acumular pendência é sinal de que ninguém está fechando o ciclo: revisar com a gerência o que já foi resolvido.",
      peso: 10,
      fonte: "ocorrencia",
    });
  }

  // ── estoque ──
  const emFalta = e.estoque.filter((l) => situacaoDoItem(l.saldo, l.consumoMensal) === "falta");
  const criticos = e.estoque.filter((l) => situacaoDoItem(l.saldo, l.consumoMensal) === "critico");
  if (emFalta.length > 0) {
    achados.push({
      gravidade: "urgente",
      titulo: `Em falta: ${emFalta.map((l) => l.item).join(", ")}`,
      detalhe: "Saldo zero em item com consumo registrado. Paciente crônico sem remédio é internação evitável.",
      acao: "Remanejar de outra unidade hoje e incluir no pedido de reposição.",
      peso: 30,
      fonte: "estoque",
    });
  }
  if (criticos.length > 0) {
    achados.push({
      gravidade: "atencao",
      titulo: `Acabando em dias: ${criticos.map((l) => `${l.item} (${diasDeCobertura(l.saldo, l.consumoMensal)} d)`).join(", ")}`,
      detalhe: "Menos de uma semana de cobertura pelo consumo informado.",
      acao: "Gerar o pedido de reposição agora; a entrega leva mais que isso.",
      peso: 15,
      fonte: "estoque",
    });
  }
  const velhas = e.estoque.filter((l) => contagemVelha(l.atualizadoEm, hoje));
  if (e.estoque.length > 0 && velhas.length === e.estoque.length) {
    achados.push({
      gravidade: "info",
      titulo: "Estoque sem contagem há mais de 30 dias",
      detalhe: "Os dias de cobertura acima partem de uma contagem velha.",
      acao: "Pedir à gerência uma contagem nova — leva dez minutos e evita surpresa.",
      peso: 5,
      fonte: "estoque",
    });
  }

  // ── ouvidoria ──
  if (e.mencoesOuvidoria.length >= 3) {
    achados.push({
      gravidade: "atencao",
      titulo: `${e.mencoesOuvidoria.length} manifestações do cidadão citam esta unidade em 30 dias`,
      detalhe: e.mencoesOuvidoria.slice(0, 3).map((m) => `"${m.assunto}"`).join(", "),
      acao: "Ler as manifestações na Ouvidoria e comparar com as ocorrências registradas: se o cidadão reclama do que a gerência não registrou, a ficha está incompleta.",
      peso: 12,
      fonte: "ouvidoria",
    });
  } else if (e.mencoesOuvidoria.length > 0) {
    achados.push({
      gravidade: "info",
      titulo: `${e.mencoesOuvidoria.length} manifestação(ões) do cidadão citam esta unidade em 30 dias`,
      detalhe: e.mencoesOuvidoria.map((m) => `"${m.assunto}"`).join(", "),
      acao: "Conferir na Ouvidoria se já foi respondida.",
      peso: 3,
      fonte: "ouvidoria",
    });
  }

  // ── cadastro incompleto (só informativo) ──
  if (u.origem === "manual") {
    achados.push({
      gravidade: "info",
      titulo: "Cadastrada à mão, sem código CNES",
      detalhe: "Não aparece na sincronização com o Ministério da Saúde.",
      acao: "Se a unidade existe no CNES, importe a rede para ela ganhar código e data de atualização.",
      peso: 2,
      fonte: "cadastro",
    });
  }

  const ordem = { urgente: 0, atencao: 1, info: 2 } as const;
  achados.sort((a, b) => ordem[a.gravidade] - ordem[b.gravidade] || b.peso - a.peso);
  const peso = achados.reduce((s, a) => s + a.peso, 0);
  const situacao = achados.some((a) => a.gravidade === "urgente") ? "urgente" : achados.some((a) => a.gravidade === "atencao") ? "atencao" : "normal";
  const principal = achados[0];
  const resumo = principal
    ? `${principal.titulo}. ${principal.acao}`
    : "Sem pendência registrada. Cadastro em dia, nenhuma ocorrência aberta, estoque coberto.";
  return { situacao, achados, resumo, peso };
}

/** Manifestações que citam a unidade pelo nome (ou por um apelido: "UBS Centro" ↔ "posto do centro"). */
export function mencionaUnidade(texto: string, nomeUnidade: string): boolean {
  const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const t = norm(texto);
  const n = norm(nomeUnidade);
  if (t.includes(n)) return true;
  // "UBS Alto da Serra" → procura "alto da serra"
  const semPrefixo = n.replace(/^(ubs|posto de saude|posto|hospital municipal|hospital|upa|caps)\s+/i, "").trim();
  return semPrefixo.length >= 5 && t.includes(semPrefixo);
}
