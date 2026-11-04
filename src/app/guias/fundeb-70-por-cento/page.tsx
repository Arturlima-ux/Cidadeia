import Link from "next/link";
import GuiaArtigo from "@/components/site/GuiaArtigo";
import { guiaPor } from "@/lib/guias";
import { LEIS } from "@/lib/links-oficiais";
import { MINIMOS } from "@/lib/minimos-constitucionais";
import { metadadosDoGuia } from "../metadados";

const SLUG = "fundeb-70-por-cento";
export const metadata = metadadosDoGuia(SLUG);

export default function GuiaFundeb70() {
  const guia = guiaPor(SLUG)!;
  const piso = MINIMOS.fundeb.percentual;
  return (
    <GuiaArtigo
      guia={guia}
      fontes={[
        { rotulo: `${LEIS.constituicao.nome}, art. 212-A, XI`, href: LEIS.constituicao.url },
        { rotulo: `${LEIS.fundeb.nome} (${LEIS.fundeb.numero}), arts. 25 e 26`, href: LEIS.fundeb.url },
      ]}
    >
      <p>
        O Fundeb tem um piso próprio, que não se confunde com os 25% da educação: pelo menos{" "}
        <strong>{piso}% do que o município recebe do Fundeb no ano</strong> tem de ir para a{" "}
        <strong>remuneração dos profissionais da educação básica em efetivo exercício</strong> (Constituição, art.
        212-A, XI, e Lei 14.113/2020, art. 26). A prefeitura pode cumprir os 25% com folga e mesmo assim ficar
        abaixo deste piso, porque aqui a pergunta não é quanto foi para o ensino, e sim quanto do Fundeb virou
        salário.
      </p>

      <h2>O que mudou em 2021</h2>
      <p>
        No Fundeb antigo o piso era de 60% e valia para os <strong>profissionais do magistério</strong>. A Emenda
        Constitucional 108/2020 e a Lei 14.113/2020 subiram o piso para {piso}% e alargaram quem conta: agora são os{" "}
        <strong>profissionais da educação básica</strong>, o que inclui, além dos professores, quem trabalha na
        escola em suporte pedagógico, direção, apoio técnico e administrativo, nos termos do art. 26, § 1º. É o erro
        mais comum de quem aprendeu a regra antiga: aplicar o percentual velho, ou contar só o magistério.
      </p>

      <h2>A base da conta</h2>
      <div className="guia-tabela">
        <table>
          <thead>
            <tr>
              <th scope="col">Entra na base</th>
              <th scope="col">Fica fora da base</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                Os recursos anuais totais recebidos do Fundeb, inclusive a complementação da União nas modalidades
                VAAF e VAAT
              </td>
              <td>
                A complementação VAAR, a parcela por resultado, que a lei exclui expressamente da base dos {piso}%
                (art. 26, caput, remetendo ao art. 5º, III)
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>
        Remuneração, para esta conta, é o total pago ao profissional, com os encargos sociais da prefeitura (art.
        26, § 1º). O efetivo exercício admite os afastamentos temporários previstos em lei, pagos pela prefeitura,
        que não rompem o vínculo.
      </p>

      <h2>Os 10% que passam para o ano seguinte</h2>
      <p>
        Até <strong>10% dos recursos recebidos à conta do Fundeb</strong> podem ser usados no{" "}
        <strong>primeiro quadrimestre do ano seguinte</strong>, com abertura de crédito adicional (Lei 14.113, art.
        25, § 3º). Sobra maior que 10% em dezembro já descumpre essa regra, mesmo com os {piso}% atingidos.
      </p>

      <h2>Acompanhar durante o ano</h2>
      <p>
        O Fundeb também aparece no RREO, no Anexo 8, junto com a manutenção e desenvolvimento do ensino (veja{" "}
        <Link href="/guias/minimo-saude-educacao">os mínimos de saúde e educação</Link>). No sistema, o módulo{" "}
        <Link href="/modulos/gestao">Gestão</Link> acompanha os {piso}% com a base e o valor pago informados pela
        prefeitura, e o módulo <Link href="/modulos/educacao">Educação</Link> mostra a matrícula declarada ao Censo
        Escolar convertida em reais de Fundeb. O demonstrativo oficial continua sendo do contador.
      </p>
    </GuiaArtigo>
  );
}
