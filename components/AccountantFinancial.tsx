import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../services/supabase';
import {
    DollarSign, Search, Calendar, ChevronLeft, ChevronRight,
    Loader2, Save, Plus, Edit, Trash2, ArrowLeft, X, Briefcase, MessageSquare, Users, FolderPlus, TrendingUp, RefreshCw
} from 'lucide-react';

// ─── Interfaces ────────────────────────────────────────────────
interface Company {
    id: number;
    client_seq_id: number;
    code: string;
    name: string;
    status: string;
    client_date?: string;
    monthly_fee?: number;
    due_day?: number;
    phone?: string;
    created_at?: string;
    financial_group_id?: string | null;
    responsibleName?: string;
}

interface FinancialGroup {
    id: string;
    name: string;
    phone: string;
}

interface FinancialRecord {
    id?: string;
    company_id: number;
    year: number;
    month: number;
    monthly_fee: number;
    payroll_fee: number;
    extras: number;
    amount_paid: number;
    payment_date: string | null;
    previous_balance: number;
    status: string;
    notes: string;
}

interface ServiceType {
    id: string;
    name: string;
    default_price: number;
}

interface ExtraService {
    id?: string;
    company_id: number;
    year: number;
    month: number;
    service_type_id: string | null;
    service_name: string;
    value: number;
    notes: string;
}

// ─── Constants ─────────────────────────────────────────────────
const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const MONTHS_FULL = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

const STATUS_COLORS: Record<string, { dot: string }> = {
    'Em Aberto': { dot: 'bg-red-500' },
    'Pago': { dot: 'bg-green-500' },
    'Parcial': { dot: 'bg-amber-500' },
};

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtShort = (v: number) => v === 0 ? '-' : v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// ─── Component ─────────────────────────────────────────────────
const AccountantFinancial: React.FC = () => {
    const currentDate = new Date();
    const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
    const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
    const [companies, setCompanies] = useState<Company[]>([]);
    const [records, setRecords] = useState<FinancialRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('Todos');

    // Service Types
    const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
    const [extraServices, setExtraServices] = useState<ExtraService[]>([]);
    const [showNewServiceType, setShowNewServiceType] = useState(false);
    const [newServiceTypeName, setNewServiceTypeName] = useState('');

    // Detail View (client card)
    const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
    const [clientRecords, setClientRecords] = useState<FinancialRecord[]>([]);
    const [clientServices, setClientServices] = useState<ExtraService[]>([]);
    const [editingMonth, setEditingMonth] = useState<number | null>(null);
    const [editForm, setEditForm] = useState<FinancialRecord | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    // New service entry
    const [newService, setNewService] = useState<{ typeId: string; name: string; value: number; notes: string }>({ typeId: '', name: '', value: 0, notes: '' });

    // Tab State
    const [activeTab, setActiveTab] = useState<'clients' | 'standalone'>('clients');





    // Standalone Tab State
    const [standaloneServices, setStandaloneServices] = useState<any[]>([]);
    const [standaloneForm, setStandaloneForm] = useState<any | null>(null);
    const [isLoadingStandalone, setIsLoadingStandalone] = useState(false);

    // Financial Groups State
    const [groups, setGroups] = useState<FinancialGroup[]>([]);
    const [isManagingGroups, setIsManagingGroups] = useState(false);
    const [groupForm, setGroupForm] = useState<Partial<FinancialGroup> | null>(null);
    const [isSavingGroup, setIsSavingGroup] = useState(false);
    const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

    // Persistence guards
    const isMounted = React.useRef(true);
    const refreshTimer = React.useRef<NodeJS.Timeout | null>(null);
    useEffect(() => {
        isMounted.current = true;
        fetchCompanies();
        fetchFinancialGroups();
        fetchServiceTypes();

        // Listen for global refresh events (Real-time) - with DEBOUNCE
        const handleRefresh = (e: any) => {
            if (e.detail.table === 'companies' || e.detail.table === 'accountant_financial' || e.detail.table === 'financial_groups') {
                if (refreshTimer.current) clearTimeout(refreshTimer.current);
                refreshTimer.current = setTimeout(() => {
                    if (isMounted.current) {
                        fetchCompanies();
                        fetchAllRecords();
                    }
                }, 500);
            }
        };
        window.addEventListener('fact-db-change', handleRefresh);

        // Safety timeout: prevent loading from getting stuck
        const timeout = setTimeout(() => {
            if (isMounted.current) setIsLoading(false);
        }, 10000);
        return () => {
            isMounted.current = false;
            if (refreshTimer.current) clearTimeout(refreshTimer.current);
            window.removeEventListener('fact-db-change', handleRefresh);
            clearTimeout(timeout);
        };
    }, []);
    useEffect(() => { fetchAllRecords(); }, [selectedYear, companies]);
    useEffect(() => { if (activeTab === 'standalone') fetchStandaloneServices(); }, [activeTab]);

    const fetchCompanies = async () => {
        console.log('[DEBUG] fetchCompanies started');
        try {
            // Simplified query to select everything to avoid potential schema mismatch issues
            const { data, error } = await supabase
                .from('companies')
                .select('*')
                .order('name');

            if (error) {
                console.error('[DEBUG] fetchCompanies error:', error);
                alert('Erro ao carregar empresas: ' + error.message);
                return;
            }

            console.log('[DEBUG] fetchCompanies data:', data?.length || 0, 'rows retrieved');

            // Natural Sort: Numbers first, then '-' or empty at the bottom (by date)
            const sorted = (data || []).sort((a: any, b: any) => {
                const codeA = String(a.code || '').replace(/-/g, '').trim();
                const codeB = String(b.code || '').replace(/-/g, '').trim();
                const hasCodeA = codeA.length > 0;
                const hasCodeB = codeB.length > 0;
                if (hasCodeA && !hasCodeB) return -1;
                if (!hasCodeA && hasCodeB) return 1;
                if (!hasCodeA && !hasCodeB) {
                    const dateA = new Date(a.created_at || 0).getTime() || 0;
                    const dateB = new Date(b.created_at || 0).getTime() || 0;
                    return dateA - dateB;
                }
                return codeA.localeCompare(codeB, undefined, { numeric: true, sensitivity: 'base' });
            });

            // Cast and ensure types
            const mapped: Company[] = sorted.map((c: any, idx: number) => ({
                id: c.id,
                client_seq_id: c.client_seq_id || 0,
                code: c.code || '',
                name: c.name || 'Sem Nome',
                status: c.status || 'Ativo',
                client_date: c.client_date,
                monthly_fee: Number(c.monthly_fee) || 0,
                due_day: Number(c.due_day) || 10,
                created_at: c.created_at,
                phone: c.phone || '',
                financial_group_id: c.financial_group_id,
                responsibleName: c.responsible_name || '',
                temp_seq_id: idx + 1
            }));

            setCompanies(mapped);
        } catch (err: any) {
            console.error('[DEBUG] fetchCompanies crash:', err);
            alert('Falha crítica ao carregar empresas. Verifique o console.');
            setCompanies([]);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchServiceTypes = async () => {
        const { data } = await supabase.from('financial_service_types').select('*').order('name');
        setServiceTypes(data || []);
    };

    const fetchFinancialGroups = async () => {
        const { data } = await supabase.from('financial_groups').select('*').order('name');
        setGroups(data || []);
    };

    const saveGroup = async () => {
        if (!groupForm?.name) return;
        setIsSavingGroup(true);
        try {
            const payload = {
                name: groupForm.name,
                phone: groupForm.phone || ''
            } as any;
            if (groupForm.id) {
                const { error } = await supabase.from('financial_groups').update(payload).eq('id', groupForm.id);
                if (error) throw error;
            } else {
                const { error } = await supabase.from('financial_groups').insert(payload);
                if (error) throw error;
            }
            fetchFinancialGroups();
            setGroupForm(null);
        } catch (err: any) { alert(err.message); }
        finally { setIsSavingGroup(false); }
    };

    const deleteGroup = async (id: string) => {
        if (!confirm('Excluir este grupo? As empresas voltarão para a lista individual.')) return;
        try {
            await supabase.from('companies').update({ financial_group_id: null }).eq('financial_group_id', id);
            await supabase.from('financial_groups').delete().eq('id', id);
            fetchFinancialGroups();
            fetchCompanies();
        } catch (err: any) { alert(err.message); }
    };

    const toggleCompanyGroup = async (companyId: number, groupId: string | null) => {
        try {
            const { error } = await supabase.from('companies').update({ financial_group_id: groupId }).eq('id', companyId);
            if (error) throw error;
            fetchCompanies();
        } catch (err: any) { alert(err.message); }
    };

    const handleWhatsAppGroupBilling = (group: FinancialGroup) => {
        const groupMembers = companies.filter(c => c.financial_group_id === group.id);
        if (groupMembers.length === 0) { alert('Este grupo não possui empresas.'); return; }

        const rawPhone = group.phone?.replace(/\D/g, '') || groupMembers[0].phone?.replace(/\D/g, '') || '';
        if (!rawPhone) { alert('Configure um telefone para o grupo ou para a empresa principal.'); return; }
        const phoneNumber = rawPhone.length <= 11 ? `55${rawPhone}` : rawPhone;

        const monthName = MONTHS_FULL[selectedMonth - 1];
        const monthNum = String(selectedMonth).padStart(2, '0');

        let message = `Olá! 👋 Segue o resumo das mensalidades de *${monthName} de ${selectedYear}*:\n\n`;
        let grandTotal = 0;

        groupMembers.forEach(company => {
            const companyRecords = records.filter(r => r.company_id === company.id && r.year === selectedYear);
            const record = companyRecords.find(r => r.month === selectedMonth);

            const mensalidade = record?.monthly_fee || company.monthly_fee || 0;
            const folha = record?.payroll_fee || 0;
            const extras = record?.extras || 0;
            const total = mensalidade + folha + extras;
            grandTotal += total;

            message += `🏢 *${company.name}*\n`;
            message += `📊 Mensalidade: ${fmt(mensalidade)}\n`;
            message += `📄 Folha: ${fmt(folha)}\n`;
            message += `🛠️ Outros: ${fmt(extras)}\n`;
            message += `💰 *Subtotal: ${fmt(total)}*\n\n`;
        });

        message += `🌟 *TOTAL GERAL DO GRUPO: ${fmt(grandTotal)}*\n`;
        const day = groupMembers[0].due_day || 10;
        message += `📅 Vencimento: ${day}/${monthNum}/${selectedYear}\n\n`;
        message += `Atenciosamente,\n**Fact Assessoria**`;

        window.open(`https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`, '_blank');
    };

    const fetchAllRecords = async () => {
        setIsLoading(true);
        try {
            if (companies.length === 0) { setRecords([]); setIsLoading(false); return; }
            const { data, error } = await supabase.from('accountant_financial').select('*').eq('year', selectedYear);
            if (error) console.error('Error fetching records:', error);
            setRecords(data || []);
        } catch (err) { console.error('Error:', err); setRecords([]); }
        finally { setIsLoading(false); }
    };

    const fetchClientDetail = async (company: Company) => {
        setSelectedCompany(company);
        const [{ data: recs }, { data: svcs }] = await Promise.all([
            supabase.from('accountant_financial').select('*').eq('company_id', company.id).eq('year', selectedYear).order('month'),
            supabase.from('financial_extra_services').select('*').eq('company_id', company.id).eq('year', selectedYear).order('month'),
        ]);
        setClientRecords(recs || []);
        setClientServices(svcs || []);
    };

    // ─── Handlers ────────────────────────────────────────────────
    const openMonthEdit = (month: number) => {
        if (!selectedCompany) return;
        const existing = clientRecords.find(r => r.month === month);
        setEditForm(existing ? { ...existing } : {
            company_id: selectedCompany.id, year: selectedYear, month,
            monthly_fee: 0, payroll_fee: 0, extras: 0, amount_paid: 0,
            payment_date: null, previous_balance: 0, status: 'Em Aberto', notes: '',
        });
        setEditingMonth(month);
    };

    const saveMonthRecord = async () => {
        if (!editForm) return;
        setIsSaving(true);
        try {
            // Calculate extras from services
            const monthServices = clientServices.filter(s => s.month === editForm.month);
            const extrasTotal = monthServices.reduce((s, sv) => s + sv.value, 0);
            const payload = { ...editForm, extras: extrasTotal };
            delete (payload as any).id;

            if (editForm.id) {
                const { error } = await supabase.from('accountant_financial').update(payload).eq('id', editForm.id);
                if (error) throw error;
            } else {
                const { error } = await supabase.from('accountant_financial').insert(payload);
                if (error) throw error;
            }
            await fetchClientDetail(selectedCompany!);
            await fetchAllRecords();
            setEditingMonth(null);
            setEditForm(null);
        } catch (err: any) { alert('Erro: ' + err.message); }
        finally { setIsSaving(false); }
    };

    const addExtraService = async () => {
        if (!selectedCompany || editingMonth === null) return;
        if (!newService.name && !newService.typeId) { alert('Selecione ou digite um serviço.'); return; }
        const serviceName = newService.typeId
            ? serviceTypes.find(s => s.id === newService.typeId)?.name || newService.name
            : newService.name;

        try {
            const { error } = await supabase.from('financial_extra_services').insert({
                company_id: selectedCompany.id, year: selectedYear, month: editingMonth,
                service_type_id: newService.typeId || null, service_name: serviceName,
                value: newService.value, notes: newService.notes,
            });
            if (error) throw error;
            setNewService({ typeId: '', name: '', value: 0, notes: '' });
            await fetchClientDetail(selectedCompany);
        } catch (err: any) { alert('Erro: ' + err.message); }
    };

    const deleteExtraService = async (id: string) => {
        if (!window.confirm('Excluir este serviço?')) return;
        await supabase.from('financial_extra_services').delete().eq('id', id);
        if (selectedCompany) await fetchClientDetail(selectedCompany);
    };

    const addNewServiceType = async () => {
        if (!newServiceTypeName.trim()) return;
        try {
            const { error } = await supabase.from('financial_service_types').insert({ name: newServiceTypeName.trim() });
            if (error) throw error;
            setNewServiceTypeName('');
            setShowNewServiceType(false);
            fetchServiceTypes();
        } catch (err: any) { alert('Erro: ' + err.message); }
    };

    const handleProvision = async () => {
        if (!window.confirm(`Provisionar lançamentos para ${selectedYear}?\nIsso criará registros em aberto para clientes ativos nos meses sem lançamento e atualizará mensalidades zeradas.`)) return;
        setIsLoading(true);
        try {
            // Build map of existing records keyed by company_id-month
            const existingMap = new Map<string, FinancialRecord>();
            records.forEach(r => existingMap.set(`${r.company_id}-${r.month}`, r));

            const toInsert: any[] = [];
            const toUpdate: { id: string; monthly_fee: number }[] = [];

            companies.filter(c => c.status === 'Ativo').forEach(c => {
                const companyFee = c.monthly_fee || 0;
                for (let m = 1; m <= 12; m++) {
                    const key = `${c.id}-${m}`;
                    const existing = existingMap.get(key);
                    if (!existing) {
                        // Phase 1: Create new records for months without entries
                        toInsert.push({
                            company_id: c.id, year: selectedYear, month: m,
                            monthly_fee: companyFee, payroll_fee: 0, extras: 0, amount_paid: 0,
                            previous_balance: 0, status: 'Em Aberto', notes: '',
                        });
                    } else if (
                        existing.id &&
                        (Number(existing.monthly_fee) || 0) === 0 &&
                        companyFee > 0 &&
                        existing.status === 'Em Aberto'
                    ) {
                        // Phase 2: Update existing records that have monthly_fee = 0
                        // but the company now has a fee configured (only if still unpaid)
                        toUpdate.push({ id: existing.id, monthly_fee: companyFee });
                    }
                }
            });

            let msgParts: string[] = [];

            // Insert new records
            if (toInsert.length > 0) {
                const { error } = await supabase.from('accountant_financial').insert(toInsert);
                if (error) throw error;
                msgParts.push(`${toInsert.length} lançamento(s) criado(s)`);
            }

            // Update existing records with zero monthly_fee
            if (toUpdate.length > 0) {
                // Batch update in groups of 50
                for (let i = 0; i < toUpdate.length; i += 50) {
                    const batch = toUpdate.slice(i, i + 50);
                    const ids = batch.map(b => b.id);
                    // Group by fee value for efficient updates
                    const feeGroups = new Map<number, string[]>();
                    batch.forEach(b => {
                        const arr = feeGroups.get(b.monthly_fee) || [];
                        arr.push(b.id);
                        feeGroups.set(b.monthly_fee, arr);
                    });
                    for (const [fee, feeIds] of feeGroups) {
                        const { error } = await supabase
                            .from('accountant_financial')
                            .update({ monthly_fee: fee })
                            .in('id', feeIds);
                        if (error) throw error;
                    }
                }
                msgParts.push(`${toUpdate.length} mensalidade(s) atualizada(s) de R$ 0,00 para o valor do cadastro`);
            }

            if (msgParts.length === 0) {
                alert('Todos os meses já estão provisionados e com valores corretos.');
            } else {
                alert(msgParts.join('\n'));
            }
            fetchAllRecords();
        } catch (err: any) { alert('Erro: ' + err.message); }
        finally { setIsLoading(false); }
    };

    // ─── CLIENT DETAIL VIEW (Jan-Dec) ───────────────────────────
    if (selectedCompany) {
        let cumulativeBalance = 0;
        const monthlyData = MONTHS.map((label, idx) => {
            const m = idx + 1;
            const rec = clientRecords.find(r => r.month === m);

            // For January, we start with the carry-over from the database
            if (m === 1) cumulativeBalance = rec?.previous_balance || 0;

            const svcs = clientServices.filter(s => s.month === m);
            const extrasTotal = svcs.reduce((s, sv) => s + sv.value, 0);
            const monthlyFee = rec?.monthly_fee || 0;
            const payrollFee = rec?.payroll_fee || 0;
            const amountPaid = rec?.amount_paid || 0;

            const total = monthlyFee + payrollFee + extrasTotal;
            const prevBalanceForThisMonth = cumulativeBalance;
            cumulativeBalance += (total - amountPaid);
            const rowBalance = cumulativeBalance;

            return { m, label, rec, svcs, extrasTotal, monthlyFee, payrollFee, amountPaid, prevBalance: prevBalanceForThisMonth, total, balance: rowBalance, status: rec?.status || 'Em Aberto' };
        });

        const yearTotals = monthlyData.reduce((a, d) => ({
            mensalidade: a.mensalidade + d.monthlyFee,
            folha: a.folha + d.payrollFee,
            extras: a.extras + d.extrasTotal,
            pago: a.pago + d.amountPaid,
            saldo: a.saldo + d.balance,
        }), { mensalidade: 0, folha: 0, extras: 0, pago: 0, saldo: 0 });

        return (
            <div className="flex flex-col gap-4 animate-fade-in h-[calc(100vh-120px)]">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button onClick={() => { setSelectedCompany(null); setEditingMonth(null); }} className="p-2 hover:bg-slate-100 rounded-full text-slate-500"><ArrowLeft className="w-5 h-5" /></button>
                        <div>
                            <h2 className="text-xl font-serif font-bold text-slate-800">{selectedCompany.name}</h2>
                            <p className="text-xs text-slate-500 font-bold">Cód: {selectedCompany.client_seq_id ? String(selectedCompany.client_seq_id).padStart(3, '0') : '—'} • Ano: {selectedYear}</p>
                        </div>
                    </div>
                </div>

                {/* Annual Grid */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col flex-1 min-h-0">
                    <div className="overflow-auto flex-1">
                        <table className="w-full border-collapse">
                            <thead className="sticky top-0 z-10">
                                <tr className="bg-slate-50 border-b-2 border-slate-200">
                                    {['Mês', 'Saldo Ant.', 'Mensalidade', 'Folha', 'Serviços', 'Total', 'Pago', 'Saldo', ''].map(h => (
                                        <th key={h} className="text-left px-3 py-2.5 border-r border-slate-200 last:border-r-0">
                                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider">{h}</span>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {monthlyData.map((d, idx) => {
                                    const colors = STATUS_COLORS[d.status] || STATUS_COLORS['Em Aberto'];
                                    const isEditing = editingMonth === d.m;
                                    return (
                                        <React.Fragment key={d.m}>
                                            <tr className={`border-b border-slate-100 transition-colors cursor-pointer ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'} ${isEditing ? 'bg-blue-50/60 border-blue-200' : 'hover:bg-blue-50/30'}`} onClick={() => !isEditing && openMonthEdit(d.m)}>
                                                <td className="px-3 py-2 border-r border-slate-100">
                                                    <span className="text-[11px] font-black text-slate-700 uppercase">{d.label}</span>
                                                </td>
                                                <td className="px-3 py-2 border-r border-slate-100 text-right">
                                                    <span className={`text-[11px] font-mono font-bold ${d.prevBalance > 0 ? 'text-amber-600' : 'text-slate-400'}`}>{fmtShort(d.prevBalance)}</span>
                                                </td>
                                                <td className="px-3 py-2 border-r border-slate-100 text-right">
                                                    <span className="text-[11px] font-mono font-bold text-slate-700">{fmtShort(d.monthlyFee)}</span>
                                                </td>
                                                <td className="px-3 py-2 border-r border-slate-100 text-right">
                                                    <span className="text-[11px] font-mono text-slate-600">{fmtShort(d.payrollFee)}</span>
                                                </td>
                                                <td className="px-3 py-2 border-r border-slate-100 text-right">
                                                    <div className="flex items-center justify-end gap-1.5">
                                                        <span className="text-[11px] font-mono text-purple-600 font-bold">{fmtShort(d.extrasTotal)}</span>
                                                        {d.svcs.length > 0 && <span className="text-[8px] bg-purple-100 text-purple-600 px-1 rounded font-bold">{d.svcs.length}</span>}
                                                    </div>
                                                </td>
                                                <td className="px-3 py-2 border-r border-slate-100 text-right">
                                                    <span className="text-[11px] font-mono font-bold text-slate-800">{fmtShort(d.total)}</span>
                                                </td>
                                                <td className="px-3 py-2 border-r border-slate-100 text-right">
                                                    <span className={`text-[11px] font-mono font-bold ${d.amountPaid > 0 ? 'text-green-600' : 'text-slate-400'}`}>{fmtShort(d.amountPaid)}</span>
                                                </td>
                                                <td className="px-3 py-2 border-r border-slate-100 text-right">
                                                    <span className={`text-[11px] font-mono font-black ${d.balance > 0 ? 'text-red-600' : d.balance < 0 ? 'text-green-600' : 'text-slate-400'}`}>{fmtShort(d.balance)}</span>
                                                </td>
                                                <td className="px-3 py-2 border-r border-slate-100 text-center">
                                                    <button onClick={(e) => { e.stopPropagation(); openMonthEdit(d.m); }} className="p-1 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded transition-all" title="Editar">
                                                        <Edit className="w-3.5 h-3.5" />
                                                    </button>
                                                </td>
                                            </tr>

                                            {/* Expanded Edit Panel */}
                                            {isEditing && editForm && (
                                                <tr>
                                                    <td colSpan={10} className="p-0">
                                                        <div className="bg-blue-50/40 border-y-2 border-blue-200 p-4 space-y-4">
                                                            {/* Month Values */}
                                                            <div className="grid grid-cols-7 gap-3">
                                                                {[
                                                                    { label: 'Saldo Anterior', key: 'previous_balance' },
                                                                    { label: 'Mensalidade', key: 'monthly_fee' },
                                                                    { label: 'Folha', key: 'payroll_fee' },
                                                                    { label: 'Valor Pago', key: 'amount_paid' },
                                                                ].map(f => (
                                                                    <div key={f.key}>
                                                                        <label className="text-[8px] font-black text-slate-500 uppercase tracking-wider">{f.label}</label>
                                                                        <input type="number" step="0.01"
                                                                            value={(editForm as any)[f.key]}
                                                                            onChange={e => setEditForm(p => p ? { ...p, [f.key]: parseFloat(e.target.value) || 0 } : null)}
                                                                            className="w-full px-2 py-1.5 text-[11px] border border-slate-200 rounded-md outline-none focus:border-blue-400 font-mono font-bold bg-white"
                                                                        />
                                                                    </div>
                                                                ))}
                                                                <div>
                                                                    <label className="text-[8px] font-black text-slate-500 uppercase tracking-wider">Data Pgto</label>
                                                                    <input type="date" value={editForm.payment_date || ''}
                                                                        onChange={e => setEditForm(p => p ? { ...p, payment_date: e.target.value || null } : null)}
                                                                        className="w-full px-2 py-1.5 text-[11px] border border-slate-200 rounded-md outline-none focus:border-blue-400 bg-white"
                                                                    />
                                                                </div>
                                                                <div className="col-span-2">
                                                                    <label className="text-[8px] font-black text-slate-500 uppercase tracking-wider">Observação</label>
                                                                    <input type="text" value={editForm.notes}
                                                                        onChange={e => setEditForm(p => p ? { ...p, notes: e.target.value } : null)}
                                                                        className="w-full px-2 py-1.5 text-[11px] border border-slate-200 rounded-md outline-none focus:border-blue-400 bg-white"
                                                                        placeholder="Nota..."
                                                                    />
                                                                </div>
                                                            </div>

                                                            {/* Extra Services Section */}
                                                            <div className="border-2 border-dashed border-purple-200 rounded-xl p-3 bg-purple-50/30 relative">
                                                                <span className="absolute -top-2.5 left-3 bg-white px-2 text-[8px] font-black text-purple-500 uppercase tracking-widest flex items-center gap-1">
                                                                    <Briefcase className="w-3 h-3" /> Serviços Extras — {MONTHS_FULL[d.m - 1]}
                                                                </span>
                                                                {/* Existing services */}
                                                                {clientServices.filter(s => s.month === d.m).length > 0 && (
                                                                    <div className="space-y-1 mb-3 mt-1">
                                                                        {clientServices.filter(s => s.month === d.m).map(svc => (
                                                                            <div key={svc.id} className="flex items-center justify-between bg-white rounded-md px-3 py-1.5 border border-purple-100">
                                                                                <div className="flex items-center gap-3">
                                                                                    <span className="text-[10px] font-bold text-purple-700">{svc.service_name}</span>
                                                                                    {svc.notes && <span className="text-[9px] text-slate-400 italic">({svc.notes})</span>}
                                                                                </div>
                                                                                <div className="flex items-center gap-2">
                                                                                    <span className="text-[11px] font-mono font-bold text-purple-600">{fmt(svc.value)}</span>
                                                                                    <button onClick={() => svc.id && deleteExtraService(svc.id)} className="p-0.5 text-slate-300 hover:text-red-500 transition-colors">
                                                                                        <X className="w-3 h-3" />
                                                                                    </button>
                                                                                </div>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                                {/* Add new service */}
                                                                <div className="flex items-end gap-2 mt-2">
                                                                    <div className="flex-1">
                                                                        <label className="text-[7px] font-black text-purple-400 uppercase">Tipo de Serviço</label>
                                                                        <select value={newService.typeId} onChange={e => {
                                                                            const st = serviceTypes.find(s => s.id === e.target.value);
                                                                            setNewService(p => ({ ...p, typeId: e.target.value, name: st?.name || '', value: st?.default_price || p.value }));
                                                                        }} className="w-full px-2 py-1.5 text-[10px] border border-purple-200 rounded-md outline-none bg-white font-bold">
                                                                            <option value="">Selecione ou digite abaixo...</option>
                                                                            {serviceTypes.map(st => <option key={st.id} value={st.id}>{st.name}</option>)}
                                                                        </select>
                                                                    </div>
                                                                    <div className="flex-1">
                                                                        <label className="text-[7px] font-black text-purple-400 uppercase">Ou Nome Livre</label>
                                                                        <input type="text" value={newService.name} onChange={e => setNewService(p => ({ ...p, name: e.target.value, typeId: '' }))}
                                                                            className="w-full px-2 py-1.5 text-[10px] border border-purple-200 rounded-md outline-none bg-white" placeholder="Ex: Consultoria especial" />
                                                                    </div>
                                                                    <div className="w-28">
                                                                        <label className="text-[7px] font-black text-purple-400 uppercase">Valor (R$)</label>
                                                                        <input type="number" step="0.01" value={newService.value} onChange={e => setNewService(p => ({ ...p, value: parseFloat(e.target.value) || 0 }))}
                                                                            className="w-full px-2 py-1.5 text-[10px] border border-purple-200 rounded-md outline-none bg-white font-mono font-bold" />
                                                                    </div>
                                                                    <button onClick={addExtraService} className="px-3 py-1.5 bg-purple-600 text-white rounded-md text-[10px] font-bold hover:bg-purple-700 transition-colors flex items-center gap-1">
                                                                        <Plus className="w-3 h-3" /> Incluir
                                                                    </button>
                                                                </div>
                                                                {/* Add new type */}
                                                                <div className="mt-2 flex items-center gap-2">
                                                                    {!showNewServiceType ? (
                                                                        <button onClick={() => setShowNewServiceType(true)} className="text-[9px] text-purple-400 hover:text-purple-600 font-bold uppercase tracking-wider flex items-center gap-1">
                                                                            <Plus className="w-3 h-3" /> Cadastrar novo tipo de serviço
                                                                        </button>
                                                                    ) : (
                                                                        <div className="flex items-center gap-2">
                                                                            <input type="text" value={newServiceTypeName} onChange={e => setNewServiceTypeName(e.target.value)}
                                                                                className="px-2 py-1 text-[10px] border border-purple-300 rounded-md outline-none bg-white" placeholder="Nome do serviço..." />
                                                                            <button onClick={addNewServiceType} className="px-2 py-1 bg-purple-500 text-white text-[10px] font-bold rounded-md">Salvar</button>
                                                                            <button onClick={() => setShowNewServiceType(false)} className="text-slate-400 hover:text-slate-600"><X className="w-3 h-3" /></button>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            {/* Actions */}
                                                            <div className="flex justify-end gap-2">
                                                                <button onClick={() => { setEditingMonth(null); setEditForm(null); }} className="px-4 py-1.5 bg-white border border-slate-200 text-slate-600 rounded-lg text-[10px] font-bold hover:bg-slate-50">Cancelar</button>
                                                                <button onClick={saveMonthRecord} disabled={isSaving} className="px-5 py-1.5 bg-slate-800 text-white rounded-lg text-[10px] font-bold hover:bg-slate-900 flex items-center gap-1.5 disabled:opacity-50">
                                                                    {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />} Salvar Mês
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    );
                                })}
                            </tbody>
                            {/* Year Totals */}
                            <tfoot>
                                <tr className="bg-slate-800 text-white">
                                    <td className="px-3 py-2.5 text-[10px] font-black uppercase tracking-wider">Total {selectedYear}</td>
                                    <td className="px-3 py-2.5"></td>
                                    <td className="px-3 py-2.5 text-right"><span className="text-[11px] font-mono font-bold">{fmt(yearTotals.mensalidade)}</span></td>
                                    <td className="px-3 py-2.5 text-right"><span className="text-[11px] font-mono font-bold">{fmt(yearTotals.folha)}</span></td>
                                    <td className="px-3 py-2.5 text-right"><span className="text-[11px] font-mono font-bold text-purple-300">{fmt(yearTotals.extras)}</span></td>
                                    <td className="px-3 py-2.5 text-right"><span className="text-[11px] font-mono font-bold">{fmt(yearTotals.mensalidade + yearTotals.folha + yearTotals.extras)}</span></td>
                                    <td className="px-3 py-2.5 text-right"><span className="text-[11px] font-mono font-bold text-green-400">{fmt(yearTotals.pago)}</span></td>
                                    <td className="px-3 py-2.5 text-right"><span className={`text-[11px] font-mono font-black ${yearTotals.saldo > 0 ? 'text-red-400' : 'text-green-400'}`}>{fmt(yearTotals.saldo)}</span></td>
                                    <td colSpan={1}></td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
            </div>
        );
    }

    // ─── LIST VIEW (All Clients) ─────────────────────────────────
    const fetchStandaloneServices = async () => {
        setIsLoadingStandalone(true);
        const { data } = await supabase.from('standalone_services').select('*').order('created_at', { ascending: false });
        setStandaloneServices(data || []);
        setIsLoadingStandalone(false);
    };

    const saveStandaloneService = async () => {
        if (!standaloneForm) return;
        if (!standaloneForm.client_name || !standaloneForm.service_name) { alert('Preencha o nome do cliente e o serviço.'); return; }
        try {
            const payload = { ...standaloneForm };
            const id = payload.id; delete payload.id; delete payload.created_at;
            if (id) {
                const { error } = await supabase.from('standalone_services').update(payload).eq('id', id);
                if (error) throw error;
            } else {
                const { error } = await supabase.from('standalone_services').insert(payload);
                if (error) throw error;
            }
            setStandaloneForm(null);
            fetchStandaloneServices();
        } catch (err: any) { alert('Erro: ' + err.message); }
    };

    const deleteStandaloneService = async (id: string) => {
        if (!window.confirm('Excluir este serviço avulso?')) return;
        await supabase.from('standalone_services').delete().eq('id', id);
        fetchStandaloneServices();
    };

    const handleWhatsAppBilling = (company: Company, specificRecord?: FinancialRecord, specificMonth?: number, breakdown?: { mensalidade: number, folha: number, extras: number }) => {
        const rawPhone = company.phone?.replace(/\D/g, '') || '';
        if (!rawPhone) {
            alert('Cliente sem telefone cadastrado.');
            return;
        }

        const phoneNumber = rawPhone.length <= 11 ? `55${rawPhone}` : rawPhone;

        const companyRecords = records.filter(r => r.company_id === company.id && r.year === selectedYear);

        // Use provided record/month or find the first unpaid/current
        const record = specificRecord || (specificMonth ? companyRecords.find(r => r.month === specificMonth) : (companyRecords.find(r => r.status === 'Em Aberto') || companyRecords.find(r => r.month === currentDate.getMonth() + 1)));

        const mIdx = record ? record.month - 1 : (specificMonth ? specificMonth - 1 : currentDate.getMonth());
        const monthName = MONTHS_FULL[mIdx];
        const monthNum = String(mIdx + 1).padStart(2, '0');

        // Values for breakdown - use provided breakdown or fallback to record/company
        const mensalidade = breakdown ? breakdown.mensalidade : (record?.monthly_fee || company.monthly_fee || 0);
        const folha = breakdown ? breakdown.folha : (record?.payroll_fee || 0);
        const extras = breakdown ? breakdown.extras : (record?.extras || 0);
        const total = mensalidade + folha + extras;
        const day = company.due_day || 10;
        const dueDate = `${day}/${monthNum}/${selectedYear}`;

        const message = `Olá *${company.name}*! 👋

Este é o resumo da mensalidade de **${monthName} de ${selectedYear}** já está disponível.

*Resumo dos Serviços:*
📊 Mensalidade: ${fmt(mensalidade)}
📄 Folha: ${fmt(folha)}
🛠️ Outros Serviços: ${fmt(extras)}

💰 *Total do Mês: ${fmt(total)}*
📅 Vencimento: ${dueDate}

Caso já tenha efetuado o pagamento, por favor desconsidere esta mensagem.

Dados para pagamento:

Fact Assessoria e Consultoria Empresarial Ltda
Banco Inter 
Chave Pix [CNPJ]: 30.321.587/0001-00

Atenciosamente,
**Fact Assessoria**`;

        const encodedMessage = encodeURIComponent(message);
        window.open(`https://wa.me/${phoneNumber}?text=${encodedMessage}`, '_blank');
    };

    const filteredCompanies = companies.filter(c => {
        if (!c.monthly_fee || c.monthly_fee <= 0) return false;

        const s = searchTerm.toLowerCase();
        const seqIdStr = c.client_seq_id ? String(c.client_seq_id) : '';
        return c.name?.toLowerCase().includes(s) || seqIdStr.includes(s) || c.code?.toLowerCase().includes(s);
    });

    return (
        <div className="flex flex-col gap-4 animate-fade-in h-[calc(100vh-120px)]">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-serif font-bold text-slate-800">Controle Financeiro</h2>
                    <p className="text-slate-500 text-sm">Gestão mensal de mensalidades e serviços avulsos.</p>
                </div>
                <div className="flex items-center gap-2">
                    <select
                        value={selectedMonth}
                        onChange={e => setSelectedMonth(parseInt(e.target.value))}
                        className="text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-lg px-2 py-1.5 outline-none focus:border-blue-400"
                    >
                        {MONTHS_FULL.map((m, idx) => (
                            <option key={m} value={idx + 1}>{m}</option>
                        ))}
                    </select>
                    <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-0.5">
                        <button onClick={() => setSelectedYear(y => y - 1)} className="p-1 hover:bg-slate-50 rounded text-slate-400"><ChevronLeft className="w-3.5 h-3.5" /></button>
                        <span className="text-[11px] font-black text-slate-700 min-w-[40px] text-center">{selectedYear}</span>
                        <button onClick={() => setSelectedYear(y => y + 1)} className="p-1 hover:bg-slate-50 rounded text-slate-400"><ChevronRight className="w-3.5 h-3.5" /></button>
                    </div>
                    {activeTab === 'clients' && (
                        <div className="flex items-center gap-2 ml-2">
                            <button onClick={() => setIsManagingGroups(true)}
                                className="flex items-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-4 py-2.5 rounded-xl font-bold shadow-sm transition-all active:scale-95 text-xs">
                                <Users className="w-4 h-4 text-blue-500" /> Responsáveis
                            </button>
                            <button onClick={handleProvision} disabled={isLoading}
                                className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white px-5 py-2.5 rounded-xl font-bold shadow-md transition-all active:scale-95 text-xs">
                                <Plus className="w-4 h-4" /> Provisionar Ano
                            </button>
                        </div>
                    )}
                    {activeTab === 'standalone' && (
                        <button onClick={() => setStandaloneForm({ client_name: '', client_document: '', service_name: '', description: '', value: 0, payment_status: 'Em Aberto', payment_date: null, due_date: null, notes: '' })}
                            className="flex items-center gap-2 bg-purple-700 hover:bg-purple-800 text-white px-5 py-2.5 rounded-xl font-bold shadow-md transition-all active:scale-95 text-xs ml-2">
                            <Plus className="w-4 h-4" /> Novo Serviço Avulso
                        </button>
                    )}
                </div>
            </div>

            {isManagingGroups && (
                <div className="fixed inset-0 z-[60] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0">
                            <div>
                                <h3 className="text-xl font-serif font-bold text-slate-800 flex items-center gap-2">
                                    <Users className="w-5 h-5 text-blue-500" /> Grupos de Faturamento
                                </h3>
                                <p className="text-xs text-slate-500">Agrupe empresas para cobrança unificada.</p>
                            </div>
                            <button onClick={() => setIsManagingGroups(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 flex gap-6">
                            {/* Left Side: Groups List */}
                            <div className="w-1/2 flex flex-col gap-4">
                                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Novo / Editar Responsável</h4>
                                    <div className="flex flex-col gap-3">
                                        <input
                                            placeholder="Nome do Responsável"
                                            value={groupForm?.name || ''}
                                            onChange={e => setGroupForm(p => ({ ...p, name: e.target.value }))}
                                            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl outline-none focus:border-blue-400"
                                        />
                                        <input
                                            placeholder="WhatsApp (ex: 21999999999)"
                                            value={groupForm?.phone || ''}
                                            onChange={e => setGroupForm(p => ({ ...p, phone: e.target.value }))}
                                            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl outline-none focus:border-blue-400"
                                        />
                                        <div className="flex gap-2">
                                            <button
                                                onClick={saveGroup} disabled={isSavingGroup}
                                                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded-xl text-xs transition-all disabled:opacity-50"
                                            >
                                                {isSavingGroup ? 'Salvando...' : groupForm?.id ? 'Atualizar' : 'Criar Grupo'}
                                            </button>
                                            {groupForm && (
                                                <button onClick={() => setGroupForm(null)} className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-600 rounded-xl text-xs">Cancelar</button>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-2">
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Grupos Cadastrados</h4>
                                    {groups.length === 0 && <p className="text-xs text-slate-400 italic">Nenhum grupo criado.</p>}
                                    {groups.map(g => (
                                        <div key={g.id} className={`p-3 rounded-2xl border transition-all flex items-center justify-between ${groupForm?.id === g.id ? 'border-blue-400 bg-blue-50' : 'border-slate-100 bg-white hover:border-slate-300'}`}>
                                            <div>
                                                <p className="text-sm font-bold text-slate-700">{g.name}</p>
                                                <p className="text-[10px] text-blue-500 font-mono italic">{g.phone || 'Sem telefone'}</p>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <button onClick={() => setGroupForm(g)} className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg"><Edit className="w-3.5 h-3.5" /></button>
                                                <button onClick={() => deleteGroup(g.id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg"><Trash2 className="w-3.5 h-3.5" /></button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Right Side: Assignment */}
                            <div className="w-1/2 bg-slate-50 rounded-3xl p-6 border border-slate-200 overflow-hidden flex flex-col">
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Empresas e Associações</h4>
                                <div className="flex-1 overflow-y-auto pr-2 flex flex-col gap-2">
                                    {companies.map(c => (
                                        <div key={c.id} className="bg-white p-3 rounded-2xl border border-slate-100 flex items-center justify-between shadow-sm">
                                            <div>
                                                <p className="text-xs font-bold text-slate-800">{c.name}</p>
                                                <p className="text-[9px] text-slate-400">{c.code || 'S/C'}</p>
                                            </div>
                                            <select
                                                value={c.financial_group_id || ''}
                                                onChange={e => toggleCompanyGroup(c.id, e.target.value || null)}
                                                className="text-[10px] font-bold text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 outline-none"
                                            >
                                                <option value="">Sem Grupo</option>
                                                {groups.map(g => (
                                                    <option key={g.id} value={g.id}>{g.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Tab Switcher */}
            <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5 w-fit">
                <button onClick={() => setActiveTab('clients')} className={`px-4 py-1.5 rounded-md text-[10px] font-black uppercase tracking-wider transition-all ${activeTab === 'clients' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}>
                    <DollarSign className="w-3 h-3 inline mr-1" />Clientes ({companies.length})
                </button>
                <button onClick={() => setActiveTab('standalone')} className={`px-4 py-1.5 rounded-md text-[10px] font-black uppercase tracking-wider transition-all ${activeTab === 'standalone' ? 'bg-white shadow-sm text-purple-700' : 'text-slate-400 hover:text-slate-600'}`}>
                    <Briefcase className="w-3 h-3 inline mr-1" />Serviços Avulsos ({standaloneServices.length})
                </button>
            </div>

            {activeTab === 'clients' && (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col flex-1 min-h-0">
                    <div className="bg-gradient-to-r from-slate-100 to-slate-50 border-b border-slate-200 px-4 py-2 flex items-center justify-center gap-2">
                        <Search className="w-3.5 h-3.5 text-slate-400" />
                        <input type="text" placeholder="Buscar por nome ou código..." className="bg-transparent text-xs text-slate-500 font-medium outline-none w-full max-w-md text-center placeholder:text-slate-400" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                    </div>
                    <div className="overflow-auto flex-1">
                        <table className="w-full border-collapse">
                            <thead className="sticky top-0 z-10">
                                <tr className="bg-slate-50 border-b-2 border-slate-200">
                                    <th className="w-8 px-2 py-2.5 border-r border-slate-200"></th>
                                    <th className="w-14 px-2 py-2.5 border-r border-slate-200 text-left"><span className="text-[9px] font-black text-slate-500 uppercase tracking-wider">ID</span></th>
                                    <th className="w-20 px-2 py-2.5 border-r border-slate-200 text-left"><span className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Sistema</span></th>
                                    <th className="min-w-[180px] px-2 py-2.5 border-r border-slate-200 text-left"><span className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Cliente / Responsável</span></th>
                                    <th className="w-24 px-2 py-2.5 border-r border-slate-200 text-center"><span className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Data Cliente</span></th>
                                    <th className="w-24 px-2 py-2.5 border-r border-slate-200 text-right"><span className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Saldo Anterior</span></th>
                                    <th className="w-24 px-2 py-2.5 border-r border-slate-200 text-right"><span className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Mensalidade</span></th>
                                    <th className="w-24 px-2 py-2.5 border-r border-slate-200 text-right"><span className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Valor Pago</span></th>
                                    <th className="w-24 px-2 py-2.5 border-r border-slate-200 text-right"><span className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Saldo Atual</span></th>
                                    <th className="w-16 px-2 py-2.5 text-center"><span className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Ação</span></th>
                                </tr>
                            </thead>
                            <tbody>
                                {isLoading && <tr><td colSpan={10} className="text-center py-10"><Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-300" /></td></tr>}

                                {!isLoading && groups.map(group => {
                                    const groupMembers = filteredCompanies.filter(c => c.financial_group_id === group.id);
                                    if (groupMembers.length === 0) return null;
                                    const isExpanded = !!expandedGroups[group.id];

                                    const groupRecs = records.filter(r => groupMembers.some(m => m.id === r.company_id) && r.year === selectedYear);
                                    const monthRecs = groupRecs.filter(r => r.month === selectedMonth);
                                    const prevRecs = groupRecs.filter(r => r.month < selectedMonth);

                                    // Helper to get fee with company fallback
                                    const getFee = (r: FinancialRecord) => {
                                        const recFee = Number(r.monthly_fee) || 0;
                                        if (recFee > 0) return recFee;
                                        const member = groupMembers.find(m => m.id === r.company_id);
                                        return member?.monthly_fee || 0;
                                    };

                                    const stats = {
                                        monthlyTotal: monthRecs.reduce((sum, r) => sum + getFee(r) + (Number(r.payroll_fee) || 0) + (Number(r.extras) || 0), 0),
                                        paymentTotal: monthRecs.reduce((sum, r) => sum + (Number(r.amount_paid) || 0), 0),
                                        prevBalance: prevRecs.reduce((sum, r) => sum + (getFee(r) + (Number(r.payroll_fee) || 0) + (Number(r.extras) || 0)) - (Number(r.amount_paid) || 0), 0),
                                        currentBalance: 0
                                    };
                                    stats.currentBalance = stats.prevBalance + stats.monthlyTotal - stats.paymentTotal;

                                    return (
                                        <React.Fragment key={group.id}>
                                            <tr onClick={() => setExpandedGroups(p => ({ ...p, [group.id]: !isExpanded }))}
                                                className="border-b border-slate-100 hover:bg-blue-50/30 cursor-pointer bg-blue-50/10 group transition-all"
                                            >
                                                <td className="px-2 py-3 text-center border-r border-slate-100">
                                                    <div className={`transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}>
                                                        <ChevronRight className="w-4 h-4 text-blue-500" />
                                                    </div>
                                                </td>
                                                <td className="px-2 py-3 text-center border-r border-slate-100">
                                                    <Users className="w-3.5 h-3.5 text-blue-400 mx-auto" />
                                                </td>
                                                <td className="px-2 py-3 border-r border-slate-100"></td>
                                                <td className="px-2 py-3 border-r border-slate-100">
                                                    <div className="flex flex-col">
                                                        <span className="text-[12px] font-black text-slate-800 uppercase flex items-center gap-1.5 tracking-tight">
                                                            {group.name}
                                                            <span className="bg-blue-100 text-blue-600 text-[8px] px-1.5 py-0.5 rounded-full font-black">GRUPO</span>
                                                        </span>
                                                        <span className="text-[10px] text-blue-500 font-medium">{group.phone || 'Sem telefone principal'}</span>
                                                    </div>
                                                </td>
                                                <td className="px-2 py-3 border-r border-slate-100 text-center">
                                                    <span className="text-[10px] font-mono font-bold text-slate-400">
                                                        {groupMembers[0]?.client_date ? new Date(groupMembers[0].client_date).toLocaleDateString('pt-BR') : '-'}
                                                    </span>
                                                </td>
                                                <td className="px-2 py-3 border-r border-slate-100 text-right">
                                                    <span className={`text-[10px] font-mono font-bold ${stats.prevBalance < 0 ? 'text-red-600' : 'text-slate-400'}`}>
                                                        {fmt(stats.prevBalance)}
                                                    </span>
                                                </td>
                                                <td className="px-2 py-3 border-r border-slate-100 text-right">
                                                    <span className="text-[10px] font-mono font-bold text-blue-600">
                                                        {fmt(stats.monthlyTotal)}
                                                    </span>
                                                </td>
                                                <td className="px-2 py-3 border-r border-slate-100 text-right">
                                                    <span className="text-[10px] font-mono font-bold text-green-600">
                                                        {fmt(stats.paymentTotal)}
                                                    </span>
                                                </td>
                                                <td className="px-2 py-3 border-r border-slate-100 text-right">
                                                    <span className={`text-[10px] font-mono font-bold ${stats.currentBalance < 0 ? 'text-red-500' : 'text-slate-800'}`}>
                                                        {fmt(stats.currentBalance)}
                                                    </span>
                                                </td>
                                                <td className="px-2 py-1.5 text-center">
                                                    <div className="flex items-center justify-center gap-0.5">
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleWhatsAppGroupBilling(group); }}
                                                            className="p-1 text-slate-300 hover:text-green-500 hover:bg-green-50 rounded-lg transition-all"
                                                            title="Cobrança Consolidada"
                                                        >
                                                            <MessageSquare className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>

                                            {isExpanded && (
                                                <>
                                                    {/* Group Summary Card for Screenshot/Reporting */}
                                                    <tr key={`summary-${group.id}`} className="bg-slate-50/80 border-b border-blue-100">
                                                        <td colSpan={10} className="px-6 py-4">
                                                            <div className="bg-white rounded-2xl border-2 border-blue-200 shadow-xl p-6 max-w-4xl mx-auto flex flex-col gap-6 relative overflow-hidden">
                                                                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-bl-full -mr-16 -mt-16 opacity-50 pointer-events-none" />

                                                                <div className="flex items-center justify-between border-b border-slate-100 pb-4 relative">
                                                                    <div className="flex items-center gap-3">
                                                                        <div className="bg-blue-600 text-white p-2 rounded-lg shadow-lg">
                                                                            <TrendingUp className="w-5 h-5" />
                                                                        </div>
                                                                        <div>
                                                                            <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">{group.name}</h3>
                                                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none mt-0.5 flex items-center gap-1">
                                                                                <Calendar className="w-3 h-3 text-blue-500" /> RESUMO FINANCEIRO • {MONTHS_FULL[selectedMonth - 1]} / {selectedYear}
                                                                            </p>
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex items-center gap-2">
                                                                        <button
                                                                            onClick={() => window.print()}
                                                                            className="p-2 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-xl transition-all print:hidden"
                                                                            title="Imprimir Resumo"
                                                                        >
                                                                            <Save className="w-4 h-4" />
                                                                        </button>
                                                                    </div>
                                                                </div>

                                                                <div className="grid grid-cols-4 gap-4 relative">
                                                                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 flex flex-col text-center">
                                                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Saldo Anterior</span>
                                                                        <span className={`text-sm font-mono font-bold ${stats.prevBalance < 0 ? 'text-red-600' : 'text-slate-600'}`}>
                                                                            {fmt(stats.prevBalance)}
                                                                        </span>
                                                                    </div>
                                                                    <div className="bg-blue-50/50 rounded-xl p-4 border border-blue-100 flex flex-col text-center">
                                                                        <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest mb-1">Total Mensalidades</span>
                                                                        <span className="text-sm font-mono font-bold text-blue-700">
                                                                            {fmt(stats.monthlyTotal)}
                                                                        </span>
                                                                    </div>
                                                                    <div className="bg-green-50/50 rounded-xl p-4 border border-green-100 flex flex-col text-center">
                                                                        <span className="text-[10px] font-black text-green-500 uppercase tracking-widest mb-1">Pagamento Total</span>
                                                                        <span className="text-sm font-mono font-bold text-green-700">
                                                                            {fmt(stats.paymentTotal)}
                                                                        </span>
                                                                    </div>
                                                                    <div className="bg-slate-800 rounded-xl p-4 border border-slate-700 flex flex-col shadow-lg ring-2 ring-slate-800 ring-offset-2 ring-offset-white text-center">
                                                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 text-white/50">Saldo Atual</span>
                                                                        <span className={`text-sm font-mono font-bold ${stats.currentBalance < 0 ? 'text-red-400' : 'text-green-400'}`}>
                                                                            {fmt(stats.currentBalance)}
                                                                        </span>
                                                                    </div>
                                                                </div>

                                                                {/* Lista de Membros no Group Card */}
                                                                <div className="mt-2 space-y-2 relative">
                                                                    <div className="flex items-center gap-2 mb-2">
                                                                        <div className="h-[2px] flex-1 bg-slate-100" />
                                                                        <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Detalhes das Empresas</span>
                                                                        <div className="h-[2px] flex-1 bg-slate-100" />
                                                                    </div>
                                                                    <div className="grid grid-cols-1 gap-1">
                                                                        {groupMembers.map(member => {
                                                                            const r = records.find(rec => rec.company_id === member.id && rec.month === selectedMonth && rec.year === selectedYear) || {} as any;
                                                                            const mBal = Number(r.monthly_fee) || member.monthly_fee || 0;
                                                                            const pBal = Number(r.payroll_fee) || 0;
                                                                            const extraTotal = (r.extras || 0);
                                                                            const totalDue = mBal + pBal + extraTotal;

                                                                            return (
                                                                                <div key={member.id} className="flex items-center justify-between py-2 px-4 hover:bg-slate-50 rounded-lg transition-colors border border-transparent hover:border-slate-100 group/item">
                                                                                    <div className="flex items-center gap-3">
                                                                                        <span className="text-[10px] font-mono text-slate-300 group-hover/item:text-blue-400 transition-colors">#{member.code || '---'}</span>
                                                                                        <span className="text-[11px] font-bold text-slate-600 group-hover/item:text-slate-950 transition-colors">{member.name}</span>
                                                                                    </div>
                                                                                    <div className="flex items-center gap-4 text-[11px]">
                                                                                        <div className="flex flex-col items-end">
                                                                                            <span className="text-[8px] font-black text-slate-300 uppercase">A pagar</span>
                                                                                            <span className="font-bold text-slate-500">{fmt(totalDue)}</span>
                                                                                        </div>
                                                                                        <div className="flex flex-col items-end min-w-[80px]">
                                                                                            <span className="text-[8px] font-black text-slate-300 uppercase">Status</span>
                                                                                            <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-tighter ${r.status === 'Pago' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                                                                                                {r.status || 'Pendente'}
                                                                                            </span>
                                                                                        </div>
                                                                                    </div>
                                                                                </div>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                </div>

                                                                <div className="border-t border-slate-100 pt-3">
                                                                    <div className="flex items-center justify-between">
                                                                        <div className="flex -space-x-2">
                                                                            {groupMembers.map((c, i) => (
                                                                                <div key={c.id} className="w-6 h-6 rounded-full bg-white border-2 border-slate-50 flex items-center justify-center shadow-sm" title={c.name}>
                                                                                    <span className="text-[8px] font-black text-slate-400">{c.name[0]}</span>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                        <p className="text-[9px] text-slate-400 font-bold uppercase italic">Fact Assessoria e Consultoria Empresarial</p>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                    </tr>

                                                    {groupMembers.map((company, cIdx) => {
                                                        const companyRecords = records.filter(r => r.company_id === company.id && r.year === selectedYear);
                                                        return (
                                                            <tr key={company.id} onClick={() => fetchClientDetail(company)} className="border-b border-slate-50 hover:bg-slate-50/80 cursor-pointer text-slate-600 bg-white/50">
                                                                <td className="px-2 py-2 text-center border-r border-slate-100/50"></td>
                                                                <td className="px-2 py-2 text-center border-r border-slate-100/50">
                                                                    <span className="text-[10px] font-mono font-bold text-slate-400">#{company.client_seq_id ? String(company.client_seq_id).padStart(3, '0') : '---'}</span>
                                                                </td>
                                                                <td className="px-2 py-2 border-r border-slate-100/50">
                                                                    <span className="text-[10px] font-mono font-bold text-slate-400">{company.code || '---'}</span>
                                                                </td>
                                                                <td className="px-2 py-2 border-r border-slate-100/50 pl-6 relative">
                                                                    <div className="absolute left-3 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-slate-200" />
                                                                    <div className="flex flex-col">
                                                                        <span className="text-[11px] font-bold text-slate-700 tracking-tight leading-none uppercase">{company.name}</span>
                                                                        <span className="text-[9px] text-slate-400 font-medium">Cod: {company.code || 'S/C'}</span>
                                                                    </div>
                                                                </td>
                                                                <td className="px-2 py-2 border-r border-slate-100/50 text-center">
                                                                    <span className="text-[9px] font-mono font-bold text-slate-400">
                                                                        {company.client_date ? new Date(company.client_date).toLocaleDateString('pt-BR') : '-'}
                                                                    </span>
                                                                </td>
                                                                {(() => {
                                                                    const cRecs = records.filter(r => r.company_id === company.id && r.year === selectedYear);
                                                                    const mRec = cRecs.find(r => r.month === selectedMonth);
                                                                    const pRecs = cRecs.filter(r => r.month < selectedMonth);
                                                                    const pBal = pRecs.reduce((sum, r) => sum + ((Number(r.monthly_fee) || company.monthly_fee || 0) + (Number(r.payroll_fee) || 0) + (Number(r.extras) || 0)) - (Number(r.amount_paid) || 0), 0);
                                                                    const recFee = mRec ? (Number(mRec.monthly_fee) || company.monthly_fee || 0) : (company.monthly_fee || 0);
                                                                    const curDue = recFee + (mRec ? (Number(mRec.payroll_fee) || 0) + (Number(mRec.extras) || 0) : 0);
                                                                    const curPaid = mRec ? (Number(mRec.amount_paid) || 0) : 0;
                                                                    const curBal = pBal + curDue - curPaid;

                                                                    return (
                                                                        <>
                                                                            <td className="px-2 py-2 border-r border-slate-100/50 text-right">
                                                                                <span className={`text-[9px] font-mono font-bold ${pBal < 0 ? 'text-red-500' : 'text-slate-400'}`}>
                                                                                    {fmt(pBal)}
                                                                                </span>
                                                                            </td>
                                                                            <td className="px-2 py-2 border-r border-slate-100/50 text-right">
                                                                                <span className="text-[9px] font-mono font-bold text-slate-400">{fmt(curDue)}</span>
                                                                            </td>
                                                                            <td className="px-2 py-2 border-r border-slate-100/50 text-right">
                                                                                <span className="text-[9px] font-mono font-bold text-slate-400">{fmt(curPaid)}</span>
                                                                            </td>
                                                                            <td className="px-2 py-2 border-r border-slate-100/50 text-right">
                                                                                <span className={`text-[9px] font-mono font-bold ${curBal < 0 ? 'text-red-500' : 'text-slate-700'}`}>
                                                                                    {fmt(curBal)}
                                                                                </span>
                                                                            </td>
                                                                        </>
                                                                    );
                                                                })()}
                                                                <td className="px-2 py-1.5 text-center">
                                                                    <div className="flex items-center justify-center gap-0.5">
                                                                        <button
                                                                            onClick={(e) => { e.stopPropagation(); fetchClientDetail(company); }}
                                                                            className="p-1 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded transition-all"
                                                                            title="Editar Lançamentos"
                                                                        >
                                                                            <Edit className="w-3.5 h-3.5" />
                                                                        </button>
                                                                        <button
                                                                            onClick={(e) => { e.stopPropagation(); handleWhatsAppBilling(company, companyRecords.find(r => r.month === selectedMonth), selectedMonth); }}
                                                                            className="p-1 text-slate-300 hover:text-green-500 hover:bg-green-50 rounded transition-all"
                                                                            title="WhatsApp"
                                                                        >
                                                                            <MessageSquare className="w-3 h-3" />
                                                                        </button>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </>
                                            )}
                                        </React.Fragment>
                                    );
                                })}

                                {!isLoading && filteredCompanies.filter(c => !c.financial_group_id).map((company, idx) => {
                                    const companyRecords = records.filter(r => r.company_id === company.id);
                                    return (
                                        <tr key={company.id} className={`border-b border-slate-100 transition-colors cursor-pointer ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'} hover:bg-blue-50/50`} onClick={() => fetchClientDetail(company)}>
                                            <td className="px-2 py-1.5 border-r border-slate-100"></td>
                                            <td className="px-2 py-1.5 border-r border-slate-100"><span className="text-[11px] font-bold font-mono text-slate-500">{company.client_seq_id ? String(company.client_seq_id).padStart(3, '0') : '---'}</span></td>
                                            <td className="px-2 py-1.5 border-r border-slate-100"><span className="text-[11px] font-bold font-mono text-slate-600">{company.code || '---'}</span></td>
                                            <td className="px-2 py-1.5 border-r border-slate-100"><span className="text-[11px] font-bold text-slate-800 truncate block max-w-[220px]">{company.name}</span></td>
                                            <td className="px-2 py-1.5 border-r border-slate-100 text-center">
                                                <span className="text-[10px] font-mono font-bold text-slate-400">
                                                    {company.client_date ? new Date(company.client_date).toLocaleDateString('pt-BR') : '-'}
                                                </span>
                                            </td>
                                            {(() => {
                                                const cRecs = records.filter(r => r.company_id === company.id && r.year === selectedYear);
                                                const mRec = cRecs.find(r => r.month === selectedMonth);
                                                const pRecs = cRecs.filter(r => r.month < selectedMonth);
                                                const pBal = pRecs.reduce((sum, r) => sum + ((Number(r.monthly_fee) || company.monthly_fee || 0) + (Number(r.payroll_fee) || 0) + (Number(r.extras) || 0)) - (Number(r.amount_paid) || 0), 0);
                                                const recFee = mRec ? (Number(mRec.monthly_fee) || company.monthly_fee || 0) : (company.monthly_fee || 0);
                                                const curDue = recFee + (mRec ? (Number(mRec.payroll_fee) || 0) + (Number(mRec.extras) || 0) : 0);
                                                const curPaid = mRec ? (Number(mRec.amount_paid) || 0) : 0;
                                                const curBal = pBal + curDue - curPaid;

                                                return (
                                                    <>
                                                        <td className="px-2 py-1.5 border-r border-slate-100 text-right">
                                                            <span className={`text-[10px] font-mono font-bold ${pBal < 0 ? 'text-red-500' : 'text-slate-400'}`}>
                                                                {fmt(pBal)}
                                                            </span>
                                                        </td>
                                                        <td className="px-2 py-1.5 border-r border-slate-100 text-right">
                                                            <span className="text-[10px] font-mono font-bold text-slate-400">{fmt(curDue)}</span>
                                                        </td>
                                                        <td className="px-2 py-1.5 border-r border-slate-100 text-right">
                                                            <span className="text-[10px] font-mono font-bold text-slate-400">{fmt(curPaid)}</span>
                                                        </td>
                                                        <td className="px-2 py-1.5 border-r border-slate-100 text-right">
                                                            <span className={`text-[10px] font-mono font-bold ${curBal < 0 ? 'text-red-500' : 'text-slate-800'}`}>
                                                                {fmt(curBal)}
                                                            </span>
                                                        </td>
                                                    </>
                                                );
                                            })()}
                                            <td className="px-2 py-1.5 text-center">
                                                <div className="flex items-center justify-center gap-0.5">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); fetchClientDetail(company); }}
                                                        className="p-1 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded transition-all"
                                                        title="Editar Lançamentos"
                                                    >
                                                        <Edit className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleWhatsAppBilling(company, companyRecords.find(r => r.month === selectedMonth && r.year === selectedYear), selectedMonth); }}
                                                        className="p-1 text-slate-300 hover:text-green-500 hover:bg-green-50 rounded transition-all"
                                                        title="WhatsApp"
                                                    >
                                                        <MessageSquare className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    <div className="bg-slate-50 border-t border-slate-200 px-4 py-2 flex items-center justify-between mt-auto">
                        <span className="text-[10px] font-bold text-slate-400">{filteredCompanies.length} cliente(s)</span>
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-green-500" /><span className="text-[9px] font-bold text-slate-500">Pago</span></div>
                            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-amber-400" /><span className="text-[9px] font-bold text-slate-500">Grupo Parcial</span></div>
                            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-red-500" /><span className="text-[9px] font-bold text-slate-500">Pendente</span></div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'standalone' && (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col flex-1 min-h-0">
                    {standaloneForm && (
                        <div className="border-b-2 border-purple-200 bg-purple-50/30 p-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-black text-purple-600 uppercase tracking-widest flex items-center gap-1.5">
                                    <Briefcase className="w-3.5 h-3.5" /> {standaloneForm.id ? 'Editar Serviço Avulso' : 'Novo Serviço Avulso'}
                                </span>
                                <button onClick={() => setStandaloneForm(null)} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
                            </div>
                            <div className="grid grid-cols-6 gap-3">
                                <div className="col-span-2">
                                    <label className="text-[7px] font-black text-purple-400 uppercase">Nome do Cliente</label>
                                    <input type="text" value={standaloneForm.client_name} onChange={e => setStandaloneForm((p: any) => ({ ...p, client_name: e.target.value }))}
                                        className="w-full px-2 py-1.5 text-[11px] border border-purple-200 rounded-md outline-none bg-white font-bold" placeholder="Nome ou Razão Social" />
                                </div>
                                <div>
                                    <label className="text-[7px] font-black text-purple-400 uppercase">CPF/CNPJ</label>
                                    <input type="text" value={standaloneForm.client_document || ''} onChange={e => setStandaloneForm((p: any) => ({ ...p, client_document: e.target.value }))}
                                        className="w-full px-2 py-1.5 text-[11px] border border-purple-200 rounded-md outline-none bg-white" placeholder="Documento" />
                                </div>
                                <div>
                                    <label className="text-[7px] font-black text-purple-400 uppercase">Serviço</label>
                                    <input type="text" value={standaloneForm.service_name} onChange={e => setStandaloneForm((p: any) => ({ ...p, service_name: e.target.value }))}
                                        className="w-full px-2 py-1.5 text-[11px] border border-purple-200 rounded-md outline-none bg-white font-bold" placeholder="Ex: Alteração Contratual" />
                                </div>
                                <div>
                                    <label className="text-[7px] font-black text-purple-400 uppercase">Valor (R$)</label>
                                    <input type="number" step="0.01" value={standaloneForm.value} onChange={e => setStandaloneForm((p: any) => ({ ...p, value: parseFloat(e.target.value) || 0 }))}
                                        className="w-full px-2 py-1.5 text-[11px] border border-purple-200 rounded-md outline-none bg-white font-mono font-bold" />
                                </div>
                                <div>
                                    <label className="text-[7px] font-black text-purple-400 uppercase">Descrição</label>
                                    <input type="text" value={standaloneForm.description || ''} onChange={e => setStandaloneForm((p: any) => ({ ...p, description: e.target.value }))}
                                        className="w-full px-2 py-1.5 text-[11px] border border-purple-200 rounded-md outline-none bg-white" placeholder="Detalhes..." />
                                </div>
                                <div>
                                    <label className="text-[7px] font-black text-purple-400 uppercase">Vencimento</label>
                                    <input type="date" value={standaloneForm.due_date || ''} onChange={e => setStandaloneForm((p: any) => ({ ...p, due_date: e.target.value || null }))}
                                        className="w-full px-2 py-1.5 text-[11px] border border-purple-200 rounded-md outline-none bg-white" />
                                </div>
                                <div>
                                    <label className="text-[7px] font-black text-purple-400 uppercase">Data Pgto</label>
                                    <input type="date" value={standaloneForm.payment_date || ''} onChange={e => setStandaloneForm((p: any) => ({ ...p, payment_date: e.target.value || null }))}
                                        className="w-full px-2 py-1.5 text-[11px] border border-purple-200 rounded-md outline-none bg-white" />
                                </div>
                                <div>
                                    <label className="text-[7px] font-black text-purple-400 uppercase">Status</label>
                                    <select value={standaloneForm.payment_status} onChange={e => setStandaloneForm((p: any) => ({ ...p, payment_status: e.target.value }))}
                                        className="w-full px-2 py-1.5 text-[11px] border border-purple-200 rounded-md outline-none bg-white font-bold">
                                        <option value="Em Aberto">Em Aberto</option>
                                        <option value="Pago">Pago</option>
                                        <option value="Parcial">Parcial</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[7px] font-black text-purple-400 uppercase">Observação</label>
                                    <input type="text" value={standaloneForm.notes || ''} onChange={e => setStandaloneForm((p: any) => ({ ...p, notes: e.target.value }))}
                                        className="w-full px-2 py-1.5 text-[11px] border border-purple-200 rounded-md outline-none bg-white" placeholder="Nota..." />
                                </div>
                                <div className="flex items-end">
                                    <button onClick={saveStandaloneService} className="px-4 py-1.5 bg-purple-700 text-white rounded-md text-[10px] font-bold hover:bg-purple-800 flex items-center gap-1.5 w-full justify-center">
                                        <Save className="w-3 h-3" /> Salvar
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                    <div className="overflow-auto flex-1">
                        <table className="w-full border-collapse">
                            <thead className="sticky top-0 z-10">
                                <tr className="bg-purple-50 border-b-2 border-purple-200">
                                    {['Cliente', 'CPF/CNPJ', 'Serviço', 'Descrição', 'Valor', 'Vencimento', 'Data Pgto', 'Status', 'Obs', ''].map(h => (
                                        <th key={h} className="text-left px-3 py-2.5 border-r border-purple-100 last:border-r-0">
                                            <span className="text-[9px] font-black text-purple-500 uppercase tracking-wider">{h}</span>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {isLoadingStandalone && <tr><td colSpan={10} className="text-center py-10"><Loader2 className="w-6 h-6 animate-spin mx-auto text-purple-300" /></td></tr>}
                                {!isLoadingStandalone && standaloneServices.length === 0 && (
                                    <tr><td colSpan={10} className="text-center py-10">
                                        <Briefcase className="w-8 h-8 text-purple-200 mx-auto mb-2" />
                                        <p className="text-sm text-slate-400 font-medium">Nenhum serviço avulso.</p>
                                        <p className="text-xs text-slate-300 mt-1">Clique em "Novo Serviço Avulso" para adicionar.</p>
                                    </td></tr>
                                )}
                                {standaloneServices.map((svc, idx) => {
                                    const sColors = STATUS_COLORS[svc.payment_status] || STATUS_COLORS['Em Aberto'];
                                    return (
                                        <tr key={svc.id} className={`border-b border-slate-100 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-purple-50/20'} hover:bg-purple-50/40`}>
                                            <td className="px-3 py-1.5 border-r border-slate-100"><span className="text-[11px] font-bold text-slate-800">{svc.client_name}</span></td>
                                            <td className="px-3 py-1.5 border-r border-slate-100"><span className="text-[10px] text-slate-500">{svc.client_document || '—'}</span></td>
                                            <td className="px-3 py-1.5 border-r border-slate-100"><span className="text-[11px] font-bold text-purple-700">{svc.service_name}</span></td>
                                            <td className="px-3 py-1.5 border-r border-slate-100"><span className="text-[10px] text-slate-500 truncate block max-w-[150px]">{svc.description || '—'}</span></td>
                                            <td className="px-3 py-1.5 border-r border-slate-100 text-right"><span className="text-[11px] font-mono font-bold text-purple-600">{fmt(svc.value)}</span></td>
                                            <td className="px-3 py-1.5 border-r border-slate-100"><span className="text-[10px] text-slate-500">{svc.due_date || '—'}</span></td>
                                            <td className="px-3 py-1.5 border-r border-slate-100"><span className="text-[10px] text-slate-500">{svc.payment_date || '—'}</span></td>
                                            <td className="px-3 py-1.5 border-r border-slate-100">
                                                <div className="flex items-center gap-1.5">
                                                    <div className={`w-2.5 h-2.5 rounded-full ${sColors.dot}`} />
                                                    <span className="text-[10px] font-bold text-slate-600">{svc.payment_status}</span>
                                                </div>
                                            </td>
                                            <td className="px-3 py-1.5 border-r border-slate-100"><span className="text-[10px] text-slate-400 truncate block max-w-[100px]">{svc.notes || '—'}</span></td>
                                            <td className="px-3 py-1.5 text-center">
                                                <div className="flex items-center justify-center gap-0.5">
                                                    <button onClick={() => setStandaloneForm({ ...svc })} className="p-1 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded transition-all" title="Editar"><Edit className="w-3.5 h-3.5" /></button>
                                                    <button onClick={() => deleteStandaloneService(svc.id)} className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-all" title="Excluir"><Trash2 className="w-3.5 h-3.5" /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    <div className="bg-purple-50 border-t border-purple-200 px-4 py-2 flex items-center justify-between mt-auto">
                        <span className="text-[10px] font-bold text-purple-400">{standaloneServices.length} serviço(s) avulso(s)</span>
                        <span className="text-[10px] font-mono font-bold text-purple-700">
                            Total: {fmt(standaloneServices.reduce((s: number, sv: any) => s + (sv.value || 0), 0))}
                        </span>
                    </div>
                </div>
            )}


        </div>
    );
};

export default AccountantFinancial;
