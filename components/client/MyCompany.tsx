import React, { useEffect, useState } from 'react';
import { Building2, TrendingUp, DollarSign, FileText, Newspaper } from 'lucide-react';
import { supabase } from '../../services/supabase';
import { Client } from '../../types';

interface MyCompanyProps {
  companyId?: string | null;
}

const MyCompany: React.FC<MyCompanyProps> = ({ companyId }) => {
  const [company, setCompany] = useState<Client | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchCompanyData = async () => {
      if (!companyId) return;
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('companies')
          .select('*')
          .eq('id', companyId)
          .single();

        if (error) throw error;
        if (data) setCompany(data as any);
      } catch (error) {
        console.error('Error fetching company:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchCompanyData();
  }, [companyId]);

  const news = [
    { id: 1, title: 'Tendências do Varejo 2025', category: 'Mercado' },
    { id: 2, title: 'Novas linhas de crédito BNDES', category: 'Finanças' },
    { id: 3, title: 'Como otimizar seu estoque', category: 'Gestão' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-serif font-bold text-slate-800">Minha Empresa</h2>
        <p className="text-slate-500">Visão geral do seu negócio e resultados.</p>
      </div>

      {/* Company Profile Card */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-100 flex items-start gap-6 relative overflow-hidden">
        {isLoading && (
          <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] flex items-center justify-center z-10 transition-all">
            <div className="flex flex-col items-center gap-2">
              <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Carregando Dados...</span>
            </div>
          </div>
        )}
        <div className="w-16 h-16 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400">
          <Building2 className="w-8 h-8" />
        </div>
        <div className="flex-1">
          <h3 className="text-xl font-bold text-slate-800">{company?.name || 'Carregando...'}</h3>
          <p className="text-slate-500 text-sm">CNPJ: {company?.cnpj || '-'}</p>
          <div className="flex gap-4 mt-4">
            <div className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded border border-green-200">{company?.taxRegime || 'Não informado'}</div>
            <div className="text-xs bg-gold-50 text-gold-700 px-2 py-1 rounded border border-gold-200">Certificado: Ativo</div>
          </div>
        </div>
      </div>

      {/* Financial Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-100">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><FileText className="w-5 h-5" /></div>
            <h4 className="font-semibold text-slate-700">Notas Emitidas (Mês)</h4>
          </div>
          <div className="text-3xl font-bold text-slate-800">142</div>
          <p className="text-xs text-green-600 flex items-center mt-1"><TrendingUp className="w-3 h-3 mr-1" /> +12% vs mês anterior</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-100">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-green-50 text-green-600 rounded-lg"><DollarSign className="w-5 h-5" /></div>
            <h4 className="font-semibold text-slate-700">Faturamento (Mês)</h4>
          </div>
          <div className="text-3xl font-bold text-slate-800">R$ 48.250,00</div>
          <p className="text-xs text-green-600 flex items-center mt-1"><TrendingUp className="w-3 h-3 mr-1" /> +5% meta atingida</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-100">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-purple-50 text-purple-600 rounded-lg"><Newspaper className="w-5 h-5" /></div>
            <h4 className="font-semibold text-slate-700">Notícias Empreendedoras</h4>
          </div>
          <div className="space-y-3">
            {news.map(n => (
              <div key={n.id} className="text-sm border-b border-slate-50 last:border-0 pb-2 last:pb-0 hover:text-gold-600 cursor-pointer transition-colors">
                <span className="text-[10px] uppercase font-bold text-slate-400 mr-2">{n.category}</span>
                {n.title}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Chart Placeholder */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-100 h-64 flex flex-col justify-center items-center text-slate-400 relative overflow-hidden">
        <h4 className="absolute top-6 left-6 font-semibold text-slate-700">Evolução de Vendas (Semestral)</h4>
        <div className="flex items-end gap-4 h-32 mt-8">
          {[40, 60, 45, 70, 55, 80].map((h, i) => (
            <div key={i} className="w-12 bg-gold-200 hover:bg-gold-400 transition-all rounded-t-sm" style={{ height: `${h}%` }}></div>
          ))}
        </div>
        <div className="w-full h-px bg-slate-200 mt-2"></div>
      </div>
    </div>
  );
};

export default MyCompany;