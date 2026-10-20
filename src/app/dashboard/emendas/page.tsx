import { contextoDashboard } from "@/lib/contexto-dashboard";
import BloqueioPlano from "@/components/BloqueioPlano";
import FaixaExemplo from "@/components/FaixaExemplo";
import { ehGestor } from "@/lib/sessao";
import { formatarMoeda } from "@/lib/formatadores";
import { achadosDasEmendas, resumirEmendas, temRelatorioFinal, type Emenda } from "@/lib/emendas-pix";
import { lerEmendas } from "@/lib/emendas-pix-servidor";
import { emendasDeExemplo } from "@/lib/emendas-pix-exemplo";
import { dataDoBanco } from "@/lib/data-do-banco";
import BotaoAtualizar from "./BotaoAtualizar";

export const metadata = { title: "Emendas Pix" };

const data = (iso: string | null) => (iso ? iso.split("-").reverse().join("/") : "—");

const COR = { urgente: "var(--urgente)", medio: "var(--medio)", info: "var(--info)" } as const;

function Linha({ e, hoje }: { e: Emenda; hoje: Date }) {
  const alertas = achadosDasEmendas([e], hoje);
  return (
    <li className="bg-card border border-border rounded-xl p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-muted">
            {e.ano ?? "Ano não informado"}
            {e.parlamentar ? ` · ${e.parlamentar}` : ""}
            {e.area ? ` · ${e.area}` : ""}
          </p>
          <p className="font-medium text-sm mt-1 break-words">{e.objeto ?? "Objeto não informado no Transferegov"}</p>
        </div>
        <p className="text-lg font-semibold tabular-nums whitespace-nowrap">{formatarMoeda(e.valor)}</p>
      </div>
      <div className="grid sm:grid-cols-3 gap-x-4 gap-y-1 text-xs text-muted mt-3">
        <p>Situação: <span className="text-foreground">{e.situacao ?? "—"}</span></p>
        <p>Execução até: <span className="text-foreground">{data(e.planoTrabalho?.fim ?? null)}</span></p>
        <p>
          Relatório final:{" "}
          <span className="text-foreground">{temRelatorioFinal(e) ? "enviado" : e.relatorios.length ? "só parcial" : "nenhum"}</span>
        </p>
      </div>
      {alertas.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {alertas.map((a) => (
            <li key={a.chave} className="text-xs flex gap-2">
              <span className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ background: COR[a.prioridade] }} />
              <span>
                <strong style={{ color: COR[a.prioridade] }}>{a.titulo.replace(/^Emenda Pix[^:]*:\s*/, "")}</strong>
              </span>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

export default async function EmendasPage() {
  const ctx = await contextoDashboard();
  if (!ctx.temPlano("gestao")) return <BloqueioPlano plano="gestao" />;
  const hoje = new Date();

  const lido = ctx.sessao.demo ? null : await lerEmendas(ctx.sessao.prefeituraId);
  const exemplo = !lido;
  const emendas = lido?.emendas ?? emendasDeExemplo(hoje);
  const resumo = resumirEmendas(emendas, hoje);
  const gestor = ehGestor(ctx.sessao) && !ctx.sessao.demo;

  const corpo = (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { n: String(resumo.quantidade), r: "emendas nos últimos 4 anos" },
          { n: formatarMoeda(resumo.total), r: "recebido ou a receber" },
          { n: String(resumo.porAno[0]?.quantidade ?? 0), r: `em ${resumo.porAno[0]?.ano ?? hoje.getFullYear()}` },
          { n: String(resumo.comPendencia), r: "com pendência" },
        ].map((c) => (
          <div key={c.r} className="bg-card border border-border rounded-xl p-4">
            <p className="text-xl font-semibold tabular-nums">{c.n}</p>
            <p className="text-xs text-muted mt-1">{c.r}</p>
          </div>
        ))}
      </div>
      {emendas.length ? (
        <ul className="space-y-3">
          {emendas.map((e) => (
            <Linha key={e.id} e={e} hoje={hoje} />
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted bg-card border border-border rounded-xl p-5">
          O Transferegov não tem emendas Pix para o CNPJ da prefeitura nos últimos quatro anos.
        </p>
      )}
    </div>
  );

  return (
    <div className="max-w-4xl space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-[-0.02em]">Emendas Pix</h1>
          <p className="text-muted text-sm mt-1.5 leading-relaxed max-w-2xl">
            As transferências especiais que caíram direto na conta da prefeitura: de quem veio, para quê, até quando
            executar e se o relatório de gestão foi enviado. Lido sozinho no Transferegov toda semana; o que vencer vira
            alerta no painel e e-mail para o prefeito.
          </p>
          {lido && (
            <p className="text-xs text-muted mt-2">
              Última leitura: {dataDoBanco(lido.conferidoEm).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}
            </p>
          )}
        </div>
        {gestor && <BotaoAtualizar />}
      </div>
      {exemplo ? <FaixaExemplo>{corpo}</FaixaExemplo> : corpo}
    </div>
  );
}
