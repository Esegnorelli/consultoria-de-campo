# 🚨 Guia para Corrigir o Problema de Exclusão

## Problema: A exclusão não funciona realmente

O problema é mais provavelmente causado por **permissões RLS (Row Level Security)** no Supabase que não permitem operações de DELETE.

## 📋 Passo a Passo para Corrigir

### Passo 1: Testar Permissões no App

1. Abra o app
2. Vá para a tela de **Histórico**
3. Clique no botão amarelo **"🔧 Testar Permissões"**
4. Veja o resultado:
   - ✅ Se passar: As permissões estão OK
   - ❌ Se falhar: Você precisa configurar as permissões (vá para o Passo 2)

### Passo 2: Abrir o Console do Supabase

1. Acesse: https://supabase.com/dashboard/project/zncxgpcqubsqrfqxmhhx/sql/new
2. Copie o conteúdo do arquivo `setup_permissions.sql`
3. Cole no SQL Editor
4. Clique em **"Run"**

### Passo 3: Verificar os Logs do Console

Enquanto testa a exclusão:

1. Abra o Console do Browser (F12)
2. Vá para a aba **Console**
3. Clique no botão de exclusão
4. Procure por logs com emojis:
   - 🗑️ [DELETE] = Início do processo de exclusão
   - ✅ [DELETE] = Exclusão com sucesso
   - ❌ [DELETE] = Erro na exclusão

### Passo 4: Se ainda não funcionar

#### Opção A: Desabilitar RLS (Mais rápido para desenvolvimento)

```sql
ALTER TABLE submissions DISABLE ROW LEVEL SECURITY;
```

Execute este comando no SQL Editor do Supabase. Isso desabilita completamente o RLS e permite todas as operações.

#### Opção B: Verificar políticas RLS

Se você precisa manter RLS, verifique as políticas:

```sql
-- Ver políticas existentes
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'submissions';

-- Deveria ter pelo menos uma política com cmd='*' (todas as operações)
```

## 🔍 Debug Avançado

### Verificar o tipo do ID

No console do navegador, após carregar o histórico, você verá:

```
📥 [FETCH] Exemplo de registro: { id: 123, idType: "number", ... }
```

Se `idType` for "string" e a tabela espera "number" (ou vice-versa), pode haver incompatibilidade.

### Verificar erros específicos

Se você ver este erro:

```
Error: new row violates row-level security policy
```

**Solução:** Execute o script `setup_permissions.sql`

Se você ver este erro:

```
Error: permission denied for table submissions
```

**Solução:** Execute o script `setup_permissions.sql` OU desabilite RLS:

```sql
ALTER TABLE submissions DISABLE ROW LEVEL SECURITY;
```

## ✅ Como Saber se Funcionou

Após corrigir as permissões:

1. Abra o Console do Browser (F12)
2. Vá para a aba Console
3. Tente excluir um registro
4. Você deve ver estes logs (com emojis):

```
🗑️ [DELETE] Iniciando exclusão do registro ID: 123 number
🗑️ [DELETE] ID convertido para string: 123
🗑️ [DELETE] Resultado método 1: {data: [{...}], error: null}
✅ [DELETE] Registro excluído com sucesso!
🔄 [DELETE] Atualizando estado local...
🔄 [DELETE] Registros restantes: 4
🔄 [DELETE] Buscando dados atualizados do servidor...
📥 [FETCH] Submissions carregadas: 4 registros
🏁 [DELETE] Processo de exclusão finalizado
```

E verá um alerta: `✅ Registro excluído com sucesso!`

## 📞 Se ainda não funcionar

Se após seguir todos os passos ainda não funcionar:

1. Verifique se você está usando o projeto correto no Supabase
2. Verifique se a tabela `submissions` existe
3. Verifique se a chave API está correta no arquivo `.env`
4. Verifique se não há erros de rede no Console

## 🎯 Solução Recomendada (Mais Rápida)

Se você quer resolver rápido e está em ambiente de desenvolvimento:

1. Acesse: https://supabase.com/dashboard/project/zncxgpcqubsqrfqxmhhx/sql/new
2. Execute este comando:

```sql
ALTER TABLE submissions DISABLE ROW LEVEL SECURITY;
```

3. Teste a exclusão no app
4. Deverá funcionar imediatamente! ✅

---

**Nota:** Em produção, você deve habilitar RLS novamente e configurar políticas apropriadas.
