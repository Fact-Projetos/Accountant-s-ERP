import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, UserPlus, Truck, Mail, Phone, ArrowLeft, Save, MapPin, Building, Globe, Hash, Loader2 } from 'lucide-react';
import { Partner } from '../../types';
import { partnerService } from '../../services/partnerService';

// UI Components to match Sales/ImportNfe pattern
const SectionHeader = ({ title }: { title: string }) => (
  <div className="bg-[#4a5568] text-white p-2 text-[10px] font-bold tracking-wide rounded-t-lg mt-4 first:mt-0">
    {title.toUpperCase()}
  </div>
);

const InputField = ({ label, value, onChange, onBlur, className = "", type = "text", readOnly = false, placeholder = "", isLoading = false }: any) => (
  <div className={`flex flex-col border-r border-slate-200 p-1.5 last:border-0 ${className}`}>
    <label className="text-[7px] text-slate-400 uppercase font-bold mb-0.5">{label}</label>
    <div className="relative">
      <input
        type={type}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        readOnly={readOnly}
        placeholder={placeholder}
        className={`bg-transparent outline-none text-[10px] font-bold text-slate-700 w-full ${readOnly ? 'opacity-70' : ''}`}
      />
      {isLoading && <Loader2 className="absolute right-1 top-0 w-3 h-3 animate-spin text-gold-600" />}
    </div>
  </div>
);

const Partners: React.FC = () => {
  const [viewMode, setViewMode] = useState<'LIST' | 'FORM'>('LIST');
  const [partners, setPartners] = useState<Partner[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoadingCep, setIsLoadingCep] = useState(false);
  const [formData, setFormData] = useState<Partial<Partner>>({
    type: 'cliente',
    status: 'Ativo'
  });

  useEffect(() => {
    loadPartners();
  }, []);

  const loadPartners = () => {
    const list = partnerService.getPartners();
    setPartners(list);
  };

  const filteredPartners = partners.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.document.includes(searchTerm) ||
    (p.email && p.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleEdit = (partner: Partner) => {
    setFormData(partner);
    setViewMode('FORM');
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este registro?')) {
      partnerService.deletePartner(id);
      loadPartners();
    }
  };

  const handleSave = () => {
    if (!formData.name || !formData.document) {
      alert('Nome e Documento são obrigatórios.');
      return;
    }
    partnerService.addOrUpdatePartner(formData as Partner);
    loadPartners();
    setViewMode('LIST');
    setFormData({ type: 'cliente', status: 'Ativo' });
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleCepBlur = async () => {
    const cleanCep = formData.zipCode?.replace(/\D/g, '');
    if (cleanCep && cleanCep.length === 8) {
      setIsLoadingCep(true);
      try {
        const response = await fetch(`https://brasilapi.com.br/api/cep/v1/${cleanCep}`);
        if (!response.ok) throw new Error('CEP não encontrado');
        const data = await response.json();

        setFormData(prev => ({
          ...prev,
          street: data.street || data.logradouro || '',
          neighborhood: data.neighborhood || data.bairro || '',
          city: data.city || data.localidade || '',
          state: data.state || data.uf || ''
        }));
      } catch (error) {
        console.error('Erro ao buscar CEP:', error);
      } finally {
        setIsLoadingCep(false);
      }
    }
  };

  if (viewMode === 'FORM') {
    return (
      <div className="space-y-4 animate-fade-in pb-10 max-w-[1600px] mx-auto">
        {/* Header Actions */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setViewMode('LIST')}
              className="p-1.5 hover:bg-slate-100 rounded-full text-slate-500 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h2 className="text-xl font-serif font-bold text-slate-800 tracking-tight">
                {formData.id ? 'Edição de Parceiro' : 'Cadastro de Parceiro'}
              </h2>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                Tipo: <span className="text-gold-600">{formData.type?.toUpperCase()}</span>
              </p>
            </div>
          </div>
          <button
            onClick={handleSave}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white px-8 py-2.5 rounded-xl text-xs font-bold shadow-md transition-all active:scale-95"
          >
            <Save className="w-4 h-4" /> Finalizar Cadastro
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden p-6 space-y-2">

          {/* Identificação */}
          <SectionHeader title="Identificação do Parceiro" />
          <div className="border border-slate-200 rounded-b-xl overflow-hidden bg-slate-50/30">
            <div className="grid grid-cols-12 border-b border-slate-200">
              <div className="col-span-2 flex items-center border-r border-slate-200 bg-slate-50 px-2">
                <div className="flex bg-slate-200/50 p-0.5 rounded-lg w-full">
                  <button
                    onClick={() => handleInputChange('type', 'cliente')}
                    className={`flex-1 py-1 text-[9px] font-black rounded-md transition-all ${formData.type === 'cliente' ? 'bg-white shadow text-slate-800' : 'text-slate-400'}`}
                  >
                    CLIENTE
                  </button>
                  <button
                    onClick={() => handleInputChange('type', 'fornecedor')}
                    className={`flex-1 py-1 text-[9px] font-black rounded-md transition-all ${formData.type === 'fornecedor' ? 'bg-white shadow text-slate-800' : 'text-slate-400'}`}
                  >
                    FORNEC.
                  </button>
                </div>
              </div>
              <InputField
                label="CNPJ / CPF"
                value={formData.document}
                onChange={(e: any) => handleInputChange('document', e.target.value)}
                placeholder="00.000.000/0000-00"
                className="col-span-2"
              />
              <InputField
                label="Razão Social / Nome"
                value={formData.name}
                onChange={(e: any) => handleInputChange('name', e.target.value)}
                className="col-span-6"
              />
              <div className="col-span-2 flex flex-col p-1.5 last:border-0">
                <label className="text-[7px] text-slate-400 uppercase font-bold mb-0.5">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => handleInputChange('status', e.target.value)}
                  className="bg-transparent outline-none text-[10px] font-bold text-slate-700 w-full cursor-pointer"
                >
                  <option value="Ativo">ATIVO</option>
                  <option value="Inativo">INATIVO</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-12">
              <InputField
                label="Inscrição Estadual"
                value={formData.stateRegistration}
                onChange={(e: any) => handleInputChange('stateRegistration', e.target.value)}
                className="col-span-3"
              />
              <InputField
                label="Nome p/ Contato"
                value={formData.contactName}
                onChange={(e: any) => handleInputChange('contactName', e.target.value)}
                className="col-span-9 border-r-0"
              />
            </div>
          </div>

          {/* Endereço */}
          <SectionHeader title="Endereço Completo" />
          <div className="border border-slate-200 rounded-b-xl overflow-hidden bg-slate-50/30">
            <div className="grid grid-cols-12 border-b border-slate-200">
              <InputField label="CEP" value={formData.zipCode} onChange={(e: any) => handleInputChange('zipCode', e.target.value)} onBlur={handleCepBlur} isLoading={isLoadingCep} className="col-span-2" />
              <InputField label="Logradouro" value={formData.street} onChange={(e: any) => handleInputChange('street', e.target.value)} className="col-span-6" />
              <InputField label="Número" value={formData.number} onChange={(e: any) => handleInputChange('number', e.target.value)} className="col-span-1" />
              <InputField label="Complemento" value={formData.complement} onChange={(e: any) => handleInputChange('complement', e.target.value)} className="col-span-3 border-r-0" />
            </div>
            <div className="grid grid-cols-12">
              <InputField label="Bairro" value={formData.neighborhood} onChange={(e: any) => handleInputChange('neighborhood', e.target.value)} className="col-span-5" />
              <InputField label="Município" value={formData.city} onChange={(e: any) => handleInputChange('city', e.target.value)} className="col-span-5" />
              <InputField label="UF" value={formData.state} onChange={(e: any) => handleInputChange('state', e.target.value)} className="col-span-2 text-center border-r-0" />
            </div>
          </div>

          {/* Contatos */}
          <SectionHeader title="Dados de Contato" />
          <div className="border border-slate-200 rounded-b-xl overflow-hidden bg-slate-50/30">
            <div className="grid grid-cols-12">
              <InputField label="Telefone / WhatsApp" value={formData.phone} onChange={(e: any) => handleInputChange('phone', e.target.value)} className="col-span-4" />
              <InputField label="E-mail" value={formData.email} onChange={(e: any) => handleInputChange('email', e.target.value)} className="col-span-8 border-r-0" />
            </div>
          </div>

        </div>
      </div>
    );
  }

  // LIST VIEW - DataGrid Style
  const [hiddenColumns, setHiddenColumns] = useState<string[]>([]);

  return (
    <div className="flex flex-col gap-4 animate-fade-in h-[calc(100vh-120px)]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-serif font-bold text-slate-800">Clientes e Fornecedores</h2>
          <p className="text-slate-500 text-sm">Gerencie sua rede de contatos e visualize o histórico.</p>
        </div>
        <button
          onClick={() => {
            setFormData({ type: 'cliente', status: 'Ativo' });
            setViewMode('FORM');
          }}
          className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white px-5 py-2.5 rounded-xl font-bold shadow-md transition-all active:scale-95 text-xs"
        >
          <Plus className="w-4 h-4" /> Novo Parceiro
        </button>
      </div>

      {/* DataGrid Container */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col flex-1 min-h-0">
        {/* Search Bar */}
        <div className="bg-gradient-to-r from-slate-100 to-slate-50 border-b border-slate-200 px-4 py-2 flex items-center justify-center gap-2">
          <Search className="w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por nome, documento ou localização..."
            className="bg-transparent text-xs text-slate-500 font-medium outline-none w-full max-w-md text-center placeholder:text-slate-400"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Hidden columns restore bar */}
        {hiddenColumns.length > 0 && (
          <div className="bg-amber-50 border-b border-amber-200 px-4 py-1.5 flex items-center gap-2 flex-wrap">
            <span className="text-[9px] font-black text-amber-600 uppercase tracking-widest">Colunas ocultas:</span>
            {hiddenColumns.map(col => (
              <button
                key={col}
                onClick={() => setHiddenColumns(prev => prev.filter(c => c !== col))}
                className="text-[9px] font-bold bg-white text-amber-700 border border-amber-300 px-2 py-0.5 rounded hover:bg-amber-100 transition-colors flex items-center gap-1"
              >
                {col.charAt(0).toUpperCase() + col.slice(1)} ✕
              </button>
            ))}
            <button
              onClick={() => setHiddenColumns([])}
              className="text-[9px] font-black text-amber-500 hover:text-amber-700 ml-auto uppercase tracking-widest"
            >
              Exibir todas
            </button>
          </div>
        )}

        <div className="overflow-x-auto flex-1">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b-2 border-slate-200">
                {[
                  { key: 'tipo', label: 'Tipo', width: 'w-24' },
                  { key: 'nome', label: 'Nome / Razão Social', width: 'min-w-[200px]' },
                  { key: 'documento', label: 'Documento', width: 'w-40' },
                  { key: 'localizacao', label: 'Localização', width: 'w-44' },
                ].filter(col => !hiddenColumns.includes(col.key)).map((col) => (
                  <th
                    key={col.key}
                    className={`${col.width} text-left px-2 py-2.5 border-r border-slate-200 last:border-r-0 select-none group cursor-default`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider truncate">{col.label}</span>
                      <button
                        onClick={() => setHiddenColumns(prev => [...prev, col.key])}
                        className="text-slate-300 text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-400 cursor-pointer"
                        title={`Ocultar coluna "${col.label}"`}
                      >«</button>
                    </div>
                  </th>
                ))}
                <th className="w-28 px-2 py-2.5 text-center">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Ações</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredPartners.length > 0 ? (
                filteredPartners.map((p, idx) => (
                  <tr
                    key={p.id}
                    className={`border-b border-slate-100 transition-colors group cursor-default ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'} hover:bg-blue-50/50`}
                  >
                    {!hiddenColumns.includes('tipo') && (
                      <td className="px-2 py-1.5 border-r border-slate-100">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase border ${p.type === 'cliente'
                          ? 'bg-blue-50 text-blue-700 border-blue-100'
                          : 'bg-purple-50 text-purple-700 border-purple-100'
                          }`}>
                          {p.type}
                        </span>
                      </td>
                    )}
                    {!hiddenColumns.includes('nome') && (
                      <td className="px-2 py-1.5 border-r border-slate-100">
                        <div className="flex flex-col">
                          <span className="text-[11px] font-bold text-slate-800 truncate block max-w-[280px]">{p.name}</span>
                          <span className="text-[9px] text-slate-400 font-bold">{p.email || 'Sem e-mail'}</span>
                        </div>
                      </td>
                    )}
                    {!hiddenColumns.includes('documento') && (
                      <td className="px-2 py-1.5 border-r border-slate-100">
                        <span className="text-[11px] font-mono text-slate-600">{p.document}</span>
                      </td>
                    )}
                    {!hiddenColumns.includes('localizacao') && (
                      <td className="px-2 py-1.5 border-r border-slate-100">
                        <div className="flex flex-col">
                          <span className="text-[11px] font-bold text-slate-600">{p.city || '-'} - {p.state || '-'}</span>
                          <span className="text-[9px] text-slate-400 font-bold uppercase">{p.neighborhood || '-'}</span>
                        </div>
                      </td>
                    )}
                    {/* Ações */}
                    <td className="px-2 py-1.5 text-center">
                      <div className="flex justify-center items-center gap-0.5">
                        <button
                          onClick={() => handleEdit(p)}
                          className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-md transition-all"
                          title="Editar"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(p.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-all"
                          title="Excluir"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5 - hiddenColumns.length} className="px-4 py-12 text-center">
                    <p className="text-slate-400 text-sm mb-2">Nenhum parceiro encontrado para "{searchTerm}".</p>
                    <p className="text-[10px] text-slate-300 uppercase font-black tracking-widest leading-loose">
                      Clique em "Novo Parceiro" para cadastrar.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-4 py-2 flex items-center justify-between mt-auto">
          <span className="text-[10px] font-bold text-slate-400">
            {filteredPartners.length} registro(s)
          </span>
          <span className="text-[10px] text-slate-300">
            Fact ERP Contábil
          </span>
        </div>
      </div>
    </div>
  );
};

export default Partners;