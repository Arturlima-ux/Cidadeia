export const SISTEMAS_DISPONIVEIS = [
  { chave: "portal_transparencia", label: "Portal da Transparência" },
  { chave: "esus", label: "E-SUS" },
  { chave: "receita", label: "Receita" },
  { chave: "siafi", label: "SIAFI" },
  { chave: "tce", label: "TCE" },
  { chave: "diario_oficial", label: "Diário Oficial" },
  { chave: "google_analytics", label: "Google Analytics" },
  { chave: "meta", label: "Meta" },
  { chave: "camara_municipal", label: "Câmara Municipal" },
  { chave: "ouvidoria", label: "Ouvidoria" },
  { chave: "compras_publicas", label: "Compras Públicas" },
] as const;

export const PROBLEMAS = [
  "Saúde",
  "Educação",
  "Licitações",
  "Receita",
  "Obras",
  "Transparência",
  "Todas",
] as const;
