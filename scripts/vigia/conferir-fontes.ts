// ── CONFERIR AS FONTES PÚBLICAS NOVAS ──
//
// Pergunta uma vez a cada API pública que o CidadeIA lê e imprime o formato da
// resposta (campos e um exemplo). Serve para conferir, de um lugar com rede
// aberta, que o endereço, os filtros e os nomes de campo continuam os que o
// código espera. Uso: tsx scripts/vigia/conferir-fontes.ts
const CNPJ = process.env.CNPJ_TESTE ?? "06553978000137"; // Jerumenha/PI
const IBGE = process.env.IBGE_TESTE ?? "2205300";

async function olhar(nome: string, url: string) {
  try {
    const r = await fetch(url, { headers: { accept: "application/json" }, signal: AbortSignal.timeout(40_000) });
    const texto = await r.text();
    let corpo: unknown = null;
    try {
      corpo = JSON.parse(texto);
    } catch {
      console.log(`\n### ${nome}\nHTTP ${r.status}, não é JSON: ${texto.slice(0, 300)}`);
      return null;
    }
    // Transferegov/ObrasGov: { data }; OData do FNDE: { value }.
    const lista = Array.isArray(corpo) ? corpo : ((corpo as { data?: unknown[] }).data ?? (corpo as { value?: unknown[] }).value);
    const envelope = Array.isArray(corpo) ? "lista" : Object.keys(corpo as object).join(", ");
    console.log(`\n### ${nome}\nHTTP ${r.status} · envelope: ${envelope} · itens: ${Array.isArray(lista) ? lista.length : "?"}`);
    if (Array.isArray(lista) && lista[0]) console.log(JSON.stringify(lista[0], null, 1).slice(0, 2500));
    return lista ?? corpo;
  } catch (e) {
    console.log(`\n### ${nome}\nFALHOU: ${e instanceof Error ? e.message : e}`);
    return null;
  }
}

// SIOPE (FNDE, Olinda/OData): parâmetros vão como alias @Nome na URL.
const SIOPE = "https://www.fnde.gov.br/olinda-ide/servico/DADOS_ABERTOS_SIOPE/versao/v1/odata";
const siope = (recurso: string, ano: number, peri: number, uf: string, extra = "") =>
  `${SIOPE}/${recurso}(Ano_Consulta=@Ano_Consulta,Num_Peri=@Num_Peri,Sig_UF=@Sig_UF)?@Ano_Consulta=${ano}&@Num_Peri=${peri}&@Sig_UF='${uf}'&$format=json${extra}`;

async function conferirSiope() {
  const uf = process.env.UF_TESTE ?? "PI";
  // No SIOPE o município vem com 6 dígitos (sem o verificador do IBGE).
  const cod = IBGE.slice(0, 6);
  const f = (expr: string) => `&$filter=${encodeURIComponent(expr)}`;
  const ano = new Date().getUTCFullYear();
  const todas = async (nome: string, url: string) => {
    const l = (await olhar(nome, url)) as Record<string, unknown>[] | null;
    for (const x of l ?? []) console.log(JSON.stringify(x));
    return l;
  };
  // Quem declarou o bimestre (a data da declaração está nos dados gerais).
  const decl = await todas(`SIOPE · declarações ${ano}/4º bim no ${uf}`, siope("Dados_Gerais_Siope", ano, 4, uf, `${f("TIPO eq 'Municipal'")}&$select=COD_MUNI,NOM_MUNI,DAT_DECL,NUM_POPU&$top=400`));
  console.log(`Municípios com declaração: ${decl?.length ?? 0}`);
  const outro = String(decl?.find((d) => d.COD_MUNI !== Number(cod))?.COD_MUNI ?? "220060");
  for (const [a, p] of [[ano, 4], [ano, 3], [ano, 2], [ano - 1, 6]] as const) {
    await todas(`SIOPE · indicadores ${a}/${p}º bim de ${cod}`, siope("Indicadores_Siope", a, p, uf, f(`COD_MUNI eq ${cod}`)));
    await todas(`SIOPE · indicadores ${a}/${p}º bim de ${outro} (declarou)`, siope("Indicadores_Siope", a, p, uf, f(`COD_MUNI eq ${outro}`)));
  }
  await todas(`SIOPE · indicador 25% (cód. 40?) dos municípios ${ano - 1}/6`, siope("Indicadores_Siope", ano - 1, 6, uf, `${f("TIPO eq 'Municipal' and COD_EXIB eq '1.1'")}&$top=5`));
  await todas(`SIOPE · dados gerais de ${cod} ${ano - 1}/6`, siope("Dados_Gerais_Siope", ano - 1, 6, uf, `${f(`COD_MUNI eq ${cod}`)}&$select=COD_MUNI,NOM_MUNI,DAT_DECL`));
}

async function main() {
  if (process.env.SO === "siope") return conferirSiope();
  const tg = "https://api-publica.transferegov.gestao.gov.br/especiais";
  let ben = (await olhar("Transferegov · beneficiário (só números)", `${tg}/beneficiarios-especiais?cnpj_beneficiario=${CNPJ}&pagina=1&tamanho_da_pagina=5`)) as { id_beneficiario?: number }[] | null;
  if (!ben?.length) {
    const f = CNPJ.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
    ben = (await olhar("Transferegov · beneficiário (formatado)", `${tg}/beneficiarios-especiais?cnpj_beneficiario=${encodeURIComponent(f)}&pagina=1&tamanho_da_pagina=5`)) as typeof ben;
  }
  // Formato do CNPJ e busca pelo nome, para quando o CNPJ não acha.
  const doEstado = (await olhar("Transferegov · beneficiários do PI (amostra)", `${tg}/beneficiarios-especiais?uf_beneficiario=PI&pagina=1&tamanho_da_pagina=200`)) as { id_beneficiario?: number; nome_beneficiario?: string; cnpj_beneficiario?: string }[] | null;
  const porNome = doEstado?.find((b) => /JERUMENHA/i.test(b.nome_beneficiario ?? ""));
  console.log(`\nJerumenha na amostra: ${porNome ? JSON.stringify(porNome) : "não"}`);
  console.log(`Exemplos de CNPJ: ${(doEstado ?? []).slice(0, 5).map((b) => b.cnpj_beneficiario).join(" | ")}`);
  const nome = (await olhar("Transferegov · beneficiário pelo nome", `${tg}/beneficiarios-especiais?nome_beneficiario=${encodeURIComponent("MUNICIPIO DE JERUMENHA")}&pagina=1&tamanho_da_pagina=5`)) as { id_beneficiario?: number }[] | null;
  const idb = ben?.[0]?.id_beneficiario ?? porNome?.id_beneficiario ?? nome?.[0]?.id_beneficiario ?? doEstado?.[0]?.id_beneficiario;
  const planos = idb ? ((await olhar("Transferegov · planos de ação", `${tg}/planos-acao-especiais?id_beneficiario=${idb}&pagina=1&tamanho_da_pagina=5`)) as { id_plano_acao?: number }[] | null) : null;
  const ipa = planos?.[0]?.id_plano_acao;
  if (ipa) {
    await olhar("Transferegov · plano de trabalho", `${tg}/planos-trabalho-especiais?id_plano_acao=${ipa}&pagina=1&tamanho_da_pagina=5`);
    await olhar("Transferegov · relatórios de gestão", `${tg}/relatorios-gestao-novos-especiais?id_plano_acao=${ipa}&pagina=1&tamanho_da_pagina=5`);
    await olhar("Transferegov · devoluções", `${tg}/devolucao-especiais?id_plano_acao=${ipa}&pagina=1&tamanho_da_pagina=5`);
  }

  const og = "https://api-publica.obrasgov.gestao.gov.br/obras";
  const geo = (await olhar("ObrasGov · geometrias do município", `${og}/geometria?cod_ibge=${IBGE}&pagina=1&tamanho_da_pagina=5`)) as { id_projeto_investimento?: string }[] | null;
  const idp = geo?.[0]?.id_projeto_investimento;
  if (idp) {
    await olhar("ObrasGov · projeto", `${og}/projeto-investimento?id_projeto_investimento=${encodeURIComponent(idp)}&pagina=1&tamanho_da_pagina=1`);
    await olhar("ObrasGov · execução física", `${og}/execucao-fisica?id_projeto_investimento=${encodeURIComponent(idp)}&pagina=1&tamanho_da_pagina=5`);
    await olhar("ObrasGov · empenhos", `${og}/empenho?id_projeto_investimento=${encodeURIComponent(idp)}&pagina=1&tamanho_da_pagina=5`);
  }
  await olhar("ObrasGov · paralisadas no PI (contagem)", `${og}/projeto-investimento?uf_principal=PI&situacao=Paralisada&pagina=1&tamanho_da_pagina=1`);
  await olhar("ObrasGov · histórico de paralisação", `${og}/historico-situacao-cancelada-paralisada?pagina=1&tamanho_da_pagina=1`);

  const ano = new Date().getUTCFullYear();
  await olhar("InfoDengue · alerta da cidade", `https://info.dengue.mat.br/api/alertcity?geocode=${IBGE}&disease=dengue&format=json&ew_start=1&ew_end=53&ey_start=${ano}&ey_end=${ano}`);
}

main();
