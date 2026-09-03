import { describe, it, expect } from "vitest";
import { deveForcarHttps, ehEnderecoLocal } from "@/lib/forcar-https";

// A regra é curta, mas errar nela derruba o acesso inteiro — e foi o que
// aconteceu: `next start` respondia 308 para https://localhost:3000 em TODA
// rota, endereço onde não há TLS. O site parecia fora do ar sem nunca ter
// caído, e o diagnóstico levou meia hora.

describe("endereço local", () => {
  it("reconhece loopback", () => {
    expect(ehEnderecoLocal("localhost")).toBe(true);
    expect(ehEnderecoLocal("127.0.0.1")).toBe(true);
    expect(ehEnderecoLocal("127.1.2.3")).toBe(true);
    expect(ehEnderecoLocal("::1")).toBe(true);
    expect(ehEnderecoLocal("[::1]")).toBe(true);
    expect(ehEnderecoLocal("app.localhost")).toBe(true);
  });

  it("reconhece as três faixas privadas da RFC 1918", () => {
    // O 192.168.x.x é o endereço que o Next anuncia como "Network" para testar
    // do celular na mesma rede. Forçar HTTPS ali quebra justamente esse uso.
    expect(ehEnderecoLocal("192.168.100.15")).toBe(true);
    expect(ehEnderecoLocal("10.0.0.7")).toBe(true);
    expect(ehEnderecoLocal("172.16.0.1")).toBe(true);
    expect(ehEnderecoLocal("172.31.255.254")).toBe(true);
  });

  it("não confunde faixa pública com privada", () => {
    // 172.15 e 172.32 estão FORA da 172.16/12. Uma regex preguiçosa em
    // "172." trataria endereço público como local e desligaria o HTTPS de
    // quem precisa dele.
    expect(ehEnderecoLocal("172.15.0.1")).toBe(false);
    expect(ehEnderecoLocal("172.32.0.1")).toBe(false);
    expect(ehEnderecoLocal("cidadeia.vercel.app")).toBe(false);
    expect(ehEnderecoLocal("prefeitura.pi.gov.br")).toBe(false);
    // Nome que só CONTÉM "localhost" não é local.
    expect(ehEnderecoLocal("localhost.attacker.com")).toBe(false);
  });
});

describe("decisão de redirecionar", () => {
  const emProd = (proto: string | null, hostname: string) =>
    deveForcarHttps({ proto, hostname, ehProducao: true });

  it("redireciona domínio público servido por HTTP", () => {
    expect(emProd("http", "cidadeia.vercel.app")).toBe(true);
  });

  it("não redireciona quando já está em HTTPS", () => {
    expect(emProd("https", "cidadeia.vercel.app")).toBe(false);
  });

  it("não redireciona localhost — o bug que derrubou o teste local", () => {
    // `next start` roda com NODE_ENV=production e o servidor do Next preenche
    // x-forwarded-proto: http. Sem esta exceção, tudo vira 308 para um
    // https://localhost que ninguém atende.
    expect(emProd("http", "localhost")).toBe(false);
    expect(emProd("http", "127.0.0.1")).toBe(false);
    expect(emProd("http", "192.168.100.15")).toBe(false);
  });

  it("não redireciona quando ninguém informou o esquema", () => {
    // Sem o cabeçalho não dá para saber a origem, e mandar para HTTPS no chute
    // tira o app do ar quando o chute erra.
    expect(emProd(null, "cidadeia.vercel.app")).toBe(false);
  });

  it("nunca redireciona fora de produção", () => {
    expect(
      deveForcarHttps({ proto: "http", hostname: "cidadeia.vercel.app", ehProducao: false })
    ).toBe(false);
  });
});
