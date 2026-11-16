// Regras de reserva compartilhadas entre a página do cliente e a agenda da casa.
// Valores padrão de demonstração: a casa ajusta tudo na agenda (Configurações).
export const PADRAO = {
  id: "reservas",
  sinalPorPessoa: 30,          // R$ por pessoa, abatido da conta
  janelaHoras: 6,              // cancelamento gratuito até X horas antes
  lugaresPorHorario: 40,       // capacidade por horário
  maxPessoas: 12,              // acima disso, a casa atende direto
  diasAntecedencia: 30,
  fechado: [],                 // dias da semana fechados (0 = domingo)
  turnos: [
    { nome: "Almoço", horarios: ["11:30", "12:00", "12:30", "13:00", "13:30", "14:00"] },
    { nome: "Jantar", horarios: ["18:30", "19:00", "19:30", "20:00", "20:30", "21:00", "21:30", "22:00"] },
  ],
};
export const OCASIOES = ["Sem ocasião", "Aniversário", "Encontro", "Negócios", "Comemoração"];
export const quando = r => new Date(`${r.data}T${r.hora}:00`);
export const limiteGratis = (r, cfg) => new Date(quando(r).getTime() - cfg.janelaHoras * 3600e3);
export const gratisAinda = (r, cfg, agora = Date.now()) => agora < limiteGratis(r, cfg).getTime();
export const ocupados = (lista, data, hora, ignorar) => lista.filter(r => r.data === data && r.hora === hora && r.id !== ignorar && (r.status === "confirmada" || r.status === "chegou")).reduce((a, r) => a + r.pessoas, 0);
export const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const dataLonga = s => new Date(s + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });
export const codigo = () => { const a = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; const v = crypto.getRandomValues(new Uint8Array(6)); return [...v].map(x => a[x % a.length]).join(""); };
