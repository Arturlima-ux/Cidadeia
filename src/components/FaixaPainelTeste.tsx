import { voltarParaMesa } from "@/app/admin/teste/actions";

// Aparece no topo do painel quando a equipe está na prefeitura de teste:
// lembra onde se está e leva de volta à mesa num clique.
export default function FaixaPainelTeste() {
  return (
    <div
      className="border-b px-4 sm:px-8 py-2.5 flex flex-wrap items-center justify-between gap-x-6 gap-y-1 text-sm"
      style={{ background: "var(--brand-tint)", borderColor: "var(--border)" }}
    >
      <p>
        <span className="font-medium">Painel de teste da equipe.</span>{" "}
        <span className="text-muted">Não é cliente: pode cadastrar e apagar à vontade.</span>
      </p>
      <form action={voltarParaMesa}>
        <button className="text-brand-claro hover:underline">Voltar à mesa</button>
      </form>
    </div>
  );
}
