import SiteHeader from "@/components/site/SiteHeader";
import SiteFooter from "@/components/site/SiteFooter";
import Reveal from "@/components/site/Reveal";
import { IconCheck } from "@/components/icons";

export const metadata = {
  title: "Segurança & LGPD — CidadeIA",
};

const SEGURANCA = [
  {
    titulo: "Senhas nunca em texto puro",
    descricao: "Toda senha é armazenada com hash bcrypt (12 rounds) — mesmo nós não temos acesso à sua senha real.",
  },
  {
    titulo: "Sessão protegida",
    descricao: "O login usa cookies httpOnly assinados (JWT) — inacessíveis por JavaScript no navegador, o que reduz o risco de roubo de sessão.",
  },
  {
    titulo: "Isolamento entre prefeituras",
    descricao: "Cada consulta ao banco é filtrada pela prefeitura da sua sessão — uma prefeitura nunca acessa dado de outra, em nenhuma tela do sistema.",
  },
  {
    titulo: "Proteção contra tentativas de invasão",
    descricao: "O login bloqueia temporariamente após várias tentativas erradas seguidas, pra dificultar ataques de força bruta.",
  },
  {
    titulo: "Banco de dados hospedado com criptografia",
    descricao: "Os dados ficam num banco Postgres gerenciado (Supabase), com conexão criptografada entre a aplicação e o banco.",
  },
  {
    titulo: "IA sem acesso irrestrito",
    descricao: "A IA só recebe os dados que a própria pessoa já tem permissão de ver — um secretário nunca expõe à IA dados de outra secretaria ou do financeiro geral.",
  },
];

export default function SobrePage() {
  return (
    <div className="tema-noite min-h-screen">
      <SiteHeader />

      <Reveal>
        <section className="max-w-2xl mx-auto px-4 sm:px-8 pt-16 pb-8 text-center">
          <h1 className="font-serif text-4xl font-bold">Segurança & LGPD</h1>
          <p className="text-muted text-base mt-4 leading-relaxed">
            Dado de gestão pública é sensível. Aqui está, sem enrolação, como ele é
            tratado dentro do CidadeIA.
          </p>
        </section>
      </Reveal>

      <section className="max-w-3xl mx-auto px-4 sm:px-8 pb-16">
        <div className="grid sm:grid-cols-2 gap-4">
          {SEGURANCA.map((s, i) => (
            <Reveal key={s.titulo} delay={(i % 2) * 90}>
              <div className="bg-card border border-border rounded-xl p-5 flex gap-3 h-full">
                <IconCheck className="w-5 h-5 text-brand shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-sm">{s.titulo}</p>
                  <p className="text-sm text-muted mt-1 leading-relaxed">{s.descricao}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <Reveal>
        <section className="max-w-2xl mx-auto px-4 sm:px-8 pb-20">
          <h2 className="font-serif text-2xl font-bold mb-4">Seus direitos (LGPD)</h2>
          <div className="bg-card border border-border rounded-2xl p-6 space-y-4 text-sm text-muted leading-relaxed">
            <p>
              Seus dados pessoais (nome, e-mail, celular, foto de perfil) são usados só
              para você acessar e usar o sistema — nunca vendidos ou compartilhados com
              terceiros.
            </p>
            <p>
              Seu e-mail é usado exclusivamente pra recuperação de senha e, se um
              alerta urgente for registrado, pra avisar você — nada de marketing sem
              você pedir.
            </p>
            <p>
              Você pode a qualquer momento editar seus dados em "Minha Conta", ou
              solicitar exportação/exclusão dos seus dados falando com o nosso
              suporte.
            </p>
          </div>
        </section>
      </Reveal>

      <SiteFooter />
    </div>
  );
}
