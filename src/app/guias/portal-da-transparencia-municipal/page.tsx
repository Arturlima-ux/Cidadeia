import Link from "next/link";
import GuiaArtigo from "@/components/site/GuiaArtigo";
import { guiaPor } from "@/lib/guias";
import { LEIS } from "@/lib/links-oficiais";
import { metadadosDoGuia } from "../metadados";

const SLUG = "portal-da-transparencia-municipal";
export const metadata = metadadosDoGuia(SLUG);

export default function GuiaPortalDaTransparencia() {
  const guia = guiaPor(SLUG)!;
  return (
    <GuiaArtigo
      guia={guia}
      fontes={[
        { rotulo: `${LEIS.lrf.nome} (${LEIS.lrf.numero}), arts. 48, 48-A e 73-C`, href: LEIS.lrf.url },
        { rotulo: `${LEIS.lai.nome} (${LEIS.lai.numero}), art. 8º`, href: LEIS.lai.url },
        { rotulo: `${LEIS.lei14133.nome} (${LEIS.lei14133.numero}), art. 94`, href: LEIS.lei14133.url },
      ]}
    >
      <p>
        Duas leis decidem o que o portal da transparência da prefeitura precisa ter. A{" "}
        <strong>Lei de Responsabilidade Fiscal</strong> manda mostrar a execução do orçamento em tempo real, e a{" "}
        <strong>Lei de Acesso à Informação</strong> manda publicar no site, sem que ninguém peça, um conjunto mínimo
        de informações. A primeira tem sanção financeira própria; é por ela que se começa.
      </p>

      <h2>Receita e despesa em tempo real (LRF)</h2>
      <p>
        A LRF exige a liberação, em tempo real, de informações pormenorizadas sobre a execução orçamentária e
        financeira, em meio eletrônico de acesso público (art. 48, § 1º, II). O art. 48-A diz o mínimo:
      </p>
      <div className="guia-tabela">
        <table>
          <thead>
            <tr>
              <th scope="col">Lado</th>
              <th scope="col">O que tem de aparecer</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Despesa</td>
              <td>
                Cada ato da execução da despesa, no momento em que acontece, com pelo menos o número do processo, o bem
                fornecido ou o serviço prestado, quem recebeu o pagamento e, quando houver, a licitação feita
              </td>
            </tr>
            <tr>
              <td>Receita</td>
              <td>O lançamento e o recebimento de toda a receita, inclusive a extraordinária</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>
        &ldquo;Tempo real&rdquo; tem definição em decreto federal (Decreto 10.540/2020): até o primeiro dia útil
        seguinte ao registro contábil. Na prática, o portal precisa sair direto do sistema contábil da prefeitura,
        e não de planilha montada no fim do mês.
      </p>
      <p>
        <strong>A sanção:</strong> o município que não cumpre os arts. 48 e 48-A fica impedido de receber
        transferências voluntárias (art. 73-C, que remete ao art. 23, § 3º, I).
      </p>

      <h2>O que a LAI pede no site</h2>
      <p>
        A LAI obriga a divulgar em local de fácil acesso, independentemente de pedido, as informações de interesse
        coletivo (art. 8º), e diz que o site oficial é obrigatório (§ 2º). Entre os itens que o § 1º lista:
      </p>
      <ul>
        <li>competências, estrutura organizacional, endereços, telefones e horários de atendimento;</li>
        <li>repasses e transferências de recursos;</li>
        <li>despesas;</li>
        <li>licitações, com editais e resultados, e todos os contratos celebrados;</li>
        <li>dados para acompanhar programas, ações, projetos e obras;</li>
        <li>respostas às perguntas mais frequentes da sociedade.</li>
      </ul>
      <p>
        O site precisa ter busca, permitir baixar os dados em formato aberto, manter as informações atualizadas e
        ser acessível a pessoas com deficiência (§ 3º). Os contratos e editais também vão ao Portal Nacional de
        Contratações Públicas: a publicação no PNCP é condição para o contrato ter eficácia (Lei 14.133, art. 94).
      </p>

      <h2>Cidades com até 10 mil habitantes</h2>
      <p>
        O município com <strong>até 10 mil habitantes</strong> fica dispensado da divulgação obrigatória na internet
        do § 2º da LAI, mas <strong>continua obrigado</strong> a divulgar em tempo real a execução orçamentária e
        financeira da LRF (LAI, art. 8º, § 4º). A dispensa vale para o rol da LAI, não para o portal da LRF.
      </p>

      <h2>O que o CidadeIA faz e o que não faz</h2>
      <p>
        O portal de execução em tempo real sai do sistema contábil da prefeitura, e o CidadeIA não o substitui. O
        que o módulo <Link href="/modulos/essencial">Essencial</Link> entrega é o lado do cidadão: um portal com
        endereço próprio da cidade, a Carta de Serviços, a ouvidoria com protocolo e os prazos da LAI e da Lei
        13.460 contados sozinhos (veja o{" "}
        <Link href="/guias/prazo-lai-ouvidoria">prazo de resposta da LAI e da ouvidoria</Link>). O{" "}
        <Link href="/raio-x">Raio-X</Link> mostra se o RREO e o RGF da prefeitura constam entregues no Tesouro.
      </p>
    </GuiaArtigo>
  );
}
