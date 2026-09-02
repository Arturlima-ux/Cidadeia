import { contextoDashboard } from "@/lib/contexto-dashboard";
import BloqueioPlano from "@/components/BloqueioPlano";
import MapaCidadeClient from "@/components/MapaCidadeClient";
import { montarPontosCidade } from "@/lib/pontos-cidade";
import { buscarUnidadesSaude } from "@/app/dashboard/secretarias/saude/actions";
import { buscarEscolas } from "@/app/dashboard/secretarias/educacao/actions";
import { buscarObras } from "@/app/dashboard/secretarias/obras/actions";

export const metadata = { title: "Mapa da cidade — CidadeIA" };

export default async function MapaPage() {
  const { sessao, prefeitura, temPlano, planosAtivos } = await contextoDashboard();
  if (!temPlano("gestao")) return <BloqueioPlano plano="gestao" />;

  // Só entra no mapa a camada que a prefeitura contratou. Mostrar o rótulo de
  // uma secretaria sem módulo daria a impressão de que os dados existem e
  // ninguém os cadastrou, quando na verdade a área nem faz parte do contrato.
  const [saude, escolas, obras] = await Promise.all([
    planosAtivos.includes("saude") ? buscarUnidadesSaude(sessao.prefeituraId) : Promise.resolve([]),
    planosAtivos.includes("educacao") ? buscarEscolas(sessao.prefeituraId) : Promise.resolve([]),
    planosAtivos.includes("obras") ? buscarObras(sessao.prefeituraId) : Promise.resolve([]),
  ]);

  const pontos = montarPontosCidade({ saude, escolas, obras });
  const atrasadas = pontos.filter((p) => p.emAtraso).length;

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-bold">Mapa de {prefeitura.municipio}</h1>
        <p className="text-muted text-sm mt-1.5 leading-relaxed max-w-2xl">
          Obras, escolas e unidades de saúde na mesma tela — porque o prefeito
          pensa o município por bairro, não por secretaria. Clique numa camada
          para escondê-la.
        </p>
      </div>

      {atrasadas > 0 && (
        <p
          className="text-sm rounded-lg px-4 py-3 leading-relaxed"
          style={{ background: "var(--urgente-tint)", color: "var(--urgente)" }}
        >
          {atrasadas} {atrasadas === 1 ? "obra está" : "obras estão"} mais de dez
          pontos abaixo do progresso previsto e {atrasadas === 1 ? "aparece" : "aparecem"} em
          vermelho no mapa.
        </p>
      )}

      <MapaCidadeClient pontos={pontos} />

      <p className="text-xs text-muted leading-relaxed">
        Só aparece o que tem latitude e longitude cadastradas. Item sem
        coordenada continua valendo nas telas da secretaria — apenas não dá para
        posicionar no mapa.
      </p>
    </div>
  );
}
