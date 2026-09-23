"use client";

// Imprimir é a única coisa que precisa de navegador nesta tela.
export default function BotaoImprimir() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="bg-brand hover:bg-brand-dark text-white text-sm font-semibold rounded-xl px-5 py-2.5 transition whitespace-nowrap"
    >
      Imprimir / salvar em PDF
    </button>
  );
}
