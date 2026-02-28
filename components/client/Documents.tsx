import React, { useState, useEffect } from 'react';
import {
    FileText, Upload, Search, Filter, Download, Trash2,
    FileCheck, FileClock, Shield, FileSignature,
    PieChart, BarChart3, Briefcase, Plus, X, Loader2
} from 'lucide-react';
import { supabase } from '../../services/supabase';
import { Client } from '../../types';

interface Document {
    id: string;
    name: string;
    category: 'Contrato' | 'Declaração' | 'Balanço' | 'Balancete' | 'DRE' | 'Outros';
    date: string;
    size: string;
    type: string;
    status: 'Processado' | 'Pendente';
    company_id?: string;
    company_name?: string;
}

interface DocumentsProps {
    companyIdOverride?: string | null;
    roleOverride?: 'Contador' | 'Cliente';
}

const Documents: React.FC<DocumentsProps> = ({ companyIdOverride, roleOverride }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('Todos');
    const [selectedCompanyId, setSelectedCompanyId] = useState<string>('Todos');
    const [isUploading, setIsUploading] = useState(false);
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [userRole, setUserRole] = useState<'Contador' | 'Cliente'>('Cliente');
    const [userCompanyId, setUserCompanyId] = useState<string | null>(null);
    const [companies, setCompanies] = useState<Partial<Client>[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [documents, setDocuments] = useState<Document[]>([]);

    const categories = ['Todos', 'Contrato', 'Declaração', 'Balanço', 'Balancete', 'DRE', 'Outros'];

    useEffect(() => {
        const getInitialData = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                const role = roleOverride || (session.user.user_metadata?.role || 'Cliente');
                setUserRole(role);

                // Get profile to find company_id
                let companyId = companyIdOverride;
                if (!companyId) {
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('company_id')
                        .eq('id', session.user.id)
                        .single();
                    if (profile) companyId = profile.company_id;
                }

                setUserCompanyId(companyId);

                if (role === 'Contador') {
                    const { data: cos } = await supabase.from('companies').select('id, name').order('name');
                    if (cos) setCompanies(cos as any);
                }
            }
            fetchDocuments();
        };
        getInitialData();
    }, [selectedCompanyId, selectedCategory, companyIdOverride, roleOverride]);

    const fetchDocuments = async () => {
        setIsLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            let query = supabase
                .from('documents')
                .select('*, companies(name)')
                .order('created_at', { ascending: false });

            // Apply global Filters
            if (selectedCategory !== 'Todos') {
                query = query.eq('category', selectedCategory);
            }

            // Apply Role Filters
            const activeRole = roleOverride || (session.user.user_metadata?.role || 'Cliente');
            if (activeRole === 'Contador') {
                if (selectedCompanyId !== 'Todos') {
                    query = query.eq('company_id', selectedCompanyId);
                }
            } else {
                // If it's a client or impersonated, use the active company ID
                const activeCompanyId = companyIdOverride || userCompanyId;

                if (activeCompanyId) {
                    query = query.eq('company_id', activeCompanyId);
                }
            }

            const { data, error } = await query;
            if (error) throw error;

            if (data) {
                setDocuments(data.map(doc => ({
                    id: doc.id,
                    name: doc.name,
                    category: doc.category as any,
                    date: new Date(doc.created_at).toLocaleDateString('pt-BR'),
                    size: doc.size || 'N/A',
                    type: doc.type || 'N/A',
                    status: doc.status as any,
                    company_name: (doc.companies as any)?.name
                })));
            }
        } catch (error) {
            console.error('Error fetching documents:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const filteredDocuments = documents.filter(doc => {
        const matchesSearch = doc.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = selectedCategory === 'Todos' || doc.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    const handleUpload = async () => {
        setIsUploading(true);
        try {
            const { error } = await supabase.from('documents').insert([{
                name: 'Novo Documento ' + new Date().toLocaleDateString() + '.pdf',
                category: (selectedCategory !== 'Todos' ? selectedCategory : 'Outros') as any,
                size: '512 KB',
                type: 'PDF',
                status: 'Pendente',
                company_id: userRole === 'Contador' && selectedCompanyId !== 'Todos' ? selectedCompanyId : userCompanyId
            }]);
            if (error) throw error;
            fetchDocuments();
            setShowUploadModal(false);
        } catch (error: any) {
            alert("Erro ao enviar documento: " + error.message);
        } finally {
            setIsUploading(false);
        }
    };

    const deleteDocument = async (id: string) => {
        if (window.confirm('Deseja realmente excluir este documento?')) {
            try {
                const { error } = await supabase.from('documents').delete().eq('id', id);
                if (error) throw error;
                fetchDocuments();
            } catch (error: any) {
                alert("Erro ao excluir: " + error.message);
            }
        }
    };

    const getCategoryIcon = (category: string) => {
        switch (category) {
            case 'Contrato': return <FileSignature className="w-5 h-5 text-indigo-500" />;
            case 'Balanço': return <PieChart className="w-5 h-5 text-emerald-500" />;
            case 'Balancete': return <BarChart3 className="w-5 h-5 text-blue-500" />;
            case 'DRE': return <Shield className="w-5 h-5 text-amber-500" />;
            case 'Declaração': return <FileCheck className="w-5 h-5 text-rose-500" />;
            default: return <FileText className="w-5 h-5 text-slate-400" />;
        }
    };

    return (
        <div className="space-y-6 animate-fade-in pb-10">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-serif font-bold text-slate-800">
                        {userRole === 'Contador' ? 'Gestão de Documentos' : 'Documentos da Empresa'}
                    </h2>
                    <p className="text-slate-500 text-sm">
                        {userRole === 'Contador'
                            ? 'Gerencie os contratos e demonstrativos de todos os seus clientes.'
                            : 'Acesse seus contratos, balanços e documentos fiscais.'}
                    </p>
                </div>
                <button
                    onClick={() => setShowUploadModal(true)}
                    className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white px-5 py-2.5 rounded-xl font-bold shadow-md transition-all active:scale-95 text-xs"
                >
                    <Upload className="w-4 h-4" /> Upload de Documento
                </button>
            </div>

            {/* Filters & Search */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 space-y-4">
                <div className="flex flex-wrap gap-4 items-center">
                    <div className="relative flex-1 min-w-[200px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Pesquisar documento..."
                            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:border-slate-400 outline-none transition-all font-medium text-slate-600"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    {/* Accountant-specific: Company Filter */}
                    {userRole === 'Contador' && (
                        <div className="min-w-[200px]">
                            <select
                                className="w-full bg-slate-50 border border-slate-200 text-slate-600 py-2 px-4 rounded-xl text-sm font-medium focus:border-slate-400 outline-none transition-all"
                                value={selectedCompanyId}
                                onChange={(e) => setSelectedCompanyId(e.target.value)}
                            >
                                <option value="Todos">Todos os Clientes</option>
                                {companies.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div className="flex gap-2 bg-slate-50 p-1 rounded-xl border border-slate-200 overflow-x-auto no-scrollbar">
                        {categories.map(cat => (
                            <button
                                key={cat}
                                onClick={() => setSelectedCategory(cat)}
                                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${selectedCategory === cat
                                    ? 'bg-white shadow text-slate-800'
                                    : 'text-slate-400 hover:text-slate-600'
                                    }`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Documents Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {isLoading ? (
                    <div className="col-span-full py-20 flex flex-col items-center justify-center gap-4 text-slate-400">
                        <Loader2 className="w-10 h-10 animate-spin text-slate-800" />
                        <p className="text-sm font-bold uppercase tracking-widest animate-pulse">Consultando Arquivos...</p>
                    </div>
                ) : filteredDocuments.map(doc => (
                    <div key={doc.id} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-all group relative overflow-hidden">
                        {/* Status indicator */}
                        <div className={`absolute top-0 right-0 w-16 h-16 pointer-events-none opacity-10 -mr-6 -mt-6 rounded-full ${doc.status === 'Processado' ? 'bg-emerald-500' : 'bg-amber-500'}`}></div>

                        <div className="flex items-start gap-4">
                            <div className="p-3 bg-slate-50 rounded-xl group-hover:bg-slate-100 transition-colors">
                                {getCategoryIcon(doc.category)}
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="font-bold text-slate-800 text-sm truncate" title={doc.name}>{doc.name}</h3>
                                {userRole === 'Contador' && doc.company_name && (
                                    <p className="text-[10px] font-medium text-slate-500 truncate mb-1 italic">
                                        Cliente: {doc.company_name}
                                    </p>
                                )}
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{doc.category}</span>
                                    <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{doc.size}</span>
                                </div>
                                <div className="flex items-center gap-3 mt-4">
                                    <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500">
                                        <FileClock className="w-3 h-3 text-slate-400" />
                                        {doc.date}
                                    </div>
                                    <div className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase ${doc.status === 'Processado' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                                        }`}>
                                        {doc.status}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="mt-6 flex items-center gap-2 pt-4 border-t border-slate-50">
                            <button className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-600 text-[10px] font-black uppercase transition-all">
                                <Download className="w-3.5 h-3.5" /> Download
                            </button>
                            <button
                                onClick={() => deleteDocument(doc.id)}
                                className="p-2 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-500 transition-all"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                ))}

                {filteredDocuments.length === 0 && (
                    <div className="col-span-full py-20 bg-white rounded-3xl border border-dashed border-slate-200 flex flex-col items-center justify-center text-center">
                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                            <Search className="w-8 h-8 text-slate-300" />
                        </div>
                        <h4 className="text-slate-800 font-bold">Nenhum documento encontrado</h4>
                        <p className="text-slate-400 text-xs mt-1">Tente ajustar seus filtros ou pesquise pelo nome do arquivo.</p>
                    </div>
                )}
            </div>

            {/* Upload Modal (Mock) */}
            {showUploadModal && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in duration-200">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                            <h3 className="text-lg font-serif font-bold text-slate-800">Novo Documento</h3>
                            <button onClick={() => setShowUploadModal(false)} className="p-2 hover:bg-slate-50 rounded-xl text-slate-400 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-8">
                            <div
                                className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center transition-all ${isUploading ? 'border-blue-200 bg-blue-50/10' : 'border-slate-200 bg-slate-50/30'
                                    }`}
                            >
                                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm mb-4 border border-slate-100">
                                    <Upload className="w-6 h-6 text-slate-800" />
                                </div>
                                <p className="text-sm font-bold text-slate-700">Arraste ou clique para selecionar</p>
                                <p className="text-[10px] text-slate-400 font-bold uppercase mt-1 tracking-widest">PDF, ZIP, JPG (MÁX. 10MB)</p>
                            </div>

                            <div className="mt-6 space-y-4">
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 px-1">Selecione a Categoria</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {categories.filter(c => c !== 'Todos').map(cat => (
                                            <button
                                                key={cat}
                                                onClick={() => setSelectedCategory(cat)}
                                                className={`py-2 px-3 rounded-xl text-[10px] font-black uppercase transition-all border ${selectedCategory === cat
                                                    ? 'bg-slate-800 text-white border-slate-800'
                                                    : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400'
                                                    }`}
                                            >
                                                {cat}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={handleUpload}
                                disabled={isUploading}
                                className="w-full mt-8 flex items-center justify-center gap-2 bg-slate-800 text-white py-3.5 rounded-2xl font-bold shadow-lg shadow-slate-200 transition-all active:scale-[0.98] disabled:opacity-50"
                            >
                                {isUploading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Enviando...
                                    </>
                                ) : (
                                    'Confirmar e Enviar'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Documents;
