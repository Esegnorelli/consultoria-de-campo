-- ============================================
-- CONFIGURAÇÃO DE PERMISSÕES DA TABELA SUBMISSIONS
-- ============================================
-- Execute este arquivo no SQL Editor do seu projeto Supabase
-- Acesse: https://supabase.com/dashboard/project/zncxgpcqubsqrfqxmhhx/sql/new

-- 1. Primeiro, verificar o estado atual da tabela
SELECT 
  tablename, 
  rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'submissions';

-- 2. Verificar políticas existentes
SELECT 
  policyname, 
  permissive, 
  roles, 
  cmd, 
  qual 
FROM pg_policies 
WHERE tablename = 'submissions';

-- 3. Desabilitar RLS temporariamente para garantir acesso
ALTER TABLE submissions DISABLE ROW LEVEL SECURITY;

-- 4. Habilitar RLS e configurar políticas permissivas para desenvolvimento
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;

-- 5. Remover todas as políticas antigas
DROP POLICY IF EXISTS "Enable all access for all users" ON submissions;
DROP POLICY IF EXISTS "Enable insert for authenticated" ON submissions;
DROP POLICY IF EXISTS "Enable select for authenticated" ON submissions;
DROP POLICY IF EXISTS "Enable update for authenticated" ON submissions;
DROP POLICY IF EXISTS "Enable delete for authenticated" ON submissions;

-- 6. Criar política para permitir TODAS as operações (INSERT, SELECT, UPDATE, DELETE)
CREATE POLICY "Enable all access for all users"
ON submissions
FOR ALL
USING (true)
WITH CHECK (true);

-- 7. Verificar a estrutura da tabela
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'submissions'
ORDER BY ordinal_position;

-- 8. Testar permissões (opcional - execute separadamente se quiser testar)
-- INSERT INTO submissions (unit_name, inspector_name, date, score, data)
-- VALUES ('Teste Unit', 'Teste Inspector', '2024-01-01', 10.0, '{}');

-- ============================================
-- RESULTADO ESPERADO
-- ============================================
-- Após executar este script:
-- 1. RLS estará habilitado
-- 2. Política permissiva estará criada
-- 3. Todas as operações (INSERT, SELECT, UPDATE, DELETE) deverão funcionar
-- 4. O app React deverá conseguir excluir registros

-- ============================================
-- COMO VERIFICAR SE FUNCIONOU
-- ============================================
-- 1. Abra o Console do Browser (F12)
-- 2. Vá para a aba Console
-- 3. Tente excluir um registro no app
-- 4. Deverá ver logs como:
--    - "Tentando excluir registro com ID: X number"
--    - "Resultado da exclusão: {data: [...], error: null}"
--    - "Registro excluído com sucesso: [...]"

-- ============================================
-- SOLUÇÃO ALTERNATIVA (Se quiser mais segurança)
-- ============================================
-- Se preferir restringir apenas a usuários autenticados:
/*
DROP POLICY IF EXISTS "Enable all access for all users" ON submissions;

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
*/
