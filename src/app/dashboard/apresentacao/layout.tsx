/**
 * O telão ignora o layout do painel de propósito.
 *
 * Menu lateral, cabeçalho e navegação existem para quem opera o sistema. Numa
 * projeção no gabinete ou numa sessão da câmara não há operador — e cada
 * elemento de interface na tela é espaço roubado do número que a sala precisa
 * enxergar do fundo.
 */
export default function LayoutApresentacao({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-background">{children}</div>;
}
