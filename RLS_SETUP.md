# Configuração de Permissões RLS (Row Level Security)

Se a exclusão não está funcionando, pode ser um problema de permissões no Supabase.

## Verificar e Corrigir Permissões

Execute estes comandos no SQL Editor do seu projeto Supabase:

### 1. Verificar se RLS está habilitado
```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'submissions';
```

### 2. Desabilitar RLS (para testes)
```sql
ALTER TABLE submissions DISABLE ROW LEVEL SECURITY;
```

### 3. Habilitar RLS e configurar políticas corretas
```sql
-- Habilitar RLS
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;

-- Política para permitir todas as operações (para desenvolvimento/teste)
DROP POLICY IF EXISTS "Enable all access for all users" ON submissions;

CREATE POLICY "Enable all access for all users"
ON submissions
FOR ALL
USING (true)
WITH CHECK (true);
```

### 4. Verificar políticas existentes
```sql
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  permissive, 
  roles, 
  cmd, 
  qual, 
  with_check
FROM pg_policies
WHERE tablename = 'submissions';
```

### 5. Permissões alternativas (mais seguras)
Se quiser manter segurança, use estas políticas:

```sql
-- Remover políticas antigas
DROP POLICY IF EXISTS "Enable insert for authenticated" ON submissions;
DROP POLICY IF EXISTS "Enable select for authenticated" ON submissions;
DROP POLICY IF EXISTS "Enable update for authenticated" ON submissions;
DROP POLICY IF EXISTS "Enable delete for authenticated" ON submissions;

-- Criar novas políticas
CREATE POLICY "Enable insert for authenticated"
ON submissions
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Enable select for authenticated"
ON submissions
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Enable update for authenticated"
ON submissions
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Enable delete for authenticated"
ON submissions
FOR DELETE
TO authenticated
USING (true);
```

## Debug de Permissões

Para testar se as permissões estão funcionando:

1. Abra o Console do Browser no seu app
2. Tente excluir um registro
3. Veja os logs no console

Se houver erro de permissão, aparecerá algo como:
```
Error: Permission denied for table submissions
```

## Solução Rápida (Recomendada para Desenvolvimento)

Se você está em ambiente de desenvolvimento e não precisa de segurança RLS:

```sql
-- Desabilitar completamente RLS
ALTER TABLE submissions DISABLE ROW LEVEL SECURITY;
```

Isso permitirá todas as operações (INSERT, SELECT, UPDATE, DELETE) sem restrições.

## Verificar Tipo do ID

Certifique-se de que a coluna `id` é do tipo correto:

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'submissions' 
AND column_name = 'id';
```

O ID deve ser `integer` ou `uuid`. Se for diferente, pode haver problemas de tipo.
