import { Document, Page, Text, View } from "@react-pdf/renderer";
import { estilos, formatarMoeda, formatarDataHora } from "./estilos";

type Prefeitura = {
  nome: string;
  municipio: string;
  estado: string;
  prefeito: string | null;
  populacao: number | null;
};

type Snapshot = {
  receita: number | null;
  despesas: number | null;
  saldo: number | null;
  indiceTransparencia: number | null;
  atualizadoEm: string;
} | null;

type Alerta = {
  titulo: string;
  descricao: string | null;
  prioridade: "urgente" | "medio" | "info";
  secretaria: string | null;
  resolvido: boolean;
};

const LABEL_PRIORIDADE: Record<string, string> = {
  urgente: "URGENTE",
  medio: "MÉDIO",
  info: "INFO",
};

export function RelatorioExecutivoPDF({
  prefeitura,
  snapshot,
  alertas,
  resumoSecretarias,
  geradoEm,
  geradoPor,
}: {
  prefeitura: Prefeitura;
  snapshot: Snapshot;
  alertas: Alerta[];
  resumoSecretarias: { nome: string; linha: string }[];
  geradoEm: string;
  geradoPor: string;
}) {
  const abertos = alertas.filter((a) => !a.resolvido);

  return (
    <Document
      title={`Relatório Executivo — ${prefeitura.nome}`}
      author="CidadeIA"
    >
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

        <Text style={estilos.tituloRelatorio}>Relatório Executivo</Text>
        <Text style={estilos.subtitulo}>
          {prefeitura.nome} — {prefeitura.municipio}/{prefeitura.estado}
          {prefeitura.prefeito ? ` · Prefeito(a): ${prefeitura.prefeito}` : ""}
        </Text>

        {/* FINANCEIRO */}
        <View style={estilos.secao}>
          <Text style={estilos.tituloSecao}>Indicadores financeiros</Text>
          {snapshot ? (
            <>
              <View style={estilos.linhaCards}>
                <View style={estilos.card}>
                  <Text style={estilos.cardValor}>{formatarMoeda(snapshot.receita)}</Text>
                  <Text style={estilos.cardLabel}>Receita</Text>
                </View>
                <View style={estilos.card}>
                  <Text style={estilos.cardValor}>{formatarMoeda(snapshot.despesas)}</Text>
                  <Text style={estilos.cardLabel}>Despesas</Text>
                </View>
                <View style={estilos.card}>
                  <Text style={estilos.cardValor}>{formatarMoeda(snapshot.saldo)}</Text>
                  <Text style={estilos.cardLabel}>Saldo</Text>
                </View>
                <View style={estilos.card}>
                  <Text style={estilos.cardValor}>
                    {snapshot.indiceTransparencia ?? "—"}%
                  </Text>
                  <Text style={estilos.cardLabel}>Índice de Transparência</Text>
                </View>
              </View>
              <Text style={[estilos.textoMuted, { fontSize: 8, marginTop: 4 }]}>
                Última atualização: {formatarDataHora(snapshot.atualizadoEm)} (inserção manual)
              </Text>
            </>
          ) : (
            <Text style={estilos.avisoVazio}>
              Nenhum indicador financeiro foi registrado até o momento.
            </Text>
          )}
        </View>

        {/* ALERTAS */}
        <View style={estilos.secao}>
          <Text style={estilos.tituloSecao}>
            Alertas em aberto ({abertos.length})
          </Text>
          {abertos.length === 0 ? (
            <Text style={estilos.avisoVazio}>Nenhum alerta em aberto.</Text>
          ) : (
            <View style={estilos.tabela}>
              <View style={estilos.linhaTabelaCabecalho}>
                <Text style={estilos.colFixa}>Prioridade</Text>
                <Text style={estilos.colFlex}>Título</Text>
                <Text style={estilos.colFixa}>Secretaria</Text>
              </View>
              {abertos.map((a, i) => (
                <View key={i} style={estilos.linhaTabela}>
                  <Text
                    style={[
                      estilos.colFixa,
                      a.prioridade === "urgente"
                        ? estilos.badgeUrgente
                        : a.prioridade === "medio"
                          ? estilos.badgeMedio
                          : estilos.badgeInfo,
                    ]}
                  >
                    {LABEL_PRIORIDADE[a.prioridade]}
                  </Text>
                  <Text style={estilos.colFlex}>{a.titulo}</Text>
                  <Text style={[estilos.colFixa, estilos.textoMuted]}>
                    {a.secretaria ?? "—"}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* RESUMO POR SECRETARIA */}
        <View style={estilos.secao}>
          <Text style={estilos.tituloSecao}>Resumo por secretaria</Text>
          {resumoSecretarias.map((s, i) => (
            <View key={i} style={{ marginBottom: 6 }}>
              <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 9 }}>{s.nome}</Text>
              <Text style={[estilos.textoMuted, { fontSize: 9 }]}>{s.linha}</Text>
            </View>
          ))}
        </View>

        <Text style={estilos.rodape}>
          Relatório gerado automaticamente pela CidadeIA com base nos dados
          registrados no sistema até o momento da geração. Dados de fontes
          externas (E-SUS, SIAFI, TCE etc.) não estão incluídos enquanto essas
          integrações não estiverem ativas.
        </Text>
      </Page>
    </Document>
  );
}
