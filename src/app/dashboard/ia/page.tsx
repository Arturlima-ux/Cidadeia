import ChatIA from "./ChatIA";

export default function IACentralPage() {
  return (
    <div className="max-w-3xl h-full flex flex-col">
      <div className="mb-4">
        <h1 className="font-serif text-2xl font-bold">IA Central</h1>
        <p className="text-muted text-sm mt-1.5">
          Analisa os dados reais já registrados no seu painel — indicadores
          financeiros, alertas, saúde, educação, obras e licitações. Ainda não
          tem acesso a E-SUS, SIAFI, TCE ou outros sistemas externos — isso
          exige integração direta com cada sistema, com credenciais que só a
          prefeitura pode liberar.
        </p>
      </div>
      <ChatIA />
    </div>
  );
}
