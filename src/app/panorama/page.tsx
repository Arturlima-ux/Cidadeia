import Link from "next/link";
import SiteHeader from "@/components/site/SiteHeader";
import SiteFooter from "@/components/site/SiteFooter";
import Olho from "@/components/site/Olho";
import BarrasPanorama from "@/components/site/BarrasPanorama";
import PecaUmaLigacao from "@/components/site/PecaUmaLigacao";
import { linkWhatsappComercial } from "@/lib/contato-comercial";
import { NOME_DOS_ESTADOS, type Estado } from "@/lib/estados";
import {
  PANORAMA,
  dataDoPanorama,
  fracao,
  numeroBr,
  passaramDoAlerta,
  umaEmCada,
} from "@/lib/panorama";
import { compartilhamento } from "@/lib/seo";
import { registrarEvento } from "@/lib/registrar-evento";

// ── O PANORAMA: AUTORIDADE QUE QUALQUER UM CONFERE ──
//
// Uma empresa nova não tem logo de cliente para mostrar. Tem o que nenhuma
// outra mostra: o RGF de todas as prefeituras do país conferido toda semana,
// com data e fonte. Esta página é esse retrato, nacional e por estado.
//
// Só agregados. Nenhuma cidade é citada pelo nome: expor prefeitura aqui
// seria constranger o futuro cliente. Cada uma se vê no próprio Raio-X.

export const metadata = compartilhamento({
  titulo: "Panorama da despesa com pessoal das prefeituras",
  descricao:
    "Quantas prefeituras estão no alerta, no limite prudencial e acima do limite da LRF, por estado. RGF de cada prefeitura conferido toda semana no Tesouro Nacional.",
  caminho: "/panorama",
});

export default async function PanoramaPage() {
  await registrarEvento({ tipo: "visita", caminho: "/panorama" });
  const b = PANORAMA.brasil;
  const passaram = passaramDoAlerta(b);
  const fracaoTexto = umaEmCada(passaram, b);
  const ufs = Object.entries(PANORAMA.porUf).sort(([a], [z]) =>
    NOME_DOS_ESTADOS[a as Estado].localeCompare(NOME_DOS_ESTADOS[z as Estado], "pt-BR")
  );

  return (
    <div className="tema-noite min-h-screen overflow-x-clip">
      <SiteHeader />
      <main id="conteudo">
        <section className="max-w-[1200px] mx-auto px-4 sm:px-8 pt-14 sm:pt-24 pb-12">
          <Olho>Panorama · atualizado toda semana</Olho>
          <h1 className="titulo-pagina mt-5 max-w-[20ch]">
            {numeroBr(passaram)} prefeituras já passaram do sinal de alerta da LRF.
          </h1>
          <p className="mt-6 text-lg text-muted leading-relaxed max-w-[62ch]">
            {fracaoTexto ? `É ${fracaoTexto} das que têm o número publicado. ` : ""}
            Toda semana o CidadeIA lê no Tesouro Nacional o Relatório de Gestão Fiscal mais recente de cada uma das{" "}
            {numeroBr(b.municipios)} prefeituras do país e confere a despesa com pessoal contra os limites da Lei de
            Responsabilidade Fiscal. Última conferência: {dataDoPanorama()}.
          </p>
        </section>

        <section className="max-w-[1200px] mx-auto px-4 sm:px-8 pb-16">
          <BarrasPanorama comLinks={false} />
        </section>

        <section className="max-w-[1200px] mx-auto px-4 sm:px-8 pb-16 sm:pb-24">
          <h2 className="inicio-h2 max-w-[18ch]">Estado por estado.</h2>
          <p className="text-muted mt-4 max-w-[60ch] leading-relaxed">
            Percentual sobre as prefeituras do estado com o RGF publicado. O Distrito Federal fica de fora: segue os
            limites de estado, não os de município.
          </p>
          <div className="mt-8 overflow-x-auto rounded-2xl border border-border">
            <table className="w-full min-w-[720px] text-sm tabular-nums">
              <thead style={{ background: "var(--superficie)" }}>
                <tr className="text-left text-muted">
                  <th className="px-4 py-3 font-medium">Estado</th>
                  <th className="px-4 py-3 font-medium text-right">Com RGF</th>
                  <th className="px-4 py-3 font-medium text-right">Alerta</th>
                  <th className="px-4 py-3 font-medium text-right">Prudencial</th>
                  <th className="px-4 py-3 font-medium text-right">Acima do limite</th>
                  <th className="px-4 py-3 font-medium text-right">Passaram do alerta</th>
                  <th className="px-4 py-3 font-medium text-right">RGF atrasado</th>
                </tr>
              </thead>
              <tbody>
                {ufs.map(([uf, c]) => (
                  <tr key={uf} className="border-t border-border">
                    <td className="px-4 py-3">
                      <Link href={`/raio-x/${uf.toLowerCase()}`} className="hover:text-brand transition">
                        {NOME_DOS_ESTADOS[uf as Estado]}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-right text-muted">
                      {numeroBr(c.comNumero)} de {numeroBr(c.municipios)}
                    </td>
                    <td className="px-4 py-3 text-right">{numeroBr(c.alerta)}</td>
                    <td className="px-4 py-3 text-right">{numeroBr(c.prudencial)}</td>
                    <td className="px-4 py-3 text-right">{numeroBr(c.acimaDoLimite)}</td>
                    <td className="px-4 py-3 text-right font-semibold">{fracao(passaramDoAlerta(c), c)}</td>
                    <td className="px-4 py-3 text-right">{numeroBr(c.rgfAtrasado)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-muted">Clique no estado para ver o Raio-X de cada município dele.</p>
        </section>

        <section className="border-t border-border" style={{ background: "var(--superficie)" }}>
          <div className="max-w-[1200px] mx-auto px-4 sm:px-8 py-16 sm:py-20 grid lg:grid-cols-2 gap-10 lg:gap-16">
            <div>
              <h2 className="inicio-h2 max-w-[16ch]">Como a conferência é feita.</h2>
            </div>
            <ul className="grid gap-5 text-muted leading-relaxed">
              <li>
                <span className="text-foreground font-medium">A fonte é o Tesouro Nacional.</span> O número é o que cada
                prefeitura declarou no RGF enviado ao Siconfi, comum ou simplificado. O CidadeIA não estima nem
                corrige nada.
              </li>
              <li>
                <span className="text-foreground font-medium">Vale o relatório mais recente.</span> Quando o último RGF
                traz números que não fecham (despesa maior que a receita, por exemplo), ele é contado à parte e a faixa
                usa o relatório anterior.
              </li>
              <li>
                <span className="text-foreground font-medium">“RGF atrasado”</span> é a prefeitura cujo relatório
                seguinte já passou do prazo de 30 dias da LRF e ainda não consta entregue no extrato do Tesouro.
              </li>
              <li>
                <span className="text-foreground font-medium">Nenhuma cidade é citada aqui.</span> O dado de cada uma
                está aberto no Raio-X dela, sem cadastro.
              </li>
            </ul>
          </div>
        </section>

        <section className="max-w-[1200px] mx-auto px-4 sm:px-8 py-16 sm:py-24">
          <div className="grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] gap-10 lg:gap-16 items-start">
            <div>
              <h2 className="inicio-h2 max-w-[16ch]">E a sua prefeitura?</h2>
              <p className="text-muted mt-5 leading-relaxed max-w-[44ch]">
                O Raio-X mostra o número que ela declarou, sem cadastro. Com o módulo Gestão, a conferência passa a
                ser diária, e o aviso chega ao prefeito antes do prazo e antes do Tribunal de Contas.
              </p>
              <div className="mt-7 flex flex-wrap items-center gap-x-8 gap-y-4">
                <Link
                  href="/raio-x"
                  className="elevar inline-block bg-brand hover:bg-brand-dark text-white font-semibold rounded-full px-7 py-3.5"
                >
                  Ver o Raio-X da minha cidade
                </Link>
                <Link href="/proposta?modulos=gestao" className="inicio-sublinhado text-muted">
                  Receber a proposta
                </Link>
              </div>
            </div>
            <div id="atendimento" className="scroll-mt-24">
              <PecaUmaLigacao
                origem="Panorama"
                linkWhatsapp={linkWhatsappComercial("Olá! Vi o panorama do CidadeIA e queria conversar sobre a minha prefeitura.")}
              />
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
