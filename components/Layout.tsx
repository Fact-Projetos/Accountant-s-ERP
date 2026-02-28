import React, { useState } from 'react';
import {
  Home, Users, FileBarChart2, LogOut, Link as LinkIcon, Building,
  ShoppingCart, Briefcase, Package, Users2, Import, Settings2,
  FileWarning, ChevronLeft, ChevronRight, Maximize2, Minimize2,
  FileText, Wallet, Bot, ClipboardCheck
} from 'lucide-react';
import { ViewState } from '../types';

interface LayoutProps {
  currentView: ViewState;
  onNavigate: (view: ViewState) => void;
  onLogout: () => void;
  userRole: 'Contador' | 'Cliente';
  children: React.ReactNode;
  visibleViews?: ViewState[];
  isImpersonating?: boolean;
  onExitImpersonation?: () => void;
}

const Layout: React.FC<LayoutProps> = ({ currentView, onNavigate, onLogout, userRole, children, visibleViews, isImpersonating, onExitImpersonation }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isCompact, setIsCompact] = useState(false);

  const accountantMenu = [
    { id: ViewState.HOME, label: 'Início', icon: <Home className="w-5 h-5" /> },
    { id: ViewState.CLIENTS, label: 'Clientes', icon: <Users className="w-5 h-5" /> },
    { id: ViewState.MOVEMENTS, label: 'Movimentos', icon: <FileBarChart2 className="w-5 h-5" /> },
    { id: ViewState.TAX_ASSESSMENT, label: 'Controle de Apurações', icon: <ClipboardCheck className="w-5 h-5" /> },
    { id: ViewState.LINKS_NFSE, label: 'Automação NFS-e', icon: <Bot className="w-5 h-5" /> },
    { id: ViewState.DOCUMENTS, label: 'Documentos', icon: <FileText className="w-5 h-5" /> },
  ];

  const clientMenu = [
    { id: ViewState.MY_COMPANY, label: 'Minha Empresa', icon: <Building className="w-5 h-5" /> },
    { id: ViewState.SALES, label: 'Vendas', icon: <ShoppingCart className="w-5 h-5" /> },
    { id: ViewState.SERVICES, label: 'Serviços', icon: <Briefcase className="w-5 h-5" /> },
    { id: ViewState.INVENTORY, label: 'Estoque', icon: <Package className="w-5 h-5" /> },
    { id: ViewState.FINANCIAL, label: 'Financeiro', icon: <Wallet className="w-5 h-5" /> },
    { id: ViewState.PARTNERS, label: 'Clientes / Fornecedores', icon: <Users2 className="w-5 h-5" /> },
    { id: ViewState.IMPORT_NFE, label: 'NF-e Importação', icon: <Import className="w-5 h-5" /> },
    { id: ViewState.NFE_ACTIONS, label: 'Ações c/ NF-e', icon: <FileWarning className="w-5 h-5" /> },
    { id: ViewState.FISCAL_MATRIX, label: 'Matriz Fiscal', icon: <Settings2 className="w-5 h-5" /> },
    { id: ViewState.DOCUMENTS, label: 'Documentos', icon: <FileText className="w-5 h-5" /> },
  ];

  const menuItems = userRole === 'Contador'
    ? accountantMenu
    : clientMenu.filter(item => !visibleViews || visibleViews.includes(item.id as ViewState));

  return (
    <div className={`flex h-screen bg-slate-50 transition-all duration-300 ${isCompact ? 'scale-95 origin-top-left w-[105.26%] h-[105.26%]' : ''}`}>
      {/* Sidebar */}
      <aside className={`transition-all duration-300 bg-white border-r border-slate-200 flex flex-col fixed h-full z-20 ${isCollapsed ? 'w-20' : 'w-64'}`}>
        {/* Logo */}
        <div className={`h-20 flex items-center border-b border-slate-100 transition-all duration-300 relative ${isCollapsed ? 'px-4 justify-center' : 'px-8'}`}>
          {!isCollapsed && (
            <div className="flex flex-col overflow-hidden whitespace-nowrap">
              <h1 className="font-serif text-2xl font-bold text-slate-800">Fact</h1>
              <span className="text-xs text-slate-400 font-bold tracking-widest uppercase">ERP Contábil</span>
            </div>
          )}
          {isCollapsed && <Building className="w-8 h-8 text-slate-800" />}

          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="absolute -right-3 top-1/2 -translate-y-1/2 bg-white border border-slate-200 rounded-full p-1 text-slate-400 hover:text-slate-800 shadow-sm transition-colors z-30"
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Navigation */}
        <nav className={`flex-1 py-6 space-y-2 overflow-y-auto custom-scrollbar ${isCollapsed ? 'px-2' : 'px-4'}`}>
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id as ViewState)}
              title={isCollapsed ? item.label : ''}
              className={`w-full flex items-center rounded-lg text-sm font-bold transition-all duration-200 group relative ${currentView === item.id
                ? 'bg-slate-100 text-slate-900 shadow-sm border border-slate-200'
                : 'text-slate-400 hover:bg-slate-50 hover:text-slate-800 border border-transparent'
                } ${isCollapsed ? 'justify-center py-3 px-0' : 'gap-3 px-4 py-3'}`}
            >
              <span className={currentView === item.id ? 'text-slate-800' : 'text-slate-400 group-hover:text-slate-600'}>
                {item.icon}
              </span>
              {!isCollapsed && <span className="truncate">{item.label}</span>}
              {isCollapsed && currentView === item.id && (
                <div className="absolute left-0 w-1 h-6 bg-slate-800 rounded-r-full"></div>
              )}
            </button>
          ))}
        </nav>

        {/* Compact Mode Toggle */}
        <div className={`px-4 py-2 ${isCollapsed ? 'flex justify-center' : ''}`}>
          <button
            onClick={() => setIsCompact(!isCompact)}
            className={`flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider transition-colors ${isCompact ? 'text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}
            title={isCompact ? "Modo Normal" : "Reduzir Escala"}
          >
            {isCompact ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            {!isCollapsed && (isCompact ? 'Escala: 95%' : 'Reduzir Escala')}
          </button>
        </div>

        {/* User Footer */}
        <div className="p-4 border-t border-slate-100">
          <div className={`flex items-center gap-3 mb-4 transition-all duration-300 ${isCollapsed ? 'px-0 justify-center' : 'px-4'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0 bg-slate-800`}>
              {userRole === 'Contador' ? 'R' : 'T'}
            </div>
            {!isCollapsed && (
              <div className="flex flex-col overflow-hidden">
                <span className="text-sm font-semibold text-slate-700 truncate">
                  {userRole === 'Contador' ? 'Rodrigo' : 'Teste'}
                </span>
                <span className="text-xs text-slate-400 truncate">
                  {userRole === 'Contador' ? 'Contador Master' : 'Gestão'}
                </span>
              </div>
            )}
          </div>
          {isImpersonating && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl">
              <p className="text-[10px] font-black text-amber-800 uppercase tracking-widest mb-2 text-center">Modo Visualização</p>
              <button
                onClick={onExitImpersonation}
                className="w-full py-2 bg-amber-800 text-white text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-amber-900 transition-all flex items-center justify-center gap-2"
              >
                <ChevronLeft className="w-3 h-3" />
                Painel Contador
              </button>
            </div>
          )}

          <button
            onClick={onLogout}
            className={`flex items-center justify-center gap-2 border border-slate-200 rounded-lg text-sm transition-colors ${isCollapsed ? 'w-10 h-10 p-0 mx-auto' : 'w-full px-4 py-2'
              } text-slate-600 hover:bg-red-50 hover:text-red-600 hover:border-red-200`}
            title="Sair"
          >
            <LogOut className="w-4 h-4" />
            {!isCollapsed && 'Sair'}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className={`flex-1 transition-all duration-300 p-8 overflow-y-auto ${isCollapsed ? 'ml-20' : 'ml-64'}`}>
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;