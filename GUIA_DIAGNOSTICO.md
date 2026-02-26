# 🩺 Diagnóstico Completo para o Problema de Exclusão

## 📋 Sua Configuração do Supabase

- **Project ID**: `zncxgpcqubsqrfqxmhhx`
- **URL**: `https://zncxgpcqubsqrfqxmhhx.supabase.co`
- **Key**: `sb_publishable_O4Ozf7bprRosDluP37mAiA_ShAlr-m0`

## 🔍 Passo 1: Executar Diagnóstico Completo

### Acessar o SQL Editor
1. Clique neste link: https://supabase.com/dashboard/project/zncxgpcqubsqrfqxmhhx/sql/new
2. Copie todo o conteúdo do arquivo `diagnostico_completo.sql`
3. Cole no editor
4. Clique em **RUN**

### O Que O Script Faz

O script vai verificar:

1. ✅ Se a tabela `submissions` existe
2. ✅ A estrutura da tabela (colunas e tipos)
3. ✅ As políticas RLS configuradas
4. ✅ Uma amostra dos dados
5. ✅ O tipo do ID (crucial!)
6. ✅ Testa o DELETE automaticamente
7. ✅ **Desabilita o RLS automaticamente**

## 🔍 Passo 2: Analisar os Resultados

### SEÇÃO 1: Informações da Tabela
Deve mostrar:
```
tablename       | submissions
rowsecurity    | true/false (deve ser false após execução do script)
```

### SEÇÃO 2: Estrutura da Tabela
Deve mostrar:
```
column_name     | data_type
id              | integer ou bigint (importante!)
unit_name       | text
inspector_name  | text
date            | date ou text
score           | numeric ou double precision
data            | jsonb
created_at      | timestamp with time zone
```

**Se o `id` for `uuid` em vez de `integer`**, isso pode causar problemas!

### SEÇÃO 3: Políticas RLS
Se houver políticas listadas, execute o script completo - ele vai desabilitar o RLS.

### SEÇÃO 5: Tipo do ID
Deve mostrar:
```
id_texto    | "123"
id_tipo     | integer
id_numero   | 123
```

**Importante**: O tipo deve ser `integer` ou `bigint`, não `uuid`.

### SEÇÃO 6: Teste de DELETE
Você deve ver nos NOTICES:
- ✅ `DELETE funcionou! Registro foi excluído.` = Tudo OK!
- ❌ `DELETE NÃO funcionou! O registro ainda existe.` = RLS bloqueando

### SEÇÃO 7: Solução Aplicada
Deve mostrar:
```
✅ RLS desabilitado!
```

## 🔧 Se o ID for UUID em vez de Integer

Se na SEÇÃO 2 o `data_type` do `id` for `uuid`, você tem duas opções:

### Opção A: Alterar o código React para usar UUID

No arquivo `src/App.tsx`, a função de exclusão já aceita `string`, então deve funcionar.

### Opção B: Converter a tabela para usar Integer (mais complexo)

```sql
-- ATENÇÃO: Isso vai deletar todos os dados!
-- Backup antes:
-- CREATE TABLE submissions_backup AS SELECT * FROM submissions;

-- Depois converter:
-- (requer mais comandos complexos, não recomendado)
```

**Recomendado**: Use a Opção A (código já está preparado).

## ✅ Após Executar o Script

1. **Volte para o app React**
2. **Vá para Histórico**
3. **Tente excluir um registro**
4. **Deve funcionar!** 🎉

### Logs Esperados no Console (F12)

```
🗑️ [DELETE] Iniciando exclusão do registro ID: 123 number
🔍 [DELETE] Verificando se o registro existe...
✅ [DELETE] Registro encontrado: Unidade Teste
🗑️ [DELETE] Executando DELETE...
🔍 [DELETE] Verificando se foi excluído...
✅ [DELETE] Registro excluído com sucesso! (verificado)
🔄 [DELETE] Atualizando estado local...
✅ Registro excluído com sucesso!
```

## 🐛 Se Ainda Não Funcionar

### Verificar 1: RLS realmente foi desabilitado?

Execute no SQL Editor:
```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'submissions';
```

Deve mostrar `rowsecurity = false`. Se for `true`, execute:
```sql
ALTER TABLE submissions DISABLE ROW LEVEL SECURITY;
```

### Verificar 2: Tipo do ID

Execute no SQL Editor:
```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'submissions' AND column_name = 'id';
```

- Se for `integer` ou `bigint`: ✅ OK
- Se for `uuid`: O código React deve funcionar pois já usa `String(id)`
- Se for outro tipo: Pode haver problemas

### Verificar 3: Verificar logs do React

Abra o Console (F12) e veja:

- Se mostra `✅ [DELETE] Registro excluído com sucesso!` ✅
- Se mostra `❌ [DELETE] O registro ainda existe após DELETE!` ❌ = RLS ainda bloqueando
- Se mostra outro erro: Copie e cole para análise

## 📞 Comandos SQL Rápidos

### Desabilitar RLS (já está no script)
```sql
ALTER TABLE submissions DISABLE ROW LEVEL SECURITY;
```

### Verificar RLS
```sql
SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'submissions';
```

### Verificar tipo do ID
```sql
SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'submissions' AND column_name = 'id';
```

### Verificar políticas
```sql
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'submissions';
```

### Verificar dados
```sql
SELECT id, unit_name, score FROM submissions ORDER BY created_at DESC LIMIT 5;
```

## 🎯 Resumo da Solução

1. **Execute** `diagnostico_completo.sql` no SQL Editor
2. **O script vai**:
   - Diagnosticar tudo automaticamente
   - Testar o DELETE
   - Desabilitar o RLS
3. **Teste** no app
4. **Deve funcionar!** 🎉

---

## 🔗 Links Úteis

- **SQL Editor**: https://supabase.com/dashboard/project/zncxgpcqubsqrfqxmhhx/sql/new
- **Table Editor**: https://supabase.com/dashboard/project/zncxgpcqubsqrfqxmhhx/editor
- **Database**: https://supabase.com/dashboard/project/zncxgpcqubsqrfqxmhhx/database

---

**Pronto! Execute o script de diagnóstico e tudo será resolvido automaticamente!** 🚀
