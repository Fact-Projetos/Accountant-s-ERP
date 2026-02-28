import React, { useState } from 'react';
import {
    Briefcase, Download, Upload, FileCheck, FileText,
    Search, Plus, Trash2, Calendar, User, CreditCard,
    DollarSign, FileSpreadsheet, Loader2, CheckCircle2
} from 'lucide-react';

interface ServiceItem {
    id: string;
    date: string;
    name: string;
    document: string;
    value: number;
}

const Services: React.FC = () => {
    const [services, setServices] = useState<ServiceItem[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isExporting, setIsExporting] = useState(false);
    const [isImporting, setIsImporting] = useState(false);

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
    };

    const downloadTemplate = () => {
        const headers = 'Data;Nome/Razão Social;CPF/CNPJ;Valor\n';
        const example = '11/02/2026;Cliente Exemplo Ltda;00.000.000/0001-00;1500,00';
        const csvContent = headers + example;

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', 'modelo_importacao_servicos.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsImporting(true);
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const text = e.target?.result as string;
                const lines = text.split('\n');
                const newServices: ServiceItem[] = [];

                // Skip header
                for (let i = 1; i < lines.length; i++) {
                    if (!lines[i].trim()) continue;

                    const columns = lines[i].split(';');
                    if (columns.length >= 4) {
                        newServices.push({
                            id: Math.random().toString(36).substr(2, 9),
                            date: columns[0].trim(),
                            name: columns[1].trim(),
                            document: columns[2].trim(),
                            value: parseFloat(columns[3].replace(',', '.')) || 0
                        });
                    }
                }

                setServices(prev => [...prev, ...newServices]);
                alert(`${newServices.length} serviços importados com sucesso!`);
            } catch (error) {
                console.error('Erro ao processar arquivo:', error);
                alert('Erro ao processar o arquivo. Verifique se o formato está correto.');
            } finally {
                setIsImporting(false);
                if (event.target) event.target.value = '';
            }
        };
        reader.readAsText(file);
    };

    const generateLotePrefeitura = () => {
        if (services.length === 0) {
            alert('Não há serviços para gerar o lote.');
            return;
        }

        setIsExporting(true);
        // Simulating batch generation
        setTimeout(() => {
            setIsExporting(false);
            alert('Lote de exportação gerado com sucesso para a prefeitura!');
        }, 1500);
    };

    const deleteService = (id: string) => {
        setServices(services.filter(s => s.id !== id));
    };

    const filteredServices = services.filter(s =>
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.document.includes(searchTerm)
    );

    return (
        <div className="space-y-6 animate-fade-in pb-10">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-serif font-bold text-slate-800">Serviços</h2>
                    <p className="text-slate-500 text-sm">Gere lotes para importação na prefeitura através de planilhas.</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={downloadTemplate}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold bg-[#f8fafc] border border-slate-200 text-slate-600 hover:bg-slate-100 shadow-sm transition-all active:scale-95 text-xs"
                    >
                        <Download className="w-4 h-4" /> Baixar Planilha Padrão
                    </button>

                    <label className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md transition-all active:scale-95 text-xs cursor-pointer">
                        {isImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                        Importar Planilha
                        <input type="file" className="hidden" accept=".csv" onChange={handleFileUpload} disabled={isImporting} />
                    </label>

                    <button
                        onClick={generateLotePrefeitura}
                        disabled={services.length === 0 || isExporting}
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold shadow-md transition-all active:scale-95 text-xs ${services.length > 0 && !isExporting
                                ? 'bg-slate-800 hover:bg-slate-900 text-white shadow-slate-200'
                                : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                            }`}
                    >
                        {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileCheck className="w-4 h-4" />}
                        Gerar Lote Prefeitura
                    </button>
                </div>
            </div>

            {/* Main Stats Banner */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
                        <FileText className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Total de Serviços</p>
                        <p className="text-xl font-black text-slate-800">{services.length}</p>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600">
                        <DollarSign className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Valor Total</p>
                        <p className="text-xl font-black text-slate-800">
                            {formatCurrency(services.reduce((acc, curr) => acc + curr.value, 0))}
                        </p>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600">
                        <Calendar className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Data do Lote</p>
                        <p className="text-xl font-black text-slate-800">{new Date().toLocaleDateString('pt-BR')}</p>
                    </div>
                </div>
            </div>

            {/* Search and Filters */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Pesquisar por nome ou CPF/CNPJ..."
                        className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:border-slate-300 outline-none transition-all font-medium text-slate-600 placeholder:text-slate-400"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Services Table */}
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                {services.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="bg-slate-50/50 text-[10px] uppercase font-black text-slate-400 border-b border-slate-100 text-left">
                                    <th className="px-6 py-4">Data</th>
                                    <th className="px-6 py-4">Nome / Razão Social</th>
                                    <th className="px-6 py-4">CPF / CNPJ</th>
                                    <th className="px-6 py-4 text-right">Valor do Serviço</th>
                                    <th className="px-6 py-4 text-center">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 text-xs text-slate-600">
                                {filteredServices.map(service => (
                                    <tr key={service.id} className="hover:bg-slate-50/30 transition-colors group">
                                        <td className="px-6 py-4 font-bold text-slate-500">{service.date}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400 group-hover:bg-white group-hover:text-slate-600 transition-colors">
                                                    <User className="w-4 h-4" />
                                                </div>
                                                <span className="font-black text-slate-700 uppercase tracking-tight">{service.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 font-mono font-medium text-slate-500">{service.document}</td>
                                        <td className="px-6 py-4 text-right">
                                            <span className="font-black text-slate-800 text-sm">{formatCurrency(service.value)}</span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <button
                                                onClick={() => deleteService(service.id)}
                                                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="p-20 flex flex-col items-center justify-center text-center">
                        <div className="w-20 h-20 bg-slate-50 rounded-[2.5rem] flex items-center justify-center text-slate-200 mb-6">
                            <FileSpreadsheet className="w-10 h-10" />
                        </div>
                        <h3 className="text-xl font-serif font-bold text-slate-400">Nenhum serviço importado</h3>
                        <p className="text-slate-400 text-sm mt-2 max-w-xs">
                            Baixe o modelo de planilha e importe os dados para começar a gerar o seu lote.
                        </p>
                    </div>
                )}
            </div>

            {services.length > 0 && (
                <div className="bg-slate-800 rounded-3xl p-8 text-white relative overflow-hidden group shadow-2xl shadow-slate-200">
                    <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white/5 rounded-full blur-3xl group-hover:bg-white/10 transition-all duration-500"></div>
                    <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="space-y-1">
                            <h4 className="text-lg font-bold flex items-center gap-2">
                                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                                Deseja gerar o lote agora?
                            </h4>
                            <p className="text-slate-400 text-xs">Todos os {services.length} itens listados acima serão incluídos no lote de prefeitura.</p>
                        </div>
                        <button
                            onClick={generateLotePrefeitura}
                            className="bg-white text-slate-900 px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg hover:bg-slate-50 transition-all active:scale-95 whitespace-nowrap"
                        >
                            Confirmar Geração de Lote
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Services;
