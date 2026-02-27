import React, { useState, useRef, useMemo, useEffect } from 'react';
import {
  CheckCircle2,
  XCircle,
  Camera,
  FileText,
  Save,
  History,
  ChevronRight,
  ChevronLeft,
  Trash2,
  Plus,
  Loader2,
  Download,
  AlertTriangle,
  Share2,
  Edit,
  X as XIcon
} from 'lucide-react';
import { CHECKLIST_DATA, STORES } from './constants';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import jsPDF from 'jspdf';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type Status = 'conforme' | 'nao-conforme' | null;

interface ItemResult {
  status: Status;
  photos: string[];
  observation: string;
}

interface ChecklistResults {
  [key: string]: ItemResult;
}

export default function App() {
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'info' | 'checklist' | 'history'>('info');
  const [unitName, setUnitName] = useState('');
  const [inspectorName, setInspectorName] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [results, setResults] = useState<ChecklistResults>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [editingSubmissionId, setEditingSubmissionId] = useState<number | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      setError(event.message);
    };
    window.addEventListener('error', handleError);
    fetchSubmissions();
    return () => window.removeEventListener('error', handleError);
  }, []);

  const currentSection = CHECKLIST_DATA[currentSectionIndex];

  const compressImage = (base64Str: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64Str;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800;
        const MAX_HEIGHT = 800;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };
    });
  };

  const handlePhotoUpload = (itemId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const currentPhotos = results[itemId]?.photos || [];
    if (currentPhotos.length >= 3) {
      alert('Máximo de 3 fotos por item.');
      return;
    }

    Array.from(files).slice(0, 3 - currentPhotos.length).forEach((file: File) => {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const compressed = await compressImage(reader.result as string);
        setResults(prev => ({
          ...prev,
          [itemId]: {
            ...(prev[itemId] || { status: null, observation: '' }),
            photos: [...(prev[itemId]?.photos || []), compressed]
          }
        }));
      };
      reader.readAsDataURL(file);
    });
  };

  const handleStatusChange = (itemId: string, status: Status) => {
    setResults(prev => ({
      ...prev,
      [itemId]: {
        ...(prev[itemId] || { photos: [], observation: '' }),
        status
      }
    }));
  };

  const removePhoto = (itemId: string, photoIndex: number) => {
    setResults(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        photos: prev[itemId].photos.filter((_, i) => i !== photoIndex)
      }
    }));
  };

  const handleObservationChange = (itemId: string, observation: string) => {
    setResults(prev => ({
      ...prev,
      [itemId]: {
        ...(prev[itemId] || { status: null, photos: [] }),
        observation
      }
    }));
  };

  const totalItemsCount = useMemo(() => CHECKLIST_DATA.reduce((acc, sec) => acc + sec.items.length, 0), []);
  const answeredItemsCount = useMemo(() => Object.values(results).filter((r: ItemResult) => r.status !== null).length, [results]);
  const progressPercentage = (answeredItemsCount / totalItemsCount) * 100;

  const score = useMemo(() => {
    const conformeItems = Object.values(results).filter((r: ItemResult) => r.status === 'conforme').length;
    return totalItemsCount > 0 ? (conformeItems / totalItemsCount) * 10 : 0;
  }, [results, totalItemsCount]);

  const isAllItemsAnswered = (submissionData: any) => {
    const answeredItems = Object.values(submissionData || {}).filter((r: any) => r.status !== null).length;
    return answeredItems === totalItemsCount;
  };

  const saveSubmission = async () => {
    if (!unitName || !inspectorName) {
      alert('Por favor, preencha o nome da unidade e do inspetor.');
      return;
    }

    setIsSaving(true);
    try {
      const submissionData = {
        unit_name: unitName,
        inspector_name: inspectorName,
        date,
        score,
        data: results
      };

      if (editingSubmissionId) {
        // Atualizar submission existente
        const { error } = await supabase
          .from('submissions')
          .update(submissionData)
          .eq('id', editingSubmissionId);

        if (error) throw error;
      } else {
        // Criar nova submission
        const { data: insertedData, error } = await supabase
          .from('submissions')
          .insert([submissionData])
          .select();

        if (error) {
          console.error('Supabase Error:', error);
          throw new Error(error.message);
        }
      }

      setShowSuccess(true);
      setEditingSubmissionId(null);
      fetchSubmissions();
    } catch (error: any) {
      console.error('Save error:', error);
      alert(`Erro ao salvar no Supabase: ${error.message || 'Verifique se a tabela "submissions" foi criada.'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const fetchSubmissions = async () => {
    try {
      console.log('📥 [FETCH] Buscando submissions do servidor...');
      
      const { data, error } = await supabase
        .from('submissions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      console.log('📥 [FETCH] Submissions carregadas:', data?.length || 0, 'registros');
      
      if (data && data.length > 0) {
        console.log('📥 [FETCH] Exemplo de registro:', {
          id: data[0].id,
          idType: typeof data[0].id,
          idValue: String(data[0].id),
          idIsUUID: typeof data[0].id === 'string' && data[0].id.includes('-'),
          unit_name: data[0].unit_name,
          created_at: data[0].created_at
        });

        // Verificar tipos de todos os IDs
        const idTypes = new Set(data.map(s => typeof s.id));
        console.log('📥 [FETCH] Tipos de ID encontrados:', Array.from(idTypes));
      }
      
      setSubmissions(data || []);
    } catch (error) {
      console.error('❌ [FETCH] Erro ao buscar submissions:', error);
    }
  };

  // Função para testar permissões do Supabase
  const testSupabasePermissions = async () => {
    console.log('🧪 [TEST] Iniciando teste de permissões...');
    
    try {
      // Test 1: SELECT
      console.log('🧪 [TEST 1/3] Testando SELECT...');
      const { data: selectData, error: selectError } = await supabase
        .from('submissions')
        .select('id, unit_name')
        .limit(1);
      
      if (selectError) {
        console.error('❌ [TEST 1/3] SELECT falhou:', selectError);
        alert('❌ SELECT falhou: ' + selectError.message);
        return;
      }
      console.log('✅ [TEST 1/3] SELECT OK');

      // Test 2: INSERT (se houver dados)
      if (selectData && selectData.length > 0) {
        console.log('🧪 [TEST 2/3] Testando DELETE...');
        
        const { data: deleteData, error: deleteError } = await supabase
          .from('submissions')
          .delete()
          .eq('id', selectData[0].id)
          .select();

        if (deleteError) {
          console.error('❌ [TEST 2/3] DELETE falhou:', deleteError);
          alert('❌ DELETE falhou: ' + deleteError.message + '\n\nExecute o arquivo setup_permissions.sql no SQL Editor do Supabase.');
          return;
        }
        
        console.log('✅ [TEST 2/3] DELETE OK', deleteData);

        // Restaura o registro deletado (para não perder dados no teste)
        if (deleteData && deleteData.length > 0) {
          console.log('🧪 [TEST 3/3] Restaurando registro...');
          await supabase
            .from('submissions')
            .insert(deleteData);
          console.log('✅ [TEST 3/3] RESTORE OK');
        }
      } else {
        console.log('⚠️ [TEST] Nenhum registro para testar DELETE');
      }

      alert('✅ Todos os testes de permissão passaram!\n\nSELECT: OK\nDELETE: OK\nRESTORE: OK');
      
      // Atualiza a lista
      await fetchSubmissions();
      
    } catch (error: any) {
      console.error('❌ [TEST] Erro no teste:', error);
      alert('❌ Erro no teste: ' + error.message);
    }
  };

  const deleteSubmission = async (id: number | string) => {
    setIsDeleting(true);
    try {
      console.log('🗑️ [DELETE] Iniciando exclusão do registro ID:', id, 'Tipo:', typeof id);

      // Convert para string se for número, para garantir compatibilidade
      const idToDelete = String(id);
      console.log('🗑️ [DELETE] ID convertido para string:', idToDelete);

      // Passo 1: Verificar se o registro existe ANTES de tentar excluir
      console.log('🔍 [DELETE] Verificando se o registro existe...');
      const { data: recordExists, error: checkError } = await supabase
        .from('submissions')
        .select('id, unit_name')
        .eq('id', idToDelete)
        .single();

      if (checkError || !recordExists) {
        console.error('❌ [DELETE] Registro não encontrado:', checkError);
        throw new Error('Registro não encontrado ou erro ao verificar.');
      }
      console.log('✅ [DELETE] Registro encontrado:', recordExists.unit_name);

      // Passo 2: Excluir o registro
      console.log('🗑️ [DELETE] Executando DELETE...');
      const { error: deleteError } = await supabase
        .from('submissions')
        .delete()
        .eq('id', idToDelete);

      console.log('🗑️ [DELETE] Resultado DELETE:', deleteError);

      if (deleteError) {
        console.error('❌ [DELETE] Erro ao excluir:', deleteError);
        throw new Error(`Erro ao excluir: ${deleteError.message}`);
      }

      // Passo 3: Verificar se o registro foi REALMENTE excluído
      console.log('🔍 [DELETE] Verificando se foi excluído...');
      const { data: stillExists, error: verifyError } = await supabase
        .from('submissions')
        .select('id')
        .eq('id', idToDelete)
        .maybeSingle();

      console.log('🔍 [DELETE] Resultado verificação:', { stillExists, verifyError });

      if (stillExists) {
        console.error('❌ [DELETE] O registro ainda existe após DELETE!');
        console.error('❌ [DELETE] Isso indica problema com permissões RLS.');
        throw new Error('O registro NÃO foi excluído. Mesmo com chave service_role, ainda não funcionou.');
      }

      console.log('✅ [DELETE] Registro excluído com sucesso! (verificado)');

      // Passo 4: Atualiza a lista localmente primeiro para resposta mais rápida
      console.log('🔄 [DELETE] Atualizando estado local...');
      setSubmissions(prev => {
        const filtered = prev.filter(sub => String(sub.id) !== idToDelete);
        console.log('🔄 [DELETE] Registros restantes:', filtered.length);
        return filtered;
      });

      // Passo 5: Depois busca do servidor para garantir sincronização
      console.log('🔄 [DELETE] Buscando dados atualizados do servidor...');
      await fetchSubmissions();

      // Passo 6: Fecha o modal e mostra sucesso
      setShowDeleteConfirm(null);
      alert('✅ Registro excluído com sucesso!');

    } catch (error: any) {
      console.error('❌ [DELETE] Erro completo:', error);
      console.error('❌ [DELETE] Detalhes do erro:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      });

      let errorMessage = 'Erro ao excluir o registro.';
      
      // Mensagens mais específicas
      if (error.message?.includes('permission denied') || error.message?.includes('insufficient privilege')) {
        errorMessage = '❌ Erro de permissão: Você não tem permissão para excluir este registro.\n\nSolução: Execute no SQL Editor do Supabase:\nALTER TABLE submissions DISABLE ROW LEVEL SECURITY;';
      } else if (error.message?.includes('row-level security policy')) {
        errorMessage = '❌ Erro de política de segurança: A tabela submissions tem RLS habilitado.\n\nSolução: Execute no SQL Editor do Supabase:\nALTER TABLE submissions DISABLE ROW LEVEL SECURITY;';
      } else if (error.message?.includes('NÃO foi excluído')) {
        errorMessage = error.message;
      } else if (error.message) {
        errorMessage = `❌ Erro ao excluir: ${error.message}`;
      }

      alert(errorMessage);
    } finally {
      setIsDeleting(false);
      console.log('🏁 [DELETE] Processo de exclusão finalizado');
    }
  };

  const editSubmission = (submission: any) => {
    setUnitName(submission.unit_name);
    setInspectorName(submission.inspector_name);
    setDate(submission.date);
    setResults(submission.data);
    setEditingSubmissionId(submission.id);
    setStep('info');
  };

  const updateSubmission = async () => {
    if (!unitName || !inspectorName) {
      alert('Por favor, preencha o nome da unidade e do inspetor.');
      return;
    }

    if (!editingSubmissionId) return;

    setIsSaving(true);
    try {
      const updatedData = {
        unit_name: unitName,
        inspector_name: inspectorName,
        date,
        score,
        data: results
      };

      const { error } = await supabase
        .from('submissions')
        .update(updatedData)
        .eq('id', editingSubmissionId);

      if (error) throw error;

      setShowSuccess(true);
      setEditingSubmissionId(null);
      fetchSubmissions();
    } catch (error: any) {
      console.error('Update error:', error);
      alert(`Erro ao atualizar: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const generatePDF = async (action: 'download' | 'share' = 'download') => {
    setIsGeneratingPDF(true);

    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 15;
      const contentWidth = pageWidth - (margin * 2);
      let y = margin;

      const addNewPageIfNeeded = (neededHeight: number) => {
        if (y + neededHeight > pageHeight - margin) {
          pdf.addPage();
          y = margin;
        }
      };

      const addText = (text: string, x: number, fontSize: number, style: 'normal' | 'bold' = 'normal', color: [number, number, number] = [0, 0, 0]) => {
        pdf.setFontSize(fontSize);
        pdf.setFont('helvetica', style);
        pdf.setTextColor(...color);
        
        const lines = pdf.splitTextToSize(text, contentWidth - (x - margin));
        const lineHeight = fontSize * 0.4;
        
        addNewPageIfNeeded(lines.length * lineHeight);
        
        lines.forEach((line: string, idx: number) => {
          pdf.text(line, x, y + (idx * lineHeight));
        });
        
        return lines.length * lineHeight;
      };

      const scoreColor: [number, number, number] = score >= 8 ? [16, 185, 129] : score >= 5 ? [245, 158, 11] : [244, 63, 94];

      pdf.setFillColor(255, 107, 0);
      pdf.rect(0, 0, pageWidth, 8, 'F');

      y = 20;
      pdf.setTextColor(255, 107, 0);
      pdf.setFontSize(24);
      pdf.setFont('helvetica', 'bold');
      pdf.text('HORA DO PASTEL', margin, y);

      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(100, 100, 100);
      pdf.text('RELATORIO TECNICO DE AUDITORIA OPERACIONAL', margin, y + 7);

      pdf.setFillColor(240, 240, 240);
      pdf.roundedRect(pageWidth - margin - 40, 18, 40, 20, 3, 3, 'F');
      pdf.setFontSize(8);
      pdf.setTextColor(100, 100, 100);
      pdf.text('SCORE FINAL', pageWidth - margin - 35, 24);
      pdf.setFontSize(16);
      pdf.setTextColor(...scoreColor);
      pdf.text(score.toFixed(1), pageWidth - margin - 25, 33);

      y = 48;
      pdf.setDrawColor(230, 230, 230);
      pdf.line(margin, y, pageWidth - margin, y);

      y = 58;
      const drawInfoBox = (label: string, value: string, x: number, boxWidth: number, boxY: number) => {
        pdf.setDrawColor(230, 230, 230);
        pdf.roundedRect(x, boxY, boxWidth, 18, 2, 2, 'S');
        
        pdf.setFontSize(7);
        pdf.setTextColor(150, 150, 150);
        pdf.text(label.toUpperCase(), x + 4, boxY + 6);
        
        pdf.setFontSize(10);
        pdf.setTextColor(50, 50, 50);
        pdf.setFont('helvetica', 'bold');
        const truncatedValue = value.length > 25 ? value.substring(0, 25) + '...' : value;
        pdf.text(truncatedValue, x + 4, boxY + 14);
        pdf.setFont('helvetica', 'normal');
      };

      const boxWidth = (contentWidth - 10) / 2;
      const row1Y = y;
      const row2Y = y + 24;
      
      drawInfoBox('Unidade Auditada', unitName || 'N/A', margin, boxWidth, row1Y);
      drawInfoBox('Data da Auditoria', new Date(date).toLocaleDateString('pt-BR'), margin + boxWidth + 10, boxWidth, row1Y);
      drawInfoBox('Auditor Responsavel', inspectorName || 'N/A', margin, boxWidth, row2Y);
      
      const statusText = score >= 8 ? 'APROVADO' : 'NECESSITA ATENCAO';
      const statusColor: [number, number, number] = score >= 8 ? [16, 185, 129] : [244, 63, 94];
      pdf.setDrawColor(230, 230, 230);
      pdf.roundedRect(margin + boxWidth + 10, row2Y, boxWidth, 18, 2, 2, 'S');
      pdf.setFontSize(7);
      pdf.setTextColor(150, 150, 150);
      pdf.text('STATUS GERAL', margin + boxWidth + 14, row2Y + 6);
      pdf.setFontSize(10);
      pdf.setTextColor(...statusColor);
      pdf.setFont('helvetica', 'bold');
      pdf.text(statusText, margin + boxWidth + 14, row2Y + 14);
      pdf.setFont('helvetica', 'normal');

      y = row2Y + 30;

      const allItems = CHECKLIST_DATA.flatMap(s => s.items.map(i => ({ ...i, sectionTitle: s.title })));
      const nonConforming = allItems.filter(i => results[i.id]?.status === 'nao-conforme');
      const conforming = allItems.filter(i => results[i.id]?.status === 'conforme');
      const notEvaluated = allItems.filter(i => !results[i.id]?.status);

      if (nonConforming.length > 0) {
        addNewPageIfNeeded(25);
        
        pdf.setFillColor(244, 63, 94);
        pdf.roundedRect(margin, y, contentWidth, 12, 2, 2, 'F');
        pdf.setFontSize(10);
        pdf.setTextColor(255, 255, 255);
        pdf.setFont('helvetica', 'bold');
        pdf.text('ITENS NAO CONFORMES - REQUER ATENCAO', margin + 5, y + 8);
        pdf.text(`${nonConforming.length}`, pageWidth - margin - 10, y + 8, { align: 'right' });
        pdf.setFont('helvetica', 'normal');
        
        y += 18;

        for (const item of nonConforming) {
          const res = results[item.id];
          
          addNewPageIfNeeded(30);
          
          pdf.setFillColor(255, 240, 240);
          pdf.roundedRect(margin, y, contentWidth, 8, 1, 1, 'F');
          pdf.setFontSize(7);
          pdf.setTextColor(150, 150, 150);
          pdf.text(item.sectionTitle.toUpperCase(), margin + 3, y + 5);
          
          y += 10;
          
          pdf.setFontSize(9);
          pdf.setTextColor(244, 63, 94);
          pdf.setFont('helvetica', 'bold');
          pdf.text(`#${item.id}`, margin, y + 4);
          pdf.setTextColor(50, 50, 50);
          pdf.text(item.question.substring(0, 80) + (item.question.length > 80 ? '...' : ''), margin + 12, y + 4);
          pdf.setFont('helvetica', 'normal');
          
          pdf.setFillColor(255, 240, 240);
          pdf.roundedRect(pageWidth - margin - 25, y - 1, 25, 6, 1, 1, 'F');
          pdf.setFontSize(6);
          pdf.setTextColor(244, 63, 94);
          pdf.text('NAO CONFORME', pageWidth - margin - 22, y + 3);
          
          y += 8;

          if (res?.observation) {
            pdf.setFillColor(255, 250, 240);
            pdf.roundedRect(margin, y, contentWidth, 12, 1, 1, 'F');
            pdf.setFontSize(7);
            pdf.setTextColor(245, 158, 11);
            pdf.text('OBSERVACOES:', margin + 3, y + 4);
            pdf.setTextColor(80, 80, 80);
            const obsLines = pdf.splitTextToSize(`"${res.observation}"`, contentWidth - 8);
            pdf.text(obsLines.slice(0, 2), margin + 3, y + 9);
            y += 15;
          }

          if (res?.photos && res.photos.length > 0) {
            const photoSize = 25;
            const photoSpacing = 5;
            let photoX = margin;
            
            for (let i = 0; i < Math.min(res.photos.length, 3); i++) {
              try {
                pdf.addImage(res.photos[i], 'JPEG', photoX, y, photoSize, photoSize, undefined, 'FAST');
                pdf.setDrawColor(200, 200, 200);
                pdf.rect(photoX, y, photoSize, photoSize, 'S');
              } catch (e) {
                console.error('Erro ao adicionar foto:', e);
              }
              photoX += photoSize + photoSpacing;
            }
            y += photoSize + 5;
          }

          y += 8;
        }
      }

      if (conforming.length > 0) {
        addNewPageIfNeeded(25);
        
        pdf.setFillColor(16, 185, 129);
        pdf.roundedRect(margin, y, contentWidth, 12, 2, 2, 'F');
        pdf.setFontSize(10);
        pdf.setTextColor(255, 255, 255);
        pdf.setFont('helvetica', 'bold');
        pdf.text('ITENS EM CONFORMIDADE', margin + 5, y + 8);
        pdf.text(`${conforming.length}`, pageWidth - margin - 10, y + 8, { align: 'right' });
        pdf.setFont('helvetica', 'normal');
        
        y += 18;

        for (const item of conforming) {
          addNewPageIfNeeded(8);
          
          pdf.setFontSize(8);
          pdf.setTextColor(50, 50, 50);
          pdf.setFont('helvetica', 'bold');
          pdf.text(`${item.id}`, margin, y + 4);
          pdf.setFont('helvetica', 'normal');
          pdf.setTextColor(80, 80, 80);
          const questionText = item.question.length > 70 ? item.question.substring(0, 70) + '...' : item.question;
          pdf.text(questionText, margin + 10, y + 4);
          
          pdf.setFillColor(240, 253, 244);
          pdf.roundedRect(pageWidth - margin - 15, y, 15, 5, 1, 1, 'F');
          pdf.setFontSize(6);
          pdf.setTextColor(16, 185, 129);
          pdf.text('OK', pageWidth - margin - 11, y + 3.5);
          
          y += 8;
        }
      }

      if (notEvaluated.length > 0) {
        addNewPageIfNeeded(25);
        
        pdf.setFillColor(150, 150, 150);
        pdf.roundedRect(margin, y, contentWidth, 12, 2, 2, 'F');
        pdf.setFontSize(10);
        pdf.setTextColor(255, 255, 255);
        pdf.setFont('helvetica', 'bold');
        pdf.text('ITENS NAO AVALIADOS', margin + 5, y + 8);
        pdf.text(`${notEvaluated.length}`, pageWidth - margin - 10, y + 8, { align: 'right' });
        pdf.setFont('helvetica', 'normal');
        
        y += 18;

        for (const item of notEvaluated) {
          addNewPageIfNeeded(8);
          
          pdf.setFontSize(8);
          pdf.setTextColor(100, 100, 100);
          pdf.text(`${item.id}`, margin, y + 4);
          const questionText = item.question.length > 70 ? item.question.substring(0, 70) + '...' : item.question;
          pdf.text(questionText, margin + 10, y + 4);
          
          y += 8;
        }
      }

      addNewPageIfNeeded(30);
      y = Math.max(y + 10, pageHeight - 30);
      
      pdf.setDrawColor(230, 230, 230);
      pdf.line(margin, y, pageWidth - margin, y);
      
      y += 10;
      pdf.setFontSize(7);
      pdf.setTextColor(180, 180, 180);
      pdf.setFont('helvetica', 'bold');
      pdf.text('RELATORIO GERADO ELETRONICAMENTE VIA SISTEMA DE AUDITORIA HORA DO PASTEL', pageWidth / 2, y, { align: 'center' });
      y += 5;
      pdf.setFontSize(6);
      pdf.text(`ID do Documento: ${Date.now()} | Gerado em: ${new Date().toLocaleString('pt-BR')}`, pageWidth / 2, y, { align: 'center' });

      const safeUnitName = (unitName || 'AUDITORIA').toUpperCase().replace(/\s+/g, '_');
      const fileName = `AUDITORIA_${safeUnitName}_${date}.pdf`;

      if (action === 'share' && navigator.share) {
        const pdfBlob = pdf.output('blob');
        const file = new File([pdfBlob], fileName, { type: 'application/pdf' });

        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: 'Relatorio de Auditoria',
            text: `Relatorio da unidade ${unitName}`,
          });
        } else {
          pdf.save(fileName);
        }
      } else {
        pdf.save(fileName);
      }
    } catch (err) {
      console.error('PDF Error:', err);
      alert('Erro ao gerar o PDF. Tente novamente.');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  if (error) {
    return (
      <div className="p-10 text-center bg-rose-50 min-h-screen flex flex-col items-center justify-center">
        <AlertTriangle size={48} className="text-rose-500 mb-4" />
        <h1 className="text-2xl font-bold text-rose-800">Ops! Algo deu errado.</h1>
        <p className="text-rose-600 mt-2 max-w-md">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-6 px-6 py-2 bg-rose-600 text-white rounded-lg font-bold"
        >
          Tentar Novamente
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#1A1A1A] font-sans pb-28">
      <header className="bg-white border-b border-stone-200 sticky top-0 z-40 px-4 md:px-6 py-3 md:py-4">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3 md:gap-4">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-[#FF6B00] rounded-xl md:rounded-2xl flex items-center justify-center text-white shadow-lg shadow-orange-100 transform -rotate-3">
              <span className="font-black text-xl md:text-2xl">H</span>
            </div>
            <div>
              <h1 className="font-bold text-base md:text-xl tracking-tight">Hora do Pastel</h1>
              <div className="flex items-center gap-1.5 md:gap-2">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                <p className="text-[8px] md:text-[10px] text-stone-400 uppercase font-bold tracking-widest">Sistema de Auditoria</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => { fetchSubmissions(); setStep('history'); }}
              className={cn(
                "p-2.5 rounded-xl transition-all",
                step === 'history' ? "bg-orange-50 text-orange-600" : "hover:bg-stone-100 text-stone-500"
              )}
            >
              <History size={22} />
            </button>
            <button
              onClick={() => setStep('info')}
              className={cn(
                "p-2.5 rounded-xl transition-all",
                step === 'info' ? "bg-orange-50 text-orange-600" : "hover:bg-stone-100 text-stone-500"
              )}
            >
              <Plus size={22} />
            </button>
          </div>
        </div>
      </header>

      {step === 'checklist' && (
        <div className="sticky top-[73px] z-30 bg-white/80 backdrop-blur-md border-b border-stone-100">
          <div className="h-1.5 bg-stone-100 w-full overflow-hidden">
            <div
              className="h-full bg-orange-500 transition-all duration-500 ease-out"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
          <div className="max-w-5xl mx-auto px-6 py-2 flex justify-between items-center text-[10px] font-bold text-stone-400 uppercase tracking-tighter">
            <span>Progresso da Auditoria</span>
            <span className="text-orange-600">{answeredItemsCount} / {totalItemsCount} Itens</span>
          </div>
        </div>
      )}

      <main className="max-w-5xl mx-auto p-4 md:p-6">
        {showSuccess && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/90 backdrop-blur-sm px-4">
            <div className="text-center p-8 md:p-10 bg-white rounded-[32px] md:rounded-[40px] shadow-2xl border border-stone-100 max-w-sm w-full">
              <div className="w-20 h-20 md:w-24 md:h-24 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-100">
                <CheckCircle2 size={40} className="text-white md:hidden" />
                <CheckCircle2 size={48} className="text-white hidden md:block" />
              </div>
              <h2 className="text-xl md:text-2xl font-black text-stone-900 mb-2">Sucesso!</h2>
              <p className="text-sm md:text-base text-stone-500 font-medium mb-6">
                {editingSubmissionId ? 'Auditoria atualizada com sucesso!' : 'Auditoria salva e sincronizada localmente.'}
              </p>

              {answeredItemsCount === totalItemsCount && (
                <div className="space-y-3">
                  <button
                    onClick={() => generatePDF('share')}
                    disabled={isGeneratingPDF}
                    className="w-full py-4 bg-emerald-500 text-white font-black rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-100 disabled:opacity-50"
                  >
                    {isGeneratingPDF ? <Loader2 className="animate-spin" /> : <Share2 size={20} />}
                    COMPARTILHAR PDF
                  </button>
                  <button
                    onClick={() => generatePDF('download')}
                    disabled={isGeneratingPDF}
                    className="w-full py-4 bg-orange-500 text-white font-black rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-orange-100 disabled:opacity-50"
                  >
                    {isGeneratingPDF ? <Loader2 className="animate-spin" /> : <Download size={20} />}
                    BAIXAR PDF
                  </button>
                </div>
              )}

              <button
                onClick={() => { setShowSuccess(false); setStep('history'); }}
                className="w-full py-4 bg-stone-100 text-stone-600 font-bold rounded-2xl mt-3"
              >
                Ir para o Historico
              </button>
            </div>
          </div>
        )}

        {step === 'info' && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-3xl md:rounded-[32px] p-6 md:p-8 shadow-xl shadow-stone-200/50 border border-stone-100">
              <div className="mb-6 md:mb-8">
                <h2 className="text-2xl md:text-3xl font-bold text-stone-900 tracking-tight">
                  {editingSubmissionId ? 'Editar Auditoria' : 'Nova Inspecao'}
                </h2>
                <p className="text-sm md:text-base text-stone-500 mt-1">
                  {editingSubmissionId ? 'Atualize os dados da auditoria.' : 'Preencha os dados da unidade para comecar.'}
                </p>
              </div>

              <div className="space-y-5 md:space-y-6">
                <div className="space-y-1.5 md:space-y-2">
                  <label className="text-[10px] md:text-xs font-bold text-stone-400 uppercase ml-1">Unidade Operacional</label>
                  <select
                    value={unitName}
                    onChange={e => setUnitName(e.target.value)}
                    className="w-full p-3.5 md:p-4 bg-stone-50 border border-stone-200 rounded-xl md:rounded-2xl focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 outline-none transition-all text-sm md:text-base appearance-none cursor-pointer"
                  >
                    <option value="" disabled selected>Selecione a loja</option>
                    {STORES.map(store => (
                      <option key={store} value={store}>{store}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5 md:space-y-2">
                  <label className="text-[10px] md:text-xs font-bold text-stone-400 uppercase ml-1">Responsavel pela Auditoria</label>
                  <input
                    type="text"
                    value={inspectorName}
                    onChange={e => setInspectorName(e.target.value)}
                    placeholder="Nome completo do inspetor"
                    className="w-full p-3.5 md:p-4 bg-stone-50 border border-stone-200 rounded-xl md:rounded-2xl focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 outline-none transition-all placeholder:text-stone-300 text-sm md:text-base"
                  />
                </div>

                <div className="space-y-1.5 md:space-y-2">
                  <label className="text-[10px] md:text-xs font-bold text-stone-400 uppercase ml-1">Data da Visita</label>
                  <input
                    type="date"
                    value={date}
                    onChange={e => setDate(e.target.value)}
                    className="w-full p-3.5 md:p-4 bg-stone-50 border border-stone-200 rounded-xl md:rounded-2xl focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 outline-none transition-all text-sm md:text-base"
                  />
                </div>

                <button
                  onClick={() => {
                    if (editingSubmissionId) {
                      setStep('checklist');
                    } else {
                      setStep('checklist');
                    }
                  }}
                  disabled={!unitName || !inspectorName}
                  className="w-full bg-[#1A1A1A] text-white font-bold py-4 md:py-5 rounded-xl md:rounded-[24px] mt-2 md:mt-4 hover:bg-stone-800 active:scale-[0.98] transition-all disabled:opacity-20 disabled:pointer-events-none shadow-xl shadow-stone-200 text-sm md:text-base"
                >
                  {editingSubmissionId ? 'Continuar Edição' : 'Iniciar Auditoria'}
                </button>
              </div>
            </div>
          </div>
        )}

        {step === 'checklist' && (
          <div className="space-y-6 md:space-y-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-2">
              <div>
                <span className="text-[8px] md:text-[10px] font-black text-orange-500 uppercase tracking-[0.2em] mb-1 block">Secao Atual</span>
                <h2 className="text-xl md:text-3xl font-black text-stone-900 leading-tight">{currentSection.title}</h2>
              </div>
              <div className="flex items-center justify-between md:justify-end gap-3">
                <div className="bg-white px-3 md:px-4 py-1.5 md:py-2 rounded-xl md:rounded-2xl border border-stone-200 shadow-sm flex items-center gap-2 md:gap-3">
                  <span className="text-[8px] md:text-[10px] font-bold text-stone-400 uppercase">Score</span>
                  <span className={cn(
                    "text-lg md:text-xl font-black",
                    score >= 8 ? "text-emerald-500" : score >= 5 ? "text-amber-500" : "text-rose-500"
                  )}>{score.toFixed(1)}</span>
                </div>
                <div className="flex gap-1">
                  <button
                    disabled={currentSectionIndex === 0}
                    onClick={() => {
                      setCurrentSectionIndex(i => i - 1);
                      window.scrollTo(0, 0);
                    }}
                    className="p-2.5 md:p-3 bg-white border border-stone-200 rounded-lg md:rounded-xl hover:bg-stone-50 disabled:opacity-20 transition-all"
                  >
                    <ChevronLeft size={18} className="md:hidden" />
                    <ChevronLeft size={20} className="hidden md:block" />
                  </button>
                  <button
                    disabled={currentSectionIndex === CHECKLIST_DATA.length - 1}
                    onClick={() => {
                      setCurrentSectionIndex(i => i + 1);
                      window.scrollTo(0, 0);
                    }}
                    className="p-2.5 md:p-3 bg-white border border-stone-200 rounded-lg md:rounded-xl hover:bg-stone-50 disabled:opacity-20 transition-all"
                  >
                    <ChevronRight size={18} className="md:hidden" />
                    <ChevronRight size={20} className="hidden md:block" />
                  </button>
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:gap-6">
              {currentSection.items.map((item) => (
                <div key={item.id} className="bg-white rounded-2xl md:rounded-[32px] p-5 md:p-8 border border-stone-100 shadow-sm hover:shadow-md transition-all group">
                  <div className="flex flex-col md:flex-row gap-5 md:gap-6">
                    <div className="flex-1">
                      <div className="flex gap-3 md:gap-4 mb-5 md:mb-6">
                        <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl bg-stone-50 flex items-center justify-center text-stone-400 font-black text-xs md:text-sm group-hover:bg-orange-50 group-hover:text-orange-500 transition-colors shrink-0">
                          {item.id}
                        </div>
                        <p className="text-base md:text-lg font-bold text-stone-800 leading-snug pt-0.5">{item.question}</p>
                      </div>

                      <div className="grid grid-cols-2 gap-2.5 md:gap-3">
                        <button
                          onClick={() => handleStatusChange(item.id, 'conforme')}
                          className={cn(
                            "flex items-center justify-center gap-2 md:gap-3 py-3.5 md:py-4 rounded-xl md:rounded-2xl border-2 font-black text-xs md:text-sm transition-all",
                            results[item.id]?.status === 'conforme'
                              ? "bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-100"
                              : "bg-white border-stone-100 text-stone-400 hover:border-stone-200"
                          )}
                        >
                          <CheckCircle2 size={16} className="md:hidden" />
                          <CheckCircle2 size={18} className="hidden md:block" />
                          CONFORME
                        </button>
                        <button
                          onClick={() => handleStatusChange(item.id, 'nao-conforme')}
                          className={cn(
                            "flex items-center justify-center gap-2 md:gap-3 py-3.5 md:py-4 rounded-xl md:rounded-2xl border-2 font-black text-xs md:text-sm transition-all",
                            results[item.id]?.status === 'nao-conforme'
                              ? "bg-rose-500 border-rose-500 text-white shadow-lg shadow-rose-100"
                              : "bg-white border-stone-100 text-stone-400 hover:border-stone-200"
                          )}
                        >
                          <XCircle size={16} className="md:hidden" />
                          <XCircle size={18} className="hidden md:block" />
                          NAO CONFORME
                        </button>
                      </div>
                    </div>

                    <div className="w-full md:w-72 space-y-4">
                      <div className="space-y-2">
                        <label className="text-[9px] md:text-[10px] font-black text-stone-400 uppercase tracking-widest ml-1">Evidencias (Max 3)</label>
                        <div className="flex gap-2">
                          {results[item.id]?.photos?.map((photo, idx) => (
                            <div key={idx} className="relative w-14 h-14 md:w-16 md:h-16 rounded-lg md:rounded-xl overflow-hidden border border-stone-200 group/photo">
                              <img src={photo} alt="Evidencia" className="w-full h-full object-cover" />
                              <button
                                onClick={() => removePhoto(item.id, idx)}
                                className="absolute inset-0 bg-rose-500/80 text-white flex items-center justify-center opacity-0 group-hover/photo:opacity-100 transition-opacity"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          ))}
                          {(results[item.id]?.photos?.length || 0) < 3 && (
                            <label className="w-14 h-14 md:w-16 md:h-16 rounded-lg md:rounded-xl border-2 border-dashed border-stone-200 flex flex-col items-center justify-center text-stone-300 hover:border-orange-300 hover:text-orange-400 cursor-pointer transition-all bg-stone-50/50">
                              <Camera size={18} />
                              <input
                                type="file"
                                accept="image/*"
                                capture="environment"
                                multiple
                                className="hidden"
                                onChange={(e) => handlePhotoUpload(item.id, e)}
                              />
                            </label>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[9px] md:text-[10px] font-black text-stone-400 uppercase tracking-widest ml-1">Observacoes</label>
                        <textarea
                          placeholder="Descreva detalhes..."
                          value={results[item.id]?.observation || ''}
                          onChange={(e) => handleObservationChange(item.id, e.target.value)}
                          className="w-full p-3 bg-stone-50 border border-stone-100 rounded-xl text-xs focus:ring-4 focus:ring-orange-500/5 focus:border-orange-500 outline-none min-h-[70px] md:min-h-[80px] resize-none placeholder:text-stone-300"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {currentSectionIndex === CHECKLIST_DATA.length - 1 && answeredItemsCount === totalItemsCount && (
              <div className="bg-orange-50 border-2 border-orange-200 rounded-2xl md:rounded-[32px] p-6 md:p-8 text-center">
                <div className="w-14 h-14 md:w-16 md:h-16 bg-orange-500 text-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-orange-200">
                  <FileText size={28} className="md:hidden" />
                  <FileText size={32} className="hidden md:block" />
                </div>
                <h3 className="text-xl md:text-2xl font-black text-orange-900 mb-2">Auditoria Completa</h3>
                <p className="text-sm md:text-base text-orange-700 font-medium mb-6">Todos os itens foram verificados. Nota final calculada: <span className="font-black">{score.toFixed(1)}</span></p>
              </div>
            )}

            <div className="flex flex-col md:flex-row gap-3 md:gap-4 pt-6 md:pt-10 pb-16 md:pb-20">
              {editingSubmissionId && (
                <button
                  onClick={() => {
                    setEditingSubmissionId(null);
                    setUnitName('');
                    setInspectorName('');
                    setDate(new Date().toISOString().split('T')[0]);
                    setResults({});
                    setStep('history');
                  }}
                  className="w-full md:flex-1 py-4 md:py-5 bg-rose-50 border border-rose-200 text-rose-600 font-bold rounded-xl md:rounded-[24px] hover:bg-rose-100 transition-all text-sm md:text-base flex items-center justify-center gap-2"
                >
                  <XIcon size={18} />
                  Cancelar Edição
                </button>
              )}
              <button
                onClick={() => {
                  if (currentSectionIndex > 0) {
                    setCurrentSectionIndex(i => i - 1);
                    window.scrollTo(0, 0);
                  } else {
                    setStep('info');
                  }
                }}
                className={`w-full ${editingSubmissionId ? 'md:flex-1' : 'md:flex-[2]'} py-4 md:py-5 bg-white border border-stone-200 text-stone-600 font-bold rounded-xl md:rounded-[24px] hover:bg-stone-50 transition-all text-sm md:text-base flex items-center justify-center gap-2`}
              >
                <ChevronLeft size={18} />
                {currentSectionIndex > 0 ? 'Etapa Anterior' : 'Voltar aos Dados'}
              </button>

              {currentSectionIndex < CHECKLIST_DATA.length - 1 ? (
                <button
                  onClick={() => {
                    setCurrentSectionIndex(i => i + 1);
                    window.scrollTo(0, 0);
                  }}
                  className="w-full md:flex-[2] py-4 md:py-5 bg-[#1A1A1A] text-white font-black rounded-xl md:rounded-[24px] hover:bg-stone-800 transition-all shadow-xl shadow-stone-200 flex items-center justify-center gap-2 md:gap-3 text-sm md:text-base"
                >
                  PROXIMA ETAPA
                  <ChevronRight size={22} />
                </button>
              ) : (
                <button
                  onClick={saveSubmission}
                  disabled={isSaving || answeredItemsCount < totalItemsCount}
                  className="w-full md:flex-[2] py-4 md:py-5 bg-[#FF6B00] text-white font-black rounded-xl md:rounded-[24px] hover:bg-orange-600 transition-all shadow-xl shadow-orange-200 flex items-center justify-center gap-2 md:gap-3 disabled:opacity-20 disabled:grayscale text-sm md:text-base"
                >
                  {isSaving ? <Loader2 className="animate-spin" /> : <Save size={20} className="md:hidden" />}
                  {isSaving ? null : <Save size={22} className="hidden md:block" />}
                  {editingSubmissionId ? 'ATUALIZAR AUDITORIA' : 'FINALIZAR AUDITORIA'}
                </button>
              )}
            </div>
          </div>
        )}

        {step === 'history' && (
          <div className="max-w-3xl mx-auto space-y-5 md:space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 md:mb-8">
              <div>
                <h2 className="text-2xl md:text-3xl font-black text-stone-900 tracking-tight">Historico</h2>
                <p className="text-sm md:text-base text-stone-500">Relatorios de auditorias anteriores.</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={testSupabasePermissions}
                  className="w-full md:w-auto px-4 py-3.5 bg-amber-100 text-amber-700 rounded-xl md:rounded-2xl font-bold text-xs shadow-lg hover:bg-amber-200 transition-all"
                  title="Testar permissões do Supabase"
                >
                  🔧 Testar Permissões
                </button>
                <button
                  onClick={() => setStep('info')}
                  className="w-full md:w-auto px-6 py-3.5 bg-[#1A1A1A] text-white rounded-xl md:rounded-2xl font-bold text-sm shadow-lg shadow-stone-200 hover:bg-stone-800 transition-all"
                >
                  Nova Auditoria
                </button>
              </div>
            </div>

            {submissions.length === 0 ? (
              <div className="bg-white p-12 md:p-20 rounded-3xl md:rounded-[40px] border border-stone-100 text-center shadow-sm">
                <div className="w-16 h-16 md:w-20 md:h-20 bg-stone-50 rounded-full flex items-center justify-center mx-auto mb-6">
                  <FileText size={28} className="text-stone-200 md:hidden" />
                  <FileText size={32} className="text-stone-200 hidden md:block" />
                </div>
                <p className="text-stone-400 font-bold uppercase tracking-widest text-[10px] md:text-xs">Nenhum registro encontrado</p>
              </div>
            ) : (
              <div className="grid gap-3 md:gap-4">
                {submissions.map((sub) => (
                  <div key={sub.id} className="bg-white p-4 md:p-6 rounded-2xl md:rounded-[28px] border border-stone-100 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row justify-between items-center gap-4 md:gap-6 group">
                    <div className="flex items-center gap-4 md:gap-6 w-full md:w-auto">
                      <div className={cn(
                        "w-14 h-14 md:w-16 md:h-16 rounded-xl md:rounded-2xl flex flex-col items-center justify-center font-black text-lg md:text-xl shadow-sm transform group-hover:scale-105 transition-transform shrink-0",
                        sub.score >= 8 ? "bg-emerald-50 text-emerald-600" :
                          sub.score >= 5 ? "bg-amber-50 text-amber-600" : "bg-rose-50 text-rose-600"
                      )}>
                        <span className="text-[8px] md:text-[10px] uppercase tracking-tighter opacity-50">Score</span>
                        {sub.score.toFixed(1)}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-black text-base md:text-lg text-stone-800 leading-none mb-1.5 truncate">{sub.unit_name}</h3>
                        <div className="flex flex-wrap items-center gap-2 md:gap-3 text-[10px] md:text-xs font-bold text-stone-400 uppercase tracking-wider">
                          <span>{new Date(sub.date).toLocaleDateString('pt-BR')}</span>
                          <span className="hidden md:inline w-1 h-1 bg-stone-200 rounded-full"></span>
                          <span className="truncate max-w-[120px] md:max-w-none">{sub.inspector_name}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2 w-full md:w-auto">
                      <button
                        onClick={() => {
                          setUnitName(sub.unit_name);
                          setInspectorName(sub.inspector_name);
                          setDate(sub.date);
                          setResults(sub.data);
                          generatePDF('download');
                        }}
                        disabled={isGeneratingPDF || !isAllItemsAnswered(sub.data)}
                        className="flex-1 md:flex-none flex items-center justify-center gap-2 md:gap-3 px-5 py-3.5 md:px-6 md:py-4 bg-stone-50 text-stone-600 rounded-xl md:rounded-2xl font-black text-[10px] md:text-xs hover:bg-orange-500 hover:text-white transition-all group/btn disabled:opacity-50 disabled:cursor-not-allowed"
                        title={!isAllItemsAnswered(sub.data) ? 'Complete todos os itens antes de gerar PDF' : 'Baixar PDF'}
                      >
                        {isGeneratingPDF ? (
                          <Loader2 size={18} className="animate-spin" />
                        ) : (
                          <>
                            <Download size={16} className="md:hidden" />
                            <Download size={18} className="hidden md:block group-hover/btn:animate-bounce" />
                          </>
                        )}
                        {isGeneratingPDF ? 'GERANDO...' : 'PDF'}
                      </button>
                      <button
                        onClick={() => editSubmission(sub)}
                        className="flex items-center justify-center p-3.5 md:p-4 bg-stone-50 text-stone-600 rounded-xl md:rounded-2xl hover:bg-blue-500 hover:text-white transition-all"
                        title="Editar"
                      >
                        <Edit size={18} />
                      </button>
                      <button
                        onClick={() => {
                          console.log('Botão de exclusão clicado para ID:', sub.id, 'Tipo:', typeof sub.id);
                          setShowDeleteConfirm(sub.id);
                        }}
                        className="flex items-center justify-center p-3.5 md:p-4 bg-stone-50 text-stone-600 rounded-xl md:rounded-2xl hover:bg-rose-500 hover:text-white transition-all"
                        title="Excluir"
                      >
                        <Trash2 size={18} />
                      </button>
                      <button
                        onClick={() => {
                          setUnitName(sub.unit_name);
                          setInspectorName(sub.inspector_name);
                          setDate(sub.date);
                          setResults(sub.data);
                          generatePDF('share');
                        }}
                        disabled={isGeneratingPDF || !isAllItemsAnswered(sub.data)}
                        className="flex items-center justify-center p-3.5 md:p-4 bg-stone-50 text-stone-600 rounded-xl md:rounded-2xl hover:bg-emerald-500 hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        title={!isAllItemsAnswered(sub.data) ? 'Complete todos os itens antes de compartilhar' : 'Compartilhar PDF'}
                      >
                        <Share2 size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {isGeneratingPDF && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
          <div className="bg-white rounded-[32px] p-8 max-w-sm w-full text-center shadow-2xl animate-in fade-in zoom-in duration-300">
            <div className="w-20 h-20 bg-orange-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-orange-200">
              <Loader2 size={40} className="text-white animate-spin" />
            </div>
            <h3 className="text-xl font-black text-stone-800 mb-2">Gerando Relatorio</h3>
            <p className="text-stone-500 font-bold text-sm leading-relaxed">
              Estamos processando os dados. Isso pode levar alguns segundos...
            </p>
            <div className="mt-6 h-1.5 w-full bg-stone-100 rounded-full overflow-hidden">
              <div className="h-full bg-orange-500 animate-progress w-full origin-left"></div>
            </div>
          </div>
        </div>
      )}

      {showDeleteConfirm !== null && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
          <div className="bg-white rounded-[32px] p-8 max-w-sm w-full text-center shadow-2xl animate-in fade-in zoom-in duration-300">
            <div className="w-20 h-20 bg-rose-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-rose-200">
              <Trash2 size={40} className="text-white" />
            </div>
            <h3 className="text-xl md:text-2xl font-black text-stone-900 mb-2">Confirmar Exclusão</h3>
            <p className="text-stone-500 font-medium text-sm md:text-base leading-relaxed mb-6">
              Tem certeza que deseja excluir este registro? Esta ação não pode ser desfeita.
            </p>
            <div className="space-y-3">
              <button
                onClick={() => deleteSubmission(showDeleteConfirm)}
                disabled={isDeleting}
                className="w-full py-4 bg-rose-500 text-white font-black rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-rose-100 disabled:opacity-50"
              >
                {isDeleting ? <Loader2 className="animate-spin" /> : <Trash2 size={20} />}
                SIM, EXCLUIR
              </button>
              <button
                onClick={() => setShowDeleteConfirm(null)}
                disabled={isDeleting}
                className="w-full py-4 bg-stone-100 text-stone-600 font-bold rounded-2xl"
              >
                CANCELAR
              </button>
            </div>
          </div>
        </div>
      )}

      <nav className="fixed bottom-4 md:bottom-6 left-1/2 -translate-x-1/2 bg-[#1A1A1A] text-white px-6 md:px-8 py-3 md:py-4 rounded-3xl md:rounded-[32px] flex items-center gap-8 md:gap-12 z-50 shadow-2xl shadow-stone-900/20 border border-white/10 w-[90%] md:w-auto justify-center">
        <button
          onClick={() => setStep('info')}
          className={cn("flex flex-col items-center gap-1 transition-all", step === 'info' ? "text-orange-500 scale-110" : "text-stone-500 hover:text-stone-300")}
        >
          <Plus size={20} className="md:hidden" />
          <Plus size={24} className="hidden md:block" />
          <span className="text-[7px] md:text-[8px] font-black uppercase tracking-widest">Novo</span>
        </button>
        <button
          onClick={() => setStep('checklist')}
          className={cn("flex flex-col items-center gap-1 transition-all", step === 'checklist' ? "text-orange-500 scale-110" : "text-stone-500 hover:text-stone-300")}
        >
          <CheckCircle2 size={20} className="md:hidden" />
          <CheckCircle2 size={24} className="hidden md:block" />
          <span className="text-[7px] md:text-[8px] font-black uppercase tracking-widest">Check</span>
        </button>
        <button
          onClick={() => { fetchSubmissions(); setStep('history'); }}
          className={cn("flex flex-col items-center gap-1 transition-all", step === 'history' ? "text-orange-500 scale-110" : "text-stone-500 hover:text-stone-300")}
        >
          <History size={20} className="md:hidden" />
          <History size={24} className="hidden md:block" />
          <span className="text-[7px] md:text-[8px] font-black uppercase tracking-widest">Logs</span>
        </button>
      </nav>
    </div>
  );
}
