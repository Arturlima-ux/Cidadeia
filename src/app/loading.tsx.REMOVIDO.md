# Por que não existe loading.tsx na raiz

Existiu, com um spinner, e custava caro sem que nada quebrasse.

Um `loading.tsx` cria uma fronteira de Suspense em volta de TUDO que o
segmento renderiza. Numa página dinâmica — a home é, porque lê a sessão e
lista os portais publicados —, o React aproveita essa fronteira para começar a
enviar antes de terminar: manda o esqueleto com lacunas e despacha o resto em
`<div hidden>` no fim do documento, com scripts que encaixam cada pedaço no
buraco correspondente.

Com JavaScript, monta certo e ninguém percebe. Sem, o HTML servido fica
incompleto no meio das listas. Medido na home:

| | com loading.tsx | sem |
|---|---|---|
| Blocos em "O que é verificado" | 2 de 4 | 4 |
| Capacidades do módulo Essencial | 3 e um item VAZIO | 6 |
| `<div hidden>` no documento | 41 | 1 |

O item vazio é o pior sintoma, porque não parece falta de dado: parece um
traço solto, defeito de acabamento. Foi assim que chegou o relato.

Quem lê sem executar script — buscador, pré-visualização de link em
mensageiro, leitor de texto — via a página pela metade. É a mesma família do
defeito de `/login`, que vinha do `useSearchParams`: conteúdo que só existe
depois do JavaScript.

O que se perde: o spinner entre navegações para páginas dinâmicas. O Next
mantém a página anterior na tela enquanto a próxima carrega, então a troca
continua sem tela branca — só sem o círculo girando.

Se um dia fizer falta, o lugar certo é uma fronteira ESTREITA, em volta só do
pedaço que de fato espera dado, e não em volta da página toda.
