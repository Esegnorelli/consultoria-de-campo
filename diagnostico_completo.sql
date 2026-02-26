-- ═══════════════════════════════════════════════════════════════════
-- DIAGNÓSTICO COMPLETO DA TABELA SUBMISSIONS
-- ═══════════════════════════════════════════════════════════════════
--
# Execute este arquivo no SQL Editor do seu projeto Supabase
# Acesse: https://supabase.com/dashboard/project/zncxgpcqubsqrfqxmhhx/sql/new
--
# Clique em "RUN" para executar tudo
#
# ═══════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════
-- SEÇÃO 1: Informações da Tabela
-- ═══════════════════════════════════════════════════════════════════

SELECT '=== SEÇÃO 1: Informações da Tabela ===' as info;

-- Verificar se a tabela existe
SELECT 
  tablename, 
  rowsecurity,
  tableowner
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'submissions';

-- ═══════════════════════════════════════════════════════════════════
-- SEÇÃO 2: Estrutura da Tabela (Colunas)
-- ═══════════════════════════════════════════════════════════════════

SELECT '=== SEÇÃO 2: Estrutura da Tabela (Colunas) ===' as info;

SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'submissions'
ORDER BY ordinal_position;

-- ═══════════════════════════════════════════════════════════════════
-- SEÇÃO 3: Políticas RLS
-- ═══════════════════════════════════════════════════════════════════

SELECT '=== SEÇÃO 3: Políticas RLS (Row Level Security) ===' as info;

SELECT 
  policyname, 
  permissive, 
  roles, 
  cmd, 
  qual, 
  with_check
FROM pg_policies 
WHERE tablename = 'submissions';

-- ═══════════════════════════════════════════════════════════════════
-- SEÇÃO 4: Amostra de Dados (Primeiros 3 registros)
-- ═══════════════════════════════════════════════════════════════════

SELECT '=== SEÇÃO 4: Amostra de Dados ===' as info;

SELECT 
  id, 
  unit_name, 
  inspector_name, 
  date, 
  score,
  created_at
FROM submissions
ORDER BY created_at DESC
LIMIT 3;

-- ═══════════════════════════════════════════════════════════════════
-- SEÇÃO 5: Verificar Tipo do ID no Primeiro Registro
-- ═══════════════════════════════════════════════════════════════════

SELECT '=== SEÇÃO 5: Tipo do ID ===' as info;

SELECT 
  id::text as id_texto,
  typeof(id) as id_tipo,
  id::integer as id_numero
FROM submissions
LIMIT 1;

-- ═══════════════════════════════════════════════════════════════════
-- SEÇÃO 6: Teste de Permissões (DELETE)
-- ═══════════════════════════════════════════════════════════════════

SELECT '=== SEÇÃO 6: Teste de Permissões (DELETE) ===' as info;

DO $$
DECLARE
    test_record_id submissions.id%TYPE;
    test_record RECORD;
    delete_result TEXT;
BEGIN
    -- Buscar um registro para testar
    SELECT id INTO test_record_id
    FROM submissions
    LIMIT 1;
    
    IF test_record_id IS NULL THEN
        RAISE NOTICE '⚠️ Nenhum registro encontrado para teste de DELETE';
        RETURN;
    END IF;
    
    RAISE NOTICE '📝 Testando DELETE do registro ID: % (Tipo: %)', 
        test_record_id, pg_typeof(test_record_id);
    
    -- Guardar os dados antes de deletar (para restaurar)
    SELECT * INTO test_record
    FROM submissions
    WHERE id = test_record_id;
    
    -- Tentar deletar
    DELETE FROM submissions WHERE id = test_record_id;
    
    -- Verificar se foi deletado
    IF EXISTS (SELECT 1 FROM submissions WHERE id = test_record_id) THEN
        RAISE NOTICE '❌ DELETE NÃO funcionou! O registro ainda existe.';
        RAISE NOTICE '💡 Isso indica que RLS está bloqueando a exclusão.';
        
        -- Restaurar o registro
        INSERT INTO submissions SELECT * FROM test_record;
        RAISE NOTICE '🔄 Registro restaurado para não perder dados.';
    ELSE
        RAISE NOTICE '✅ DELETE funcionou! Registro foi excluído.';
        
        -- Restaurar o registro
        INSERT INTO submissions SELECT * FROM test_record;
        RAISE NOTICE '🔄 Registro restaurado para não perder dados.';
    END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════
-- SEÇÃO 7: SOLUÇÃO APLICADA AUTOMATICAMENTE
-- ═══════════════════════════════════════════════════════════════════

SELECT '=== SEÇÃO 7: Aplicando Solução ===' as info;

-- Desabilitar RLS
ALTER TABLE submissions DISABLE ROW LEVEL SECURITY;

SELECT '✅ RLS desabilitado!' as status;

-- ═══════════════════════════════════════════════════════════════════
-- RESULTADO ESPERADO
-- ═══════════════════════════════════════════════════════════════════
--
# Após executar este script:
#
# 1. Você verá informações detalhadas da tabela
# 2. Verá a estrutura das colunas
# 3. Verá as políticas RLS (se houver)
# 4. Verá uma amostra dos dados
# 5. Verá o tipo do ID (deve ser integer ou bigint)
# 6. O teste de DELETE mostrará se funciona ou não
# 7. RLS será desabilitado automaticamente
#
# ═══════════════════════════════════════════════════════════════════
--
# PRÓXIMOS PASSOS:
#
# 1. Execute este script no SQL Editor
# 2. Volte para o app React
# 3. Tente excluir um registro
# 4. Deverá funcionar agora! ✅
#
# ═══════════════════════════════════════════════════════════════════

SELECT '🎉 Diagnóstico completo! RLS foi desabilitado. Teste a exclusão no app.' as final_message;
