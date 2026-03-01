import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../services/supabase';
import {
    DollarSign, Search, Calendar, ChevronLeft, ChevronRight,
    Loader2, Save, Plus, Edit, Trash2, ArrowLeft, X, Briefcase
} from 'lucide-react';

// ─── Interfaces ────────────────────────────────────────────────
interface Company {
    id: string;
    code: string;
    name: string;
    status: string;
    client_date?: string;
    monthly_fee?: number;
    due_day?: number;
}

interface FinancialRecord {
    id?: string;
    company_id: string;
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
    company_id: string;
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

    // ─── Fetch ───────────────────────────────────────────────────
    useEffect(() => {
        fetchCompanies();
        fetchServiceTypes();
        // Safety timeout: prevent loading from getting stuck
        const timeout = setTimeout(() => {
            setIsLoading(false);
        }, 10000);
        return () => clearTimeout(timeout);
    }, []);
    useEffect(() => { fetchAllRecords(); }, [selectedYear, companies]);

    const fetchCompanies = async () => {
        try {
            const { data, error } = await supabase.from('companies').select('id, code, name, status, client_date, monthly_fee, due_day').order('code');
            if (error) { console.error('Error fetching companies:', error); }
            const sorted = (data || []).sort((a: any, b: any) => {
                const codeA = parseInt(a.code || '0', 10) || 0;
                const codeB = parseInt(b.code || '0', 10) || 0;
                return codeA - codeB;
            });
            setCompanies(sorted);
        } catch (err) { console.error('Error:', err); setCompanies([]); }
    };

    const fetchServiceTypes = async () => {
        const { data } = await supabase.from('financial_service_types').select('*').order('name');
        setServiceTypes(data || []);
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
        if (!window.confirm(`Provisionar lançamentos para ${selectedYear}?\nIsso criará registros em aberto para clientes ativos nos meses sem lançamento.`)) return;
        setIsLoading(true);
        try {
            const existingKeys = new Set(records.map(r => `${r.company_id}-${r.month}`));
            const toInsert: any[] = [];
            companies.filter(c => c.status === 'Ativo').forEach(c => {
                for (let m = 1; m <= 12; m++) {
                    if (!existingKeys.has(`${c.id}-${m}`)) {
                        toInsert.push({
                            company_id: c.id, year: selectedYear, month: m,
                            monthly_fee: c.monthly_fee || 0, payroll_fee: 0, extras: 0, amount_paid: 0,
                            previous_balance: 0, status: 'Em Aberto', notes: '',
                        });
                    }
                }
            });
            if (toInsert.length === 0) { alert('Todos os meses já estão provisionados.'); setIsLoading(false); return; }
            const { error } = await supabase.from('accountant_financial').insert(toInsert);
            if (error) throw error;
            alert(`${toInsert.length} lançamento(s) criado(s)!`);
            fetchAllRecords();
        } catch (err: any) { alert('Erro: ' + err.message); }
        finally { setIsLoading(false); }
    };

    // ─── CLIENT DETAIL VIEW (Jan-Dec) ───────────────────────────
    if (selectedCompany) {
        const monthlyData = MONTHS.map((label, idx) => {
            const m = idx + 1;
            const rec = clientRecords.find(r => r.month === m);
            const svcs = clientServices.filter(s => s.month === m);
            const extrasTotal = svcs.reduce((s, sv) => s + sv.value, 0);
            const monthlyFee = rec?.monthly_fee || 0;
            const payrollFee = rec?.payroll_fee || 0;
            const amountPaid = rec?.amount_paid || 0;
            const prevBalance = rec?.previous_balance || 0;
            const total = monthlyFee + payrollFee + extrasTotal;
            const balance = prevBalance + total - amountPaid;
            return { m, label, rec, svcs, extrasTotal, monthlyFee, payrollFee, amountPaid, prevBalance, total, balance, status: rec?.status || 'Em Aberto' };
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
                            <p className="text-xs text-slate-500 font-bold">Cód: {selectedCompany.code || '—'} • Ano: {selectedYear}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={() => setSelectedYear(y => y - 1)} className="p-1.5 hover:bg-slate-100 rounded-lg border border-slate-200"><ChevronLeft className="w-4 h-4 text-slate-500" /></button>
                        <span className="text-sm font-black text-slate-700 min-w-[50px] text-center">{selectedYear}</span>
                        <button onClick={() => setSelectedYear(y => y + 1)} className="p-1.5 hover:bg-slate-100 rounded-lg border border-slate-200"><ChevronRight className="w-4 h-4 text-slate-500" /></button>
                    </div>
                </div>

                {/* Annual Grid */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col flex-1 min-h-0">
                    <div className="overflow-auto flex-1">
                        <table className="w-full border-collapse">
                            <thead className="sticky top-0 z-10">
                                <tr className="bg-slate-50 border-b-2 border-slate-200">
                                    {['Mês', 'Saldo Ant.', 'Mensalidade', 'Folha', 'Serviços', 'Total', 'Pago', 'Saldo', 'Status', ''].map(h => (
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
                                                <td className="px-3 py-2 border-r border-slate-100">
                                                    <div className="flex items-center gap-1.5">
                                                        <div className={`w-2.5 h-2.5 rounded-full ${colors.dot}`} />
                                                        <span className="text-[10px] font-bold text-slate-600">{d.status}</span>
                                                    </div>
                                                </td>
                                                <td className="px-3 py-2 text-center">
                                                    <button onClick={(e) => { e.stopPropagation(); openMonthEdit(d.m); }} className="p-1 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded transition-all">
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
                                                                <div>
                                                                    <label className="text-[8px] font-black text-slate-500 uppercase tracking-wider">Status</label>
                                                                    <select value={editForm.status} onChange={e => setEditForm(p => p ? { ...p, status: e.target.value } : null)} className="w-full px-2 py-1.5 text-[11px] border border-slate-200 rounded-md outline-none focus:border-blue-400 bg-white font-bold">
                                                                        <option value="Em Aberto">Em Aberto</option>
                                                                        <option value="Pago">Pago</option>
                                                                        <option value="Parcial">Parcial</option>
                                                                    </select>
                                                                </div>
                                                                <div>
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
                                    <td colSpan={2}></td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
            </div>
        );
    }

    // ─── LIST VIEW (All Clients) ─────────────────────────────────
    const [activeTab, setActiveTab] = useState<'clients' | 'standalone'>('clients');
    const [standaloneServices, setStandaloneServices] = useState<any[]>([]);
    const [standaloneForm, setStandaloneForm] = useState<any | null>(null);
    const [isLoadingStandalone, setIsLoadingStandalone] = useState(false);

    const fetchStandaloneServices = async () => {
        setIsLoadingStandalone(true);
        const { data } = await supabase.from('standalone_services').select('*').order('created_at', { ascending: false });
        setStandaloneServices(data || []);
        setIsLoadingStandalone(false);
    };

    useEffect(() => { if (activeTab === 'standalone') fetchStandaloneServices(); }, [activeTab]);

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

    const filteredCompanies = companies.filter(c => {
        const s = searchTerm.toLowerCase();
        return c.name?.toLowerCase().includes(s) || c.code?.toLowerCase().includes(s);
    });

    return (
        <div className="flex flex-col gap-4 animate-fade-in h-[calc(100vh-120px)]">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-serif font-bold text-slate-800">Controle Financeiro</h2>
                    <p className="text-slate-500 text-sm">Gestão mensal de mensalidades e serviços avulsos.</p>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => setSelectedYear(y => y - 1)} className="p-1.5 hover:bg-slate-100 rounded-lg border border-slate-200"><ChevronLeft className="w-4 h-4 text-slate-500" /></button>
                    <span className="text-sm font-black text-slate-700 min-w-[50px] text-center">{selectedYear}</span>
                    <button onClick={() => setSelectedYear(y => y + 1)} className="p-1.5 hover:bg-slate-100 rounded-lg border border-slate-200"><ChevronRight className="w-4 h-4 text-slate-500" /></button>
                    {activeTab === 'clients' && (
                        <button onClick={handleProvision} disabled={isLoading}
                            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white px-5 py-2.5 rounded-xl font-bold shadow-md transition-all active:scale-95 text-xs ml-2">
                            <Plus className="w-4 h-4" /> Provisionar Ano
                        </button>
                    )}
                    {activeTab === 'standalone' && (
                        <button onClick={() => setStandaloneForm({ client_name: '', client_document: '', service_name: '', description: '', value: 0, payment_status: 'Em Aberto', payment_date: null, due_date: null, notes: '' })}
                            className="flex items-center gap-2 bg-purple-700 hover:bg-purple-800 text-white px-5 py-2.5 rounded-xl font-bold shadow-md transition-all active:scale-95 text-xs ml-2">
                            <Plus className="w-4 h-4" /> Novo Serviço Avulso
                        </button>
                    )}
                </div>
            </div>

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
                                    <th className="w-14 px-2 py-2.5 border-r border-slate-200 text-left"><span className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Cód</span></th>
                                    <th className="min-w-[180px] px-2 py-2.5 border-r border-slate-200 text-left"><span className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Cliente</span></th>
                                    <th className="w-24 px-2 py-2.5 border-r border-slate-200 text-right"><span className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Mensalidade</span></th>
                                    <th className="w-14 px-2 py-2.5 border-r border-slate-200 text-center"><span className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Venc.</span></th>
                                    {MONTHS.map(m => (
                                        <th key={m} className="w-16 px-1 py-2.5 border-r border-slate-200 text-center last:border-r-0">
                                            <span className="text-[9px] font-black text-slate-500 uppercase">{m}</span>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {isLoading && <tr><td colSpan={16} className="text-center py-10"><Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-300" /></td></tr>}
                                {!isLoading && filteredCompanies.map((company, idx) => {
                                    const companyRecords = records.filter(r => r.company_id === company.id);
                                    return (
                                        <tr key={company.id} className={`border-b border-slate-100 transition-colors cursor-pointer ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'} hover:bg-blue-50/50`} onClick={() => fetchClientDetail(company)}>
                                            <td className="px-2 py-1.5 border-r border-slate-100"><span className="text-[11px] font-mono font-bold text-slate-600">{company.code || '-'}</span></td>
                                            <td className="px-2 py-1.5 border-r border-slate-100"><span className="text-[11px] font-bold text-slate-800 truncate block max-w-[220px]">{company.name}</span></td>
                                            <td className="px-2 py-1.5 border-r border-slate-100 text-right">
                                                <span className="text-[10px] font-mono font-bold text-green-600">{company.monthly_fee ? fmt(company.monthly_fee) : '-'}</span>
                                            </td>
                                            <td className="px-2 py-1.5 border-r border-slate-100 text-center">
                                                <span className="text-[10px] font-mono font-bold text-slate-500">{company.due_day || '-'}</span>
                                            </td>
                                            {MONTHS.map((_, mIdx) => {
                                                const rec = companyRecords.find(r => r.month === mIdx + 1);
                                                const statusColor = rec ? (STATUS_COLORS[rec.status]?.dot || 'bg-slate-300') : 'bg-slate-200';
                                                return (
                                                    <td key={mIdx} className="px-1 py-1.5 border-r border-slate-100 last:border-r-0 text-center">
                                                        <div className={`w-3 h-3 rounded-full mx-auto ${statusColor}`} title={rec ? `${rec.status} — ${fmt(rec.monthly_fee)}` : 'Sem lançamento'} />
                                                    </td>
                                                );
                                            })}
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
                            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-red-500" /><span className="text-[9px] font-bold text-slate-500">Em Aberto</span></div>
                            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-amber-500" /><span className="text-[9px] font-bold text-slate-500">Parcial</span></div>
                            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-slate-200" /><span className="text-[9px] font-bold text-slate-500">Sem Lançamento</span></div>
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
