import { Document, Page, Text, View } from "@react-pdf/renderer";
import { estilos, formatarDataHora } from "./estilos";
import { frasesDoValor, plural, type Valor } from "@/lib/valor-entregue";
import { dataDoBanco } from "@/lib/data-do-banco";

// O "O que o CidadeIA fez" em PDF: o mesmo conteúdo da tela, para o prefeito
// levar à reunião de orçamento ou encaminhar à Câmara. Mesmos estilos dos
// outros relatórios (estilos.ts).

const dataCurta = (t: string) =>
  dataDoBanco(t).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "America/Sao_Paulo" });

export function RelatorioValorPDF({
  prefeitura,
  periodo,
  valor,
  geradoEm,
}: {
  prefeitura: { nome: string; municipio: string; estado: string };
  periodo: string;
  valor: Valor;
  geradoEm: string;
}) {
  const frases = frasesDoValor(valor);
  return (
    <Document title={`O que o CidadeIA fez — ${prefeitura.nome}`} author="CidadeIA">
      <Page size="A4" style={estilos.pagina}>
        <View style={estilos.cabecalho}>
          <Text style={estilos.logo}>CidadeIA</Text>
          <View style={estilos.metaCabecalho}>
            <Text>Gerado em {formatarDataHora(geradoEm)}</Text>
          </View>
        </View>

        <Text style={estilos.tituloRelatorio}>O que o CidadeIA fez</Text>
        <Text style={estilos.subtitulo}>
          {prefeitura.nome} — {prefeitura.municipio}/{prefeitura.estado} · {periodo}
        </Text>

        <View style={estilos.secao}>
          <View style={estilos.linhaCards}>
            <View style={estilos.card}>
              <Text style={estilos.cardValor}>{valor.resolvidos}</Text>
              <Text style={estilos.cardLabel}>problemas apontados e resolvidos</Text>
            </View>
            <View style={estilos.card}>
              <Text style={estilos.cardValor}>{valor.mediaDias === null ? "—" : valor.mediaDias < 1 ? "<1" : valor.mediaDias.toLocaleString("pt-BR")}</Text>
              <Text style={estilos.cardLabel}>dias, em média, do aviso à solução</Text>
            </View>
            <View style={estilos.card}>
              <Text style={estilos.cardValor}>{valor.ouvidoria.percentualNoPrazo === null ? "—" : `${valor.ouvidoria.percentualNoPrazo}%`}</Text>
              <Text style={estilos.cardLabel}>manifestações respondidas no prazo</Text>
            </View>
            <View style={estilos.card}>
              <Text style={estilos.cardValor}>{valor.importados.total.toLocaleString("pt-BR")}</Text>
              <Text style={estilos.cardLabel}>registros importados sem digitação</Text>
            </View>
          </View>
        </View>

        <View style={estilos.secao}>
          <Text style={estilos.tituloSecao}>Em resumo</Text>
          {frases.length ? (
            frases.map((f) => (
              <Text key={f} style={{ marginBottom: 5, lineHeight: 1.4 }}>
                • {f}
              </Text>
            ))
          ) : (
            <Text style={estilos.avisoVazio}>Nada a registrar no período.</Text>
          )}
        </View>

        {valor.recentes.length > 0 && (
          <View style={estilos.secao}>
            <Text style={estilos.tituloSecao}>Apontado e resolvido</Text>
            <View style={estilos.linhaTabelaCabecalho}>
              <Text style={estilos.colFlex}>O que era</Text>
              <Text style={estilos.colFixa}>Área</Text>
              <Text style={estilos.colFixa}>Resolvido em</Text>
              <Text style={{ width: 50 }}>Dias</Text>
            </View>
            {valor.recentes.map((r, i) => (
              <View key={i} style={estilos.linhaTabela} wrap={false}>
                <Text style={estilos.colFlex}>{r.titulo}</Text>
                <Text style={estilos.colFixa}>{r.area}</Text>
                <Text style={estilos.colFixa}>{dataCurta(r.em)}</Text>
                <Text style={{ width: 50 }}>{r.dias === null ? "—" : r.dias === 0 ? "mesmo dia" : plural(r.dias, "dia", "dias")}</Text>
              </View>
            ))}
          </View>
        )}

        <Text style={estilos.rodape} fixed>
          Contagem do que aconteceu no sistema, sem estimativa. Quem resolve é a equipe da prefeitura; o CidadeIA avisa a tempo.
        </Text>
      </Page>
    </Document>
  );
}
