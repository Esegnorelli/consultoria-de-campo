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
  AlertTriangle
} from 'lucide-react';
import { CHECKLIST_DATA } from './constants';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

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
  const [showSuccess, setShowSuccess] = useState(false);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);

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

  const handleStatusChange = (itemId: string, status: Status) => {
    setResults(prev => ({
      ...prev,
      [itemId]: {
        ...(prev[itemId] || { photos: [], observation: '' }),
        status
      }
    }));
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
      reader.onloadend = () => {
        setResults(prev => ({
          ...prev,
          [itemId]: {
            ...(prev[itemId] || { status: null, observation: '' }),
            photos: [...(prev[itemId]?.photos || []), reader.result as string]
          }
        }));
      };
      reader.readAsDataURL(file);
    });
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

  const saveSubmission = async () => {
    if (!unitName || !inspectorName) {
      alert('Por favor, preencha o nome da unidade e do inspetor.');
      return;
    }

    setIsSaving(true);
    try {
      const newSubmission = {
        id: Date.now(),
        unit_name: unitName,
        inspector_name: inspectorName,
        date,
        score,
        data: results
      };

      const existingSubmissions = JSON.parse(localStorage.getItem('checklist_submissions') || '[]');
      const updatedSubmissions = [newSubmission, ...existingSubmissions];
      localStorage.setItem('checklist_submissions', JSON.stringify(updatedSubmissions));

      setShowSuccess(true);
      fetchSubmissions();
      setTimeout(() => {
        setShowSuccess(false);
        setStep('history');
      }, 2000);
    } catch (error) {
      console.error(error);
      alert('Erro ao salvar checklist.');
    } finally {
      setIsSaving(false);
    }
  };

  const fetchSubmissions = async () => {
    try {
      const data = JSON.parse(localStorage.getItem('checklist_submissions') || '[]');
      setSubmissions(data);
    } catch (error) {
      console.error(error);
    }
  };

  const generatePDF = async () => {
    if (!reportRef.current) return;
    
    const canvas = await html2canvas(reportRef.current, {
      scale: 2,
      useCORS: true,
      logging: false
    });
    
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const imgProps = pdf.getImageProperties(imgData);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
    
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`Checklist_${unitName}_${date}.pdf`);
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
    <div className="min-h-screen bg-[#F8F9FA] text-[#1A1A1A] font-sans pb-24">
      {/* Premium Header */}
      <header className="bg-white border-b border-stone-200 sticky top-0 z-40 px-6 py-4">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-[#FF6B00] rounded-2xl flex items-center justify-center text-white shadow-lg shadow-orange-100 transform -rotate-3">
              <span className="font-black text-2xl">H</span>
            </div>
            <div>
              <h1 className="font-bold text-xl tracking-tight">Hora do Pastel</h1>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                <p className="text-[10px] text-stone-400 uppercase font-bold tracking-widest">Sistema de Auditoria</p>
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

      {/* Progress Bar (Sticky) */}
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

      <main className="max-w-5xl mx-auto p-6">
        {showSuccess && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/90 backdrop-blur-sm">
            <div className="text-center p-10 bg-white rounded-[40px] shadow-2xl border border-stone-100 max-w-sm w-full mx-4">
              <div className="w-24 h-24 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-100">
                <CheckCircle2 size={48} className="text-white" />
              </div>
              <h2 className="text-2xl font-black text-stone-900 mb-2">Sucesso!</h2>
              <p className="text-stone-500 font-medium">Auditoria salva e sincronizada com o servidor.</p>
            </div>
          </div>
        )}

        {step === 'info' && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-[32px] p-8 shadow-xl shadow-stone-200/50 border border-stone-100">
              <div className="mb-8">
                <h2 className="text-3xl font-bold text-stone-900 tracking-tight">Nova Inspeção</h2>
                <p className="text-stone-500 mt-1">Preencha os dados da unidade para começar.</p>
              </div>
              
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-stone-400 uppercase ml-1">Unidade Operacional</label>
                  <div className="relative">
                    <input 
                      type="text" 
                      value={unitName}
                      onChange={e => setUnitName(e.target.value)}
                      placeholder="Ex: Unidade Shopping Central"
                      className="w-full p-4 bg-stone-50 border border-stone-200 rounded-2xl focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 outline-none transition-all placeholder:text-stone-300"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-stone-400 uppercase ml-1">Responsável pela Auditoria</label>
                  <input 
                    type="text" 
                    value={inspectorName}
                    onChange={e => setInspectorName(e.target.value)}
                    placeholder="Nome completo do inspetor"
                    className="w-full p-4 bg-stone-50 border border-stone-200 rounded-2xl focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 outline-none transition-all placeholder:text-stone-300"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-stone-400 uppercase ml-1">Data da Visita</label>
                  <input 
                    type="date" 
                    value={date}
                    onChange={e => setDate(e.target.value)}
                    className="w-full p-4 bg-stone-50 border border-stone-200 rounded-2xl focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 outline-none transition-all"
                  />
                </div>

                <button 
                  onClick={() => setStep('checklist')}
                  disabled={!unitName || !inspectorName}
                  className="w-full bg-[#1A1A1A] text-white font-bold py-5 rounded-[24px] mt-4 hover:bg-stone-800 active:scale-[0.98] transition-all disabled:opacity-20 disabled:pointer-events-none shadow-xl shadow-stone-200"
                >
                  Iniciar Auditoria
                </button>
              </div>
            </div>
          </div>
        )}

        {step === 'checklist' && (
          <div className="space-y-8">
            {/* Section Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-2">
              <div>
                <span className="text-[10px] font-black text-orange-500 uppercase tracking-[0.2em] mb-1 block">Seção Atual</span>
                <h2 className="text-3xl font-black text-stone-900 leading-none">{currentSection.title}</h2>
              </div>
              <div className="flex items-center gap-3">
                <div className="bg-white px-4 py-2 rounded-2xl border border-stone-200 shadow-sm flex items-center gap-3">
                  <span className="text-[10px] font-bold text-stone-400 uppercase">Score</span>
                  <span className={cn(
                    "text-xl font-black",
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
                    className="p-3 bg-white border border-stone-200 rounded-xl hover:bg-stone-50 disabled:opacity-20 transition-all"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <button 
                    disabled={currentSectionIndex === CHECKLIST_DATA.length - 1}
                    onClick={() => {
                      setCurrentSectionIndex(i => i + 1);
                      window.scrollTo(0, 0);
                    }}
                    className="p-3 bg-white border border-stone-200 rounded-xl hover:bg-stone-50 disabled:opacity-20 transition-all"
                  >
                    <ChevronRight size={20} />
                  </button>
                </div>
              </div>
            </div>

            {/* Checklist Items */}
            <div className="grid gap-6">
              {currentSection.items.map((item) => (
                <div key={item.id} className="bg-white rounded-[32px] p-6 md:p-8 border border-stone-100 shadow-sm hover:shadow-md transition-all group">
                  <div className="flex flex-col md:flex-row gap-6">
                    <div className="flex-1">
                      <div className="flex gap-4 mb-6">
                        <div className="w-10 h-10 rounded-xl bg-stone-50 flex items-center justify-center text-stone-400 font-black text-sm group-hover:bg-orange-50 group-hover:text-orange-500 transition-colors shrink-0">
                          {item.id}
                        </div>
                        <p className="text-lg font-bold text-stone-800 leading-snug pt-1">{item.question}</p>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <button 
                          onClick={() => handleStatusChange(item.id, 'conforme')}
                          className={cn(
                            "flex items-center justify-center gap-3 py-4 rounded-2xl border-2 font-black text-sm transition-all",
                            results[item.id]?.status === 'conforme' 
                              ? "bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-100" 
                              : "bg-white border-stone-100 text-stone-400 hover:border-stone-200"
                          )}
                        >
                          <CheckCircle2 size={18} />
                          CONFORME
                        </button>
                        <button 
                          onClick={() => handleStatusChange(item.id, 'nao-conforme')}
                          className={cn(
                            "flex items-center justify-center gap-3 py-4 rounded-2xl border-2 font-black text-sm transition-all",
                            results[item.id]?.status === 'nao-conforme' 
                              ? "bg-rose-500 border-rose-500 text-white shadow-lg shadow-rose-100" 
                              : "bg-white border-stone-100 text-stone-400 hover:border-stone-200"
                          )}
                        >
                          <XCircle size={18} />
                          NÃO CONFORME
                        </button>
                      </div>
                    </div>

                    <div className="w-full md:w-72 space-y-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest ml-1">Evidências (Máx 3)</label>
                        <div className="flex gap-2">
                          {results[item.id]?.photos?.map((photo, idx) => (
                            <div key={idx} className="relative w-16 h-16 rounded-xl overflow-hidden border border-stone-200 group/photo">
                              <img src={photo} alt="Evidência" className="w-full h-full object-cover" />
                              <button 
                                onClick={() => removePhoto(item.id, idx)}
                                className="absolute inset-0 bg-rose-500/80 text-white flex items-center justify-center opacity-0 group-hover/photo:opacity-100 transition-opacity"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          ))}
                          {(results[item.id]?.photos?.length || 0) < 3 && (
                            <label className="w-16 h-16 rounded-xl border-2 border-dashed border-stone-200 flex flex-col items-center justify-center text-stone-300 hover:border-orange-300 hover:text-orange-400 cursor-pointer transition-all bg-stone-50/50">
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
                        <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest ml-1">Observações</label>
                        <textarea 
                          placeholder="Descreva detalhes..."
                          value={results[item.id]?.observation || ''}
                          onChange={(e) => handleObservationChange(item.id, e.target.value)}
                          className="w-full p-3 bg-stone-50 border border-stone-100 rounded-xl text-xs focus:ring-4 focus:ring-orange-500/5 focus:border-orange-500 outline-none min-h-[80px] resize-none placeholder:text-stone-300"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Summary Card before finishing */}
            {currentSectionIndex === CHECKLIST_DATA.length - 1 && answeredItemsCount === totalItemsCount && (
              <div className="bg-orange-50 border-2 border-orange-200 rounded-[32px] p-8 text-center">
                <div className="w-16 h-16 bg-orange-500 text-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-orange-200">
                  <FileText size={32} />
                </div>
                <h3 className="text-2xl font-black text-orange-900 mb-2">Auditoria Completa</h3>
                <p className="text-orange-700 font-medium mb-6">Todos os itens foram verificados. Nota final calculada: <span className="font-black">{score.toFixed(1)}</span></p>
              </div>
            )}

            {/* Footer Actions */}
            <div className="flex flex-col md:flex-row gap-4 pt-10 pb-20">
              <button 
                onClick={() => setStep('info')}
                className="flex-1 py-5 bg-white border border-stone-200 text-stone-600 font-bold rounded-[24px] hover:bg-stone-50 transition-all"
              >
                Voltar aos Dados
              </button>
              <button 
                onClick={saveSubmission}
                disabled={isSaving || answeredItemsCount < totalItemsCount}
                className="flex-[2] py-5 bg-[#FF6B00] text-white font-black rounded-[24px] hover:bg-orange-600 transition-all shadow-xl shadow-orange-200 flex items-center justify-center gap-3 disabled:opacity-20 disabled:grayscale"
              >
                {isSaving ? <Loader2 className="animate-spin" /> : <Save size={22} />}
                FINALIZAR AUDITORIA
              </button>
            </div>
          </div>
        )}

        {step === 'history' && (
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h2 className="text-3xl font-black text-stone-900 tracking-tight">Histórico</h2>
                <p className="text-stone-500">Relatórios de auditorias anteriores.</p>
              </div>
              <button 
                onClick={() => setStep('info')}
                className="px-6 py-3 bg-[#1A1A1A] text-white rounded-2xl font-bold text-sm shadow-lg shadow-stone-200 hover:bg-stone-800 transition-all"
              >
                Nova Auditoria
              </button>
            </div>

            {submissions.length === 0 ? (
              <div className="bg-white p-20 rounded-[40px] border border-stone-100 text-center shadow-sm">
                <div className="w-20 h-20 bg-stone-50 rounded-full flex items-center justify-center mx-auto mb-6">
                  <FileText size={32} className="text-stone-200" />
                </div>
                <p className="text-stone-400 font-bold uppercase tracking-widest text-xs">Nenhum registro encontrado</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {submissions.map((sub) => (
                  <div key={sub.id} className="bg-white p-6 rounded-[28px] border border-stone-100 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row justify-between items-center gap-6 group">
                    <div className="flex items-center gap-6 w-full md:w-auto">
                      <div className={cn(
                        "w-16 h-16 rounded-2xl flex flex-col items-center justify-center font-black text-xl shadow-sm transform group-hover:scale-110 transition-transform",
                        sub.score >= 8 ? "bg-emerald-50 text-emerald-600" : 
                        sub.score >= 5 ? "bg-amber-50 text-amber-600" : "bg-rose-50 text-rose-600"
                      )}>
                        <span className="text-[10px] uppercase tracking-tighter opacity-50">Score</span>
                        {sub.score.toFixed(1)}
                      </div>
                      <div>
                        <h3 className="font-black text-lg text-stone-800 leading-none mb-2">{sub.unit_name}</h3>
                        <div className="flex items-center gap-3 text-xs font-bold text-stone-400 uppercase tracking-wider">
                          <span>{new Date(sub.date).toLocaleDateString('pt-BR')}</span>
                          <span className="w-1 h-1 bg-stone-200 rounded-full"></span>
                          <span>{sub.inspector_name}</span>
                        </div>
                      </div>
                    </div>
                    
                    <button 
                      onClick={() => {
                        setUnitName(sub.unit_name);
                        setInspectorName(sub.inspector_name);
                        setDate(sub.date);
                        setResults(sub.data);
                        setTimeout(generatePDF, 100);
                      }}
                      className="w-full md:w-auto flex items-center justify-center gap-3 px-6 py-4 bg-stone-50 text-stone-600 rounded-2xl font-black text-xs hover:bg-orange-500 hover:text-white transition-all group/btn"
                    >
                      <Download size={18} className="group-hover/btn:animate-bounce" />
                      DOWNLOAD PDF
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Hidden Report for PDF Generation */}
      <div className="fixed left-[-9999px] top-0">
        <div ref={reportRef} className="w-[210mm] bg-white p-12 text-stone-900 font-sans">
          <div className="flex justify-between items-start border-b-4 border-[#FF6B00] pb-8 mb-10">
            <div>
              <h1 className="text-4xl font-black text-[#FF6B00] tracking-tighter">HORA DO PASTEL</h1>
              <p className="text-sm font-black text-stone-400 uppercase tracking-[0.3em] mt-1">Relatório de Auditoria Operacional</p>
            </div>
            <div className="text-right">
              <div className={cn(
                "inline-block px-6 py-3 rounded-2xl font-black text-3xl mb-2",
                score >= 8 ? "bg-emerald-50 text-emerald-600" : score >= 5 ? "bg-amber-50 text-amber-600" : "bg-rose-50 text-rose-600"
              )}>
                {score.toFixed(1)} <span className="text-sm opacity-50">/ 10</span>
              </div>
              <p className="text-xs font-bold text-stone-400 uppercase tracking-widest">{new Date().toLocaleDateString('pt-BR')}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-10 mb-12">
            <div className="bg-stone-50 p-6 rounded-3xl">
              <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2">Unidade Auditada</p>
              <p className="text-xl font-black text-stone-800">{unitName}</p>
            </div>
            <div className="bg-stone-50 p-6 rounded-3xl">
              <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2">Auditor Responsável</p>
              <p className="text-xl font-black text-stone-800">{inspectorName}</p>
            </div>
          </div>

          {CHECKLIST_DATA.map(section => (
            <div key={section.title} className="mb-10">
              <h2 className="text-sm font-black mb-6 text-stone-400 uppercase tracking-[0.4em] border-b border-stone-100 pb-2">{section.title}</h2>
              <div className="space-y-6">
                {section.items.map(item => {
                  const res = results[item.id];
                  if (!res) return null;
                  return (
                    <div key={item.id} className="pb-6 border-b border-stone-50 last:border-0">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1 pr-10">
                          <p className="font-bold text-stone-800"><span className="text-orange-500 mr-3 font-black">{item.id}</span> {item.question}</p>
                        </div>
                        <span className={cn(
                          "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest",
                          res.status === 'conforme' ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                        )}>
                          {res.status === 'conforme' ? 'Conforme' : 'Não Conforme'}
                        </span>
                      </div>
                      {res.observation && (
                        <div className="bg-stone-50 p-4 rounded-2xl mb-4">
                          <p className="text-xs text-stone-500 font-bold uppercase tracking-widest mb-1">Observação:</p>
                          <p className="text-sm text-stone-700 leading-relaxed italic">"{res.observation}"</p>
                        </div>
                      )}
                      {res.photos.length > 0 && (
                        <div className="flex gap-3">
                          {res.photos.map((p, i) => (
                            <img key={i} src={p} className="w-40 h-40 object-cover rounded-2xl border-2 border-stone-100 shadow-sm" />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          <div className="mt-20 pt-10 border-t-2 border-stone-100 text-center">
            <p className="text-[10px] font-black text-stone-300 uppercase tracking-[0.5em]">Documento Oficial Hora do Pastel • Auditoria Interna</p>
          </div>
        </div>
      </div>

      {/* Modern Bottom Nav */}
      <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#1A1A1A] text-white px-8 py-4 rounded-[32px] flex items-center gap-12 z-50 shadow-2xl shadow-stone-900/20 border border-white/10">
        <button 
          onClick={() => setStep('info')}
          className={cn("flex flex-col items-center gap-1 transition-all", step === 'info' ? "text-orange-500 scale-110" : "text-stone-500 hover:text-stone-300")}
        >
          <Plus size={24} />
          <span className="text-[8px] font-black uppercase tracking-widest">Novo</span>
        </button>
        <button 
          onClick={() => setStep('checklist')}
          className={cn("flex flex-col items-center gap-1 transition-all", step === 'checklist' ? "text-orange-500 scale-110" : "text-stone-500 hover:text-stone-300")}
        >
          <CheckCircle2 size={24} />
          <span className="text-[8px] font-black uppercase tracking-widest">Check</span>
        </button>
        <button 
          onClick={() => { fetchSubmissions(); setStep('history'); }}
          className={cn("flex flex-col items-center gap-1 transition-all", step === 'history' ? "text-orange-500 scale-110" : "text-stone-500 hover:text-stone-300")}
        >
          <History size={24} />
          <span className="text-[8px] font-black uppercase tracking-widest">Logs</span>
        </button>
      </nav>
    </div>
  );
}
