import React, { useState, useEffect } from 'react';
import { Search, Filter, Loader2, RefreshCw, CheckCircle2, AlertCircle, Clock, ArrowUpDown, ChevronDown } from 'lucide-react';
import { supabase } from '../services/supabase';

interface CompanyData {
    id: string;
    code: string;
    name: string;
    cnpj: string;
    city: string;
}

interface AssessmentRow {
    id: string;
    companyId: string;
    companyCode: string;
    companyName: string;
    cnpj: string;
    month: string;
    year: string;
    movement: 'Com Movimento' | 'Sem Movimento';
    assessment: 'Apurado' | 'Não Apurado';
    sent: 'Sistema' | 'Manual' | 'Não Enviado';
    dbId?: string; // ID from tax_assessments table
}

const MONTHS = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const YEARS = ['2026', '2025', '2024', '2023'];

const TaxAssessment: React.FC = () => {
    const [filterClient, setFilterClient] = useState('');
    const [filterMonth, setFilterMonth] = useState('');
    const [filterYear, setFilterYear] = useState(String(new Date().getFullYear()));
    const [filterMovement, setFilterMovement] = useState('');
    const [filterAssessment, setFilterAssessment] = useState('');
    const [filterSent, setFilterSent] = useState('');

    const [companies, setCompanies] = useState<CompanyData[]>([]);
    const [rows, setRows] = useState<AssessmentRow[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [sortField, setSortField] = useState<string>('companyName');
    const [sortAsc, setSortAsc] = useState(true);

    useEffect(() => {
        fetchCompanies();
        // Safety timeout: prevent loading from getting stuck
        const timeout = setTimeout(() => {
            setIsLoading(false);
            setIsRefreshing(false);
        }, 10000);
        return () => clearTimeout(timeout);
    }, []);

    useEffect(() => {
        if (companies.length > 0) {
            fetchAssessments();
        }
    }, [companies, filterYear, filterMonth]);

    const fetchCompanies = async () => {
        const { data, error } = await supabase
            .from('companies')
            .select('id, code, name, cnpj, city')
            .order('name');
        if (error) { console.error('Error fetching companies:', error); return; }
        setCompanies((data || []) as CompanyData[]);
    };

    const fetchAssessments = async () => {
        const isInitial = rows.length === 0;
        if (isInitial) setIsLoading(true); else setIsRefreshing(true);

        try {
            // Fetch existing tax assessments
            let query = supabase.from('tax_assessments').select('*').eq('year', filterYear);
            if (filterMonth) query = query.eq('month', filterMonth);
            const { data: assessments, error } = await query;
            if (error) throw error;

            // Also check movements (sales/services) to determine movement status
            let movQuery = supabase.from('movements').select('*').eq('year', filterYear);
            if (filterMonth) movQuery = movQuery.eq('month', filterMonth);
            const { data: movements } = await movQuery;

            // Build rows for all companies
            const buildRows: AssessmentRow[] = companies.map(company => {
                const assessment = (assessments || []).find(
                    (a: any) => a.company_id === company.id
                );
                const movement = (movements || []).find(
                    (m: any) => m.company_id === company.id
                );

                return {
                    id: `${company.id}-${filterMonth || 'all'}-${filterYear}`,
                    companyId: company.id,
                    companyCode: company.code || '---',
                    companyName: company.name,
                    cnpj: company.cnpj || '',
                    month: filterMonth || 'Atual',
                    year: filterYear,
                    movement: (assessment?.movement_status as any) || (movement?.status as any) || 'Sem Movimento',
                    assessment: (assessment?.assessment_status as any) || 'Não Apurado',
                    sent: (assessment?.sent_status as any) || 'Não Enviado',
                    dbId: assessment?.id,
                };
            });

            setRows(buildRows);
        } catch (err) {
            console.error('Error fetching assessments:', err);
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    };

    // ─── Update status in database ─────────────────────────────────
    const updateStatus = async (
        row: AssessmentRow,
        field: 'movement' | 'assessment' | 'sent',
        value: string
    ) => {
        const fieldMap = {
            movement: 'movement_status',
            assessment: 'assessment_status',
            sent: 'sent_status',
        };

        try {
            if (row.dbId) {
                // Update existing record
                await supabase
                    .from('tax_assessments')
                    .update({ [fieldMap[field]]: value, updated_at: new Date().toISOString() })
                    .eq('id', row.dbId);
            } else {
                // Insert new record
                const { data } = await supabase
                    .from('tax_assessments')
                    .insert({
                        company_id: row.companyId,
                        month: row.month === 'Atual' ? MONTHS[new Date().getMonth()] : row.month,
                        year: row.year,
                        [fieldMap[field]]: value,
                    })
                    .select()
                    .single();

                if (data) {
                    // Update local row with the new dbId
                    setRows(prev => prev.map(r =>
                        r.id === row.id ? { ...r, dbId: data.id } : r
                    ));
                }
            }

            // Update local state immediately
            setRows(prev => prev.map(r =>
                r.id === row.id ? { ...r, [field]: value } : r
            ));
        } catch (err) {
            console.error('Error updating status:', err);
        }
    };

    // ─── Sorting ───────────────────────────────────────────────────
    const handleSort = (field: string) => {
        if (sortField === field) {
            setSortAsc(!sortAsc);
        } else {
            setSortField(field);
            setSortAsc(true);
        }
    };

    // ─── Filtering & Sorting ───────────────────────────────────────
    const filteredRows = rows
        .filter(r => !filterClient || r.companyId === filterClient)
        .filter(r => !filterMovement || r.movement === filterMovement)
        .filter(r => !filterAssessment || r.assessment === filterAssessment)
        .filter(r => !filterSent || r.sent === filterSent)
        .sort((a, b) => {
            const valA = (a as any)[sortField] || '';
            const valB = (b as any)[sortField] || '';
            const cmp = valA.localeCompare(valB, 'pt-BR', { sensitivity: 'base' });
            return sortAsc ? cmp : -cmp;
        });

    // ─── Status badge colors ──────────────────────────────────────
    const movementBadge = (val: string) => {
        if (val === 'Com Movimento') return 'bg-green-100 text-green-700 border-green-200';
        return 'bg-slate-100 text-slate-400 border-slate-200';
    };

    const assessmentBadge = (val: string) => {
        if (val === 'Apurado') return 'bg-blue-100 text-blue-700 border-blue-200';
        return 'bg-amber-50 text-amber-600 border-amber-200';
    };

    const sentBadge = (val: string) => {
        if (val === 'Sistema') return 'bg-green-100 text-green-700 border-green-200';
        if (val === 'Manual') return 'bg-purple-100 text-purple-700 border-purple-200';
        return 'bg-slate-100 text-slate-400 border-slate-200';
    };

    // ─── Counters ──────────────────────────────────────────────────
    const totalComMovimento = filteredRows.filter(r => r.movement === 'Com Movimento').length;
    const totalApurado = filteredRows.filter(r => r.assessment === 'Apurado').length;
    const totalEnviado = filteredRows.filter(r => r.sent !== 'Não Enviado').length;

    // ═══════════════════════════════════════════════════════════════
    //  RENDER
    // ═══════════════════════════════════════════════════════════════
    return (
        <div className="flex flex-col gap-3 h-[calc(100vh-120px)]">
            {/* Header */}
            <div className="flex items-center justify-between flex-shrink-0">
                <div>
                    <h2 className="text-2xl font-serif font-bold text-slate-800">Controle de Apurações</h2>
                    <p className="text-slate-500 text-sm">Acompanhe o status fiscal de cada empresa: movimentos, apurações e envios.</p>
                </div>
                <div className="flex items-center gap-2">
                    {isRefreshing && <RefreshCw className="w-4 h-4 text-slate-400 animate-spin" />}
                    <button
                        onClick={fetchAssessments}
                        className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 rounded-lg text-[10px] font-black uppercase tracking-wider text-slate-500 hover:border-slate-400 hover:text-slate-700 transition-all shadow-sm"
                    >
                        <RefreshCw className="w-3 h-3" />
                        Atualizar
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-4 gap-3 flex-shrink-0">
                <div className="bg-white rounded-xl border border-slate-200 px-4 py-2.5 shadow-sm">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Total Empresas</p>
                    <p className="text-xl font-bold text-slate-800">{filteredRows.length}</p>
                </div>
                <div className="bg-white rounded-xl border border-green-200 px-4 py-2.5 shadow-sm">
                    <p className="text-[9px] font-black text-green-500 uppercase tracking-widest">Com Movimento</p>
                    <p className="text-xl font-bold text-green-700">{totalComMovimento}</p>
                </div>
                <div className="bg-white rounded-xl border border-blue-200 px-4 py-2.5 shadow-sm">
                    <p className="text-[9px] font-black text-blue-500 uppercase tracking-widest">Apurados</p>
                    <p className="text-xl font-bold text-blue-700">{totalApurado}</p>
                </div>
                <div className="bg-white rounded-xl border border-purple-200 px-4 py-2.5 shadow-sm">
                    <p className="text-[9px] font-black text-purple-500 uppercase tracking-widest">Enviados</p>
                    <p className="text-xl font-bold text-purple-700">{totalEnviado}</p>
                </div>
            </div>

            {/* DataGrid Card */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col flex-1 min-h-0">
                {/* Compact Filter Fieldset */}
                <div className="border-b border-slate-200 px-4 py-2.5 flex-shrink-0">
                    <fieldset className="border border-slate-200 rounded-lg px-3 py-2 relative">
                        <legend className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1.5 select-none flex items-center gap-1">
                            <Filter className="w-3 h-3" />
                            Filtro de Pesquisa
                        </legend>
                        <div className="flex items-center gap-3 flex-wrap">
                            <div className="flex items-center gap-1.5 flex-1 min-w-[140px]">
                                <label className="text-[10px] font-bold text-slate-500 uppercase whitespace-nowrap">Empresa</label>
                                <select
                                    className="flex-1 min-w-0 appearance-none bg-slate-50 border border-slate-200 text-slate-700 py-1 px-2 rounded-md text-[11px] font-medium focus:outline-none focus:border-slate-400 transition-all"
                                    value={filterClient}
                                    onChange={(e) => setFilterClient(e.target.value)}
                                >
                                    <option value="">Todas</option>
                                    {companies.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <label className="text-[10px] font-bold text-slate-500 uppercase whitespace-nowrap">Mês</label>
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
                            <div className="flex items-center gap-1.5">
                                <label className="text-[10px] font-bold text-slate-500 uppercase whitespace-nowrap">Movimento</label>
                                <select
                                    className="appearance-none bg-slate-50 border border-slate-200 text-slate-700 py-1 px-2 rounded-md text-[11px] font-medium focus:outline-none focus:border-slate-400 transition-all w-28"
                                    value={filterMovement}
                                    onChange={(e) => setFilterMovement(e.target.value)}
                                >
                                    <option value="">Todos</option>
                                    <option value="Com Movimento">Com Movimento</option>
                                    <option value="Sem Movimento">Sem Movimento</option>
                                </select>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <label className="text-[10px] font-bold text-slate-500 uppercase whitespace-nowrap">Apuração</label>
                                <select
                                    className="appearance-none bg-slate-50 border border-slate-200 text-slate-700 py-1 px-2 rounded-md text-[11px] font-medium focus:outline-none focus:border-slate-400 transition-all w-28"
                                    value={filterAssessment}
                                    onChange={(e) => setFilterAssessment(e.target.value)}
                                >
                                    <option value="">Todos</option>
                                    <option value="Apurado">Apurado</option>
                                    <option value="Não Apurado">Não Apurado</option>
                                </select>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <label className="text-[10px] font-bold text-slate-500 uppercase whitespace-nowrap">Enviado</label>
                                <select
                                    className="appearance-none bg-slate-50 border border-slate-200 text-slate-700 py-1 px-2 rounded-md text-[11px] font-medium focus:outline-none focus:border-slate-400 transition-all w-28"
                                    value={filterSent}
                                    onChange={(e) => setFilterSent(e.target.value)}
                                >
                                    <option value="">Todos</option>
                                    <option value="Sistema">Sistema</option>
                                    <option value="Manual">Manual</option>
                                    <option value="Não Enviado">Não Enviado</option>
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
                                <th className="w-16 text-left px-3 py-2 border-r border-slate-200 cursor-pointer select-none" onClick={() => handleSort('companyCode')}>
                                    <div className="flex items-center gap-1">
                                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Cód.</span>
                                        {sortField === 'companyCode' && <ArrowUpDown className="w-2.5 h-2.5 text-slate-400" />}
                                    </div>
                                </th>
                                <th className="text-left px-3 py-2 border-r border-slate-200 cursor-pointer select-none" onClick={() => handleSort('companyName')}>
                                    <div className="flex items-center gap-1">
                                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Empresa</span>
                                        {sortField === 'companyName' && <ArrowUpDown className="w-2.5 h-2.5 text-slate-400" />}
                                    </div>
                                </th>
                                <th className="w-36 text-left px-3 py-2 border-r border-slate-200">
                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">CNPJ</span>
                                </th>
                                <th className="w-24 text-left px-3 py-2 border-r border-slate-200">
                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Compet.</span>
                                </th>
                                <th className="w-32 text-center px-3 py-2 border-r border-slate-200 cursor-pointer select-none" onClick={() => handleSort('movement')}>
                                    <div className="flex items-center justify-center gap-1">
                                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Movimento</span>
                                        {sortField === 'movement' && <ArrowUpDown className="w-2.5 h-2.5 text-slate-400" />}
                                    </div>
                                </th>
                                <th className="w-32 text-center px-3 py-2 border-r border-slate-200 cursor-pointer select-none" onClick={() => handleSort('assessment')}>
                                    <div className="flex items-center justify-center gap-1">
                                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Apuração</span>
                                        {sortField === 'assessment' && <ArrowUpDown className="w-2.5 h-2.5 text-slate-400" />}
                                    </div>
                                </th>
                                <th className="w-32 text-center px-3 py-2 cursor-pointer select-none" onClick={() => handleSort('sent')}>
                                    <div className="flex items-center justify-center gap-1">
                                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Enviado</span>
                                        {sortField === 'sent' && <ArrowUpDown className="w-2.5 h-2.5 text-slate-400" />}
                                    </div>
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr>
                                    <td colSpan={7} className="px-4 py-16 text-center">
                                        <div className="flex flex-col items-center gap-3 text-slate-400">
                                            <Loader2 className="w-6 h-6 animate-spin" />
                                            <p className="text-[10px] font-black uppercase tracking-widest">Carregando...</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredRows.length > 0 ? (
                                filteredRows.map((row, idx) => (
                                    <tr
                                        key={row.id}
                                        className={`border-b border-slate-100 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'} hover:bg-blue-50/40`}
                                    >
                                        {/* Código */}
                                        <td className="px-3 py-1.5 border-r border-slate-100">
                                            <span className="text-[11px] font-bold font-mono text-slate-500">{row.companyCode}</span>
                                        </td>
                                        {/* Empresa */}
                                        <td className="px-3 py-1.5 border-r border-slate-100">
                                            <span className="text-[11px] font-bold text-slate-700">{row.companyName}</span>
                                        </td>
                                        {/* CNPJ */}
                                        <td className="px-3 py-1.5 border-r border-slate-100">
                                            <span className="text-[10px] font-mono text-slate-500">{row.cnpj || '—'}</span>
                                        </td>
                                        {/* Competência */}
                                        <td className="px-3 py-1.5 border-r border-slate-100">
                                            <span className="text-[11px] text-slate-600">{row.month} / {row.year}</span>
                                        </td>
                                        {/* Movimento */}
                                        <td className="px-3 py-1.5 border-r border-slate-100 text-center">
                                            <div className="relative inline-block">
                                                <select
                                                    value={row.movement}
                                                    onChange={(e) => updateStatus(row, 'movement', e.target.value)}
                                                    className={`appearance-none text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border cursor-pointer focus:outline-none transition-all pr-5 ${movementBadge(row.movement)}`}
                                                >
                                                    <option value="Com Movimento">Com Movimento</option>
                                                    <option value="Sem Movimento">Sem Movimento</option>
                                                </select>
                                                <ChevronDown className="w-2.5 h-2.5 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none text-current opacity-50" />
                                            </div>
                                        </td>
                                        {/* Apuração */}
                                        <td className="px-3 py-1.5 border-r border-slate-100 text-center">
                                            <div className="relative inline-block">
                                                <select
                                                    value={row.assessment}
                                                    onChange={(e) => updateStatus(row, 'assessment', e.target.value)}
                                                    className={`appearance-none text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border cursor-pointer focus:outline-none transition-all pr-5 ${assessmentBadge(row.assessment)}`}
                                                >
                                                    <option value="Apurado">Apurado</option>
                                                    <option value="Não Apurado">Não Apurado</option>
                                                </select>
                                                <ChevronDown className="w-2.5 h-2.5 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none text-current opacity-50" />
                                            </div>
                                        </td>
                                        {/* Enviado */}
                                        <td className="px-3 py-1.5 text-center">
                                            <div className="relative inline-block">
                                                <select
                                                    value={row.sent}
                                                    onChange={(e) => updateStatus(row, 'sent', e.target.value)}
                                                    className={`appearance-none text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border cursor-pointer focus:outline-none transition-all pr-5 ${sentBadge(row.sent)}`}
                                                >
                                                    <option value="Sistema">Sistema</option>
                                                    <option value="Manual">Manual</option>
                                                    <option value="Não Enviado">Não Enviado</option>
                                                </select>
                                                <ChevronDown className="w-2.5 h-2.5 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none text-current opacity-50" />
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                                        <div className="flex flex-col items-center gap-2">
                                            <Search className="w-6 h-6 text-slate-300" />
                                            <p className="text-xs">Nenhuma empresa encontrada.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Footer */}
                <div className="bg-slate-50 border-t border-slate-200 px-4 py-1.5 flex items-center justify-between flex-shrink-0">
                    <span className="text-[10px] font-bold text-slate-400">{filteredRows.length} registro(s)</span>
                    <span className="text-[10px] text-slate-300">Fact ERP Contábil</span>
                </div>
            </div>
        </div>
    );
};

export default TaxAssessment;
