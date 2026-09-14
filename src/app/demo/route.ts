import { redirect } from "next/navigation";
import { criarSessao } from "@/lib/sessao";
import { garantirPrefeituraDemo, ID_PREFEITURA_DEMO, ID_USUARIO_DEMO } from "@/lib/demo/prefeitura-demo";

// ── ENTRAR NA DEMONSTRAÇÃO ──
// Um clique, sem cadastro. Garante a prefeitura fictícia (cria ou recria
// se envelheceu), abre uma sessão marcada como demo e manda para o painel
// real. Tudo que gravaria é recusado pelo proxy a partir daqui.
//
// Route Handler, e não Server Action: precisa gravar cookie e redirecionar
// a partir de um link simples, sem JavaScript.

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await garantirPrefeituraDemo();
  } catch (e) {
    console.error("[demo] falha ao preparar a prefeitura de demonstração:", e);
    redirect("/precos?demo=indisponivel");
  }
  await criarSessao({
    usuarioId: ID_USUARIO_DEMO,
    prefeituraId: ID_PREFEITURA_DEMO,
    nome: "Ana Ribeiro",
    cargo: "prefeito",
    demo: true,
  });
  redirect("/dashboard");
}
