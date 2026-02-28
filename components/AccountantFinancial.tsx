import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../services/supabase';
import {
    DollarSign, Search, Calendar, ChevronLeft, ChevronRight,
    Loader2, Save, Plus, Edit, Trash2, CheckCircle, Clock,
    AlertCircle, Filter, ArrowLeft, X
} from 'lucide-react';

// ─── Interfaces ────────────────────────────────────────────────
interface Company {
    id: string;
    code: string;
    name: string;
    status: string;
    client_date?: string;
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

// ─── Constants ─────────────────────────────────────────────────
const MONTHS = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const STATUS_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
    'Em Aberto': { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
    'Pago': { bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-500' },
    'Parcial': { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
};

const formatCurrency = (v: number) =>
    v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

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

    // Form
    const [editingRecord, setEditingRecord] = useState<FinancialRecord | null>(null);
    const [showForm, setShowForm] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // ─── Fetch Data ──────────────────────────────────────────────
    useEffect(() => {
        fetchCompanies();
    }, []);

    useEffect(() => {
        if (companies.length > 0) fetchRecords();
    }, [selectedYear, selectedMonth, companies]);

    const fetchCompanies = async () => {
        try {
            const { data, error } = await supabase
                .from('companies')
                .select('id, code, name, status, client_date')
                .order('code', { ascending: true });
            if (error) throw error;
            setCompanies(data || []);
        } catch (err) {
            console.error('Error fetching companies:', err);
        }
    };

    const fetchRecords = async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('accountant_financial')
                .select('*')
                .eq('year', selectedYear)
                .eq('month', selectedMonth);
            if (error) throw error;
            setRecords(data || []);
        } catch (err) {
            console.error('Error fetching financial records:', err);
        } finally {
            setIsLoading(false);
        }
    };

    // ─── Merged Data ─────────────────────────────────────────────
    const mergedData = useMemo(() => {
        return companies
            .filter(c => {
                const search = searchTerm.toLowerCase();
                const nameMatch = c.name?.toLowerCase().includes(search);
                const codeMatch = c.code?.toLowerCase().includes(search);
                return nameMatch || codeMatch;
            })
            .map(company => {
                const record = records.find(r => r.company_id === company.id);
                const monthlyFee = record?.monthly_fee || 0;
                const payrollFee = record?.payroll_fee || 0;
                const extras = record?.extras || 0;
                const amountPaid = record?.amount_paid || 0;
                const previousBalance = record?.previous_balance || 0;
                const totalMonth = monthlyFee + payrollFee + extras;
                const balanceMonth = totalMonth - amountPaid;
                const totalBalance = previousBalance + balanceMonth;

                return {
                    company,
                    record,
                    monthlyFee,
                    payrollFee,
                    extras,
                    amountPaid,
                    previousBalance,
                    totalMonth,
                    balanceMonth,
                    totalBalance,
                    status: record?.status || 'Em Aberto',
                    paymentDate: record?.payment_date || null,
                    notes: record?.notes || '',
                };
            })
            .filter(item => {
                if (statusFilter === 'Todos') return true;
                return item.status === statusFilter;
            });
    }, [companies, records, searchTerm, statusFilter]);

    // ─── Totals ──────────────────────────────────────────────────
    const totals = useMemo(() => {
        return mergedData.reduce(
            (acc, item) => ({
                mensalidade: acc.mensalidade + item.monthlyFee,
                folha: acc.folha + item.payrollFee,
                extras: acc.extras + item.extras,
                pago: acc.pago + item.amountPaid,
                saldoMes: acc.saldoMes + item.balanceMonth,
                saldoTotal: acc.saldoTotal + item.totalBalance,
            }),
            { mensalidade: 0, folha: 0, extras: 0, pago: 0, saldoMes: 0, saldoTotal: 0 }
        );
    }, [mergedData]);

    // ─── Handlers ────────────────────────────────────────────────
    const handlePrevMonth = () => {
        if (selectedMonth === 1) {
            setSelectedMonth(12);
            setSelectedYear(y => y - 1);
        } else {
            setSelectedMonth(m => m - 1);
        }
    };

    const handleNextMonth = () => {
        if (selectedMonth === 12) {
            setSelectedMonth(1);
            setSelectedYear(y => y + 1);
        } else {
            setSelectedMonth(m => m + 1);
        }
    };

    const openEditForm = (data: typeof mergedData[0]) => {
        setEditingRecord({
            id: data.record?.id,
            company_id: data.company.id,
            year: selectedYear,
            month: selectedMonth,
            monthly_fee: data.monthlyFee,
            payroll_fee: data.payrollFee,
            extras: data.extras,
            amount_paid: data.amountPaid,
            payment_date: data.paymentDate,
            previous_balance: data.previousBalance,
            status: data.status,
            notes: data.notes,
        });
        setShowForm(true);
    };

    const handleSave = async () => {
        if (!editingRecord) return;
        setIsSaving(true);
        try {
            const payload = {
                company_id: editingRecord.company_id,
                year: editingRecord.year,
                month: editingRecord.month,
                monthly_fee: editingRecord.monthly_fee,
                payroll_fee: editingRecord.payroll_fee,
                extras: editingRecord.extras,
                amount_paid: editingRecord.amount_paid,
                payment_date: editingRecord.payment_date || null,
                previous_balance: editingRecord.previous_balance,
                status: editingRecord.status,
                notes: editingRecord.notes,
            };

            if (editingRecord.id) {
                const { error } = await supabase.from('accountant_financial').update(payload).eq('id', editingRecord.id);
                if (error) throw error;
            } else {
                const { error } = await supabase.from('accountant_financial').insert(payload);
                if (error) throw error;
            }
            setShowForm(false);
            setEditingRecord(null);
            fetchRecords();
        } catch (err: any) {
            alert('Erro ao salvar: ' + err.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Deseja excluir este lançamento?')) return;
        try {
            const { error } = await supabase.from('accountant_financial').delete().eq('id', id);
            if (error) throw error;
            fetchRecords();
        } catch (err: any) {
            alert('Erro ao excluir: ' + err.message);
        }
    };

    const handleProvision = async () => {
        if (!window.confirm(`Provisionar lançamentos para ${MONTHS[selectedMonth - 1]}/${selectedYear}?\nIsso criará registros em aberto para todos os clientes que ainda não possuem.`)) return;
        setIsLoading(true);
        try {
            const existingIds = new Set(records.map(r => r.company_id));
            const toInsert = companies
                .filter(c => !existingIds.has(c.id) && c.status === 'Ativo')
                .map(c => ({
                    company_id: c.id,
                    year: selectedYear,
                    month: selectedMonth,
                    monthly_fee: 0,
                    payroll_fee: 0,
                    extras: 0,
                    amount_paid: 0,
                    previous_balance: 0,
                    status: 'Em Aberto',
                    notes: '',
                }));
            if (toInsert.length === 0) {
                alert('Todos os clientes já possuem lançamento neste mês.');
                setIsLoading(false);
                return;
            }
            const { error } = await supabase.from('accountant_financial').insert(toInsert);
            if (error) throw error;
            alert(`${toInsert.length} lançamento(s) criado(s) com sucesso!`);
            fetchRecords();
        } catch (err: any) {
            alert('Erro ao provisionar: ' + err.message);
        } finally {
            setIsLoading(false);
        }
    };

    // ─── Edit Form (Slide-in) ────────────────────────────────────
    if (showForm && editingRecord) {
        const companyName = companies.find(c => c.id === editingRecord.company_id)?.name || '';
        return (
            <div className="space-y-6 animate-fade-in pb-10">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                    <div className="flex items-center gap-4">
                        <button onClick={() => { setShowForm(false); setEditingRecord(null); }} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div>
                            <h2 className="text-xl font-serif font-bold text-slate-800">Lançamento Financeiro</h2>
                            <p className="text-xs text-slate-500 font-bold">{companyName} — {MONTHS[selectedMonth - 1]}/{selectedYear}</p>
                        </div>
                    </div>
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white px-6 py-2 rounded-xl text-xs font-bold shadow-sm transition-all disabled:opacity-50"
                    >
                        {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                        Salvar
                    </button>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                    <div className="grid grid-cols-12 gap-5">
                        <div className="col-span-12 md:col-span-3">
                            <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase">Saldo Anterior (R$)</label>
                            <input type="number" step="0.01" value={editingRecord.previous_balance} onChange={e => setEditingRecord(p => p ? { ...p, previous_balance: parseFloat(e.target.value) || 0 } : null)} className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-slate-400 font-mono font-bold" />
                        </div>
                        <div className="col-span-12 md:col-span-3">
                            <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase">R$ Mensalidade</label>
                            <input type="number" step="0.01" value={editingRecord.monthly_fee} onChange={e => setEditingRecord(p => p ? { ...p, monthly_fee: parseFloat(e.target.value) || 0 } : null)} className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-slate-400 font-mono font-bold" />
                        </div>
                        <div className="col-span-12 md:col-span-3">
                            <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase">R$ Folha</label>
                            <input type="number" step="0.01" value={editingRecord.payroll_fee} onChange={e => setEditingRecord(p => p ? { ...p, payroll_fee: parseFloat(e.target.value) || 0 } : null)} className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-slate-400 font-mono font-bold" />
                        </div>
                        <div className="col-span-12 md:col-span-3">
                            <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase">R$ Extras</label>
                            <input type="number" step="0.01" value={editingRecord.extras} onChange={e => setEditingRecord(p => p ? { ...p, extras: parseFloat(e.target.value) || 0 } : null)} className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-slate-400 font-mono font-bold" />
                        </div>
                    </div>
                    <div className="border-t border-slate-100 pt-5 mt-5">
                        <div className="grid grid-cols-12 gap-5">
                            <div className="col-span-12 md:col-span-3">
                                <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase">Valor Pago (R$)</label>
                                <input type="number" step="0.01" value={editingRecord.amount_paid} onChange={e => setEditingRecord(p => p ? { ...p, amount_paid: parseFloat(e.target.value) || 0 } : null)} className="w-full px-3 py-2.5 text-sm border border-green-200 rounded-lg outline-none focus:border-green-400 font-mono font-bold bg-green-50/50" />
                            </div>
                            <div className="col-span-12 md:col-span-3">
                                <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase">Data Pagamento</label>
                                <input type="date" value={editingRecord.payment_date || ''} onChange={e => setEditingRecord(p => p ? { ...p, payment_date: e.target.value || null } : null)} className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-slate-400" />
                            </div>
                            <div className="col-span-12 md:col-span-3">
                                <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase">Status</label>
                                <select value={editingRecord.status} onChange={e => setEditingRecord(p => p ? { ...p, status: e.target.value } : null)} className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-slate-400 bg-white font-bold">
                                    <option value="Em Aberto">Em Aberto</option>
                                    <option value="Pago">Pago</option>
                                    <option value="Parcial">Parcial</option>
                                </select>
                            </div>
                            <div className="col-span-12 md:col-span-3">
                                <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase">Observação</label>
                                <input type="text" value={editingRecord.notes} onChange={e => setEditingRecord(p => p ? { ...p, notes: e.target.value } : null)} className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-slate-400" placeholder="Nota opcional..." />
                            </div>
                        </div>
                    </div>

                    {/* Resumo */}
                    <div className="border-t border-slate-100 pt-5 mt-5">
                        <div className="grid grid-cols-3 gap-4">
                            <div className="bg-slate-50 rounded-xl p-4 text-center border border-slate-200">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Total do Mês</p>
                                <p className="text-lg font-mono font-bold text-slate-800">{formatCurrency(editingRecord.monthly_fee + editingRecord.payroll_fee + editingRecord.extras)}</p>
                            </div>
                            <div className="bg-slate-50 rounded-xl p-4 text-center border border-slate-200">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Saldo do Mês</p>
                                <p className={`text-lg font-mono font-bold ${(editingRecord.monthly_fee + editingRecord.payroll_fee + editingRecord.extras - editingRecord.amount_paid) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                    {formatCurrency(editingRecord.monthly_fee + editingRecord.payroll_fee + editingRecord.extras - editingRecord.amount_paid)}
                                </p>
                            </div>
                            <div className="bg-slate-50 rounded-xl p-4 text-center border border-slate-200">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Saldo Total</p>
                                <p className={`text-lg font-mono font-bold ${(editingRecord.previous_balance + editingRecord.monthly_fee + editingRecord.payroll_fee + editingRecord.extras - editingRecord.amount_paid) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                    {formatCurrency(editingRecord.previous_balance + editingRecord.monthly_fee + editingRecord.payroll_fee + editingRecord.extras - editingRecord.amount_paid)}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // ─── List View ───────────────────────────────────────────────
    const statusCounts = {
        total: mergedData.length,
        aberto: mergedData.filter(d => d.status === 'Em Aberto').length,
        pago: mergedData.filter(d => d.status === 'Pago').length,
        parcial: mergedData.filter(d => d.status === 'Parcial').length,
    };

    return (
        <div className="flex flex-col gap-4 animate-fade-in h-[calc(100vh-120px)]">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-serif font-bold text-slate-800">Controle Financeiro</h2>
                    <p className="text-slate-500 text-sm">Gestão mensal de mensalidades e recebimentos.</p>
                </div>
                <button
                    onClick={handleProvision}
                    disabled={isLoading}
                    className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white px-5 py-2.5 rounded-xl font-bold shadow-md transition-all active:scale-95 text-xs"
                >
                    <Plus className="w-4 h-4" /> Provisionar Mês
                </button>
            </div>

            {/* DataGrid Container */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col flex-1 min-h-0">
                {/* Controls Bar */}
                <div className="bg-gradient-to-r from-slate-100 to-slate-50 border-b border-slate-200 px-4 py-2 flex items-center gap-4 flex-wrap">
                    {/* Month Navigator */}
                    <div className="flex items-center gap-1 bg-white rounded-lg border border-slate-200 px-1 py-0.5">
                        <button onClick={handlePrevMonth} className="p-1 hover:bg-slate-100 rounded transition-colors"><ChevronLeft className="w-4 h-4 text-slate-500" /></button>
                        <div className="flex items-center gap-1.5 px-2">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            <span className="text-[11px] font-black text-slate-700 uppercase tracking-wider min-w-[120px] text-center">
                                {MONTHS[selectedMonth - 1]} / {selectedYear}
                            </span>
                        </div>
                        <button onClick={handleNextMonth} className="p-1 hover:bg-slate-100 rounded transition-colors"><ChevronRight className="w-4 h-4 text-slate-500" /></button>
                    </div>

                    {/* Status Filters */}
                    <div className="flex items-center gap-1.5">
                        {[
                            { label: 'Todos', value: 'Todos', count: statusCounts.total, color: 'slate' },
                            { label: 'Em Aberto', value: 'Em Aberto', count: statusCounts.aberto, color: 'red' },
                            { label: 'Pagos', value: 'Pago', count: statusCounts.pago, color: 'green' },
                            { label: 'Parcial', value: 'Parcial', count: statusCounts.parcial, color: 'amber' },
                        ].map(f => (
                            <button
                                key={f.value}
                                onClick={() => setStatusFilter(f.value)}
                                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all ${statusFilter === f.value
                                        ? `bg-${f.color}-100 text-${f.color}-700 border border-${f.color}-200`
                                        : 'text-slate-400 hover:text-slate-600 border border-transparent'
                                    }`}
                            >
                                <div className={`w-2 h-2 rounded-full bg-${f.color}-500`} />
                                {f.label} <span className="text-[9px] opacity-70">({f.count})</span>
                            </button>
                        ))}
                    </div>

                    {/* Search */}
                    <div className="flex items-center gap-2 flex-1 justify-end">
                        <Search className="w-3.5 h-3.5 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Buscar por nome ou código..."
                            className="bg-transparent text-xs text-slate-500 font-medium outline-none w-full max-w-[200px] placeholder:text-slate-400"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-auto flex-1">
                    <table className="w-full border-collapse">
                        <thead className="sticky top-0 z-10">
                            <tr className="bg-slate-50 border-b-2 border-slate-200">
                                {[
                                    { label: 'Inf', width: 'w-10' },
                                    { label: 'Cód', width: 'w-14' },
                                    { label: 'Cliente', width: 'min-w-[200px]' },
                                    { label: 'Data Cliente', width: 'w-28' },
                                    { label: 'R$ Mensalidade', width: 'w-28' },
                                    { label: 'R$ Folha', width: 'w-24' },
                                    { label: 'R$ Extras', width: 'w-24' },
                                    { label: 'Valor Pago', width: 'w-24' },
                                    { label: 'Data Pgto', width: 'w-24' },
                                    { label: 'Saldo Mês', width: 'w-24' },
                                    { label: 'Saldo Ant.', width: 'w-24' },
                                    { label: 'Saldo Total', width: 'w-28' },
                                    { label: 'Obs', width: 'min-w-[100px]' },
                                ].map(col => (
                                    <th key={col.label} className={`${col.width} text-left px-2 py-2.5 border-r border-slate-200 last:border-r-0 select-none`}>
                                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider">{col.label}</span>
                                    </th>
                                ))}
                                <th className="w-16 px-2 py-2.5 text-center">
                                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Ações</span>
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {/* Saldo Anterior Row */}
                            <tr className="bg-blue-50/60 border-b-2 border-blue-200">
                                <td colSpan={4} className="px-2 py-1.5">
                                    <span className="text-[10px] font-black text-blue-700 uppercase tracking-widest flex items-center gap-1.5">
                                        <DollarSign className="w-3 h-3" />Saldo Anterior
                                    </span>
                                </td>
                                <td colSpan={6}></td>
                                <td className="px-2 py-1.5 text-right border-r border-blue-200">
                                    <span className={`font-mono font-bold text-[11px] ${totals.saldoTotal > 0 ? 'text-blue-700' : 'text-green-600'}`}>
                                        {formatCurrency(mergedData.reduce((s, d) => s + d.previousBalance, 0))}
                                    </span>
                                </td>
                                <td colSpan={3}></td>
                            </tr>

                            {isLoading && (
                                <tr><td colSpan={14} className="text-center py-10"><Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-300" /></td></tr>
                            )}
                            {!isLoading && mergedData.length === 0 && (
                                <tr><td colSpan={14} className="text-center py-10">
                                    <DollarSign className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                                    <p className="text-sm text-slate-400 font-medium">Nenhum lançamento encontrado.</p>
                                    <p className="text-xs text-slate-300 mt-1">Clique em "Provisionar Mês" para criar lançamentos.</p>
                                </td></tr>
                            )}
                            {mergedData.map((item, idx) => {
                                const colors = STATUS_COLORS[item.status] || STATUS_COLORS['Em Aberto'];
                                return (
                                    <tr key={item.company.id} className={`border-b border-slate-100 transition-colors group cursor-default ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'} hover:bg-blue-50/50`}>
                                        {/* Status dot */}
                                        <td className="px-2 py-1.5 border-r border-slate-100 text-center">
                                            <div className={`w-3 h-3 rounded-full mx-auto ${colors.dot}`} title={item.status} />
                                        </td>
                                        {/* Código */}
                                        <td className="px-2 py-1.5 border-r border-slate-100">
                                            <span className="text-[11px] font-mono font-bold text-slate-600">{item.company.code || '-'}</span>
                                        </td>
                                        {/* Cliente */}
                                        <td className="px-2 py-1.5 border-r border-slate-100">
                                            <span className="text-[11px] font-bold text-slate-800 truncate block max-w-[250px]" title={item.company.name}>{item.company.name}</span>
                                        </td>
                                        {/* Data Cliente */}
                                        <td className="px-2 py-1.5 border-r border-slate-100">
                                            <span className="text-[10px] text-slate-500 font-medium">{item.company.client_date || '—'}</span>
                                        </td>
                                        {/* Mensalidade */}
                                        <td className="px-2 py-1.5 border-r border-slate-100 text-right">
                                            <span className="text-[11px] font-mono font-bold text-slate-700">{formatCurrency(item.monthlyFee)}</span>
                                        </td>
                                        {/* Folha */}
                                        <td className="px-2 py-1.5 border-r border-slate-100 text-right">
                                            <span className="text-[11px] font-mono text-slate-600">{formatCurrency(item.payrollFee)}</span>
                                        </td>
                                        {/* Extras */}
                                        <td className="px-2 py-1.5 border-r border-slate-100 text-right">
                                            <span className="text-[11px] font-mono text-slate-600">{formatCurrency(item.extras)}</span>
                                        </td>
                                        {/* Valor Pago */}
                                        <td className="px-2 py-1.5 border-r border-slate-100 text-right">
                                            <span className={`text-[11px] font-mono font-bold ${item.amountPaid > 0 ? 'text-green-600' : 'text-slate-400'}`}>{formatCurrency(item.amountPaid)}</span>
                                        </td>
                                        {/* Data Pgto */}
                                        <td className="px-2 py-1.5 border-r border-slate-100">
                                            <span className="text-[10px] text-slate-500 font-medium">{item.paymentDate || '—'}</span>
                                        </td>
                                        {/* Saldo Mês */}
                                        <td className="px-2 py-1.5 border-r border-slate-100 text-right">
                                            <span className={`text-[11px] font-mono font-bold ${item.balanceMonth > 0 ? 'text-red-600' : 'text-green-600'}`}>{formatCurrency(item.balanceMonth)}</span>
                                        </td>
                                        {/* Saldo Anterior */}
                                        <td className="px-2 py-1.5 border-r border-slate-100 text-right">
                                            <span className={`text-[11px] font-mono font-bold ${item.previousBalance > 0 ? 'text-amber-600' : 'text-slate-400'}`}>{formatCurrency(item.previousBalance)}</span>
                                        </td>
                                        {/* Saldo Total */}
                                        <td className="px-2 py-1.5 border-r border-slate-100 text-right">
                                            <span className={`text-[11px] font-mono font-black ${item.totalBalance > 0 ? 'text-red-700' : 'text-green-700'}`}>{formatCurrency(item.totalBalance)}</span>
                                        </td>
                                        {/* Obs */}
                                        <td className="px-2 py-1.5 border-r border-slate-100">
                                            <span className="text-[10px] text-slate-400 truncate block max-w-[120px]" title={item.notes}>{item.notes || '—'}</span>
                                        </td>
                                        {/* Ações */}
                                        <td className="px-2 py-1.5 text-center">
                                            <div className="flex justify-center items-center gap-0.5">
                                                <button onClick={() => openEditForm(item)} className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-md transition-all" title="Editar">
                                                    <Edit className="w-3.5 h-3.5" />
                                                </button>
                                                {item.record?.id && (
                                                    <button onClick={() => handleDelete(item.record!.id!)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-all" title="Excluir">
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Footer Totals */}
                <div className="bg-slate-800 text-white px-4 py-2.5 flex items-center justify-between mt-auto">
                    <span className="text-[10px] font-bold opacity-60">
                        {mergedData.length} cliente(s) • {MONTHS[selectedMonth - 1]}/{selectedYear}
                    </span>
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2">
                            <span className="text-[9px] font-bold uppercase tracking-wider opacity-50">Mensalidade:</span>
                            <span className="text-[11px] font-mono font-bold">{formatCurrency(totals.mensalidade)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-[9px] font-bold uppercase tracking-wider opacity-50">Pago:</span>
                            <span className="text-[11px] font-mono font-bold text-green-400">{formatCurrency(totals.pago)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-[9px] font-bold uppercase tracking-wider opacity-50">Saldo Total:</span>
                            <span className={`text-[11px] font-mono font-black ${totals.saldoTotal > 0 ? 'text-red-400' : 'text-green-400'}`}>{formatCurrency(totals.saldoTotal)}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AccountantFinancial;
