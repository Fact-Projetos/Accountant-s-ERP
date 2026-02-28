import React, { useState } from 'react';
import {
    Wallet, TrendingUp, TrendingDown, DollarSign, Calendar,
    Plus, ArrowUpRight, ArrowDownRight, FileText, PieChart,
    ChevronRight, Filter, Download, MoreHorizontal, HelpCircle,
    PlusCircle, Save, X, Calculator, ArrowLeft, Search, Clock,
    CheckCircle2, AlertCircle, CheckCircle, Edit, Trash2
} from 'lucide-react';

type FinancialView = 'DASHBOARD' | 'RECEIVABLES' | 'PAYABLES';

const Financial: React.FC = () => {
    const [view, setView] = useState<FinancialView>('DASHBOARD');
    const [showEntryForm, setShowEntryForm] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [openMenuId, setOpenMenuId] = useState<number | null>(null);

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
    };

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'Recebido': case 'Pago': return 'bg-green-50 text-green-700 border-green-100';
            case 'Vencido': return 'bg-red-50 text-red-700 border-red-100';
            case 'Pendente': case 'Em aberto': return 'bg-amber-50 text-amber-700 border-amber-100';
            default: return 'bg-slate-50 text-slate-700 border-slate-100';
        }
    };

    const receivablesData = [
        { id: 1, origin: 'Vendas', dueDate: '2025-02-11', client: 'FACT ASSESSORIA E CONSULTORIA', document: '30.321.587/0001-22', nature: 'Venda de Mercadorias', description: 'produtos eletronicos', totalAmount: 8000.00, paidAmount: 8000.00, status: 'Pago' },
        { id: 2, origin: 'Serviços', dueDate: '2025-02-12', client: 'FACT SERVIÇOS', document: '30.321.587/0001-23', nature: 'Serviços Prestados', description: 'consultoria', totalAmount: 2000.00, paidAmount: 500.00, status: 'Parcial' },
        { id: 3, origin: 'Manual', dueDate: '2025-02-13', client: 'FACT OBRAS', document: '30.321.587/0001-24', nature: 'Outras Receitas', description: 'consultria sem nota fiscal', totalAmount: 500.00, paidAmount: 0.00, status: 'Em aberto' },
    ];

    const payablesData = [
        { id: 1, origin: 'Compras', dueDate: '2025-02-22', supplier: 'DISTRIBUIDORA GLOBAL', document: '12.456.789/0001-99', nature: 'Compra de Insumos', description: 'materias primas', totalAmount: 3200.00, paidAmount: 1200.00, status: 'Parcial' },
        { id: 2, origin: 'Fixo', dueDate: '2025-02-18', supplier: 'ENERGIA S.A.', document: '00.111.222/0001-33', nature: 'Utilidades', description: 'fatura energia elétrica', totalAmount: 850.40, paidAmount: 0.00, status: 'Vencido' },
        { id: 3, origin: 'Manual', dueDate: '2025-02-10', supplier: 'ALUGUEL IMÓVEIS', document: '44.555.666/0001-77', nature: 'Custos Fixos', description: 'aluguel sede', totalAmount: 5000.00, paidAmount: 5000.00, status: 'Pago' },
    ];

    const renderDashboard = () => (
        <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Contas a Receber Card */}
                <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 relative overflow-hidden group hover:shadow-md transition-all">
                    <div className="absolute top-0 right-0 p-8 text-slate-50 group-hover:text-slate-100 transition-colors pointer-events-none">
                        <TrendingUp className="w-24 h-24 rotate-12" />
                    </div>

                    <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-6">
                            <div className="p-2 bg-green-50 rounded-lg">
                                <ArrowUpRight className="w-5 h-5 text-green-600" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-800">Contas a Receber</h3>
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Total Faturado (Mês)</p>
                                    <p className="text-xl font-black text-slate-800">{formatCurrency(45300.20)}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Total Recebido (Mês)</p>
                                    <p className="text-xl font-black text-green-600">{formatCurrency(38200.00)}</p>
                                </div>
                            </div>
                            <div className="space-y-4 border-l border-slate-100 pl-6">
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Vencidos</p>
                                    <div className="flex items-baseline gap-2">
                                        <p className="text-xl font-black text-red-600">5</p>
                                        <span className="text-[10px] font-bold text-red-400 uppercase">títulos</span>
                                    </div>
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">A Vencer</p>
                                    <div className="flex items-baseline gap-2">
                                        <p className="text-xl font-black text-amber-600">12</p>
                                        <span className="text-[10px] font-bold text-amber-400 uppercase">títulos</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={() => setView('RECEIVABLES')}
                            className="mt-6 w-full py-2 bg-slate-50 hover:bg-slate-100 rounded-xl text-[10px] font-black text-slate-500 uppercase tracking-widest transition-colors flex items-center justify-center gap-2"
                        >
                            Ver Detalhes <ChevronRight className="w-3 h-3" />
                        </button>
                    </div>
                </div>

                {/* Contas a Pagar Card */}
                <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 relative overflow-hidden group hover:shadow-md transition-all">
                    <div className="absolute top-0 right-0 p-8 text-slate-50 group-hover:text-slate-100 transition-colors pointer-events-none">
                        <TrendingDown className="w-24 h-24 -rotate-12" />
                    </div>

                    <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-6">
                            <div className="p-2 bg-red-50 rounded-lg">
                                <ArrowDownRight className="w-5 h-5 text-red-600" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-800">Contas a Pagar</h3>
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Total Faturado</p>
                                    <p className="text-xl font-black text-slate-800">{formatCurrency(32100.00)}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Total Pago</p>
                                    <p className="text-xl font-black text-red-600">{formatCurrency(29450.50)}</p>
                                </div>
                            </div>
                            <div className="space-y-4 border-l border-slate-100 pl-6">
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Vencidos</p>
                                    <div className="flex items-baseline gap-2">
                                        <p className="text-xl font-black text-red-600">3</p>
                                        <span className="text-[10px] font-bold text-red-400 uppercase">títulos</span>
                                    </div>
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">A Vencer</p>
                                    <div className="flex items-baseline gap-2">
                                        <p className="text-xl font-black text-amber-600">8</p>
                                        <span className="text-[10px] font-bold text-amber-400 uppercase">títulos</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={() => setView('PAYABLES')}
                            className="mt-6 w-full py-2 bg-slate-50 hover:bg-slate-100 rounded-xl text-[10px] font-black text-slate-500 uppercase tracking-widest transition-colors flex items-center justify-center gap-2"
                        >
                            Gerenciar Dívidas <ChevronRight className="w-3 h-3" />
                        </button>
                    </div>
                </div>
            </div>

            {/* DRE (Summarized for space) */}
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden mt-6">
                <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
                    <div className="flex items-center gap-2">
                        <PieChart className="w-5 h-5 text-slate-400" />
                        <div>
                            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-widest">Demonstração de Resultados (DRE)</h3>
                            <p className="text-[10px] text-slate-400 font-bold uppercase">Competência: Setembro 2025</p>
                        </div>
                    </div>
                </div>

                <div className="p-8">
                    <div className="max-w-4xl mx-auto space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-4">
                                <div className="flex justify-between items-center group px-4">
                                    <span className="text-xs font-black text-green-600 uppercase tracking-widest">Receitas Totais</span>
                                    <span className="text-sm font-black text-slate-800">{formatCurrency(45300.20)}</span>
                                </div>
                                <div className="flex justify-between items-center group px-4">
                                    <span className="text-xs font-black text-red-500 uppercase tracking-widest">Custos & Despesas</span>
                                    <span className="text-sm font-black text-slate-800">({formatCurrency(19970.50)})</span>
                                </div>
                            </div>
                            <div className="flex items-center justify-center bg-slate-900 rounded-2xl p-6 relative overflow-hidden group">
                                <DollarSign className="absolute -bottom-4 -right-4 w-20 h-20 text-slate-800 rotate-12" />
                                <div className="text-center relative z-10">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Resultado Líquido</p>
                                    <p className="text-2xl font-black text-green-400">{formatCurrency(25329.70)}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );

    const renderList = (type: 'RECEIVABLES' | 'PAYABLES') => {
        const data = type === 'RECEIVABLES' ? receivablesData : payablesData;
        const title = type === 'RECEIVABLES' ? 'Contas a Receber' : 'Contas a Pagar';
        const entityLabel = type === 'RECEIVABLES' ? 'cliente' : 'fornecedor';

        return (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-wrap gap-4 items-center">
                    <div className="relative flex-1 min-w-[300px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder={`Pesquisar por ${entityLabel}, CNPJ ou descrição...`}
                            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:border-slate-400 outline-none transition-all font-medium text-slate-600"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="flex gap-2">
                        <button className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-4 py-2 rounded-xl text-[10px] font-black text-slate-600 uppercase tracking-widest">
                            <Calendar className="w-3.5 h-3.5" /> Outubro/2025
                        </button>
                        <button className="p-2 hover:bg-slate-50 text-slate-400 hover:text-slate-800 transition-all">
                            <Filter className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="bg-slate-50/50 text-[10px] uppercase font-black text-slate-400 border-b border-slate-100 text-left">
                                    <th className="px-6 py-5">Origem</th>
                                    <th className="px-6 py-5">Vencimento</th>
                                    <th className="px-6 py-5 capitalize">{entityLabel} / CNPJ</th>
                                    <th className="px-6 py-5 text-center">Natureza</th>
                                    <th className="px-6 py-5 text-right">Vlr. Total</th>
                                    <th className="px-6 py-5 text-right">Vlr. Pago</th>
                                    <th className="px-6 py-5 text-right">Saldo</th>
                                    <th className="px-6 py-5 text-center">Status</th>
                                    <th className="px-6 py-5 text-center">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 text-[11px] font-bold text-slate-600">
                                {data.map(item => {
                                    const balance = item.totalAmount - item.paidAmount;
                                    return (
                                        <tr key={item.id} className="hover:bg-slate-50/30 transition-colors group">
                                            <td className="px-6 py-4">
                                                <span className="bg-slate-100 text-slate-500 px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest">{item.origin}</span>
                                            </td>
                                            <td className="px-6 py-4 font-mono text-slate-800">
                                                {new Date(item.dueDate).toLocaleDateString('pt-BR')}
                                            </td>
                                            <td className="px-6 py-4 min-w-[250px]">
                                                <div className="flex flex-col gap-0.5">
                                                    <span className="font-black text-slate-800 uppercase tracking-tight">{(item as any).client || (item as any).supplier}</span>
                                                    <span className="font-mono text-[9px] text-slate-400 tracking-tighter">{item.document}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{item.nature}</span>
                                            </td>
                                            <td className="px-6 py-4 text-right font-black text-slate-400 text-xs">
                                                {formatCurrency(item.totalAmount)}
                                            </td>
                                            <td className="px-6 py-4 text-right font-black text-green-600 text-xs">
                                                {formatCurrency(item.paidAmount)}
                                            </td>
                                            <td className="px-6 py-4 text-right font-black text-slate-900 text-sm">
                                                {formatCurrency(balance)}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`px-3 py-1.5 rounded-full font-black text-[9px] uppercase border inline-block min-w-[90px] ${item.status === 'Pago' || item.status === 'Recebido'
                                                        ? 'bg-green-50 text-green-700 border-green-100'
                                                        : item.status === 'Vencido'
                                                            ? 'bg-red-50 text-red-700 border-red-100'
                                                            : item.status === 'Parcial'
                                                                ? 'bg-blue-50 text-blue-700 border-blue-100'
                                                                : 'bg-amber-50 text-amber-700 border-amber-100'
                                                    }`}>
                                                    {item.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    <button title="Baixar" className="p-1.5 hover:bg-green-50 text-slate-400 hover:text-green-600 rounded-lg transition-all"><CheckCircle className="w-4 h-4" /></button>
                                                    <button title="Editar" className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-800 rounded-lg transition-all"><Edit className="w-4 h-4" /></button>
                                                    <button title="Excluir" className="p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-lg transition-all"><Trash2 className="w-4 h-4" /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-6 animate-fade-in pb-10">
            {/* Header */}
            <div className="flex justify-between items-center bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                <div className="flex items-center gap-4">
                    {view !== 'DASHBOARD' && (
                        <button
                            onClick={() => setView('DASHBOARD')}
                            className="p-3 bg-slate-50 hover:bg-slate-100 rounded-2xl text-slate-800 transition-all shadow-sm active:scale-95"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                    )}
                    <div>
                        <h2 className="text-2xl font-serif font-bold text-slate-800 tracking-tight flex items-center gap-3">
                            <Wallet className="w-6 h-6 text-slate-400" />
                            {view === 'DASHBOARD' ? 'Gestão Financeira' : view === 'RECEIVABLES' ? 'Detalhamento: Contas a Receber' : 'Detalhamento: Contas a Pagar'}
                        </h2>
                        <p className="text-slate-500 text-xs font-medium">
                            {view === 'DASHBOARD' ? 'Análise de performance e fluxo de caixa consolidado.' : `Lista completa de títulos de ${view === 'RECEIVABLES' ? 'recebimento' : 'pagamento'}.`}
                        </p>
                    </div>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => setShowEntryForm(true)}
                        className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white px-6 py-3 rounded-2xl font-black shadow-lg shadow-slate-200 transition-all active:scale-95 text-[10px] uppercase tracking-widest"
                    >
                        <PlusCircle className="w-4 h-4" /> Lançar Valores
                    </button>
                </div>
            </div>

            {view === 'DASHBOARD' && renderDashboard()}
            {view !== 'DASHBOARD' && renderList(view)}

            {/* Entry Modal Expanded */}
            {showEntryForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-slate-100">
                        <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
                            <div>
                                <h3 className="text-xl font-bold text-slate-800">Novo Lançamento Financeiro</h3>
                                <p className="text-xs text-slate-400 font-medium">Preencha os detalhes do título para registro no sistema.</p>
                            </div>
                            <button
                                onClick={() => setShowEntryForm(false)}
                                className="p-3 hover:bg-white rounded-full text-slate-300 hover:text-slate-800 transition-all shadow-sm border border-transparent hover:border-slate-100"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-8 space-y-6 overflow-y-auto max-h-[70vh]">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2 text-left">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Fluxo Financeiro</label>
                                    <select className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3 text-xs font-bold text-slate-700 outline-none focus:bg-white focus:border-slate-300 transition-all appearance-none cursor-pointer">
                                        <option>Receita (Entrada)</option>
                                        <option>Custo (Saída)</option>
                                        <option>Despesa (Saída)</option>
                                    </select>
                                </div>
                                <div className="space-y-2 text-left">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Origem do Lançamento</label>
                                    <select className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3 text-xs font-bold text-slate-700 outline-none focus:bg-white focus:border-slate-300 transition-all appearance-none cursor-pointer">
                                        <option>Manual</option>
                                        <option>Vendas</option>
                                        <option>Serviços</option>
                                        <option>Compras</option>
                                        <option>Fixo</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2 text-left">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Cliente / Fornecedor</label>
                                    <input type="text" placeholder="Nome ou Razão Social" className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3 text-xs font-bold text-slate-700 outline-none focus:bg-white focus:border-slate-300 transition-all font-medium" />
                                </div>
                                <div className="space-y-2 text-left">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">CNPJ / CPF</label>
                                    <input type="text" placeholder="00.000.000/0000-00" className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3 text-[11px] font-bold text-slate-700 outline-none focus:bg-white focus:border-slate-300 transition-all font-mono" />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2 text-left">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Natureza da Operação</label>
                                    <input type="text" placeholder="Ex: Venda de Mercadorias" className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3 text-xs font-bold text-slate-700 outline-none focus:bg-white focus:border-slate-300 transition-all font-medium" />
                                </div>
                                <div className="space-y-2 text-left">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Data de Vencimento</label>
                                    <input type="date" className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3 text-xs font-bold text-slate-700 outline-none focus:bg-white focus:border-slate-300 transition-all" />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2 text-left">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Parcelamento</label>
                                    <select className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3 text-xs font-bold text-slate-700 outline-none focus:bg-white focus:border-slate-300 transition-all appearance-none cursor-pointer">
                                        <option>À Vista</option>
                                        <option>2 Parcelas</option>
                                        <option>3 Parcelas</option>
                                        <option>4 Parcelas</option>
                                        <option>5 Parcelas</option>
                                        <option>6 Parcelas</option>
                                        <option>12 Parcelas</option>
                                    </select>
                                </div>
                                <div className="space-y-2 text-left">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Valor Pago (Entrada)</label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 font-black text-sm">R$</span>
                                        <input type="number" placeholder="0,00" className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-12 pr-5 py-3 text-sm font-black text-slate-800 outline-none focus:bg-white focus:border-slate-300 transition-all" />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2 text-left">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Descrição Adicional</label>
                                <input type="text" placeholder="Ex: Referente à fatura de Janeiro..." className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3 text-xs font-bold text-slate-700 outline-none focus:bg-white focus:border-slate-300 transition-all font-medium" />
                            </div>

                            <div className="space-y-2 text-left">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Valor Total do Título (R$)</label>
                                <div className="relative">
                                    <span className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 font-black text-lg">R$</span>
                                    <input type="number" placeholder="0,00" className="w-full bg-slate-50 border border-slate-100 rounded-3xl pl-16 pr-6 py-5 text-2xl font-black text-slate-800 outline-none focus:bg-white focus:border-slate-300 transition-all" />
                                </div>
                            </div>
                        </div>

                        <div className="p-8 bg-slate-50/50 flex gap-4">
                            <button
                                onClick={() => setShowEntryForm(false)}
                                className="flex-1 py-4 bg-white border border-slate-100 rounded-2xl text-[10px] font-black text-slate-400 hover:text-slate-800 transition-all uppercase tracking-widest shadow-sm"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={() => {
                                    alert('Lançamento financeiro registrado com sucesso!');
                                    setShowEntryForm(false);
                                }}
                                className="flex-1 py-4 bg-slate-800 hover:bg-slate-900 text-white rounded-2xl text-[10px] font-black shadow-xl shadow-slate-200 transition-all active:scale-95 uppercase tracking-widest"
                            >
                                Salvar Lançamento
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Financial;
