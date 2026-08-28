import { Document, Page, Text, View } from "@react-pdf/renderer";
import { estilos, formatarDataHora } from "./estilos";

export type CardIndicador = { valor: string; label: string };
export type LinhaLista = { colunas: string[] };

export function RelatorioSecretariaPDF({
  tituloSecretaria,
  prefeituraNome,
  municipioUf,
  indicadores,
  colunasLista,
  linhas,
  observacao,
  geradoEm,
  geradoPor,
}: {
  tituloSecretaria: string;
  prefeituraNome: string;
  municipioUf: string;
  indicadores: CardIndicador[];
  colunasLista: string[];
  linhas: LinhaLista[];
  observacao?: string;
  geradoEm: string;
  geradoPor: string;
}) {
  return (
    <Document title={`Relatório — ${tituloSecretaria}`} author="CidadeIA">
      <Page size="A4" style={estilos.pagina}>
        <View style={estilos.cabecalho}>
          <View>
            <Text style={estilos.logo}>CidadeIA</Text>
          </View>
          <View style={estilos.metaCabecalho}>
            <Text>Gerado em {formatarDataHora(geradoEm)}</Text>
            <Text>Por: {geradoPor}</Text>
          </View>
        </View>

        <Text style={estilos.tituloRelatorio}>Relatório — {tituloSecretaria}</Text>
        <Text style={estilos.subtitulo}>
          {prefeituraNome} — {municipioUf}
        </Text>

        <View style={estilos.secao}>
          <Text style={estilos.tituloSecao}>Indicadores atuais</Text>
          {indicadores.length === 0 ? (
            <Text style={estilos.avisoVazio}>
              Nenhum indicador registrado até o momento.
            </Text>
          ) : (
            <View style={estilos.linhaCards}>
              {indicadores.map((c, i) => (
                <View key={i} style={estilos.card}>
                  <Text style={estilos.cardValor}>{c.valor}</Text>
                  <Text style={estilos.cardLabel}>{c.label}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={estilos.secao}>
          <Text style={estilos.tituloSecao}>
            Itens cadastrados ({linhas.length})
          </Text>
          {linhas.length === 0 ? (
            <Text style={estilos.avisoVazio}>Nenhum item cadastrado até o momento.</Text>
          ) : (
            <View style={estilos.tabela}>
              <View style={estilos.linhaTabelaCabecalho}>
                {colunasLista.map((c, i) => (
                  <Text key={i} style={estilos.colFlex}>
                    {c}
                  </Text>
                ))}
              </View>
              {linhas.map((l, i) => (
                <View key={i} style={estilos.linhaTabela}>
                  {l.colunas.map((valor, j) => (
                    <Text key={j} style={estilos.colFlex}>
                      {valor}
                    </Text>
                  ))}
                </View>
              ))}
            </View>
          )}
        </View>

        {observacao && (
          <View style={estilos.secao}>
            <Text style={estilos.tituloSecao}>Observação</Text>
            <Text style={{ fontSize: 9 }}>{observacao}</Text>
          </View>
        )}

        <Text style={estilos.rodape}>
          Relatório gerado automaticamente pela CidadeIA com base nos dados
          registrados manualmente no sistema até o momento da geração — ainda
          sem integração automática com sistemas externos (E-SUS, SIAFI, TCE
          etc.).
        </Text>
      </Page>
    </Document>
  );
}
