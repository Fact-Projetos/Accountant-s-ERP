import React, { useState } from 'react';
import {
  Ban, Search, Filter, MoreVertical, FileText,
  Download, Printer, RotateCcw, Calendar,
  Hash, AlertTriangle, Send, XCircle, FileInput
} from 'lucide-react';

interface InvoiceAction {
  id: number;
  date: string;
  nfe: string;
  operationNature: string;
  clientName: string;
  document: string;
  value: number;
  status: 'Emitida' | 'Cancelada' | 'Pendente' | 'Inutilizada';
  type: 'Venda' | 'Entrada' | 'Importação';
}

const NfeActions: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeMenu, setActiveMenu] = useState<number | null>(null);
  const [showInutilizacaoForm, setShowInutilizacaoForm] = useState(false);

  // States for Inutilization Range
  const [rangeStart, setRangeStart] = useState('');
  const [rangeEnd, setRangeEnd] = useState('');
  const [reason, setReason] = useState('');

  // Mock data showing a proper sequence
  const [invoices] = useState<InvoiceAction[]>([
    {
      id: 5,
      date: '05/02/2026',
      nfe: '000.001.240',
      operationNature: 'Venda de Mercadoria',
      clientName: 'João Silva Oliveira',
      document: '123.456.789-00',
      value: 1250.50,
      status: 'Emitida',
      type: 'Venda'
    },
    {
      id: 4,
      date: '04/02/2026',
      nfe: '000.001.239',
      operationNature: 'Compra para Comercialização',
      clientName: 'Distribuidora Tech Ltda',
      document: '12.345.678/0001-90',
      value: 3400.00,
      status: 'Emitida',
      type: 'Entrada'
    },
    {
      id: 3,
      date: '03/02/2026',
      nfe: '000.001.238',
      operationNature: 'Importação de Insumos',
      clientName: 'Global Logistics S.A.',
      document: '45.678.901/0001-22',
      value: 15780.90,
      status: 'Emitida',
      type: 'Importação'
    },
    {
      id: 2,
      date: '02/02/2026',
      nfe: '000.001.237',
      operationNature: 'Venda de Mercadoria',
      clientName: 'Supermercado Todo Dia',
      document: '00.111.222/0001-33',
      value: 890.00,
      status: 'Inutilizada',
      type: 'Venda'
    },
    {
      id: 1,
      date: '01/02/2026',
      nfe: '000.001.236',
      operationNature: 'Venda de Produção Própria',
      clientName: 'Maria Helena Santos',
      document: '987.654.321-11',
      value: 450.25,
      status: 'Cancelada',
      type: 'Venda'
    }
  ]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const handleHandleInutilizar = () => {
    if (!rangeStart || !rangeEnd) {
      alert("Por favor, preencha a faixa inicial e final para a inutilização.");
      return;
    }
    alert(`Solicitação de Inutilização enviada para a SEFAZ: Faixa ${rangeStart} até ${rangeEnd}`);
    setShowInutilizacaoForm(false);
  };

  // Close menu when clicking backdrop/outside could be added, but for now fixed the crash
  const toggleMenu = (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    setActiveMenu(activeMenu === id ? null : id);
  };

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-serif font-bold text-slate-800">Ações c/ NF-e</h2>
          <p className="text-slate-500 text-sm">Gerenciamento de inutilização e histórico sequencial de notas.</p>
        </div>
      </div>

      {/* Section: Inutilização */}
      <div className="grid grid-cols-1 gap-6">
        <div className={`bg-white rounded-xl shadow-sm border transition-all duration-300 ${showInutilizacaoForm ? 'border-orange-200 shadow-md' : 'border-slate-100'}`}>
          <div className="p-5 flex items-center justify-between cursor-pointer" onClick={() => setShowInutilizacaoForm(!showInutilizacaoForm)}>
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${showInutilizacaoForm ? 'bg-orange-100 text-orange-600' : 'bg-slate-100 text-slate-500'}`}>
                <Ban className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-700 text-sm">Inutilização de Numeração</h3>
                <p className="text-[11px] text-slate-500">Inutilize intervalos de numeração de notas que não foram utilizadas.</p>
              </div>
            </div>
            <button className={`text-xs font-bold px-4 py-1.5 rounded-md transition-all ${showInutilizacaoForm ? 'bg-slate-100 text-slate-600' : 'bg-orange-600 text-white shadow-sm hover:bg-orange-700'}`}>
              {showInutilizacaoForm ? 'Recolher' : 'Iniciar Processo'}
            </button>
          </div>

          {showInutilizacaoForm && (
            <div className="px-5 pb-5 pt-2 border-t border-slate-50 animate-in slide-in-from-top-2 duration-300">
              <div className="bg-orange-50/50 border border-orange-100 rounded-lg p-4 mb-4 flex gap-3">
                <AlertTriangle className="w-5 h-5 text-orange-500 shrink-0" />
                <p className="text-[11px] text-orange-800 leading-relaxed">
                  A inutilização de número de NF-e tem por objetivo permitir que o emissor comunique à SEFAZ, os números que não foram utilizados no período.
                </p>
              </div>

              <div className="grid grid-cols-12 gap-4 items-end">
                <div className="col-span-12 md:col-span-2">
                  <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">Série</label>
                  <input type="text" defaultValue="1" className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-md bg-slate-50 outline-none focus:border-orange-500" />
                </div>
                <div className="col-span-12 md:col-span-3">
                  <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider flex items-center gap-1">
                    <Hash className="w-3 h-3" /> Faixa Inicial
                  </label>
                  <input
                    type="number"
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-md outline-none focus:border-orange-500 font-mono"
                    placeholder="Ex: 1241"
                    value={rangeStart}
                    onChange={(e) => setRangeStart(e.target.value)}
                  />
                </div>
                <div className="col-span-12 md:col-span-3">
                  <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider flex items-center gap-1">
                    <Hash className="w-3 h-3" /> Faixa Final
                  </label>
                  <input
                    type="number"
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-md outline-none focus:border-orange-500 font-mono"
                    placeholder="Ex: 1250"
                    value={rangeEnd}
                    onChange={(e) => setRangeEnd(e.target.value)}
                  />
                </div>
                <div className="col-span-12 md:col-span-4 flex gap-2">
                  <button
                    onClick={handleHandleInutilizar}
                    className="flex-1 bg-orange-600 hover:bg-orange-700 text-white py-1.5 rounded-md text-xs font-bold shadow-md transition-all flex items-center justify-center gap-2"
                  >
                    <Send className="w-3.5 h-3.5" /> Enviar Inutilização
                  </button>
                </div>
                <div className="col-span-12">
                  <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">Justificativa (Mínimo 15 caracteres)</label>
                  <textarea
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-md outline-none focus:border-orange-500 min-h-[60px] resize-none"
                    placeholder="Explique o motivo da quebra de sequência..."
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                  ></textarea>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Invoice List (History) */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-visible relative">
        {/* List Headers / Search */}
        <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row items-center justify-between gap-4 bg-slate-50/30">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-gold-600" />
            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-widest">Histórico de Notas Fiscais</h3>
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-64 text-[11px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Pesquisar por nº de nota, cliente ou CNPJ..."
                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-xs focus:border-gold-500 outline-none bg-white shadow-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button className="p-2 border border-slate-200 rounded-lg bg-white text-slate-500 hover:text-gold-600 transition-colors shadow-sm">
              <Filter className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="overflow-visible">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-50/50 text-[10px] uppercase font-bold text-slate-400 border-b border-slate-100">
                <th className="px-4 py-4 text-left">Data de Registro</th>
                <th className="px-4 py-4 text-left">Numeração (NF-e)</th>
                <th className="px-4 py-4 text-left">Natureza da Operação</th>
                <th className="px-4 py-4 text-left">Razão Social / Nome</th>
                <th className="px-4 py-4 text-left">CNPJ/CPF</th>
                <th className="px-4 py-4 text-right">Valor Total</th>
                <th className="px-4 py-4 text-center">Situação</th>
                <th className="px-4 py-4 text-center">Opções</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {invoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-slate-50/30 transition-colors">
                  <td className="px-4 py-3.5 text-xs text-slate-500">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 opacity-50" />
                      {inv.date}
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-xs font-mono font-bold text-slate-800">
                    {inv.nfe}
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex flex-col">
                      <span className="text-xs text-slate-700 font-medium">{inv.operationNature}</span>
                      <span className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">{inv.type}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-xs text-slate-700 font-medium truncate max-w-[200px]" title={inv.clientName}>
                    {inv.clientName}
                  </td>
                  <td className="px-4 py-3.5 text-xs font-mono text-slate-400 whitespace-nowrap">{inv.document}</td>
                  <td className="px-4 py-3.5 text-xs text-right font-bold text-slate-700">{formatCurrency(inv.value)}</td>
                  <td className="px-4 py-3.5 text-center">
                    <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold border ${inv.status === 'Emitida' ? 'bg-green-50 text-green-700 border-green-100' :
                        inv.status === 'Cancelada' ? 'bg-red-50 text-red-700 border-red-100' :
                          inv.status === 'Inutilizada' ? 'bg-slate-50 text-slate-500 border-slate-200' :
                            'bg-amber-50 text-amber-700 border-amber-100'
                      }`}>
                      {inv.status}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-center relative overflow-visible">
                    <button
                      onClick={(e) => toggleMenu(e, inv.id)}
                      className="p-1.5 hover:bg-slate-100 rounded-full transition-colors text-slate-300 hover:text-slate-600 mx-auto block"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>

                    {activeMenu === inv.id && (
                      <div className="absolute right-full mr-2 top-0 bg-white border border-slate-200 rounded-lg shadow-xl py-2 z-[999] min-w-[160px] animate-in fade-in slide-in-from-right-2">
                        <button className="w-full text-left px-4 py-2 text-[10px] font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-2">
                          <Download className="w-3.5 h-3.5" /> XML do Documento
                        </button>
                        <button className="w-full text-left px-4 py-2 text-[10px] font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-2">
                          <Printer className="w-3.5 h-3.5" /> Imprimir DANFE
                        </button>
                        <div className="h-px bg-slate-100 my-1.5"></div>
                        <button className="w-full text-left px-4 py-2 text-[10px] font-bold text-blue-600 hover:bg-blue-50 flex items-center gap-2">
                          <FileInput className="w-3.5 h-3.5" /> Carta de Correção
                        </button>
                        <button className="w-full text-left px-4 py-2 text-[10px] font-bold text-red-600 hover:bg-red-50 flex items-center gap-2">
                          <XCircle className="w-3.5 h-3.5" /> Cancelar Nota
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="p-4 bg-slate-50/50 border-t border-slate-100 flex justify-center">
          <button className="text-[10px] font-bold text-gold-600 hover:text-gold-700 flex items-center gap-2 uppercase tracking-widest transition-all">
            <RotateCcw className="w-3.5 h-3.5" /> Carregar Registros Anteriores
          </button>
        </div>
      </div>
    </div>
  );
};

export default NfeActions;