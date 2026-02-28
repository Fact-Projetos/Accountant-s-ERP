import React, { useEffect, useState } from 'react';
import { Download, FileText, ExternalLink, RefreshCw, Landmark } from 'lucide-react';
import { fetchAccountingNews } from '../services/geminiService';
import { NewsItem } from '../types';

const Dashboard: React.FC = () => {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNews();
  }, []);

  const loadNews = async () => {
    setLoading(true);
    const data = await fetchAccountingNews();
    setNews(data);
    setLoading(false);
  };

  const downloads = [
    { name: 'Sicalc (DARF)', url: '#', desc: 'Cálculo e impressão de DARF', icon: <Landmark className="w-5 h-5" /> },
    { name: 'Receitanet', url: '#', desc: 'Validação e transmissão', icon: <FileText className="w-5 h-5" /> },
    { name: 'Gerador de DAS', url: '#', desc: 'Acesso ao Simples Nacional', icon: <ExternalLink className="w-5 h-5" /> },
    { name: 'Conectividade Social', url: '#', desc: 'FGTS e obrigações', icon: <Download className="w-5 h-5" /> },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-serif font-bold text-slate-800">Painel do Contador</h2>
        <p className="text-slate-500">Bem-vindo, Rodrigo. Confira as últimas atualizações.</p>
      </div>

      {/* Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* News Section */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-700 border-l-4 border-slate-800 pl-3">
              Atualizações Contábeis
            </h3>
            <button
              onClick={loadNews}
              disabled={loading}
              className="p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="grid gap-4">
            {loading ? (
              [1, 2, 3].map((i) => (
                <div key={i} className="bg-white p-6 rounded-lg shadow-sm border border-slate-100 animate-pulse">
                  <div className="h-4 bg-slate-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-slate-100 rounded w-full mb-2"></div>
                  <div className="h-3 bg-slate-100 rounded w-1/2"></div>
                </div>
              ))
            ) : (
              news.map((item) => (
                <div key={item.id} className="bg-white p-6 rounded-lg shadow-sm border border-slate-100 hover:shadow-md transition-shadow group">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[9px] font-black text-slate-600 bg-slate-100 px-2 py-1 rounded uppercase tracking-widest border border-slate-200">
                      {item.category}
                    </span>
                    <span className="text-[10px] text-slate-400 font-bold">{item.date}</span>
                  </div>
                  <h4 className="text-lg font-serif font-bold text-slate-800 group-hover:text-slate-600 transition-colors mb-2">
                    {item.title}
                  </h4>
                  <p className="text-slate-600 text-sm leading-relaxed">
                    {item.summary}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quick Downloads Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-slate-700 border-l-4 border-slate-800 pl-3">
            Ferramentas Governamentais
          </h3>
          <div className="bg-white rounded-lg shadow-sm border border-slate-100 overflow-hidden">
            {downloads.map((tool, idx) => (
              <a
                key={idx}
                href={tool.url}
                onClick={(e) => e.preventDefault()}
                className="flex items-center p-4 hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-0 group"
              >
                <div className="p-2 bg-slate-50 text-slate-400 rounded-lg group-hover:bg-white group-hover:text-slate-800 transition-colors">
                  {tool.icon}
                </div>
                <div className="ml-4">
                  <p className="text-sm font-semibold text-slate-800">{tool.name}</p>
                  <p className="text-xs text-slate-500">{tool.desc}</p>
                </div>
              </a>
            ))}
          </div>

          {/* Quick Stats or Info */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden group">
            <div className="relative z-10">
              <h4 className="font-serif text-2xl font-bold mb-1 text-white">Fact Contábil</h4>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-4 font-sans">Seu sistema está atualizado. <span className="text-white">v2.4.0</span></p>
              <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                Manutenção: 15/10/2025
              </div>
            </div>
            <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-slate-700/30 rounded-full blur-2xl group-hover:bg-slate-600/40 transition-all duration-500"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
