import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { estilos } from "./estilos";
import { moeda, type PropostaComercial } from "@/lib/proposta-comercial";

// ── A PROPOSTA EM PAPEL ──
// Duas ou três páginas: capa com destinatário e totais; módulos com o que
// cada um entrega; enquadramento, condições e próximos passos; dados da
// empresa. Só desenha o que lib/proposta-comercial.ts montou.

const s = StyleSheet.create({
  bloco: { marginBottom: 14 },
  rotulo: { fontSize: 8, color: "#666", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 },
  valorGrande: { fontSize: 20, fontFamily: "Helvetica-Bold", color: "#1a1a1a" },
  valorMedio: { fontSize: 13, fontFamily: "Helvetica-Bold" },
  linha: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 5, borderBottom: "1 solid #e6e3dc" },
  linhaTotal: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 7, borderTop: "2 solid #1a1a1a", marginTop: 2 },
  bold: { fontFamily: "Helvetica-Bold" },
  itemCapacidade: { flexDirection: "row", gap: 6, marginBottom: 2 },
  marcador: { color: "#1a5c35", fontFamily: "Helvetica-Bold" },
  caixa: { backgroundColor: "#f8f6f1", borderRadius: 4, padding: 12, marginBottom: 12 },
  caixaAtencao: { backgroundColor: "#fff5e0", borderRadius: 4, padding: 12, marginBottom: 12, borderLeft: "3 solid #96591a" },
  passo: { flexDirection: "row", gap: 8, marginBottom: 5 },
  numero: { width: 14, fontFamily: "Helvetica-Bold", color: "#1a5c35" },
  pequeno: { fontSize: 8.5, color: "#555", lineHeight: 1.4 },
  colchete: { color: "#96591a", fontFamily: "Helvetica-Bold" },
});

function data(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
}

function Campo({ valor, marcador }: { valor: string | null; marcador: string }) {
  return valor ? <Text>{valor}</Text> : <Text style={s.colchete}>[{marcador}]</Text>;
}

function Cabecalho({ p }: { p: PropostaComercial }) {
  return (
    <View style={estilos.cabecalho} fixed>
      <Text style={estilos.logo}>CidadeIA</Text>
      <View style={estilos.metaCabecalho}>
        <Text>Proposta comercial nº {p.numero}</Text>
        <Text>Emitida em {data(p.emitidaEm)} · válida até {data(p.validaAte)}</Text>
      </View>
    </View>
  );
}

function Rodape({ p }: { p: PropostaComercial }) {
  return (
    <View style={estilos.rodape} fixed>
      <Text>
        CidadeIA · proposta {p.numero} · {p.destinatario.prefeitura}/{p.destinatario.uf}
      </Text>
      <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
    </View>
  );
}

export function PropostaComercialPDF({ p }: { p: PropostaComercial }) {
  const pop = new Intl.NumberFormat("pt-BR").format(p.municipio.populacao);
  return (
    <Document title={`Proposta CidadeIA — ${p.destinatario.prefeitura}`} author="CidadeIA">
      {/* ── página 1: destinatário e totais ── */}
      <Page size="A4" style={estilos.pagina}>
        <Cabecalho p={p} />
        <Text style={estilos.tituloRelatorio}>Proposta comercial</Text>
        <Text style={estilos.subtitulo}>
          Licenciamento de sistema de gestão municipal, por módulo, com hospedagem, suporte e atualizações
        </Text>

        <View style={estilos.linhaCards}>
          <View style={estilos.card}>
            <Text style={s.rotulo}>Para</Text>
            <Text style={s.bold}>{p.destinatario.prefeitura}</Text>
            <Text>
              {p.destinatario.municipio}/{p.destinatario.uf}
            </Text>
            <Text style={{ marginTop: 4 }}>
              A/C {p.destinatario.nome}
              {p.destinatario.cargo ? `, ${p.destinatario.cargo}` : ""}
            </Text>
            <Text style={estilos.textoMuted}>{p.destinatario.email}</Text>
          </View>
          <View style={estilos.card}>
            <Text style={s.rotulo}>Município</Text>
            <Text>{pop} habitantes (estimativa IBGE)</Text>
            <Text>Faixa: {p.municipio.faixa} habitantes</Text>
            <Text style={[estilos.textoMuted, { marginTop: 4 }]}>
              O valor de cada módulo depende da faixa de habitantes, definida pela população do IBGE — não por
              declaração.
            </Text>
          </View>
        </View>

        <View style={estilos.secao}>
          <Text style={estilos.tituloSecao}>Resumo do investimento</Text>
          {p.itens.map((i) => (
            <View key={i.modulo} style={s.linha}>
              <Text>{i.nome}</Text>
              <Text>{i.mensal === null ? "sob consulta" : `${moeda(i.mensal)} / mês`}</Text>
            </View>
          ))}
          <View style={s.linhaTotal}>
            <Text style={s.bold}>Total mensal</Text>
            <Text style={s.bold}>{p.sobConsulta ? `${moeda(p.totalMensal)} + sob consulta` : moeda(p.totalMensal)}</Text>
          </View>
          <View style={[s.linha, { borderBottom: "0" }]}>
            <Text style={s.bold}>Total em 12 meses</Text>
            <Text style={s.valorMedio}>{p.sobConsulta ? `${moeda(p.totalAnual)} + sob consulta` : moeda(p.totalAnual)}</Text>
          </View>
        </View>

        <View style={p.enquadramento.cabeNaDispensa ? s.caixa : s.caixaAtencao}>
          <Text style={s.rotulo}>Enquadramento legal</Text>
          <Text style={{ lineHeight: 1.45 }}>{p.enquadramento.texto}</Text>
        </View>

        <View style={estilos.secao}>
          <Text style={estilos.tituloSecao}>Condições</Text>
          {p.condicoes.map((c) => (
            <View key={c} style={s.itemCapacidade}>
              <Text style={s.marcador}>•</Text>
              <Text style={{ flex: 1, lineHeight: 1.4 }}>{c}</Text>
            </View>
          ))}
        </View>
        <Rodape p={p} />
      </Page>

      {/* ── página 2: o que cada módulo entrega ── */}
      <Page size="A4" style={estilos.pagina}>
        <Cabecalho p={p} />
        <Text style={estilos.tituloRelatorio}>O que cada módulo entrega</Text>
        <Text style={estilos.subtitulo}>
          A mesma lista publicada no site. Cada item existe no sistema hoje; nada aqui é roteiro.
        </Text>
        {p.itens.map((i) => (
          <View key={i.modulo} style={s.bloco} wrap={false}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }}>
              <Text style={s.valorMedio}>{i.nome}</Text>
              <Text style={estilos.textoMuted}>{i.mensal === null ? "sob consulta" : `${moeda(i.mensal)} / mês`}</Text>
            </View>
            <Text style={[estilos.textoMuted, { marginBottom: 5 }]}>{i.resumo}</Text>
            {i.capacidades.map((c) => (
              <View key={c} style={s.itemCapacidade}>
                <Text style={s.marcador}>✓</Text>
                <Text style={{ flex: 1, lineHeight: 1.35 }}>{c}</Text>
              </View>
            ))}
          </View>
        ))}
        <Rodape p={p} />
      </Page>

      {/* ── página 3: próximos passos e a empresa ── */}
      <Page size="A4" style={estilos.pagina}>
        <Cabecalho p={p} />
        <Text style={estilos.tituloRelatorio}>Próximos passos</Text>
        <Text style={estilos.subtitulo}>Do aceite à ativação, sem reunião obrigatória</Text>
        <View style={estilos.secao}>
          {p.proximosPassos.map((passo, n) => (
            <View key={passo} style={s.passo}>
              <Text style={s.numero}>{n + 1}.</Text>
              <Text style={{ flex: 1, lineHeight: 1.45 }}>{passo}</Text>
            </View>
          ))}
        </View>

        <View style={estilos.secao}>
          <Text style={estilos.tituloSecao}>Segurança e dados</Text>
          <Text style={{ lineHeight: 1.45 }}>
            Cada prefeitura acessa somente os próprios dados. Senhas guardadas com hash, sessões assinadas, canal
            cifrado. As consultas a bases externas (SICONFI, PNCP, IBGE) usam apenas identificadores públicos do
            município. Manifestações anônimas da ouvidoria não são identificadas em nenhuma etapa. O acordo de
            tratamento de dados (LGPD) acompanha o kit de contratação.
          </Text>
        </View>

        <View style={estilos.secao}>
          <Text style={estilos.tituloSecao}>Proponente</Text>
          <View style={s.caixa}>
            <Text style={s.bold}>
              <Campo valor={p.empresa.razaoSocial} marcador="RAZÃO SOCIAL" />
            </Text>
            <Text>
              CNPJ <Campo valor={p.empresa.cnpj} marcador="CNPJ" />
            </Text>
            <Text>
              <Campo valor={p.empresa.endereco} marcador="ENDEREÇO" />
            </Text>
            <Text style={{ marginTop: 6 }}>
              Representante: <Campo valor={p.empresa.representante} marcador="REPRESENTANTE LEGAL" />
            </Text>
            <Text>
              Suporte: <Campo valor={p.empresa.emailSuporte} marcador="E-MAIL DE SUPORTE" /> ·{" "}
              <Campo valor={p.empresa.telefoneSuporte} marcador="TELEFONE" />
            </Text>
          </View>
          <Text style={s.pequeno}>
            Esta proposta tem por base os valores da tabela vigente para a faixa de habitantes do município e o
            limite de dispensa por valor em vigor na data de emissão. Os documentos do kit de contratação são
            modelos e devem ser adaptados pela assessoria jurídica do Município.
          </Text>
        </View>
        <Rodape p={p} />
      </Page>
    </Document>
  );
}
