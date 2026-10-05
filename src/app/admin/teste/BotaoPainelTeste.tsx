import { abrirPainelDeTeste } from "./actions";

export default function BotaoPainelTeste() {
  return (
    <form action={abrirPainelDeTeste}>
      <button className="text-sm font-medium rounded-full border border-border px-4 py-1.5 hover:border-brand transition">
        Painel de teste
      </button>
    </form>
  );
}
