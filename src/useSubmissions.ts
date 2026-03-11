import { useState, useCallback } from 'react';
import { api, type Submission, type CreateSubmissionData, type UpdateSubmissionData } from './api';

export function useSubmissions() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSubmissions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('📥 [FETCH] Buscando submissions...');
      const data = await api.getSubmissions();
      console.log('📥 [FETCH] Carregadas:', data.length, 'registros');
      setSubmissions(data);
    } catch (err: any) {
      console.error('❌ [FETCH] Erro:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const createSubmission = useCallback(async (data: CreateSubmissionData): Promise<number> => {
    setLoading(true);
    setError(null);
    try {
      console.log('💾 [CREATE] Salvando...', data.unit_name);
      const result = await api.createSubmission(data);
      console.log('✅ [CREATE] Criado com ID:', result.id);
      await fetchSubmissions();
      return result.id;
    } catch (err: any) {
      console.error('❌ [CREATE] Erro:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchSubmissions]);

  const updateSubmission = useCallback(async (id: number, data: UpdateSubmissionData): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      console.log('✏️ [UPDATE] Atualizando ID:', id);
      await api.updateSubmission(id, data);
      console.log('✅ [UPDATE] Atualizado');
      await fetchSubmissions();
    } catch (err: any) {
      console.error('❌ [UPDATE] Erro:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchSubmissions]);

  const deleteSubmission = useCallback(async (id: number | string): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const numId = typeof id === 'string' ? parseInt(id, 10) : id;
      console.log('🗑️ [DELETE] Excluindo ID:', numId);

      // Verificar se existe
      const existing = submissions.find(s => s.id === numId);
      if (!existing) {
        throw new Error('Registro não encontrado');
      }
      console.log('🗑️ [DELETE] Registro encontrado:', existing.unit_name);

      await api.deleteSubmission(numId);
      console.log('✅ [DELETE] Excluído com sucesso');

      // Atualizar lista local
      setSubmissions(prev => prev.filter(s => s.id !== numId));
    } catch (err: any) {
      console.error('❌ [DELETE] Erro:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [submissions]);

  const testConnection = useCallback(async (): Promise<boolean> => {
    try {
      console.log('🧪 [TEST] Testando conexão...');
      const data = await api.getSubmissions();
      console.log('✅ [TEST] OK -', data.length, 'registros');
      return true;
    } catch (err: any) {
      console.error('❌ [TEST] Erro:', err);
      return false;
    }
  }, []);

  return {
    submissions,
    loading,
    error,
    fetchSubmissions,
    createSubmission,
    updateSubmission,
    deleteSubmission,
    testConnection,
  };
}
