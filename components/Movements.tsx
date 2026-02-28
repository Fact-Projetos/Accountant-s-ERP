import React, { useState, useEffect, useRef } from 'react';
import { Download, ExternalLink, Search, Filter, Loader2, RefreshCw, Bot, X, CheckCircle2, AlertCircle, Play, Clock, Square, CheckSquare, MinusSquare } from 'lucide-react';
import { Client } from '../types';
import { supabase } from '../services/supabase';

interface MovementData {
  id: string;
  clientId: string;
  clientName: string;
  clientCode: string;
  city: string;
  month: string;
  year: string;
  status: 'Com movimento' | 'Sem movimento';
}

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

interface StepStatus {
  stepId: string;
  status: 'pending' | 'running' | 'success' | 'error';
  message?: string;
}

interface CompanyProgress {
  clientId: string;
  clientName: string;
  status: 'pending' | 'running' | 'success' | 'error';
  message?: string;
}

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const YEARS = ['2026', '2025', '2024', '2023'];

const ACTION_LABELS: Record<string, string> = {
  digitar_usuario: 'Digitar Usuário',
  digitar_senha: 'Digitar Senha',
  clicar_elemento: 'Clicar no Elemento',
  fechar_modal: 'Fechar Modal',
  email_fixo: 'Email Fixo',
  data_inicial: 'Data Inicial',
  data_final: 'Data Final',
  competencia: 'Competência',
  digitar_texto: 'Digitar Texto',
  aguardar: 'Aguardar',
  clicar_download: 'Clicar Download',
};

function formatDate(date: Date, format: string): string {
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const aaaa = String(date.getFullYear());
  switch (format) {
    case 'ddmmaaaa': return `${dd}${mm}${aaaa}`;
    case 'dd/mm/aaaa': return `${dd}/${mm}/${aaaa}`;
    case 'aaaa-mm-dd': return `${aaaa}-${mm}-${dd}`;
    case 'mmddaaaa': return `${mm}${dd}${aaaa}`;
    case 'mmaaaa': return `${mm}${aaaa}`;
    case 'mm/aaaa': return `${mm}/${aaaa}`;
    case 'aaaamm': return `${aaaa}${mm}`;
    default: return `${dd}/${mm}/${aaaa}`;
  }
}

function getMonthIndex(monthName: string): number {
  const idx = MONTHS.indexOf(monthName);
  return idx >= 0 ? idx : new Date().getMonth();
}

const Movements: React.FC<{
  initialClients?: Client[],
  onClientsUpdate?: (data: Client[]) => void,
  initialCityLinks?: { city: string, url: string }[],
  onCityLinksUpdate?: (data: { city: string, url: string }[]) => void
}> = ({ initialClients, onClientsUpdate, initialCityLinks, onCityLinksUpdate }) => {
  const [filterClient, setFilterClient] = useState<string>('');
  const [filterMonth, setFilterMonth] = useState<string>('');
  const [filterYear, setFilterYear] = useState<string>('2024');
  const [filterCity, setFilterCity] = useState<string>('');
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const [clients, setClients] = useState<Partial<Client>[]>(initialClients || []);
  const [cityLinks, setCityLinks] = useState<{ city: string, url: string }[]>(initialCityLinks || []);
  const [movements, setMovements] = useState<MovementData[]>([]);
  const [isLoading, setIsLoading] = useState(!initialClients || initialClients.length === 0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // ─── Checkbox selection ────────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // ─── Automation Panel State ────────────────────────────────────
  const [showAutomationPanel, setShowAutomationPanel] = useState(false);
  const [automationData, setAutomationData] = useState<CityAutomation | null>(null);
  const [automationClient, setAutomationClient] = useState<{ name: string, login: string, password: string, month: string, year: string } | null>(null);
  const [stepStatuses, setStepStatuses] = useState<StepStatus[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [automationMessage, setAutomationMessage] = useState('');
  const automationWindowRef = useRef<Window | null>(null);

  // ─── Batch execution ──────────────────────────────────────────
  const [companyProgress, setCompanyProgress] = useState<CompanyProgress[]>([]);
  const [currentBatchIdx, setCurrentBatchIdx] = useState(-1);
  const [isBatchMode, setIsBatchMode] = useState(false);

  useEffect(() => {
    if (initialClients && initialClients.length > 0) {
      setClients(initialClients);
      setIsLoading(false);
    }
  }, [initialClients]);

  useEffect(() => {
    if (initialCityLinks && initialCityLinks.length > 0) {
      setCityLinks(initialCityLinks);
    }
  }, [initialCityLinks]);

  useEffect(() => {
    if (clients.length === 0) fetchClients();
    if (cityLinks.length === 0) fetchCityLinks();
  }, []);

  useEffect(() => {
    fetchMovements();
  }, [filterClient, filterMonth, filterYear, clients]);

  const fetchCityLinks = async () => {
    const { data } = await supabase.from('city_links').select('city, url');
    if (data) {
      setCityLinks(data);
      if (onCityLinksUpdate) onCityLinksUpdate(data);
    }
  };

  const fetchClients = async () => {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('id, name, code, city')
        .order('name');
      if (error) { console.error('Error fetching clients:', error); return; }
      if (data) {
        setClients(data as any);
        if (onClientsUpdate) onClientsUpdate(data as any);
      }
    } catch (err) {
      console.error('Unexpected error:', err);
    }
  };

  const fetchMovements = async () => {
    if (clients.length === 0 && !filterClient) { setIsLoading(false); return; }
    const isInitialLoad = movements.length === 0;
    if (isInitialLoad) setIsLoading(true); else setIsRefreshing(true);
    try {
      let query = supabase.from('movements').select('*').eq('year', filterYear);
      if (filterMonth) query = query.eq('month', filterMonth);
      if (filterClient) query = query.eq('company_id', filterClient);
      const { data: movementsData, error } = await query;
      if (error) throw error;
      const existingMovements = (movementsData || []).map(m => ({
        id: m.id, company_id: m.company_id, month: m.month, year: m.year, status: m.status
      }));
      const displayList: MovementData[] = (filterClient
        ? clients.filter(c => c.id === filterClient)
        : clients
      ).map(client => {
        const found = existingMovements.find(m => m.company_id === client.id);
        return {
          id: found?.id || `temp-${client.id}`,
          clientId: client.id!,
          clientName: client.name!,
          clientCode: client.code || '---',
          city: client.city || '',
          month: filterMonth || 'Atual',
          year: filterYear,
          status: (found?.status as any) || 'Sem movimento'
        };
      });
      setMovements(displayList);
    } catch (error) {
      console.error('Error fetching movements:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  // ─── Derived: unique cities for filter ─────────────────────────
  const uniqueCities = Array.from(
    new Set(movements.map(m => m.city).filter(Boolean))
  ).sort();

  // ─── Filtered movements (including city filter) ────────────────
  const filteredMovements = filterCity
    ? movements.filter(m => m.city.toUpperCase() === filterCity.toUpperCase())
    : movements;

  // ─── Checkbox logic ────────────────────────────────────────────
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredMovements.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredMovements.map(m => m.id)));
    }
  };

  const isAllSelected = filteredMovements.length > 0 && selectedIds.size === filteredMovements.length;
  const isSomeSelected = selectedIds.size > 0 && selectedIds.size < filteredMovements.length;

  const handleDownloadNfe = (movement: MovementData) => {
    if (movement.status === 'Sem movimento') {
      alert("Nao ha arquivos XML para baixar nesta competencia (Sem movimento).");
      return;
    }
    setLoadingId(movement.id);
    setTimeout(() => {
      setLoadingId(null);
      alert(`Download do pacote NF-e iniciado para: ${movement.clientName} - ${movement.month}/${movement.year}`);
    }, 1500);
  };

  // ═══════════════════════════════════════════════════════════════
  // ─── BATCH AUTOMATION (run for selected companies) ────────────
  // ═══════════════════════════════════════════════════════════════
  const handleBatchPrefeitura = async () => {
    const selectedMovements = filteredMovements.filter(m => selectedIds.has(m.id));
    if (selectedMovements.length === 0) {
      alert('Selecione ao menos uma empresa para executar a automacao.');
      return;
    }

    setShowAutomationPanel(true);
    setIsBatchMode(true);
    setIsRunning(false);
    setStepStatuses([]);
    setAutomationData(null);
    setAutomationClient(null);
    setCurrentBatchIdx(-1);

    // Initialize company progress
    setCompanyProgress(
      selectedMovements.map(m => ({
        clientId: m.clientId,
        clientName: m.clientName,
        status: 'pending' as const,
      }))
    );

    setAutomationMessage(`${selectedMovements.length} empresa(s) selecionada(s). Clique em "Executar" para iniciar.`);
  };

  // ─── Single company automation (from button) ───────────────────
  const handleSinglePrefeitura = async (movement: MovementData) => {
    if (!movement.city) {
      alert(`Municipio nao cadastrado para: ${movement.clientName}.`);
      return;
    }
    setSelectedIds(new Set([movement.id]));
    setShowAutomationPanel(true);
    setIsBatchMode(false);
    setIsRunning(false);
    setStepStatuses([]);
    setCurrentBatchIdx(-1);

    setCompanyProgress([{
      clientId: movement.clientId,
      clientName: movement.clientName,
      status: 'pending',
    }]);

    await loadAutomationForMovement(movement);
  };

  // ─── Load automation for a specific movement ───────────────────
  const loadAutomationForMovement = async (movement: MovementData) => {
    setAutomationMessage('Carregando configuracao do robo...');
    setAutomationData(null);
    setAutomationClient(null);
    setStepStatuses([]);

    try {
      const { data: allAutomations, error: automationError } = await supabase
        .from('city_automations')
        .select('*');

      if (automationError) throw automationError;

      const matchedAutomation = (allAutomations || []).find(
        (a: any) => a.city.trim().toUpperCase() === movement.city.trim().toUpperCase()
      );

      if (!matchedAutomation) {
        setAutomationMessage(`Nenhuma automacao para "${movement.city}". Configure em "Automacao NFS-e".`);
        return null;
      }

      const automation: CityAutomation = matchedAutomation;

      const { data: clientData, error: clientError } = await supabase
        .from('companies')
        .select('city_hall_login, city_hall_password')
        .eq('id', movement.clientId)
        .single();

      if (clientError) throw clientError;

      if (!clientData?.city_hall_login || !clientData?.city_hall_password) {
        setAutomationMessage(`Credenciais nao cadastradas para "${movement.clientName}".`);
        return null;
      }

      setAutomationData(automation);
      setAutomationClient({
        name: movement.clientName,
        login: clientData.city_hall_login,
        password: clientData.city_hall_password,
        month: movement.month,
        year: movement.year,
      });

      setStepStatuses(
        automation.steps.map((s: AutomationStep) => ({ stepId: s.id, status: 'pending' as const }))
      );

      setAutomationMessage(`Robo pronto. Clique em "Executar" para iniciar.`);
      return { automation, credentials: clientData };

    } catch (err: any) {
      console.error('[Robo] Erro:', err);
      setAutomationMessage(`Erro ao carregar: ${err.message}`);
      return null;
    }
  };

  // ─── Execute automation (batch or single) ──────────────────────
  const executeAutomation = async () => {
    setIsRunning(true);

    if (isBatchMode) {
      // Batch mode: run for each selected company
      const selectedMovements = filteredMovements.filter(m => selectedIds.has(m.id));
      let successCount = 0;
      let errorCount = 0;

      for (let i = 0; i < selectedMovements.length; i++) {
        const movement = selectedMovements[i];
        setCurrentBatchIdx(i);

        // Update progress
        setCompanyProgress(prev =>
          prev.map((p, idx) => idx === i ? { ...p, status: 'running' } : p)
        );

        setAutomationMessage(`[${i + 1}/${selectedMovements.length}] ${movement.clientName}...`);

        // Load automation for this company
        const result = await loadAutomationForMovement(movement);

        if (!result) {
          errorCount++;
          setCompanyProgress(prev =>
            prev.map((p, idx) => idx === i ? { ...p, status: 'error', message: 'Sem automacao/credenciais' } : p)
          );
          continue; // Continua para proxima empresa
        }

        // Execute steps for this company
        const success = await executeStepsForCompany(result.automation, {
          login: result.credentials.city_hall_login,
          password: result.credentials.city_hall_password,
          month: movement.month,
          year: movement.year,
        });

        if (success) {
          successCount++;
        } else {
          errorCount++;
        }

        setCompanyProgress(prev =>
          prev.map((p, idx) => idx === i
            ? { ...p, status: success ? 'success' : 'error', message: success ? undefined : 'Falha na execucao' }
            : p)
        );

        // Small delay between companies
        if (i < selectedMovements.length - 1) {
          setAutomationMessage(`Aguardando proximo...`);
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      setAutomationMessage(
        `Concluido! ✅ ${successCount} sucesso | ❌ ${errorCount} falha(s) | Total: ${selectedMovements.length}`
      );
    } else {
      // Single mode
      if (!automationData || !automationClient) { setIsRunning(false); return; }
      const success = await executeStepsForCompany(automationData, {
        login: automationClient.login,
        password: automationClient.password,
        month: automationClient.month,
        year: automationClient.year,
      });
      setCompanyProgress(prev =>
        prev.map(p => ({ ...p, status: success ? 'success' : 'error' }))
      );
      setAutomationMessage(success
        ? 'Automacao concluida com sucesso!'
        : 'Erro durante a execucao. Verifique o portal.'
      );
    }

    setIsRunning(false);
  };

  // ─── Automation Server (Playwright) communication ──────────────
  const AUTOMATION_SERVER = 'http://localhost:3099';

  const checkAutomationServer = async (): Promise<boolean> => {
    try {
      const res = await fetch(`${AUTOMATION_SERVER}/ping`, { signal: AbortSignal.timeout(2000) });
      const data = await res.json();
      return data?.success === true;
    } catch {
      return false;
    }
  };

  // ─── Execute steps for a single company ────────────────────────
  const executeStepsForCompany = async (
    automation: CityAutomation,
    client: { login: string; password: string; month: string; year: string }
  ): Promise<boolean> => {
    setAutomationMessage(`Abrindo portal: ${automation.city}...`);

    // Reset step statuses
    setStepStatuses(
      automation.steps.map((s: AutomationStep) => ({ stepId: s.id, status: 'pending' as const }))
    );

    // Check if Playwright server is running
    const serverOnline = await checkAutomationServer();

    if (serverOnline) {
      // ─── Playwright mode (best!) ───────────────────────────────
      const sessionId = `${automation.id}-${Date.now()}`;

      try {
        // Open the URL via Playwright
        const openRes = await fetch(`${AUTOMATION_SERVER}/open`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: automation.url, sessionId })
        });
        const openData = await openRes.json();

        if (!openData?.success) {
          setAutomationMessage(`Erro ao abrir portal: ${openData?.error || 'desconhecido'}`);
          return false;
        }

        setAutomationMessage(`Portal aberto: ${openData.title || automation.city}`);

        // Execute each step
        for (let i = 0; i < automation.steps.length; i++) {
          const step = automation.steps[i];

          setStepStatuses(prev =>
            prev.map((s, idx) => idx === i ? { ...s, status: 'running' } : s)
          );
          setAutomationMessage(`Passo ${i + 1}/${automation.steps.length}: ${ACTION_LABELS[step.action] || step.action}`);

          try {
            const stepRes = await fetch(`${AUTOMATION_SERVER}/execute-step`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ sessionId, step, client })
            });
            const stepData = await stepRes.json();

            if (!stepData?.success) {
              throw new Error(stepData?.error || 'Falha no passo');
            }

            setStepStatuses(prev =>
              prev.map((s, idx) => idx === i ? { ...s, status: 'success' } : s)
            );
          } catch (err: any) {
            setStepStatuses(prev =>
              prev.map((s, idx) => idx === i ? { ...s, status: 'error', message: err.message } : s)
            );
            // Fechar aba ao falhar
            try {
              await fetch(`${AUTOMATION_SERVER}/close`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionId })
              });
            } catch { }
            return false;
          }

          await new Promise(resolve => setTimeout(resolve, 100));
        }

        // Fechar aba apos concluir com sucesso
        try {
          await fetch(`${AUTOMATION_SERVER}/close`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId })
          });
        } catch { }

        return true;

      } catch (err: any) {
        setAutomationMessage(`Erro no servidor: ${err.message}`);
        return false;
      }

    } else {
      // ─── Fallback: window.open (limited by cross-origin) ───────
      setAutomationMessage('Servidor de automacao offline. Inicie com: npm start na pasta automation-server');

      const win = window.open(automation.url, '_blank', 'width=1200,height=800,scrollbars=yes,resizable=yes');
      if (!win) {
        setAutomationMessage('Popup bloqueado! Permita popups.');
        return false;
      }
      automationWindowRef.current = win;

      await new Promise(resolve => setTimeout(resolve, 2000));

      for (let i = 0; i < automation.steps.length; i++) {
        const step = automation.steps[i];

        setStepStatuses(prev =>
          prev.map((s, idx) => idx === i ? { ...s, status: 'running' } : s)
        );
        setAutomationMessage(`Passo ${i + 1}/${automation.steps.length}: ${ACTION_LABELS[step.action] || step.action}`);

        try {
          await executeStepFallback(win, step, client);
          setStepStatuses(prev =>
            prev.map((s, idx) => idx === i ? { ...s, status: 'success' } : s)
          );
        } catch (err: any) {
          setStepStatuses(prev =>
            prev.map((s, idx) => idx === i ? { ...s, status: 'error', message: err.message } : s)
          );
          return false;
        }

        await new Promise(resolve => setTimeout(resolve, 200));
      }

      return true;
    }
  };

  // ─── Fallback: direct window manipulation (same-origin only) ───
  const executeStepFallback = async (
    win: Window,
    step: AutomationStep,
    client: { login: string; password: string; month: string; year: string }
  ): Promise<void> => {
    if (win.closed) throw new Error('Janela fechada.');
    const monthIdx = getMonthIndex(client.month);
    const year = parseInt(client.year);

    try {
      switch (step.action) {
        case 'digitar_usuario': {
          const el = win.document.querySelector<HTMLInputElement>(step.selector);
          if (!el) throw new Error(`Elemento nao encontrado: ${step.selector}`);
          el.focus();
          el.value = client.login;
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
          break;
        }
        case 'digitar_senha': {
          const el = win.document.querySelector<HTMLInputElement>(step.selector);
          if (!el) throw new Error(`Elemento nao encontrado: ${step.selector}`);
          el.focus();
          el.value = client.password;
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
          break;
        }
        case 'clicar_elemento':
        case 'clicar_download': {
          const el = win.document.querySelector<HTMLElement>(step.selector);
          if (!el) throw new Error(`Elemento nao encontrado: ${step.selector}`);
          el.click();
          break;
        }
        case 'fechar_modal': {
          try {
            const el = win.document.querySelector<HTMLElement>(step.selector);
            if (el) el.click();
          } catch { }
          break;
        }
        case 'email_fixo':
        case 'digitar_texto': {
          const el = win.document.querySelector<HTMLInputElement>(step.selector);
          if (!el) throw new Error(`Elemento nao encontrado: ${step.selector}`);
          el.value = step.format || '';
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
          break;
        }
        case 'data_inicial': {
          const firstDay = new Date(year, monthIdx, 1);
          const el = win.document.querySelector<HTMLInputElement>(step.selector);
          if (!el) throw new Error(`Elemento nao encontrado: ${step.selector}`);
          el.value = formatDate(firstDay, step.format);
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
          break;
        }
        case 'data_final': {
          const lastDay = new Date(year, monthIdx + 1, 0);
          const el = win.document.querySelector<HTMLInputElement>(step.selector);
          if (!el) throw new Error(`Elemento nao encontrado: ${step.selector}`);
          el.value = formatDate(lastDay, step.format);
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
          break;
        }
        case 'competencia': {
          const compDate = new Date(year, monthIdx, 1);
          const el = win.document.querySelector<HTMLInputElement>(step.selector);
          if (!el) throw new Error(`Elemento nao encontrado: ${step.selector}`);
          el.value = formatDate(compDate, step.format);
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
          break;
        }
        case 'aguardar': {
          const ms = parseInt(step.selector) || 2000;
          await new Promise(resolve => setTimeout(resolve, ms));
          break;
        }
        default:
          throw new Error(`Acao desconhecida: ${step.action}`);
      }
    } catch (err: any) {
      if (err.name === 'SecurityError' || err.message?.includes('cross-origin') || err.message?.includes('Blocked')) {
        throw new Error(`Bloqueio cross-origin. Inicie o servidor de automacao.`);
      }
      throw err;
    }
  };

  const closeAutomationPanel = () => {
    setShowAutomationPanel(false);
    setAutomationData(null);
    setAutomationClient(null);
    setStepStatuses([]);
    setIsRunning(false);
    setAutomationMessage('');
    setCompanyProgress([]);
    setCurrentBatchIdx(-1);
    setIsBatchMode(false);
  };

  // ═══════════════════════════════════════════════════════════════
  //  RENDER
  // ═══════════════════════════════════════════════════════════════
  return (
    <div className="flex flex-col gap-3 h-[calc(100vh-120px)]">
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h2 className="text-2xl font-serif font-bold text-slate-800">Movimentos Fiscais</h2>
          <p className="text-slate-500 text-sm">Gerencie competencias, verifique status e acesse documentos.</p>
        </div>
        <div className="flex items-center gap-2">
          {isRefreshing && <RefreshCw className="w-4 h-4 text-slate-400 animate-spin" />}
          {/* Batch Prefeitura Button */}
          {selectedIds.size > 0 && (
            <button
              onClick={handleBatchPrefeitura}
              className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 text-white rounded-lg text-[10px] font-black uppercase tracking-wider hover:bg-slate-900 transition-all shadow-md active:scale-95"
            >
              <Bot className="w-4 h-4" />
              Executar Robo ({selectedIds.size})
            </button>
          )}
        </div>
      </div>

      {/* Main: Table + Panel */}
      <div className="flex gap-3 flex-1 min-h-0">

        {/* ─── LEFT: DataGrid ────────────────────────────── */}
        <div className={`bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col transition-all duration-300 min-h-0 ${showAutomationPanel ? 'flex-1' : 'w-full'}`}>

          {/* Compact Filter Fieldset */}
          <div className="border-b border-slate-200 px-4 py-2.5 flex-shrink-0">
            <fieldset className="border border-slate-200 rounded-lg px-3 py-2 relative">
              <legend className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1.5 select-none flex items-center gap-1">
                <Filter className="w-3 h-3" />
                Filtro de Pesquisa
              </legend>
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-1.5 flex-1 min-w-[140px]">
                  <label className="text-[10px] font-bold text-slate-500 uppercase whitespace-nowrap">Cliente</label>
                  <select
                    className="flex-1 min-w-0 appearance-none bg-slate-50 border border-slate-200 text-slate-700 py-1 px-2 rounded-md text-[11px] font-medium focus:outline-none focus:border-slate-400 transition-all"
                    value={filterClient}
                    onChange={(e) => setFilterClient(e.target.value)}
                  >
                    <option value="">Todos</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-1.5 min-w-[130px]">
                  <label className="text-[10px] font-bold text-slate-500 uppercase whitespace-nowrap">Prefeitura</label>
                  <select
                    className="appearance-none bg-slate-50 border border-slate-200 text-slate-700 py-1 px-2 rounded-md text-[11px] font-medium focus:outline-none focus:border-slate-400 transition-all flex-1 min-w-0"
                    value={filterCity}
                    onChange={(e) => setFilterCity(e.target.value)}
                  >
                    <option value="">Todas</option>
                    {uniqueCities.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase whitespace-nowrap">Mes</label>
                  <select
                    className="appearance-none bg-slate-50 border border-slate-200 text-slate-700 py-1 px-2 rounded-md text-[11px] font-medium focus:outline-none focus:border-slate-400 transition-all w-28"
                    value={filterMonth}
                    onChange={(e) => setFilterMonth(e.target.value)}
                  >
                    <option value="">Todos</option>
                    {MONTHS.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase whitespace-nowrap">Ano</label>
                  <select
                    className="appearance-none bg-slate-50 border border-slate-200 text-slate-700 py-1 px-2 rounded-md text-[11px] font-medium focus:outline-none focus:border-slate-400 transition-all w-20"
                    value={filterYear}
                    onChange={(e) => setFilterYear(e.target.value)}
                  >
                    {YEARS.map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              </div>
            </fieldset>
          </div>

          {/* Table */}
          <div className="overflow-auto flex-1 min-h-0">
            <table className="w-full border-collapse">
              <thead className="sticky top-0 z-10">
                <tr className="bg-slate-50 border-b-2 border-slate-200">
                  {/* Checkbox column */}
                  <th className="w-10 text-center px-2 py-2 border-r border-slate-200">
                    <button onClick={toggleSelectAll} className="text-slate-400 hover:text-slate-700 transition-colors">
                      {isAllSelected ? (
                        <CheckSquare className="w-4 h-4 text-slate-700" />
                      ) : isSomeSelected ? (
                        <MinusSquare className="w-4 h-4 text-slate-500" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                  </th>
                  <th className="w-16 text-left px-2 py-2 border-r border-slate-200">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Cod.</span>
                  </th>
                  <th className="text-left px-2 py-2 border-r border-slate-200">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Cliente</span>
                  </th>
                  <th className="w-32 text-left px-2 py-2 border-r border-slate-200">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Prefeitura</span>
                  </th>
                  <th className="w-24 text-left px-2 py-2 border-r border-slate-200">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Compet.</span>
                  </th>
                  <th className="w-24 text-left px-2 py-2 border-r border-slate-200">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Status</span>
                  </th>
                  <th className="w-36 text-center px-2 py-2">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Acoes</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-16 text-center">
                      <div className="flex flex-col items-center gap-3 text-slate-400">
                        <Loader2 className="w-6 h-6 animate-spin" />
                        <p className="text-[10px] font-black uppercase tracking-widest">Sincronizando...</p>
                      </div>
                    </td>
                  </tr>
                ) : filteredMovements.length > 0 ? (
                  filteredMovements.map((move, idx) => {
                    const isSelected = selectedIds.has(move.id);
                    return (
                      <tr
                        key={move.id}
                        className={`border-b border-slate-100 transition-colors cursor-default ${isSelected
                          ? 'bg-blue-50/80'
                          : idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'
                          } hover:bg-blue-50/50`}
                      >
                        {/* Checkbox */}
                        <td className="px-2 py-1.5 text-center border-r border-slate-100">
                          <button onClick={() => toggleSelect(move.id)} className="text-slate-400 hover:text-slate-700 transition-colors">
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-slate-700" />
                            ) : (
                              <Square className="w-4 h-4" />
                            )}
                          </button>
                        </td>
                        <td className="px-2 py-1.5 border-r border-slate-100">
                          <span className="text-[11px] font-bold font-mono text-slate-500">{move.clientCode}</span>
                        </td>
                        <td className="px-2 py-1.5 border-r border-slate-100">
                          <span className="text-[11px] font-bold text-slate-700">{move.clientName}</span>
                        </td>
                        {/* City / Prefeitura column */}
                        <td className="px-2 py-1.5 border-r border-slate-100">
                          <span className="text-[10px] font-bold text-slate-500 uppercase">{move.city || '—'}</span>
                        </td>
                        <td className="px-2 py-1.5 border-r border-slate-100">
                          <span className="text-[11px] text-slate-600">{move.month} / {move.year}</span>
                        </td>
                        <td className="px-2 py-1.5 border-r border-slate-100">
                          <div className="flex items-center gap-1 font-bold uppercase text-[9px]">
                            <div className={`w-1.5 h-1.5 rounded-full ${move.status === 'Com movimento' ? 'bg-green-500' : 'bg-slate-300'}`}></div>
                            <span className={move.status === 'Com movimento' ? 'text-green-700' : 'text-slate-400'}>{move.status}</span>
                          </div>
                        </td>
                        <td className="px-2 py-1.5 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleDownloadNfe(move)}
                              disabled={move.status === 'Sem movimento' || loadingId === move.id}
                              className={`flex items-center gap-1 px-2 py-1 rounded-md text-[9px] uppercase font-black tracking-wider transition-all ${move.status === 'Sem movimento'
                                ? 'text-slate-200 cursor-not-allowed'
                                : 'bg-white border border-slate-200 text-slate-400 hover:border-slate-600 hover:text-slate-700 shadow-sm'
                                }`}
                              title="Baixar NF-e"
                            >
                              {loadingId === move.id ? (
                                <div className="w-3 h-3 border-2 border-slate-600 border-t-transparent rounded-full animate-spin"></div>
                              ) : (
                                <Download className="w-3 h-3" />
                              )}
                              XML
                            </button>
                            <button
                              onClick={() => handleSinglePrefeitura(move)}
                              className="flex items-center gap-1 px-2 py-1 bg-slate-800 border border-slate-800 rounded-md text-white text-[9px] uppercase font-black tracking-wider hover:bg-slate-900 transition-all shadow-sm active:scale-95"
                              title="Executar Robo NFS-e"
                            >
                              <Bot className="w-3 h-3" />
                              Prefeitura
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                      <div className="flex flex-col items-center gap-2">
                        <Search className="w-6 h-6 text-slate-300" />
                        <p className="text-xs">Nenhum movimento encontrado.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="bg-slate-50 border-t border-slate-200 px-4 py-1.5 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-bold text-slate-400">{filteredMovements.length} registro(s)</span>
              {selectedIds.size > 0 && (
                <span className="text-[10px] font-bold text-blue-600">{selectedIds.size} selecionado(s)</span>
              )}
            </div>
            <span className="text-[10px] text-slate-300">Fact ERP Contabil</span>
          </div>
        </div>

        {/* ─── RIGHT: Automation Panel ──────────────────── */}
        {showAutomationPanel && (
          <div className="w-[340px] flex-shrink-0 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col min-h-0">

            {/* Panel Header */}
            <div className="bg-gradient-to-r from-slate-800 to-slate-900 px-4 py-3 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 bg-white/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Bot className="w-3.5 h-3.5 text-white" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-white font-bold text-[11px] uppercase tracking-wider">
                    Robo NFS-e
                  </h3>
                  <p className="text-slate-400 text-[9px] font-bold uppercase tracking-wider">
                    {isBatchMode ? `${companyProgress.length} empresa(s)` : automationClient?.name || '...'}
                  </p>
                </div>
              </div>
              <button
                onClick={closeAutomationPanel}
                disabled={isRunning}
                className="text-slate-400 hover:text-white transition-colors disabled:opacity-30 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Status Bar */}
            <div className={`px-3 py-2 text-[10px] font-bold flex items-center gap-2 border-b flex-shrink-0 ${automationMessage.includes('Concluido') || automationMessage.includes('sucesso')
              ? 'bg-green-50 text-green-700 border-green-200'
              : automationMessage.includes('Erro') || automationMessage.includes('Bloqueio') || automationMessage.includes('nao cadastrad')
                ? 'bg-red-50 text-red-600 border-red-200'
                : 'bg-blue-50 text-blue-700 border-blue-200'
              }`}>
              {isRunning ? (
                <Loader2 className="w-3 h-3 animate-spin flex-shrink-0" />
              ) : automationMessage.includes('Concluido') || automationMessage.includes('sucesso') ? (
                <CheckCircle2 className="w-3 h-3 flex-shrink-0" />
              ) : automationMessage.includes('Erro') ? (
                <AlertCircle className="w-3 h-3 flex-shrink-0" />
              ) : (
                <Bot className="w-3 h-3 flex-shrink-0" />
              )}
              <span className="truncate leading-tight">{automationMessage}</span>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto min-h-0">

              {/* Company Progress (batch mode) */}
              {isBatchMode && companyProgress.length > 0 && (
                <div className="px-2.5 py-2 border-b border-slate-100">
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest px-1 mb-1.5">
                    Empresas ({companyProgress.length})
                  </p>
                  <div className="space-y-0.5">
                    {companyProgress.map((cp, idx) => (
                      <div
                        key={cp.clientId}
                        className={`flex items-center gap-2 px-2 py-1 rounded-md text-[10px] transition-all ${cp.status === 'running'
                          ? 'bg-blue-50 border border-blue-200 font-bold'
                          : cp.status === 'success'
                            ? 'bg-green-50/50 text-green-700'
                            : cp.status === 'error'
                              ? 'bg-red-50/50 text-red-600'
                              : 'text-slate-500'
                          }`}
                      >
                        <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 text-[8px] font-black ${cp.status === 'running' ? 'bg-blue-500 text-white' :
                          cp.status === 'success' ? 'bg-green-500 text-white' :
                            cp.status === 'error' ? 'bg-red-500 text-white' :
                              'bg-slate-200 text-slate-500'
                          }`}>
                          {cp.status === 'running' ? <Loader2 className="w-2 h-2 animate-spin" /> :
                            cp.status === 'success' ? <CheckCircle2 className="w-2 h-2" /> :
                              cp.status === 'error' ? <AlertCircle className="w-2 h-2" /> :
                                idx + 1}
                        </div>
                        <span className="truncate flex-1 font-medium">{cp.clientName}</span>
                        {cp.message && <span className="text-[8px] text-red-400 truncate">{cp.message}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Automation Info */}
              {automationData && (
                <div className="px-3 py-2 border-b border-slate-100 bg-slate-50/50 flex-shrink-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-[8px] font-black text-slate-400 uppercase">Cidade</span>
                      <span className="text-[10px] font-bold text-slate-700">{automationData.city}</span>
                    </div>
                    {automationClient && (
                      <span className="text-[9px] font-mono text-slate-400 bg-white px-1.5 py-0.5 rounded border border-slate-100 flex-shrink-0">
                        {automationClient.month}/{automationClient.year}
                      </span>
                    )}
                  </div>
                  <p className="text-[8px] font-mono text-slate-400 truncate mt-0.5" title={automationData.url}>{automationData.url}</p>
                </div>
              )}

              {/* Steps */}
              {automationData && automationData.steps.length > 0 && (
                <div className="px-2.5 py-2">
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest px-1 mb-1">
                    Etapas ({automationData.steps.length})
                  </p>
                  <div className="space-y-1">
                    {automationData.steps.map((step, idx) => {
                      const ss = stepStatuses.find(s => s.stepId === step.id);
                      const status = ss?.status || 'pending';
                      return (
                        <div
                          key={step.id}
                          className={`flex items-center gap-2 px-2 py-1.5 rounded-lg border transition-all ${status === 'running' ? 'bg-blue-50 border-blue-200 shadow-sm' :
                            status === 'success' ? 'bg-green-50/60 border-green-200' :
                              status === 'error' ? 'bg-red-50 border-red-200' :
                                'bg-slate-50/50 border-slate-100'
                            }`}
                        >
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-[9px] font-black ${status === 'running' ? 'bg-blue-500 text-white' :
                            status === 'success' ? 'bg-green-500 text-white' :
                              status === 'error' ? 'bg-red-500 text-white' :
                                'bg-slate-200 text-slate-500'
                            }`}>
                            {status === 'running' ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> :
                              status === 'success' ? <CheckCircle2 className="w-2.5 h-2.5" /> :
                                status === 'error' ? <AlertCircle className="w-2.5 h-2.5" /> :
                                  idx + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1">
                              <span className="text-[9px] font-bold text-slate-700 uppercase">
                                {ACTION_LABELS[step.action] || step.action}
                              </span>
                              {step.format && step.action !== 'fechar_modal' && (
                                <span className="text-[8px] font-mono text-slate-400 bg-slate-100 px-1 py-0.5 rounded">{step.format}</span>
                              )}
                            </div>
                            {step.selector && step.action !== 'aguardar' && (
                              <p className="text-[8px] font-mono text-slate-400 truncate">{step.selector}</p>
                            )}
                            {step.action === 'aguardar' && (
                              <p className="text-[8px] font-mono text-slate-400">{step.selector}ms</p>
                            )}
                            {ss?.message && (
                              <p className="text-[8px] text-red-500 font-medium mt-0.5 truncate">{ss.message}</p>
                            )}
                          </div>
                          <div className="flex-shrink-0">
                            {status === 'running' && <Clock className="w-3 h-3 text-blue-500 animate-pulse" />}
                            {status === 'success' && <CheckCircle2 className="w-3 h-3 text-green-500" />}
                            {status === 'error' && <AlertCircle className="w-3 h-3 text-red-500" />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Empty state */}
              {!automationData && !isRunning && (
                <div className="flex flex-col items-center justify-center py-12 text-slate-300 gap-2">
                  <Bot className="w-8 h-8" />
                  <p className="text-[10px] font-bold uppercase tracking-wider">
                    {automationMessage.includes('Carregando') ? 'Carregando...' : 'Aguardando...'}
                  </p>
                </div>
              )}
            </div>

            {/* Panel Footer */}
            <div className="bg-slate-50 border-t border-slate-200 px-3 py-2 flex items-center justify-between gap-2 flex-shrink-0">
              {automationData ? (
                <button
                  onClick={() => window.open(automationData.url, '_blank')}
                  disabled={isRunning}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-white border border-slate-200 text-slate-500 hover:border-slate-400 hover:text-slate-700 transition-all disabled:opacity-30"
                >
                  <ExternalLink className="w-3 h-3" />
                  Manual
                </button>
              ) : (
                <div />
              )}
              {!isRunning && (automationData || isBatchMode) && (
                <button
                  onClick={executeAutomation}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-slate-800 text-white hover:bg-slate-900 transition-all shadow-sm active:scale-95"
                >
                  <Play className="w-3 h-3" />
                  Executar
                </button>
              )}
              {isRunning && (
                <span className="flex items-center gap-1.5 px-4 py-1.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-blue-600 text-white">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Executando...
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Movements;