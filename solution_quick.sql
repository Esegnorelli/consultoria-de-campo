-- ═══════════════════════════════════════════════════════════════════
-- SOLUÇÃO RÁPIDA PARA CORRIGIR O PROBLEMA DE EXCLUSÃO
-- ═══════════════════════════════════════════════════════════════════
--
# Execute este arquivo no SQL Editor do seu projeto Supabase
# Acesse: https://supabase.com/dashboard/project/zncxgpcqubsqrfqxmhhx/sql/new
--
# Clique em "RUN" para executar
--
# ═══════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════
-- MÉTODO 1: Desabilitar RLS (MAIS RÁPIDO - Recomendado para desenvolvimento)
-- ═══════════════════════════════════════════════════════════════════

ALTER TABLE submissions DISABLE ROW LEVEL SECURITY;

-- ═══════════════════════════════════════════════════════════════════
-- RESULTADO ESPERADO
-- ═══════════════════════════════════════════════════════════════════
-- Após executar este comando:
-- 1. RLS estará desabilitado
-- 2. Todas as operações (INSERT, SELECT, UPDATE, DELETE) funcionarão
-- 3. A exclusão no app React funcionará corretamente
-- 4. Você verá no console: ✅ [DELETE] Registro excluído com sucesso!

-- ═══════════════════════════════════════════════════════════════════
-- VERIFICAR SE FUNCIONOU
-- ═══════════════════════════════════════════════════════════════════
-- 1. Volte para o app
-- 2. Tente excluir um registro
-- 3. Abra o Console do Browser (F12)
-- 4. Você deve ver:
--    🗑️ [DELETE] Iniciando exclusão do registro ID: X number
--    🔍 [DELETE] Verificando se o registro existe...
--    ✅ [DELETE] Registro encontrado: [nome da unidade]
--    🗑️ [DELETE] Executando DELETE...
--    ✅ [DELETE] Registro excluído com sucesso! (verificado)
--    🔄 [DELETE] Atualizando estado local...
--    ✅ Registro excluído com sucesso!

-- ═══════════════════════════════════════════════════════════════════
-- SE QUISER HABILITAR RLS NOVAMENTE (Produção)
-- ═══════════════════════════════════════════════════════════════════
-- Execute estes comandos:
/*
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable all access for all users" ON submissions;

CREATE POLICY "Enable all access for all users"
ON submissions
FOR ALL
USING (true)
WITH CHECK (true);
*/

-- ═══════════════════════════════════════════════════════════════════
-- DÚVIDAS? Veja o arquivo GUIA_CORRECAO_EXCLUSAO.md
-- ═══════════════════════════════════════════════════════════════════
