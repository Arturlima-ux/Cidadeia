// ── AS 27 CAPITAIS NO MAPA DO TOPO ──
//
// Posição de cada capital no mesmo sistema do mapa (lib/mapa-municipios.ts,
// 1000 x 975), tirada da tabela de municípios pelo código do IBGE. São as
// luzes roxas do Brasil em relevo (BrasilRelevo.tsx). Brasília vem primeiro:
// é dela que a onda de entrada sai.

export const CAPITAIS_NO_MAPA: readonly [nome: string, x: number, y: number][] = [
  ["Brasília", 627, 530],
  ["São Paulo", 658, 723],
  ["Rio de Janeiro", 741, 707],
  ["Belo Horizonte", 723, 633],
  ["Salvador", 854, 460],
  ["Fortaleza", 853, 229],
  ["Recife", 941, 337],
  ["Manaus", 336, 215],
  ["Belém", 613, 173],
  ["Porto Alegre", 548, 884],
  ["Curitiba", 595, 770],
  ["Goiânia", 595, 552],
  ["Teresina", 750, 264],
  ["Cuiabá", 430, 525],
  ["Campo Grande", 466, 646],
  ["Porto Velho", 243, 355],
  ["Natal", 933, 281],
  ["São Luís", 715, 200],
  ["Florianópolis", 612, 824],
  ["Palmas", 617, 392],
  ["Rio Branco", 148, 385],
  ["Boa Vista", 320, 67],
  ["Macapá", 551, 136],
  ["Vitória", 810, 643],
  ["Aracaju", 888, 408],
  ["Maceió", 920, 378],
  ["João Pessoa", 941, 314],
];
