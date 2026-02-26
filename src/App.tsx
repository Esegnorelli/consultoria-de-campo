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

  const score = useMemo(() => {
    const totalItems = CHECKLIST_DATA.reduce((acc, sec) => acc + sec.items.length, 0);
    const conformeItems = Object.values(results).filter((r: ItemResult) => r.status === 'conforme').length;
    return totalItems > 0 ? (conformeItems / totalItems) * 10 : 0;
  }, [results]);

  const saveSubmission = async () => {
    if (!unitName || !inspectorName) {
      alert('Por favor, preencha o nome da unidade e do inspetor.');
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch('/api/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          unit_name: unitName,
          inspector_name: inspectorName,
          date,
          score,
          data: results
        })
      });

      if (response.ok) {
        alert('Checklist salvo com sucesso!');
        fetchSubmissions();
        setStep('history');
      }
    } catch (error) {
      console.error(error);
      alert('Erro ao salvar checklist.');
    } finally {
      setIsSaving(false);
    }
  };

  const fetchSubmissions = async () => {
    try {
      const response = await fetch('/api/submissions');
      const data = await response.json();
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

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 font-sans pb-20">
      {/* Header */}
      <header className="bg-white border-b border-stone-200 sticky top-0 z-30 px-4 py-4 shadow-sm">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center text-white font-bold text-xl shadow-orange-200 shadow-lg">
              H
            </div>
            <div>
              <h1 className="font-bold text-lg leading-tight">Hora do Pastel</h1>
              <p className="text-xs text-stone-500 uppercase tracking-wider font-semibold">Checklist Operacional</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => { fetchSubmissions(); setStep('history'); }}
              className="p-2 hover:bg-stone-100 rounded-full transition-colors"
              title="Histórico"
            >
              <History size={20} className="text-stone-600" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 mt-4">
          {step === 'info' && (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-stone-200">
              <h2 className="text-2xl font-bold mb-6 text-stone-800">Nova Inspeção</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-stone-600 mb-1">Unidade</label>
                  <input 
                    type="text" 
                    value={unitName}
                    onChange={e => setUnitName(e.target.value)}
                    placeholder="Ex: Unidade Centro"
                    className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-stone-600 mb-1">Inspetor</label>
                  <input 
                    type="text" 
                    value={inspectorName}
                    onChange={e => setInspectorName(e.target.value)}
                    placeholder="Seu nome completo"
                    className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-stone-600 mb-1">Data</label>
                  <input 
                    type="date" 
                    value={date}
                    onChange={e => setDate(e.target.value)}
                    className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all"
                  />
                </div>
                <button 
                  onClick={() => setStep('checklist')}
                  disabled={!unitName || !inspectorName}
                  className="w-full bg-orange-500 text-white font-bold py-4 rounded-xl mt-4 hover:bg-orange-600 active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none shadow-lg shadow-orange-100"
                >
                  Iniciar Checklist
                </button>
              </div>
            </div>
          )}

          {step === 'checklist' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-stone-200 shadow-sm sticky top-24 z-20">
                <div className="flex items-center gap-4">
                  <div className="bg-orange-100 text-orange-700 w-12 h-12 rounded-full flex items-center justify-center font-bold text-xl">
                    {score.toFixed(1)}
                  </div>
                  <div>
                    <p className="text-xs text-stone-500 font-bold uppercase">Nota Atual</p>
                    <p className="font-bold text-stone-800">{currentSection.title}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button 
                    disabled={currentSectionIndex === 0}
                    onClick={() => setCurrentSectionIndex(i => i - 1)}
                    className="p-2 bg-stone-100 rounded-lg disabled:opacity-30"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <button 
                    disabled={currentSectionIndex === CHECKLIST_DATA.length - 1}
                    onClick={() => setCurrentSectionIndex(i => i + 1)}
                    className="p-2 bg-stone-100 rounded-lg disabled:opacity-30"
                  >
                    <ChevronRight size={20} />
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                {currentSection.items.map((item) => (
                  <div key={item.id} className="bg-white rounded-2xl p-5 border border-stone-200 shadow-sm hover:border-orange-200 transition-colors">
                    <div className="flex gap-4 mb-4">
                      <span className="text-orange-500 font-black text-lg">{item.id}</span>
                      <p className="font-medium text-stone-800 leading-relaxed">{item.question}</p>
                    </div>

                    <div className="flex flex-wrap gap-3 mb-4">
                      <button 
                        onClick={() => handleStatusChange(item.id, 'conforme')}
                        className={cn(
                          "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 transition-all font-bold",
                          results[item.id]?.status === 'conforme' 
                            ? "bg-emerald-50 border-emerald-500 text-emerald-700" 
                            : "border-stone-100 text-stone-400 hover:border-stone-200"
                        )}
                      >
                        <CheckCircle2 size={18} />
                        Conforme
                      </button>
                      <button 
                        onClick={() => handleStatusChange(item.id, 'nao-conforme')}
                        className={cn(
                          "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 transition-all font-bold",
                          results[item.id]?.status === 'nao-conforme' 
                            ? "bg-rose-50 border-rose-500 text-rose-700" 
                            : "border-stone-100 text-stone-400 hover:border-stone-200"
                        )}
                      >
                        <XCircle size={18} />
                        Não Conforme
                      </button>
                    </div>

                    <div className="space-y-3">
                      <div className="flex flex-wrap gap-2">
                        {results[item.id]?.photos?.map((photo, idx) => (
                          <div key={idx} className="relative w-20 h-20 rounded-lg overflow-hidden border border-stone-200 group">
                            <img src={photo} alt="Evidência" className="w-full h-full object-cover" />
                            <button 
                              onClick={() => removePhoto(item.id, idx)}
                              className="absolute top-1 right-1 bg-rose-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        ))}
                        {(results[item.id]?.photos?.length || 0) < 3 && (
                          <label className="w-20 h-20 rounded-lg border-2 border-dashed border-stone-200 flex flex-col items-center justify-center text-stone-400 hover:border-orange-300 hover:text-orange-400 cursor-pointer transition-all">
                            <Camera size={20} />
                            <span className="text-[10px] font-bold mt-1">FOTO</span>
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
                      <textarea 
                        placeholder="Observações adicionais..."
                        value={results[item.id]?.observation || ''}
                        onChange={(e) => handleObservationChange(item.id, e.target.value)}
                        className="w-full p-3 bg-stone-50 border border-stone-100 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 outline-none min-h-[80px]"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-4 pt-6">
                <button 
                  onClick={() => setStep('info')}
                  className="flex-1 py-4 bg-stone-200 text-stone-700 font-bold rounded-xl hover:bg-stone-300 transition-all"
                >
                  Voltar
                </button>
                <button 
                  onClick={saveSubmission}
                  disabled={isSaving}
                  className="flex-[2] py-4 bg-orange-500 text-white font-bold rounded-xl hover:bg-orange-600 transition-all shadow-lg shadow-orange-100 flex items-center justify-center gap-2"
                >
                  {isSaving ? <Loader2 className="animate-spin" /> : <Save size={20} />}
                  Finalizar e Salvar
                </button>
              </div>
            </div>
          )}

          {step === 'history' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-stone-800">Histórico</h2>
                <button 
                  onClick={() => setStep('info')}
                  className="px-4 py-2 bg-orange-500 text-white rounded-lg font-bold text-sm"
                >
                  Nova Inspeção
                </button>
              </div>

              {submissions.length === 0 ? (
                <div className="bg-white p-12 rounded-2xl border border-stone-200 text-center">
                  <FileText size={48} className="mx-auto text-stone-300 mb-4" />
                  <p className="text-stone-500 font-medium">Nenhum checklist encontrado.</p>
                </div>
              ) : (
                submissions.map((sub) => (
                  <div key={sub.id} className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm flex justify-between items-center">
                    <div>
                      <h3 className="font-bold text-stone-800">{sub.unit_name}</h3>
                      <p className="text-sm text-stone-500">{new Date(sub.date).toLocaleDateString('pt-BR')} • {sub.inspector_name}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "w-12 h-12 rounded-full flex items-center justify-center font-bold",
                        sub.score >= 8 ? "bg-emerald-100 text-emerald-700" : 
                        sub.score >= 5 ? "bg-amber-100 text-amber-700" : "bg-rose-100 text-rose-700"
                      )}>
                        {sub.score.toFixed(1)}
                      </div>
                      <button 
                        onClick={() => {
                          setUnitName(sub.unit_name);
                          setInspectorName(sub.inspector_name);
                          setDate(sub.date);
                          setResults(sub.data);
                          setTimeout(generatePDF, 100);
                        }}
                        className="p-2 hover:bg-stone-100 rounded-lg text-stone-600"
                        title="Baixar PDF"
                      >
                        <Download size={20} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
      </main>

      {/* Hidden Report for PDF Generation */}
      <div className="fixed left-[-9999px] top-0">
        <div ref={reportRef} className="w-[210mm] bg-white p-10 text-stone-900">
          <div className="flex justify-between items-start border-b-2 border-orange-500 pb-6 mb-8">
            <div>
              <h1 className="text-3xl font-black text-orange-500">HORA DO PASTEL</h1>
              <p className="text-lg font-bold text-stone-500">RELATÓRIO DE INSPEÇÃO OPERACIONAL</p>
            </div>
            <div className="text-right">
              <p className="font-bold">Nota Final: <span className="text-2xl text-orange-600">{score.toFixed(1)}/10</span></p>
              <p className="text-sm text-stone-500">{new Date().toLocaleDateString('pt-BR')}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 mb-10 bg-stone-50 p-6 rounded-2xl">
            <div>
              <p className="text-xs font-bold text-stone-400 uppercase">Unidade</p>
              <p className="text-xl font-bold">{unitName}</p>
            </div>
            <div>
              <p className="text-xs font-bold text-stone-400 uppercase">Inspetor</p>
              <p className="text-xl font-bold">{inspectorName}</p>
            </div>
          </div>

          {CHECKLIST_DATA.map(section => (
            <div key={section.title} className="mb-8">
              <h2 className="text-xl font-black mb-4 bg-stone-100 p-3 rounded-lg border-l-4 border-orange-500">{section.title}</h2>
              <div className="space-y-4">
                {section.items.map(item => {
                  const res = results[item.id];
                  if (!res) return null;
                  return (
                    <div key={item.id} className="border-b border-stone-100 pb-4">
                      <div className="flex justify-between items-start mb-2">
                        <p className="font-bold flex-1"><span className="text-orange-500 mr-2">{item.id}</span> {item.question}</p>
                        <span className={cn(
                          "px-3 py-1 rounded-full text-xs font-bold uppercase",
                          res.status === 'conforme' ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                        )}>
                          {res.status === 'conforme' ? 'Conforme' : 'Não Conforme'}
                        </span>
                      </div>
                      {res.observation && (
                        <p className="text-sm text-stone-600 italic mb-2">Obs: {res.observation}</p>
                      )}
                      <div className="flex gap-2">
                        {res.photos.map((p, i) => (
                          <img key={i} src={p} className="w-32 h-32 object-cover rounded-lg border border-stone-200" />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          <div className="mt-12 pt-8 border-t border-stone-200 text-center text-stone-400 text-xs">
            Este documento é de uso interno exclusivo da rede Hora do Pastel.
          </div>
        </div>
      </div>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-stone-200 px-6 py-3 flex justify-around items-center z-40 shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
        <button 
          onClick={() => setStep('info')}
          className={cn("flex flex-col items-center gap-1", step === 'info' ? "text-orange-500" : "text-stone-400")}
        >
          <Plus size={24} />
          <span className="text-[10px] font-bold uppercase">Novo</span>
        </button>
        <button 
          onClick={() => setStep('checklist')}
          className={cn("flex flex-col items-center gap-1", step === 'checklist' ? "text-orange-500" : "text-stone-400")}
        >
          <CheckCircle2 size={24} />
          <span className="text-[10px] font-bold uppercase">Checklist</span>
        </button>
        <button 
          onClick={() => { fetchSubmissions(); setStep('history'); }}
          className={cn("flex flex-col items-center gap-1", step === 'history' ? "text-orange-500" : "text-stone-400")}
        >
          <History size={24} />
          <span className="text-[10px] font-bold uppercase">Histórico</span>
        </button>
      </nav>
    </div>
  );
}
