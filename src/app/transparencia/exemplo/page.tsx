import PortalCidade from "../PortalCidade";
import { resumirVoz } from "@/lib/voz-da-cidade";
import { CENTRO_DO_EXEMPLO, dadosDoExemplo, fontesDoExemplo, frescorDoExemplo, instante, mensagensDeExemplo, obrasParadasDoExemplo } from "@/lib/portal-exemplo";
import { CONJUNTOS, linhasDe } from "@/lib/dados-abertos";

// ── A CIDADE DE EXEMPLO ──
//
// O prefeito precisa ver o portal funcionando antes de contratar, e ainda
// não há prefeitura com portal no ar. Bela Aurora não existe: o nome não é de
// município brasileiro, a UF é "BR" e a página abre com uma faixa dizendo que
// é cidade fictícia com dados de exemplo. Nada aqui se passa por uma
// prefeitura real.
//
// Mesmo componente do portal de verdade (../PortalCidade.tsx), então o que o
// prefeito vê aqui é exatamente o que o morador dele vai ver.

export const metadata = {
  title: "Portal do Cidadão · cidade de exemplo",
  robots: { index: false },
};

// Sempre recalculado: as "últimas mensagens" contam dias a partir de hoje.
export const dynamic = "force-dynamic";

export default function PortalExemplo() {
  const agora = instante();
  const dados = dadosDoExemplo(agora);
  const fontes = fontesDoExemplo(agora);

  return (
    <PortalCidade
      exemplo
      slug="exemplo"
      portal={{
        nome: "Prefeitura de Bela Aurora",
        municipio: "Bela Aurora",
        estado: "BR",
        prefeito: null,
        whatsappNumero: null,
        codigoIbge: null,
        mostrarFinanceiro: true,
        mostrarObras: true,
        mostrarLicitacoes: true,
      }}
      {...dados}
      pontoSimulado={CENTRO_DO_EXEMPLO}
      voz={resumirVoz(mensagensDeExemplo(agora), agora)}
      conjuntos={CONJUNTOS.map((c) => ({ chave: c.chave, registros: linhasDe(c.chave, fontes).length }))}
      frescor={frescorDoExemplo(agora)}
      emendas={fontes.emendas}
      obrasParadas={obrasParadasDoExemplo(agora)}
    />
  );
}
