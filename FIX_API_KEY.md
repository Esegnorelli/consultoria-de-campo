# 🔧 CORREÇÃO: Erro "Invalid API Key"

## Problema
Ao tentar excluir um registro, aparecia:
```
❌ Erro ao excluir: Erro ao excluir: Invalid API key
```

## 🎯 Solução Aplicada

### O Que Era o Problema?
No **Vite**, variáveis de ambiente que ficam disponíveis no código do frontend **PRECISAM começar com `VITE_`**.

**Antes (errado):**
```env
SUPABASE_SERVICE_ROLE_KEY=sbp_9b493583c71b551b55f72b573ebe801c32ff16fc
```

**Depois (correto):**
```env
VITE_SUPABASE_SERVICE_ROLE_KEY=sbp_9b493583c71b551b55f72b573ebe801c32ff16fc
```

### Arquivos Modificados

1. **`.env`** - Adicionado prefixo `VITE_` na variável
2. **`src/App.tsx`** - Atualizado para usar `import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY`
3. **`.env.example`** - Atualizado com documentação

## 🚀 Como Aplicar a Correção

### Passo 1: Atualizar o `.env`

Edite o arquivo `.env` e altere a linha:

```env
# Antes:
SUPABASE_SERVICE_ROLE_KEY=sbp_YOUR_SERVICE_ROLE_KEY

# Depois:
VITE_SUPABASE_SERVICE_ROLE_KEY=sbp_YOUR_SERVICE_ROLE_KEY
```

### Passo 2: **IMPORTANTE** - Reiniciar o Servidor de Desenvolvimento

As variáveis de ambiente do Vite só são carregadas quando o servidor **é iniciado**.

```bash
# 1. Pare o servidor (Ctrl+C)

# 2. Reinicie o servidor
npm run dev
```

### Passo 3: Testar

1. Vá para **Histórico**
2. Clique na 🗑️ (lixeira)
3. Confirme a exclusão
4. **Deve funcionar!** ✅

## 📋 Arquivo `.env` Correto

```env
# Variáveis para o frontend (começam com VITE_)
VITE_SUPABASE_URL=https://zncxgpcqubsqrfqxmhhx.supabase.co
VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY=sb_publishable_O4Ozf7bprRosDluP37mAiA_ShAlr-m0
VITE_SUPABASE_SERVICE_ROLE_KEY=sbp_YOUR_SERVICE_ROLE_KEY_HERE

# Variáveis para backend ou scripts (sem VITE_)
SUPABASE_URL=https://zncxgpcqubsqrfqxmhhx.supabase.co
SUPABASE_ANON_KEY=sb_publishable_O4Ozf7bprRosDluP37mAiA_ShAlr-m0
SUPABASE_ACCESS_TOKEN=sbp_YOUR_ACCESS_TOKEN_HERE
SUPABASE_SERVICE_ROLE_KEY=sbp_YOUR_SERVICE_ROLE_KEY_HERE
GITHUB_TOKEN=ghp_YOUR_GITHUB_TOKEN_HERE
```

## 🔍 Como Verificar que Funcionou

### No Console do Browser (F12)

Após reiniciar o servidor e tentar excluir, você deve ver:

```
🗑️ [DELETE] Iniciando exclusão do registro ID: 123 number
🔍 [DELETE] Verificando se o registro existe...
✅ [DELETE] Registro encontrado: Unidade Teste
🗑️ [DELETE] Executando DELETE com permissões ADMIN...
✅ [DELETE] Registro excluído com sucesso! (verificado)
```

### Visualmente

1. Clica na lixeira
2. Aparece modal de confirmação
3. Confirma
4. Modal fecha
5. Alerta: "✅ Registro excluído com sucesso!"
6. **Registro some da lista!**

## ⚠️ Importante Sobre Variáveis Vite

### Regra de Ouro
No Vite, se você quer acessar uma variável de ambiente no código do **frontend** (React, Vue, etc.), ela **DEVE** começar com `VITE_`.

### Exemplos

✅ **Funciona no frontend:**
```env
VITE_API_URL=https://api.com
VITE_API_KEY=secret_key
VITE_SUPABASE_SERVICE_ROLE_KEY=sbp_xxx
```

```javascript
// Acessível no código
console.log(import.meta.env.VITE_API_URL);
```

❌ **NÃO funciona no frontend:**
```env
API_URL=https://api.com
API_KEY=secret_key
SUPABASE_SERVICE_ROLE_KEY=sbp_xxx
```

```javascript
// UNDEFINED no código do frontend
console.log(import.meta.env.API_URL); // undefined!
```

### Quando NÃO usar `VITE_`?

Use variáveis **SEM** prefixo `VITE_` para:
- Backend (Node.js, Python, etc.)
- Scripts que rodam no servidor
- Variáveis que NÃO devem ficar expostas no frontend

## 📝 Por Que Isso Aconteceu?

1. **Código React** usa `import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY`
2. **Arquivo `.env`** tinha `SUPABASE_SERVICE_ROLE_KEY` (sem `VITE_`)
3. **Vite** não carrega variáveis sem `VITE_` para o frontend
4. **Resultado**: `undefined` → "Invalid API Key"

**Solução**: Adicionar `VITE_` ao nome da variável no `.env`.

## 🔄 Commit Realizado

```
Commit: 52403bd
Mensagem: fix: corrigir erro de API key - adicionar prefixo VITE_

Arquivos modificados:
- .env.example
- src/App.tsx

Status: ✅ Push para GitHub realizado
```

## 🚀 Resumo da Solução

### Arquivo `.env` (atualizado)
```env
VITE_SUPABASE_SERVICE_ROLE_KEY=sbp_YOUR_SERVICE_ROLE_KEY
```

### Código React (já atualizado)
```typescript
const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY || "sbp_DEFAULT_FALLBACK_KEY";
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
```

### Ação Necessária
```bash
# 1. Atualize o .env
# 2. REINICIE o servidor (Ctrl+C + npm run dev)
# 3. Teste a exclusão
```

---

**✅ Tudo pronto! Basta reiniciar o servidor e testar!** 🎉
