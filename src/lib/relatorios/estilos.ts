import { StyleSheet } from "@react-pdf/renderer";

export const estilos = StyleSheet.create({
  pagina: {
    padding: 40,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: "#1a1a1a",
  },
  cabecalho: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 24,
    borderBottom: "2 solid #1a5c35",
    paddingBottom: 12,
  },
  logo: {
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
    color: "#1a5c35",
  },
  metaCabecalho: {
    textAlign: "right",
    fontSize: 8,
    color: "#666",
  },
  tituloRelatorio: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    marginBottom: 2,
  },
  subtitulo: {
    fontSize: 10,
    color: "#666",
    marginBottom: 20,
  },
  secao: {
    marginBottom: 18,
  },
  tituloSecao: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: "#1a5c35",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  linhaCards: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 8,
  },
  card: {
    flex: 1,
    backgroundColor: "#f8f6f1",
    borderRadius: 4,
    padding: 10,
  },
  cardValor: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
  },
  cardLabel: {
    fontSize: 8,
    color: "#666",
    marginTop: 2,
  },
  tabela: {
    marginTop: 4,
  },
  linhaTabela: {
    flexDirection: "row",
    borderBottom: "1 solid #eee",
    paddingVertical: 5,
  },
  linhaTabelaCabecalho: {
    flexDirection: "row",
    borderBottom: "1 solid #1a5c35",
    paddingVertical: 5,
    fontFamily: "Helvetica-Bold",
  },
  colFlex: {
    flex: 1,
  },
  colFixa: {
    width: 70,
  },
  textoMuted: {
    color: "#666",
  },
  avisoVazio: {
    fontSize: 9,
    color: "#999",
    fontStyle: "italic",
    padding: 8,
  },
  rodape: {
    position: "absolute",
    bottom: 24,
    left: 40,
    right: 40,
    textAlign: "center",
    fontSize: 7,
    color: "#999",
    borderTop: "1 solid #eee",
    paddingTop: 8,
  },
  badgeUrgente: { color: "#b3261e" },
  badgeMedio: { color: "#96591a" },
  badgeInfo: { color: "#1a5c35" },
});

export function formatarMoeda(v: number | null | undefined) {
  if (v === null || v === undefined) return "não informado";
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function formatarDataHora(iso: string) {
  try {
    return new Date(iso).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}
