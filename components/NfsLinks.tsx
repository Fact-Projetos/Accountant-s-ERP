import React, { useState, useEffect, useRef } from 'react';
import {
  Plus, Edit, Trash2, Search, Loader2, RefreshCw, Save, ArrowLeft,
  Bot, Globe, Play, GripVertical, X, ChevronDown, ExternalLink,
  MousePointer, KeyRound, Mail, Calendar, XCircle, Type, Code2
} from 'lucide-react';
import { supabase } from '../services/supabase';

// ─── Types ──────────────────────────────────────────────────────
interface AutomationStep {
  id: string;
  action: string;
  format: string;
  selector: string;
}

interface CityAutomation {
  id: string;
  city: string;
  url: string;
  steps: AutomationStep[];
}

// ─── Action Options ─────────────────────────────────────────────
const ACTION_OPTIONS = [
  { value: 'digitar_usuario', label: 'Digitar Usuário (cadastro)', icon: <KeyRound className="w-3.5 h-3.5" /> },
  { value: 'digitar_senha', label: 'Digitar Senha (cadastro)', icon: <KeyRound className="w-3.5 h-3.5" /> },
  { value: 'clicar_elemento', label: 'Clicar no Elemento', icon: <MousePointer className="w-3.5 h-3.5" /> },
  { value: 'fechar_modal', label: 'Fechar Modal (Avisos/Popups)', icon: <XCircle className="w-3.5 h-3.5" /> },
  { value: 'email_fixo', label: 'Email Fixo', icon: <Mail className="w-3.5 h-3.5" /> },
  { value: 'data_inicial', label: 'Data Inicial', icon: <Calendar className="w-3.5 h-3.5" /> },
  { value: 'data_final', label: 'Data Final', icon: <Calendar className="w-3.5 h-3.5" /> },
  { value: 'competencia', label: 'Competência', icon: <Calendar className="w-3.5 h-3.5" /> },
  { value: 'digitar_texto', label: 'Digitar Texto', icon: <Type className="w-3.5 h-3.5" /> },
  { value: 'aguardar', label: 'Aguardar (ms)', icon: <Loader2 className="w-3.5 h-3.5" /> },
  { value: 'clicar_download', label: 'Clicar Download', icon: <MousePointer className="w-3.5 h-3.5" /> },
];

const FORMAT_OPTIONS: Record<string, string[]> = {
  data_inicial: ['ddmmaaaa', 'dd/mm/aaaa', 'aaaa-mm-dd', 'mmddaaaa'],
  data_final: ['ddmmaaaa', 'dd/mm/aaaa', 'aaaa-mm-dd', 'mmddaaaa'],
  competencia: ['mmaaaa', 'mm/aaaa', 'aaaamm'],
  fechar_modal: ['*'],
};

const getActionLabel = (value: string) => ACTION_OPTIONS.find(a => a.value === value)?.label || value;
const getActionIcon = (value: string) => ACTION_OPTIONS.find(a => a.value === value)?.icon || <Code2 className="w-3.5 h-3.5" />;

// ─── Component ──────────────────────────────────────────────────
const NfsLinks: React.FC<{ initialData?: any[], onDataUpdate?: (data: any[]) => void }> = ({ initialData, onDataUpdate }) => {
  const [automations, setAutomations] = useState<CityAutomation[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [viewMode, setViewMode] = useState<'LIST' | 'FORM'>('LIST');

  // Form
  const [formData, setFormData] = useState<CityAutomation>({
    id: '', city: '', url: '', steps: []
  });
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // ─── Fetch ──────────────────────────────────────────────────
  const fetchAutomations = async () => {
    try {
      const { data, error } = await supabase
        .from('city_automations')
        .select('*')
        .order('city');
      if (error) throw error;
      setAutomations(data || []);
    } catch (err: any) {
      console.error('Error fetching automations:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchAutomations(); }, []);

  // ─── Handlers ──────────────────────────────────────────────
  const handleNew = () => {
    setFormData({ id: '', city: '', url: '', steps: [] });
    setViewMode('FORM');
  };

  const handleEdit = (item: CityAutomation) => {
    setFormData({ ...item });
    setViewMode('FORM');
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Excluir esta automação?')) return;
    try {
      setIsUpdating(true);
      const { error } = await supabase.from('city_automations').delete().eq('id', id);
      if (error) throw error;
      await fetchAutomations();
    } catch (err: any) {
      alert('Erro ao excluir: ' + err.message);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSave = async () => {
    if (!formData.city.trim()) {
      alert('Informe o nome da cidade.');
      return;
    }
    if (!formData.url.trim()) {
      alert('Informe a URL do portal.');
      return;
    }

    setIsUpdating(true);
    try {
      const payload = {
        city: formData.city.toUpperCase(),
        url: formData.url,
        steps: formData.steps,
        updated_at: new Date().toISOString(),
      };

      if (formData.id) {
        const { error } = await supabase.from('city_automations').update(payload).eq('id', formData.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('city_automations').insert(payload);
        if (error) throw error;
      }

      alert('Automação salva com sucesso!');
      setViewMode('LIST');
      await fetchAutomations();
    } catch (err: any) {
      alert('Erro ao salvar: ' + err.message);
    } finally {
      setIsUpdating(false);
    }
  };

  // ─── Step Handlers ─────────────────────────────────────────
  const addStep = () => {
    setFormData(prev => ({
      ...prev,
      steps: [...prev.steps, {
        id: `step-${Date.now()}`,
        action: 'digitar_usuario',
        format: '',
        selector: ''
      }]
    }));
  };

  const updateStep = (stepId: string, field: keyof AutomationStep, value: string) => {
    setFormData(prev => ({
      ...prev,
      steps: prev.steps.map(s => {
        if (s.id !== stepId) return s;
        const updated = { ...s, [field]: value };
        // Auto-set format when action changes
        if (field === 'action') {
          const formats = FORMAT_OPTIONS[value];
          updated.format = formats ? formats[0] : '';
        }
        return updated;
      })
    }));
  };

  const removeStep = (stepId: string) => {
    setFormData(prev => ({
      ...prev,
      steps: prev.steps.filter(s => s.id !== stepId)
    }));
  };

  // Drag & Drop reorder
  const handleDragStart = (index: number) => setDraggedIndex(index);
  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    setFormData(prev => {
      const newSteps = [...prev.steps];
      const [moved] = newSteps.splice(draggedIndex, 1);
      newSteps.splice(index, 0, moved);
      setDraggedIndex(index);
      return { ...prev, steps: newSteps };
    });
  };
  const handleDragEnd = () => setDraggedIndex(null);

  // ─── Filtered ──────────────────────────────────────────────
  const filtered = automations.filter(a =>
    a.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.url.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // ═══════════════════════════════════════════════════════════
  // FORM VIEW
  // ═══════════════════════════════════════════════════════════
  if (viewMode === 'FORM') {
    return (
      <div className="space-y-6 animate-fade-in pb-10">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-4">
            <button onClick={() => setViewMode('LIST')} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h2 className="text-xl font-serif font-bold text-slate-800">
                {formData.id ? 'Editar Automação' : 'Nova Automação'}
              </h2>
              <p className="text-xs text-slate-500 uppercase tracking-widest font-medium">
                Configuração do Robô para Prefeitura
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setViewMode('LIST')} className="bg-white border border-slate-200 text-slate-600 px-4 py-2 rounded-xl text-xs font-bold hover:bg-slate-50 transition-colors">
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={isUpdating}
              className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white px-6 py-2 rounded-xl text-xs font-bold shadow-sm transition-all disabled:opacity-50"
            >
              {isUpdating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Salvar
            </button>
          </div>
        </div>

        {/* City & URL */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center gap-2 mb-5">
            <Globe className="w-4 h-4 text-blue-500" />
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Dados da Prefeitura</p>
          </div>
          <div className="grid grid-cols-12 gap-5">
            <div className="col-span-12 md:col-span-4">
              <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase">Nome da Cidade</label>
              <input
                type="text"
                value={formData.city}
                onChange={e => setFormData(prev => ({ ...prev, city: e.target.value }))}
                placeholder="Ex: BARUERI"
                className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-200 transition-all font-bold uppercase"
              />
            </div>
            <div className="col-span-12 md:col-span-8">
              <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase">URL do Portal</label>
              <input
                type="url"
                value={formData.url}
                onChange={e => setFormData(prev => ({ ...prev, url: e.target.value }))}
                placeholder="https://prefeitura.exemplo.gov.br"
                className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-200 transition-all font-mono"
              />
            </div>
          </div>
        </div>

        {/* Steps */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bot className="w-4 h-4 text-violet-500" />
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sequência de Execução</p>
              <span className="bg-violet-100 text-violet-700 text-[9px] font-black px-2 py-0.5 rounded-full ml-2">
                {formData.steps.length} passo(s)
              </span>
            </div>
            <button
              onClick={addStep}
              className="flex items-center gap-1.5 bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider shadow-sm transition-all active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" /> Adicionar Passo
            </button>
          </div>

          {formData.steps.length === 0 ? (
            <div className="p-12 text-center">
              <Bot className="w-10 h-10 text-slate-200 mx-auto mb-3" />
              <p className="text-sm text-slate-400 font-medium">Nenhum passo configurado.</p>
              <p className="text-xs text-slate-300 mt-1">Clique em "Adicionar Passo" para definir a sequência do robô.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {/* Header */}
              <div className="grid grid-cols-12 bg-slate-50 px-4 py-3">
                <div className="col-span-1 text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center justify-center">#</div>
                <div className="col-span-4 text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center">Ação do Robô</div>
                <div className="col-span-2 text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center">Formato</div>
                <div className="col-span-4 text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center">Seletor CSS (ID ou Classe)</div>
                <div className="col-span-1 text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center justify-center">Ação</div>
              </div>

              {/* Rows */}
              {formData.steps.map((step, idx) => (
                <div
                  key={step.id}
                  draggable
                  onDragStart={() => handleDragStart(idx)}
                  onDragOver={e => handleDragOver(e, idx)}
                  onDragEnd={handleDragEnd}
                  className={`grid grid-cols-12 px-4 py-2.5 items-center group transition-all ${draggedIndex === idx ? 'bg-violet-50 ring-1 ring-violet-200' : 'hover:bg-slate-50/50'
                    }`}
                >
                  {/* Order # + Drag */}
                  <div className="col-span-1 flex items-center justify-center gap-1">
                    <GripVertical className="w-3 h-3 text-slate-300 cursor-grab opacity-0 group-hover:opacity-100 transition-opacity" />
                    <span className="text-[10px] font-black text-slate-400 bg-slate-100 rounded-full w-6 h-6 flex items-center justify-center">
                      {idx + 1}
                    </span>
                  </div>

                  {/* Action */}
                  <div className="col-span-4 pr-2">
                    <div className="relative">
                      <select
                        value={step.action}
                        onChange={e => updateStep(step.id, 'action', e.target.value)}
                        className="w-full px-3 py-2 text-[11px] font-bold border border-slate-200 rounded-lg outline-none focus:border-violet-400 bg-white appearance-none cursor-pointer pr-8"
                      >
                        {ACTION_OPTIONS.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                    </div>
                  </div>

                  {/* Format */}
                  <div className="col-span-2 pr-2">
                    {FORMAT_OPTIONS[step.action] ? (
                      <select
                        value={step.format}
                        onChange={e => updateStep(step.id, 'format', e.target.value)}
                        className="w-full px-3 py-2 text-[11px] font-mono border border-slate-200 rounded-lg outline-none focus:border-violet-400 bg-white appearance-none cursor-pointer"
                      >
                        {FORMAT_OPTIONS[step.action].map(f => (
                          <option key={f} value={f}>{f}</option>
                        ))}
                      </select>
                    ) : (step.action === 'email_fixo' || step.action === 'digitar_texto') ? (
                      <input
                        type="text"
                        value={step.format}
                        onChange={e => updateStep(step.id, 'format', e.target.value)}
                        placeholder={step.action === 'email_fixo' ? 'email@exemplo.com' : 'texto aqui...'}
                        className="w-full px-3 py-2 text-[11px] font-mono border border-violet-300 rounded-lg outline-none focus:border-violet-500 bg-white font-bold text-violet-700 placeholder:text-slate-300 placeholder:font-normal"
                      />
                    ) : (
                      <input
                        type="text"
                        value={step.format}
                        onChange={e => updateStep(step.id, 'format', e.target.value)}
                        placeholder="—"
                        disabled={['clicar_elemento', 'clicar_download', 'digitar_usuario', 'digitar_senha', 'aguardar'].includes(step.action)}
                        className="w-full px-3 py-2 text-[11px] font-mono border border-slate-200 rounded-lg outline-none focus:border-violet-400 bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                    )}
                  </div>

                  {/* Selector */}
                  <div className="col-span-4 pr-2">
                    <div className="relative">
                      <Code2 className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                      <input
                        type="text"
                        value={step.selector}
                        onChange={e => updateStep(step.id, 'selector', e.target.value)}
                        placeholder="#id ou .classe"
                        className="w-full pl-8 pr-3 py-2 text-[11px] font-mono font-bold border border-slate-200 rounded-lg outline-none focus:border-violet-400 transition-all"
                      />
                    </div>
                  </div>

                  {/* Remove */}
                  <div className="col-span-1 flex items-center justify-center">
                    <button
                      onClick={() => removeStep(step.id)}
                      className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════
  // LIST VIEW
  // ═══════════════════════════════════════════════════════════
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-serif font-bold text-slate-800">Automação Prefeituras</h2>
            {isUpdating && <RefreshCw className="w-4 h-4 text-slate-400 animate-spin" />}
          </div>
          <p className="text-slate-500 text-sm">Configure o robô para baixar NFS-e automaticamente de cada prefeitura.</p>
        </div>
        <button
          onClick={handleNew}
          disabled={isUpdating}
          className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl font-bold shadow-md transition-all active:scale-95 text-[10px] uppercase tracking-widest"
        >
          <Plus className="w-4 h-4" /> Nova Automação
        </button>
      </div>

      {/* Filter */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por cidade ou URL..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:border-slate-400 outline-none transition-all font-medium text-slate-600"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-3 text-xs font-bold text-slate-400">
          <span className="bg-slate-100 px-3 py-1.5 rounded-lg">{filtered.length} cidade(s)</span>
        </div>
      </div>

      {/* Cards */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        {isLoading ? (
          <div className="p-32 flex flex-col items-center justify-center gap-4 text-slate-400">
            <Loader2 className="w-10 h-10 animate-spin text-slate-300" />
            <p className="text-xs font-black uppercase tracking-widest">Carregando automações...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-16 text-center">
            <Bot className="w-12 h-12 text-slate-200 mx-auto mb-3" />
            <p className="text-sm text-slate-400 font-medium">Nenhuma automação cadastrada.</p>
            <p className="text-xs text-slate-300 mt-1">Clique em "Nova Automação" para começar.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {/* Table Header */}
            <div className="grid grid-cols-12 bg-slate-50 px-6 py-4">
              <div className="col-span-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">Município</div>
              <div className="col-span-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">URL Portal</div>
              <div className="col-span-2 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Passos</div>
              <div className="col-span-2 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Ações</div>
            </div>

            {/* Rows */}
            {filtered.map(item => (
              <div key={item.id} className="grid grid-cols-12 px-6 py-4 items-center hover:bg-slate-50/50 transition-colors group">
                {/* City */}
                <div className="col-span-3 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center text-white shadow-sm">
                    <Bot className="w-4 h-4" />
                  </div>
                  <span className="font-bold text-sm text-slate-800">{item.city}</span>
                </div>

                {/* URL */}
                <div className="col-span-5">
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-slate-500 hover:text-blue-600 text-xs font-mono transition-colors truncate"
                  >
                    <Globe className="w-3.5 h-3.5 opacity-50 shrink-0" />
                    <span className="truncate">{item.url}</span>
                    <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 shrink-0" />
                  </a>
                </div>

                {/* Steps count */}
                <div className="col-span-2 text-center">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black ${item.steps?.length > 0
                    ? 'bg-violet-100 text-violet-700'
                    : 'bg-slate-100 text-slate-400'
                    }`}>
                    <Play className="w-2.5 h-2.5" />
                    {item.steps?.length || 0}
                  </span>
                </div>

                {/* Actions */}
                <div className="col-span-2 flex justify-end items-center gap-1">
                  <button
                    onClick={() => handleEdit(item)}
                    className="p-2 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-all"
                    title="Editar"
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                    title="Excluir"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default NfsLinks;
