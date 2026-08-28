# Deploy na Vercel

Guia para publicar o CidadeIA. O build de produção já foi validado localmente
(`npm run build` — 29 rotas compilam sem erro).

> **Nenhum valor de segredo aparece neste arquivo.** Ele está versionado no
> Git; os valores reais só devem ser colados no painel da Vercel.

---

## 1. Conectar o repositório

1. Acesse https://vercel.com/new
2. Faça login **com o GitHub** (botão "Continue with GitHub")
3. Na lista de repositórios, escolha **`Arturlima-ux/Cidadeia`**
   - Se não aparecer: clique em "Adjust GitHub App Permissions" e libere o acesso
4. **Root Directory**: clique em `Edit` e selecione **`cidadeia-app`**
   - ⚠️ Passo crítico. O `package.json` está nessa subpasta, não na raiz do repositório.
     Sem isso o build falha com "No package.json found".
5. Framework Preset: **Next.js** (a Vercel detecta sozinha)
6. **Não clique em Deploy ainda** — configure as variáveis abaixo primeiro.

---

## 2. Variáveis de ambiente

Em **Environment Variables**, adicione uma a uma. Os valores estão no seu
`.env` local (`c:\real app\cidadeia-app\.env`), exceto onde indicado.

### Obrigatórias — o app não sobe sem elas

| Variável | Onde pegar o valor |
|---|---|
| `DATABASE_URL` | Copie do `.env` local (connection string do pooler Supabase, porta **6543**) |
| `AUTH_SECRET` | **Gere um NOVO — não reuse o local.** Comando abaixo. |

Gere o `AUTH_SECRET` de produção:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Por que um segredo diferente:** esse valor assina os cookies de sessão. Se
produção e desenvolvimento usarem o mesmo, um cookie gerado na sua máquina
vale como login válido no site público — e vice-versa.

### Recomendadas

| Variável | Valor |
|---|---|
| `NEXT_PUBLIC_APP_URL` | A URL da Vercel (ex: `https://cidadeia.vercel.app`). Usada nos links de recuperação de senha. Preencha depois do primeiro deploy, quando souber a URL. |
| `DIRECT_URL` | Do `.env` local (porta **5432**). Só é usada por migrations, não pelo app em runtime. |

### Opcionais — o app funciona sem, com recurso desligado

| Variável | Se ficar vazia |
|---|---|
| `ANTHROPIC_API_KEY` | IA Central, insights e Central Inteligente ficam **desativados** (as telas somem, nada quebra). As regras automáticas de detecção continuam funcionando — elas não usam IA. |
| `RESEND_API_KEY` | Recuperação de senha por e-mail **não envia** — cai para log no servidor. O login normal continua funcionando. |
| `RESEND_FROM_EMAIL` | Idem acima. |
| `SUPABASE_URL` | Upload de foto de perfil desativado. |
| `SUPABASE_SERVICE_ROLE_KEY` | Idem acima. |

> **Estado atual do seu `.env`:** `ANTHROPIC_API_KEY`, `RESEND_API_KEY` e
> `RESEND_FROM_EMAIL` estão **vazias**. Ou seja: a IA e o envio de e-mail já
> estão desligados hoje, mesmo em desenvolvimento. Se quiser esses recursos no
> ar, preencha-as; senão, pode deixar em branco sem medo.

### Não configure

| Variável | Motivo |
|---|---|
| `NEXTAUTH_URL` | Está no seu `.env` mas **nenhuma linha do código a lê** — sobra de uma biblioteca que não é usada aqui. Pode ignorar. |
| `NODE_ENV` | A Vercel define automaticamente como `production`. Definir manualmente causa comportamento estranho. |

---

## 3. Deploy

Clique em **Deploy**. O primeiro build leva ~2-4 minutos.

Depois que subir:

1. Copie a URL gerada
2. Volte em **Settings → Environment Variables**
3. Preencha `NEXT_PUBLIC_APP_URL` com essa URL
4. Em **Deployments**, clique nos `...` do último deploy → **Redeploy**
   (variáveis novas só valem no build seguinte)

---

## 4. Depois do primeiro deploy

**Todo `git push` na branch `main` publica automaticamente.** Não precisa
mexer na Vercel de novo.

```bash
git add -A
git commit -m "descrição da mudança"
git push
```

---

## Se o build falhar

| Erro | Causa |
|---|---|
| `No package.json found` | Root Directory não foi definido como `cidadeia-app` (passo 1.4) |
| `AUTH_SECRET não configurado` | Faltou a variável, ou foi salva só em Preview e não em Production |
| `DATABASE_URL não configurado` | Idem |
| Erro de conexão com o banco | Confira se copiou a connection string do **pooler** (porta 6543), não a direta |

---

## Notas sobre o banco

O banco Supabase é **o mesmo** em desenvolvimento e produção — não há
separação. Na prática: um cadastro feito no site publicado aparece na sua
máquina e vice-versa.

Para separar mais tarde, crie um segundo projeto no Supabase e use a
connection string dele apenas na Vercel.
