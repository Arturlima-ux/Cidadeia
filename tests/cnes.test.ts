import { describe, it, expect } from "vitest";
import { codigoMunicipioCnes, tipoDoCodigo, interessaAoMunicipio, paraUnidade, diasSemAtualizarNoCnes, NOME_TIPO_UNIDADE, type EstabelecimentoCnes } from "@/lib/cnes";
import { situacaoDaUnidade, diasAberta, rotuloOcorrencia } from "@/lib/ocorrencias-saude";

const base: EstabelecimentoCnes = {
  codigo_cnes: 2365707,
  nome_fantasia: "UBS 1 DE BERTOLINIA",
  nome_razao_social: "SMS DE BERTOLINIA",
  codigo_tipo_unidade: 2,
  descricao_esfera_administrativa: "MUNICIPAL",
  endereco_estabelecimento: "RUA DA MATRIZ",
  numero_estabelecimento: "120",
  bairro_estabelecimento: "CENTRO",
  numero_telefone_estabelecimento: null,
  latitude_estabelecimento_decimo_grau: -7.65,
  longitude_estabelecimento_decimo_grau: -43.95,
  descricao_turno_atendimento: "ATENDIMENTOS NOS TURNOS DA MANHA E A TARDE",
  estabelecimento_faz_atendimento_ambulatorial_sus: "SIM",
  estabelecimento_possui_atendimento_hospitalar: 0,
  estabelecimento_possui_centro_cirurgico: 0,
  estabelecimento_possui_centro_obstetrico: 0,
  data_atualizacao: "2026-01-30",
};

describe("rede pelo CNES", () => {
  it("o código do município no CNES é o IBGE sem o dígito verificador", () => {
    expect(codigoMunicipioCnes("2201705")).toBe("220170");
  });

  it("mapeia os tipos que importam e cai em 'outro' no resto", () => {
    expect(tipoDoCodigo(2)).toBe("ubs");
    expect(tipoDoCodigo(1)).toBe("posto");
    expect(tipoDoCodigo(5)).toBe("hospital");
    expect(tipoDoCodigo(15)).toBe("hospital");
    expect(tipoDoCodigo(73)).toBe("upa");
    expect(tipoDoCodigo(70)).toBe("caps");
    expect(tipoDoCodigo(999)).toBe("outro");
    expect(tipoDoCodigo(null)).toBe("outro");
    for (const k of Object.keys(NOME_TIPO_UNIDADE)) expect(NOME_TIPO_UNIDADE[k as keyof typeof NOME_TIPO_UNIDADE].length).toBeGreaterThan(2);
  });

  it("entra o municipal, o que atende SUS e o hospitalar; clínica privada sem SUS fica de fora", () => {
    expect(interessaAoMunicipio(base)).toBe(true);
    expect(interessaAoMunicipio({ ...base, descricao_esfera_administrativa: "PRIVADA", estabelecimento_faz_atendimento_ambulatorial_sus: "NAO" })).toBe(false);
    expect(interessaAoMunicipio({ ...base, descricao_esfera_administrativa: "PRIVADA", estabelecimento_faz_atendimento_ambulatorial_sus: "SIM" })).toBe(true);
    expect(interessaAoMunicipio({ ...base, descricao_esfera_administrativa: "PRIVADA", estabelecimento_faz_atendimento_ambulatorial_sus: "NAO", estabelecimento_possui_atendimento_hospitalar: 1 })).toBe(true);
  });

  it("converte a linha do CNES em unidade legível", () => {
    const u = paraUnidade(base);
    expect(u.codigoCnes).toBe("2365707");
    expect(u.nome).toBe("UBS 1 de Bertolinia");
    expect(u.tipo).toBe("ubs");
    expect(u.endereco).toBe("RUA DA MATRIZ, 120");
    expect(u.bairro).toBe("Centro");
    expect(u.turno).toBe("Atendimentos nos turnos da manha e a tarde");
    expect(u.atendeSus).toBe(true);
    expect(u.hospitalar).toBe(false);
    expect(u.cnesAtualizadoEm).toBe("2026-01-30");
  });

  it("sem nome fantasia usa a razão social; S/N não vira número", () => {
    const u = paraUnidade({ ...base, nome_fantasia: null, numero_estabelecimento: "S/N" });
    expect(u.nome).toBe("SMS de Bertolinia");
    expect(u.endereco).toBe("RUA DA MATRIZ");
  });

  it("conta os dias sem atualização no CNES", () => {
    expect(diasSemAtualizarNoCnes("2026-01-01", new Date("2026-07-01T12:00:00Z"))).toBe(181);
    expect(diasSemAtualizarNoCnes(null)).toBeNull();
    expect(diasSemAtualizarNoCnes("lixo")).toBeNull();
  });
});

describe("situação da unidade pelas ocorrências", () => {
  const hoje = new Date("2026-09-21T12:00:00Z");
  const ha = (d: number) => new Date(hoje.getTime() - d * 86_400_000).toISOString();
  it("urgente há 2+ dias é urgente; urgente nova é atenção; 3 abertas é atenção", () => {
    expect(situacaoDaUnidade([], hoje)).toBe("normal");
    expect(situacaoDaUnidade([{ gravidade: "urgente", createdAt: ha(0) }], hoje)).toBe("atencao");
    expect(situacaoDaUnidade([{ gravidade: "urgente", createdAt: ha(3) }], hoje)).toBe("urgente");
    expect(situacaoDaUnidade([{ gravidade: "atencao", createdAt: ha(1) }, { gravidade: "atencao", createdAt: ha(1) }, { gravidade: "atencao", createdAt: ha(1) }], hoje)).toBe("atencao");
    expect(diasAberta(ha(5), hoje)).toBe(5);
    expect(rotuloOcorrencia("sem_medico")).toBe("Sem médico");
  });
});
