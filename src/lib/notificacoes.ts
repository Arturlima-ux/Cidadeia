import { db } from "@/db";
import { usuarios } from "@/db/schema";
import { and, eq, isNotNull, or } from "drizzle-orm";
import { enviarEmail } from "./email";
import { montarEmail } from "@/lib/email-modelo";
import { linkApp } from "@/lib/url-app";
import { repartirAvisos } from "@/lib/alerta-por-area";

// Avisa por e-mail quando um alerta urgente é criado — manualmente ou
// aprovado a partir de uma sugestão da IA: prefeito e administrador, e o
// secretário da área quando o alerta é de uma (lib/alerta-por-area.ts). Nunca lança erro: notificação é um "nice to have", uma
// falha aqui não pode derrubar a criação do alerta em si.
export async function notificarAlertaUrgente(params: {
  prefeituraId: string;
  titulo: string;
  descricao?: string | null;
  secretaria?: string | null;
}) {
  try {
    const pessoas = await db
      .select({ email: usuarios.email, cargo: usuarios.cargo, secretaria: usuarios.secretaria })
      .from(usuarios)
      .where(
        and(
          eq(usuarios.prefeituraId, params.prefeituraId),
          isNotNull(usuarios.email),
          or(eq(usuarios.cargo, "prefeito"), eq(usuarios.cargo, "admin"), eq(usuarios.cargo, "secretario"))
        )
      );
    const destinatarios = [
      ...repartirAvisos([{ secretaria: params.secretaria ?? null, prioridade: "urgente" }], pessoas).keys(),
    ];
    if (destinatarios.length === 0) return;

    const html = montarEmail({
      remetente: { tipo: "cidadeia" },
      previa: params.descricao ?? params.titulo,
      etiqueta: { texto: "Alerta urgente", tom: "urgente" },
      titulo: params.titulo,
      blocos: [
        params.descricao ? { destaque: params.descricao, tom: "urgente" } : null,
        { p: "Este alerta foi registrado agora no painel e pede uma decisão." },
        { botao: "Ver o alerta no painel", link: linkApp("/dashboard/alertas") },
      ],
      assinatura: null,
      motivo: "Você recebe os alertas urgentes da sua área no painel do CidadeIA.",
    });

    await Promise.all(
      destinatarios.map((para) => enviarEmail({ para, assunto: `Alerta urgente — ${params.titulo}`, html }))
    );
  } catch (erro) {
    console.error("[notificacoes] Falha ao notificar alerta urgente:", erro);
  }
}
