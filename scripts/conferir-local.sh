#!/usr/bin/env bash
# ── CONFERIR O SITE LOCALMENTE, DO JEITO QUE VAI PARA O AR ──
#
# Um comando só: liga o banco local, monta a versão de produção, sobe o
# servidor, espera ele responder de verdade e confere a folha de estilo.
# Para com a mensagem certa quando algo dá errado, em vez de deixar o erro
# aparecer três passos depois (um print preto, uma página que não abre).
#
#   bash scripts/conferir-local.sh            # monta e sobe na porta 3124
#   PORTA=3200 bash scripts/conferir-local.sh
#   SEM_MONTAR=1 bash scripts/conferir-local.sh   # só sobe o que já foi montado
#
# O servidor fica rodando em segundo plano; o registro vai para .conferir/.
# Para parar: bash scripts/conferir-local.sh parar
#
# Os valores abaixo são de teste, só para a máquina local. Nenhum é segredo
# de produção, e todos podem ser trocados por variável de ambiente.

set -euo pipefail
cd "$(dirname "$0")/.."

PORTA="${PORTA:-3124}"
PORTA_BANCO="${PORTA_BANCO:-54329}"
mkdir -p .conferir
REG=.conferir

export DATABASE_URL="${DATABASE_URL:-postgresql://postgres@localhost:${PORTA_BANCO}/cidadeia}"
export AUTH_SECRET="${AUTH_SECRET:-segredo-local-de-teste-com-mais-de-32-caracteres-123}"
export APP_URL="${APP_URL:-https://cidadeia.vercel.app}"
export ADMIN_EMAILS="${ADMIN_EMAILS:-equipe@cidadeia.test}"
export EQUIPE_CODIGO="${EQUIPE_CODIGO:-codigo-local-de-teste-123}"
export CRON_SECRET="${CRON_SECRET:-cron-local-teste}"

# O servidor sobe numa sessão própria (setsid): parar mata o grupo inteiro,
# e não só o npx da frente, que deixava o servidor de verdade ocupando a porta.
parar() {
  if [ -f "$REG/servidor.pid" ]; then
    kill -- "-$(cat "$REG/servidor.pid")" 2>/dev/null || true
    rm -f "$REG/servidor.pid"
    sleep 1
  fi
}
if [ "${1:-}" = "parar" ]; then parar; echo "✓ servidor parado"; exit 0; fi

falhar() { echo "✗ $1" >&2; [ -n "${2:-}" ] && [ -f "$2" ] && tail -40 "$2" >&2; exit 1; }

# 1. O banco local. Sem ele a home monta, mas cada pedido registra erro de
#    conexão e o que depende do banco (portais publicados) some calado.
if command -v pg_ctlcluster >/dev/null 2>&1; then
  if ! pg_lsclusters 2>/dev/null | grep -q " ${PORTA_BANCO} .*online"; then
    if ! pg_lsclusters 2>/dev/null | grep -q " ${PORTA_BANCO} "; then
      pg_createcluster 16 local -p "$PORTA_BANCO" -- --auth=trust >/dev/null
    fi
    pg_ctlcluster 16 local start
  fi
  if ! su postgres -c "psql -p $PORTA_BANCO -lqt" | cut -d'|' -f1 | grep -qw cidadeia; then
    su postgres -c "createdb -p $PORTA_BANCO cidadeia"
  fi
  # A pasta drizzle/ guarda migrações antigas, de SQLite; o esquema do
  # Postgres vem de src/db/schema.ts. Push num banco de teste é seguro.
  TABELAS=$(su postgres -c "psql -p $PORTA_BANCO -d cidadeia -tAc \"select count(*) from information_schema.tables where table_schema='public'\"")
  if [ "$TABELAS" = "0" ]; then
    npx drizzle-kit push --force >"$REG/banco.log" 2>&1 || falhar "não consegui criar as tabelas do banco local" "$REG/banco.log"
  fi
  echo "✓ banco local na porta $PORTA_BANCO"
else
  echo "! sem Postgres nesta máquina: a home sobe, mas o que depende do banco fica vazio"
fi

# 2. Um servidor antigo na mesma porta faria a conferência olhar a versão errada.
parar
if curl -s -o /dev/null "http://localhost:$PORTA/" 2>/dev/null; then
  falhar "a porta $PORTA já está ocupada por outro processo; pare-o ou use PORTA=outra"
fi

# 3. Montar.
if [ -z "${SEM_MONTAR:-}" ]; then
  rm -rf .next
  npx next build >"$REG/montagem.log" 2>&1 || falhar "a montagem falhou" "$REG/montagem.log"
  echo "✓ montado"
fi

# 4. Subir e esperar responder (até 90 s), parando cedo se o processo morrer.
setsid nohup node node_modules/next/dist/bin/next start -p "$PORTA" >"$REG/servidor.log" 2>&1 &
echo $! >"$REG/servidor.pid"
for _ in $(seq 1 90); do
  kill -0 "$(cat "$REG/servidor.pid")" 2>/dev/null || falhar "o servidor caiu ao subir" "$REG/servidor.log"
  [ "$(curl -s -o /dev/null -w '%{http_code}' "http://localhost:$PORTA/robots.txt")" = "200" ] && break
  sleep 1
done
[ "$(curl -s -o /dev/null -w '%{http_code}' "http://localhost:$PORTA/")" = "200" ] || falhar "a home não respondeu 200" "$REG/servidor.log"
echo "✓ no ar em http://localhost:$PORTA"

# 5. A folha de estilo. Passando de uns 131 KB, o Turbopack separa as fontes
#    num segundo arquivo bloqueante e o primeiro desenho da home atrasa.
#    Aconteceu duas vezes em outubro de 2026, e só apareceu no Lighthouse.
FOLHAS=$(curl -s "http://localhost:$PORTA/" | grep -o 'chunks/[a-z0-9_-]*\.css' | sort -u)
QTD=$(echo "$FOLHAS" | grep -c . || true)
MAIOR=0
for f in $FOLHAS; do
  T=$(wc -c <".next/static/$f")
  [ "$T" -gt "$MAIOR" ] && MAIOR=$T
done
if [ "$QTD" -gt 1 ]; then
  falhar "a home carrega $QTD folhas de estilo (o esperado é 1); a maior tem $MAIOR bytes. Tire CSS morto de globals.css ou mova regras de uma tela só para o CSS dela (ex.: app/dashboard/painel.css)."
fi
if [ "$MAIOR" -gt 128000 ]; then
  echo "! folha de estilo com $MAIOR bytes: perto do limite de ~131 KB em que ela se divide"
else
  echo "✓ uma folha de estilo, $MAIOR bytes"
fi
