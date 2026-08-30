import { db } from "@/db";
import { usuarios } from "@/db/schema";
import { and, eq, isNotNull, or } from "drizzle-orm";
import { enviarEmail } from "./email";
import { linkApp } from "@/lib/url-app";

// Avisa por e-mail quem tem visão geral da prefeitura (prefeito/admin) quando
// um alerta urgente é criado — manualmente ou aprovado a partir de uma
// sugestão da IA. Nunca lança erro: notificação é um "nice to have", uma
// falha aqui não pode derrubar a criação do alerta em si.
export async function notificarAlertaUrgente(params: {
  prefeituraId: string;
  titulo: string;
  descricao?: string | null;
}) {
  try {
    const destinatarios = await db
      .select({ email: usuarios.email })
      .from(usuarios)
      .where(
        and(
          eq(usuarios.prefeituraId, params.prefeituraId),
          isNotNull(usuarios.email),
          or(eq(usuarios.cargo, "prefeito"), eq(usuarios.cargo, "admin"))
        )
      );

    if (destinatarios.length === 0) return;

    const html = `
      <p><strong>Novo alerta urgente registrado na CidadeIA.</strong></p>
      <p>${params.titulo}</p>
      ${params.descricao ? `<p>${params.descricao}</p>` : ""}
      <p><a href="${linkApp("/dashboard/alertas")}">Ver na plataforma</a></p>
    `;

    await Promise.all(
      destinatarios
        .filter((d): d is { email: string } => !!d.email)
        .map((d) =>
          enviarEmail({ para: d.email, assunto: `Alerta urgente — ${params.titulo}`, html })
        )
    );
  } catch (erro) {
    console.error("[notificacoes] Falha ao notificar alerta urgente:", erro);
  }
}
