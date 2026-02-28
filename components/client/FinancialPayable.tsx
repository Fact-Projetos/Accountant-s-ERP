import React, { useState } from 'react';
import {
    Plus, Search, Filter, Calendar, FileText, MoreHorizontal,
    TrendingDown, AlertCircle, CheckCircle2, DollarSign, Download,
    ArrowUpRight, ArrowDownRight, Clock, Eye, Edit, Trash2,
    CheckCircle, XCircle, CreditCard
} from 'lucide-react';

const FinancialPayable: React.FC = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [openMenuId, setOpenMenuId] = useState<number | null>(null);

    const mockData = [
        { id: 1, supplier: 'Distribuidora Global', document: 'NF-e 4521', dueDate: '2025-05-22', amount: 3200.00, status: 'Pendente', category: 'Insumos' },
        { id: 2, supplier: 'Energia S.A.', document: 'Fatura Out/25', dueDate: '2025-05-18', amount: 850.40, status: 'Vencido', category: 'Utilidades' },
        { id: 3, supplier: 'Office Supplies Inc', document: 'NF-e 889', dueDate: '2025-05-10', amount: 450.00, status: 'Pago', category: 'Escritório' },
        { id: 4, supplier: 'Aluguel Imóveis Corp', document: 'Contrato 2025', dueDate: '2025-05-30', amount: 5000.00, status: 'Pendente', category: 'Aluguel' },
    ];

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
    };

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'Pago': return 'bg-green-50 text-green-700 border-green-100';
            case 'Vencido': return 'bg-red-50 text-red-700 border-red-100';
            case 'Pendente': return 'bg-amber-50 text-amber-700 border-amber-100';
            default: return 'bg-slate-50 text-slate-700 border-slate-100';
        }
    };

    return (
        <div className="space-y-6 animate-fade-in pb-10">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-serif font-bold text-slate-800 tracking-tight">Contas a Pagar</h2>
                    <p className="text-slate-500 text-sm">Gerencie suas obrigações financeiras e fornecedores.</p>
                </div>
                <div className="flex gap-3">
                    <button className="flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-4 py-2.5 rounded-xl font-bold shadow-sm transition-all active:scale-95 text-xs">
                        <Download className="w-4 h-4" /> Relatórios
                    </button>
                    <button className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white px-5 py-2.5 rounded-xl font-bold shadow-md transition-all active:scale-95 text-xs">
                        <Plus className="w-4 h-4" /> Nova Despesa
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm overflow-hidden relative group hover:border-slate-300 transition-all">
                    <div className="relative z-10">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total a Pagar</p>
                        <h3 className="text-2xl font-black text-slate-800">{formatCurrency(15800.00)}</h3>
                        <div className="mt-2 flex items-center gap-1 text-[10px] font-bold text-slate-600 bg-slate-50 w-fit px-2 py-0.5 rounded-full">
                            8 títulos em aberto
                        </div>
                    </div>
                    <DollarSign className="absolute -bottom-2 -right-2 w-16 h-16 text-slate-50 group-hover:text-slate-100 transition-colors" />
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm overflow-hidden relative group hover:border-slate-300 transition-all">
                    <div className="relative z-10">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Vencidos</p>
                        <h3 className="text-2xl font-black text-red-600">{formatCurrency(850.40)}</h3>
                        <div className="mt-2 flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-50 w-fit px-2 py-0.5 rounded-full">
                            <AlertCircle className="w-3 h-3" /> Requer atenção imediata
                        </div>
                    </div>
                    <ArrowDownRight className="absolute -bottom-2 -right-2 w-16 h-16 text-slate-50 group-hover:text-slate-100 transition-colors" />
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm overflow-hidden relative group hover:border-slate-300 transition-all">
                    <div className="relative z-10">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Hoje / Amanhã</p>
                        <h3 className="text-2xl font-black text-amber-600">{formatCurrency(1200.00)}</h3>
                        <div className="mt-2 flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 w-fit px-2 py-0.5 rounded-full">
                            <Clock className="w-3 h-3" /> 2 títulos hoje
                        </div>
                    </div>
                    <Clock className="absolute -bottom-2 -right-2 w-16 h-16 text-slate-50 group-hover:text-slate-100 transition-colors" />
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm overflow-hidden relative group hover:border-slate-300 transition-all">
                    <div className="relative z-10">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Pago (Mês)</p>
                        <h3 className="text-2xl font-black text-green-600">{formatCurrency(9400.00)}</h3>
                        <div className="mt-2 flex items-center gap-1 text-[10px] font-bold text-green-600 bg-green-50 w-fit px-2 py-0.5 rounded-full">
                            <CheckCircle2 className="w-3 h-3" /> Fluxo controlado
                        </div>
                    </div>
                    <CheckCircle2 className="absolute -bottom-2 -right-2 w-16 h-16 text-slate-50 group-hover:text-slate-100 transition-colors" />
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-wrap gap-4 items-center">
                <div className="relative flex-1 min-w-[300px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Pesquisar por fornecedor, documento ou categoria..."
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:border-slate-400 outline-none transition-all font-medium text-slate-600"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex gap-2">
                    <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-4 py-2 rounded-xl text-xs font-bold text-slate-600">
                        <Calendar className="w-4 h-4" />
                        <input type="date" className="bg-transparent outline-none" />
                    </div>
                    <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-4 py-2 rounded-xl text-xs font-bold text-slate-600">
                        <CreditCard className="w-4 h-4" />
                        <select className="bg-transparent outline-none">
                            <option>Todas as Contas</option>
                            <option>Itaú Corporate</option>
                            <option>Nubank Business</option>
                        </select>
                    </div>
                    <button className="p-2 hover:bg-slate-50 text-slate-400 hover:text-slate-800 border-none transition-all">
                        <Filter className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
                    <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-slate-400" />
                        <h3 className="text-sm font-bold text-slate-700 uppercase tracking-widest">Contas a Pagar / Despesas</h3>
                    </div>
                    <div className="flex items-center gap-4 text-[10px] font-bold text-slate-400">
                        <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-green-500"></div> Pago</div>
                        <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-amber-500"></div> Pendente</div>
                        <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-red-500"></div> Vencido</div>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50 text-[10px] uppercase font-bold text-slate-400 border-b border-slate-100 text-left">
                                <th className="px-6 py-4">Fornecedor / Favorecido</th>
                                <th className="px-6 py-4">Documento</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Categoria</th>
                                <th className="px-6 py-4 text-center">Vencimento</th>
                                <th className="px-6 py-4 text-right">Valor</th>
                                <th className="px-6 py-4 text-center">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 text-xs text-slate-600">
                            {mockData.map(item => (
                                <tr key={item.id} className="hover:bg-slate-50/30 transition-colors group">
                                    <td className="px-6 py-4 font-black text-slate-700">{item.supplier}</td>
                                    <td className="px-6 py-4">
                                        <span className="font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded text-[10px]">{item.document}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-3 py-1 rounded-lg font-bold text-[9px] uppercase border inline-block min-w-[80px] text-center ${getStatusStyle(item.status)}`}>
                                            {item.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-slate-400 font-bold uppercase text-[9px]">{item.category}</span>
                                    </td>
                                    <td className="px-6 py-4 text-center font-bold text-slate-500">
                                        {new Date(item.dueDate).toLocaleDateString('pt-BR')}
                                    </td>
                                    <td className="px-6 py-4 text-right font-black text-slate-800">
                                        {formatCurrency(item.amount)}
                                    </td>
                                    <td className="px-6 py-4 text-center overflow-visible relative">
                                        <div className="flex items-center justify-center">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setOpenMenuId(openMenuId === item.id ? null : item.id);
                                                }}
                                                className={`p-2 rounded-lg transition-all ${openMenuId === item.id ? 'bg-slate-100 text-slate-800' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'}`}
                                            >
                                                <MoreHorizontal className="w-5 h-5" />
                                            </button>

                                            {openMenuId === item.id && (
                                                <>
                                                    <div className="fixed inset-0 z-10" onClick={() => setOpenMenuId(null)}></div>
                                                    <div className="absolute right-full top-1/2 -translate-y-1/2 mr-2 z-20 w-40 bg-white rounded-xl shadow-2xl border border-slate-100 overflow-hidden">
                                                        <button className="w-full flex items-center gap-2 px-4 py-2 text-[9px] font-black text-slate-600 hover:bg-slate-50 uppercase tracking-widest border-b border-slate-50">
                                                            <Eye className="w-3.5 h-3.5" /> Detalhes
                                                        </button>
                                                        <button className="w-full flex items-center gap-2 px-4 py-2 text-[9px] font-black text-green-600 hover:bg-green-50 uppercase tracking-widest border-b border-slate-50">
                                                            <CheckCircle className="w-3.5 h-3.5" /> Efetuar Pagamento
                                                        </button>
                                                        <button className="w-full flex items-center gap-2 px-4 py-2 text-[9px] font-black text-slate-600 hover:bg-slate-50 uppercase tracking-widest border-b border-slate-50">
                                                            <Edit className="w-3.5 h-3.5" /> Editar
                                                        </button>
                                                        <button className="w-full flex items-center gap-2 px-4 py-2 text-[9px] font-black text-red-500 hover:bg-red-50 uppercase tracking-widest">
                                                            <Trash2 className="w-3.5 h-3.5" /> Excluir
                                                        </button>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default FinancialPayable;
