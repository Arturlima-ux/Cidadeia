import Link from "next/link";
import HidratarAoChegar from "@/components/site/inicio/HidratarAoChegar";
import VideoExplicativo from "@/components/site/VideoExplicativo";
import CapitulosDoVideo from "@/components/site/inicio/CapitulosDoVideo";
import MontadorProposta from "@/components/site/MontadorProposta";
import { CONTATO_PUBLICO } from "@/lib/contato-comercial";
import { AVISO_FRACIONAMENTO, LIMITE_DISPENSA } from "@/lib/contratacao";
import { formatarMoedaExata } from "@/lib/formatadores";

// As peças que funcionam igual nas três estruturas: o vídeo com capítulos, o
// montador da proposta e as três respostas de confiança. Cada estrutura veste
// essas peças do seu jeito; o comportamento é um só.

export type CidadeDoMontador = { nome: string; uf: string } | undefined;

export function Video({ id = "video-cidadeia" }: { id?: string }) {
  return (
    <>
      <HidratarAoChegar id={`video-${id}`}>
        <VideoExplicativo
          id={id}
          src="/video/cidadeia-gestao-brasa.mp4"
          srcWebm="/video/cidadeia-gestao-brasa.webm"
          capa="/video/cidadeia-gestao-brasa-capa.jpg"
          titulo="O CidadeIA em 30 segundos: a gestão municipal inteira num lugar só, do gabinete ao celular do morador."
        />
      </HidratarAoChegar>
      <CapitulosDoVideo idVideo={id} />
    </>
  );
}

export function Montador({ cidade, chave }: { cidade: CidadeDoMontador; chave: string }) {
  return (
    <div id="montar-proposta" className="min-w-0 scroll-mt-24">
      <HidratarAoChegar id="montador">
        <MontadorProposta key={chave} resumoSobConsulta municipioInicial={cidade} />
      </HidratarAoChegar>
    </div>
  );
}

export function LinhaDaDispensa() {
  return (
    <>
      Cabe na dispensa por valor, até {formatarMoedaExata(LIMITE_DISPENSA.valor)} por ano ({LIMITE_DISPENSA.base}). {AVISO_FRACIONAMENTO.curto}{" "}
      <Link href="/como-contratar" className="underline underline-offset-2">Como contratar</Link>
    </>
  );
}

export const CONFIANCA = [
  { titulo: "Piloto sem custo", texto: "As primeiras prefeituras usam antes de contratar.", link: { href: "/fale-conosco", rotulo: "Pedir um piloto" } },
  { titulo: "Quem responde", texto: `A Equipe CidadeIA, em ${CONTATO_PUBLICO}. A proposta chega em um dia útil.` },
  { titulo: "Ao lado do contador", texto: "O CidadeIA confere e avisa. Quem lança e assina continua sendo a contabilidade da prefeitura." },
] as const;

export function Confianca({ className }: { className?: string }) {
  return (
    <dl className={className}>
      {CONFIANCA.map((c) => (
        <div key={c.titulo}>
          <dt>{c.titulo}</dt>
          <dd>
            {c.texto}{" "}
            {"link" in c && c.link && (
              <Link href={c.link.href} className="underline underline-offset-2">
                {c.link.rotulo}
              </Link>
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}
