import React, { useState, useEffect } from 'react';
import { Search, Plus, LogIn, Edit, Trash2, Eye, EyeOff, ArrowLeft, Save, Upload, Loader2, CheckCircle2, MoreHorizontal, RefreshCw } from 'lucide-react';
import { Client, ViewState } from '../types';
import { supabase } from '../services/supabase';

const CLIENT_VIEWS = [
  { id: ViewState.MY_COMPANY, label: 'Minha Empresa' },
  { id: ViewState.SALES, label: 'Vendas' },
  { id: ViewState.SERVICES, label: 'Serviços' },
  { id: ViewState.INVENTORY, label: 'Estoque' },
  { id: ViewState.FINANCIAL, label: 'Financeiro' },
  { id: ViewState.PARTNERS, label: 'Clientes / Fornecedores' },
  { id: ViewState.IMPORT_NFE, label: 'NF-e Importação' },
  { id: ViewState.NFE_ACTIONS, label: 'Ações c/ NF-e' },
  { id: ViewState.FISCAL_MATRIX, label: 'Matriz Fiscal' },
  { id: ViewState.DOCUMENTS, label: 'Documentos' },
];

// UI Components - Defined outside to prevent re-creation and loss of focus on re-render
const SectionHeader = ({ title }: { title: string }) => (
  <div className="bg-[#4a5568] text-white p-2 text-[10px] font-bold tracking-wide rounded-t-lg mt-4 first:mt-0">
    {title.toUpperCase()}
  </div>
);

const InputField = ({ label, value, name, onChange, onBlur, className = "", type = "text", readOnly = false, placeholder = "" }: any) => (
  <div className={`flex flex-col border-r border-slate-200 p-1.5 last:border-0 ${className}`}>
    <label className="text-[7px] text-slate-400 uppercase font-bold mb-0.5">{label}</label>
    <input
      type={type}
      name={name}
      value={value}
      onChange={onChange}
      onBlur={onBlur}
      readOnly={readOnly}
      placeholder={placeholder}
      className={`bg-transparent outline-none text-[10px] font-bold text-slate-700 w-full ${readOnly ? 'opacity-70' : ''}`}
    />
  </div>
);

const SelectField = ({ label, value, name, onChange, options, className = "" }: any) => (
  <div className={`flex flex-col border-r border-slate-200 p-1.5 last:border-0 ${className}`}>
    <label className="text-[7px] text-slate-400 uppercase font-bold mb-0.5">{label}</label>
    <select
      name={name}
      value={value}
      onChange={onChange}
      className="bg-transparent outline-none text-[10px] font-bold text-slate-700 w-full appearance-none cursor-pointer"
    >
      {options.map((opt: any) => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  </div>
);

const MOCK_CLIENTS: Client[] = []; // Empty mock, will use Supabase

interface ClientsProps {
  onImpersonate?: (companyId: string) => void;
  initialData?: Client[];
  onDataUpdate?: (data: Client[]) => void;
}

const Clients: React.FC<ClientsProps> = ({ onImpersonate, initialData, onDataUpdate }) => {
  const [viewMode, setViewMode] = useState<'LIST' | 'FORM'>('LIST');
  const [clients, setClients] = useState<Client[]>(initialData || []);
  const [searchTerm, setSearchTerm] = useState('');
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(!initialData || initialData.length === 0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hiddenColumns, setHiddenColumns] = useState<string[]>([]);

  // Form States
  const [isLoadingCnpj, setIsLoadingCnpj] = useState(false);
  const [isLoadingCep, setIsLoadingCep] = useState(false);
  const [formData, setFormData] = useState<Partial<Client>>({
    status: 'Ativo',
    taxRegime: 'Simples Nacional',
    visibleViews: CLIENT_VIEWS.map(v => v.id)
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialData && initialData.length > 0) {
      setClients(initialData);
      setIsLoading(false);
    }
  }, [initialData]);

  useEffect(() => {
    if (clients.length === 0) {
      fetchClients();
    }
    // Safety timeout: prevent loading from getting stuck
    const timeout = setTimeout(() => {
      setIsLoading(false);
      setIsRefreshing(false);
    }, 10000);
    return () => clearTimeout(timeout);
  }, []);

  const fetchClients = async (isBackground = false) => {
    if (!isBackground) setIsLoading(true);
    else setIsRefreshing(true);

    try {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .order('code');

      if (error) throw error;

      if (data) {
        const transformed: Client[] = data.map((item: any) => ({
          id: item.id,
          code: item.code || '',
          name: item.name,
          tradeName: item.trade_name || '',
          cnpj: item.cnpj,
          email: item.email || '',
          status: item.status || 'Ativo',
          city: item.city || '',
          state: item.state || '',
          zipCode: item.zip_code || '',
          street: item.street || '',
          number: item.number || '',
          complement: item.complement || '',
          neighborhood: item.neighborhood || '',
          taxRegime: item.tax_regime,
          stateRegistration: item.state_registration || '',
          municipalRegistration: item.municipal_registration || '',
          nire: item.nire || '',
          phone: item.phone || '',
          cityHallLogin: item.city_hall_login || '',
          cityHallPassword: item.city_hall_password || '',
          certificatePassword: item.certificate_password || '',
          lastNfe: item.last_nfe || '',
          userLogin: item.user_login || '',
          userPassword: item.user_password || '',
          clientDate: item.client_date || '',
          monthlyFee: item.monthly_fee || 0,
          dueDay: item.due_day || 10,
          certificateDate: item.certificate_date || '',
          certificateExpiry: item.certificate_expiry || '',
          simplesNacionalCnpj: item.simples_nacional_cnpj || '',
          simplesNacionalCpf: item.simples_nacional_cpf || '',
          simplesNacionalAccess: item.simples_nacional_access || '',
          visibleViews: item.visible_views || [],
          lastAccess: '-'
        }));
        setClients(transformed);
        if (onDataUpdate) onDataUpdate(transformed);
      }
    } catch (error: any) {
      console.error('Error fetching clients:', error);
      if (!isBackground) alert('Erro ao buscar clientes: ' + (error.message || 'Erro desconhecido'));
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  // Filter Logic + Numeric Sort by Code
  const filteredClients = clients.filter(c => {
    const search = searchTerm.toLowerCase();
    const nameMatch = c.name?.toLowerCase().includes(search) ?? false;
    const cnpjMatch = c.cnpj?.includes(search) ?? false;
    const codeMatch = c.code?.toLowerCase().includes(search) ?? false;
    return nameMatch || cnpjMatch || codeMatch;
  }).sort((a, b) => {
    const codeA = parseInt(a.code || '0', 10) || 0;
    const codeB = parseInt(b.code || '0', 10) || 0;
    return codeA - codeB;
  });

  const togglePasswordVisibility = (id: string) => {
    setVisiblePasswords(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Simulated API Lookups
  const handleCnpjBlur = () => {
    const cleanCnpj = formData.cnpj?.replace(/\D/g, '');
    if (cleanCnpj && cleanCnpj.length === 14) {
      setIsLoadingCnpj(true);

      // ReceitaWS free tier requires JSONP to work directly from the browser (CORS issues)
      const callbackName = `cnpjCallback_${Math.random().toString(36).substr(2, 9)}`;
      const script = document.createElement('script');

      (window as any)[callbackName] = (data: any) => {
        delete (window as any)[callbackName];
        document.body.removeChild(script);

        if (data.status === 'ERROR' || !data.nome) {
          alert('CNPJ não encontrado ou limite de requisições excedido.');
        } else {
          setFormData(prev => ({
            ...prev,
            name: data.nome || '',
            tradeName: data.fantasia || '',
            zipCode: data.cep || '',
            street: data.logradouro || '',
            number: data.numero || '',
            complement: data.complemento || '',
            neighborhood: data.bairro || '',
            city: data.municipio || '',
            state: data.uf || '',
            email: data.email || '',
            phone: data.telefone || ''
          }));
        }
        setIsLoadingCnpj(false);
      };

      script.src = `https://www.receitaws.com.br/v1/cnpj/${cleanCnpj}?callback=${callbackName}`;
      script.onerror = () => {
        delete (window as any)[callbackName];
        document.body.removeChild(script);
        setIsLoadingCnpj(false);
        alert('Erro ao consultar o CNPJ. Tente novamente mais tarde.');
      };
      document.body.appendChild(script);
    }
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

  const formatCNPJ = (cnpj: string) => {
    const clean = cnpj.replace(/\D/g, '');
    if (clean.length !== 14) return cnpj;
    return clean.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
  };

  const formatCEP = (cep: string) => {
    const clean = cep.replace(/\D/g, '');
    if (clean.length !== 8) return cep;
    return clean.replace(/^(\d{5})(\d{3})$/, '$1-$2');
  };

  const handleSave = async () => {
    console.log('--- handleSave Started ---');
    console.log('Form Data:', formData);

    if (!formData.name || !formData.cnpj) {
      alert("Preencha os campos obrigatórios (Nome e CNPJ).");
      return;
    }

    setIsSubmitting(true);
    try {
      const formattedCnpj = formatCNPJ(formData.cnpj);
      const formattedCep = formData.zipCode ? formatCEP(formData.zipCode) : '';

      const companyData = {
        name: formData.name,
        trade_name: formData.tradeName,
        cnpj: formattedCnpj,
        code: formData.code,
        status: formData.status,
        zip_code: formattedCep,
        street: formData.street,
        number: formData.number,
        complement: formData.complement,
        neighborhood: formData.neighborhood,
        city: formData.city,
        state: formData.state,
        tax_regime: formData.taxRegime,
        state_registration: formData.stateRegistration,
        municipal_registration: formData.municipalRegistration,
        nire: formData.nire,
        phone: formData.phone,
        email: formData.email,
        city_hall_login: formData.cityHallLogin,
        city_hall_password: formData.cityHallPassword,
        certificate_password: formData.certificatePassword,
        certificate_date: formData.certificateDate || null,
        certificate_expiry: formData.certificateExpiry || null,
        last_nfe: formData.lastNfe,
        user_login: formData.userLogin,
        user_password: formData.userPassword,
        client_date: formData.clientDate || null,
        monthly_fee: formData.monthlyFee || 0,
        due_day: formData.dueDay || 10,
        simples_nacional_cnpj: formData.simplesNacionalCnpj,
        simples_nacional_cpf: formData.simplesNacionalCpf,
        simples_nacional_access: formData.simplesNacionalAccess,
        visible_views: formData.visibleViews,
      };

      console.log('Preparing to save to Supabase...');
      console.log('Target ID:', formData.id || 'New Record');
      console.log('Payload:', companyData);

      let result;
      if (formData.id) {
        console.log('Executing UPDATE...');
        result = await supabase
          .from('companies')
          .update(companyData)
          .eq('id', formData.id);
      } else {
        console.log('Executing INSERT...');
        result = await supabase
          .from('companies')
          .insert([companyData]);
      }

      console.log('Supabase Save Response:', result);

      if (result.error) {
        console.error('Supabase Save Error:', result.error);
        throw result.error;
      }

      console.log('Save successful, refreshing list...');
      await fetchClients(true);
      alert("Empresa salva com sucesso!");
      console.log('List refreshed, switching view...');
      setViewMode('LIST');

      setFormData({
        status: 'Ativo',
        taxRegime: 'Simples Nacional',
        visibleViews: CLIENT_VIEWS.map(v => v.id)
      });
      console.log('--- handleSave Finished ---');
    } catch (error: any) {
      console.error('Error in handleSave:', error);
      alert('Erro ao salvar no banco de dados: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (client: Client) => {
    setFormData(client);
    setViewMode('FORM');
  };

  const handleDelete = async (id: any) => {
    if (window.confirm("Tem certeza que deseja excluir este cliente?")) {
      try {
        const { error } = await supabase
          .from('companies')
          .delete()
          .eq('id', id);
        if (error) throw error;
        await fetchClients(true);
        alert("Empresa excluída com sucesso!");
      } catch (error: any) {
        console.error('Error deleting client:', error);
        alert('Erro ao excluir: ' + error.message);
      }
    }
  };

  // Render Functions
  if (viewMode === 'FORM') {
    return (
      <div className="space-y-4 animate-fade-in pb-10 max-w-[1600px] mx-auto">
        {/* Form Header */}
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
                {formData.id ? 'Editar Cliente' : 'Novo Cadastro'}
              </h2>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                Gestão de Carteira: <span className="text-slate-900">{formData.code || 'NOVO'}</span>
              </p>
            </div>
          </div>
          <button
            onClick={handleSave}
            disabled={isSubmitting}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white px-8 py-2.5 rounded-xl text-xs font-bold shadow-md transition-all active:scale-95 disabled:opacity-50"
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {isSubmitting ? 'Salvando...' : 'Salvar Cadastro'}
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden p-6 space-y-2">

          {/* Identificação */}
          <SectionHeader title="Identificação" />
          <div className="border border-slate-200 rounded-b-xl overflow-hidden bg-slate-50/30">
            <div className="grid grid-cols-12 border-b border-slate-200">
              <InputField
                label="Código"
                name="code"
                value={formData.code || ''}
                onChange={handleInputChange}
                className="col-span-2"
              />
              <SelectField
                label="Status"
                name="status"
                value={formData.status}
                onChange={handleInputChange}
                className="col-span-2"
                options={[
                  { label: 'Ativo', value: 'Ativo' },
                  { label: 'Inativo', value: 'Inativo' },
                  { label: 'Com Manutenção', value: 'Com Manutenção' },
                  { label: 'Sem Manutenção', value: 'Sem Manutenção' }
                ]}
              />
              <div className="col-span-3 relative flex flex-col border-r border-slate-200 p-1.5">
                <label className="text-[7px] text-slate-400 uppercase font-bold mb-0.5">CNPJ (Busca Automática)</label>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    name="cnpj"
                    value={formData.cnpj || ''}
                    onChange={handleInputChange}
                    onBlur={handleCnpjBlur}
                    placeholder="00.000.000/0000-00"
                    className="bg-transparent outline-none text-[10px] font-bold text-slate-700 w-full"
                  />
                  {isLoadingCnpj && <Loader2 className="absolute right-0 w-3 h-3 animate-spin text-slate-400" />}
                </div>
              </div>
              <InputField
                label="Razão Social"
                name="name"
                value={formData.name || ''}
                onChange={handleInputChange}
                readOnly={isLoadingCnpj}
                className="col-span-5 border-r-0"
              />
            </div>
            <div className="grid grid-cols-12">
              <InputField
                label="Nome Fantasia"
                name="tradeName"
                value={formData.tradeName || ''}
                onChange={handleInputChange}
                className="col-span-5"
              />
              <SelectField
                label="Regime Tributário"
                name="taxRegime"
                value={formData.taxRegime}
                onChange={handleInputChange}
                className="col-span-4"
                options={[
                  { label: 'MEI', value: 'MEI' },
                  { label: 'Simples Nacional', value: 'Simples Nacional' },
                  { label: 'Lucro Presumido', value: 'Lucro Presumido' },
                  { label: 'Lucro Real', value: 'Lucro Real' }
                ]}
              />
              <InputField
                label="Data Cliente"
                name="clientDate"
                type="date"
                value={formData.clientDate || ''}
                onChange={handleInputChange}
                className="col-span-3 border-r-0"
              />
            </div>
            <div className="grid grid-cols-12 border-t border-slate-200">
              <InputField
                label="R$ Mensalidade"
                name="monthlyFee"
                type="number"
                value={formData.monthlyFee || ''}
                onChange={handleInputChange}
                className="col-span-6"
                placeholder="0.00"
              />
              <InputField
                label="Dia Vencimento"
                name="dueDay"
                type="number"
                value={formData.dueDay || ''}
                onChange={handleInputChange}
                className="col-span-6 border-r-0"
                placeholder="10"
              />
            </div>
          </div>

          {/* Endereço */}
          <SectionHeader title="Endereço" />
          <div className="border border-slate-200 rounded-b-xl overflow-hidden bg-slate-50/30">
            <div className="grid grid-cols-12 border-b border-slate-200">
              <div className="col-span-2 relative flex flex-col border-r border-slate-200 p-1.5">
                <label className="text-[7px] text-slate-400 uppercase font-bold mb-0.5">CEP</label>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    name="zipCode"
                    value={formData.zipCode || ''}
                    onChange={handleInputChange}
                    onBlur={handleCepBlur}
                    className="bg-transparent outline-none text-[10px] font-bold text-slate-700 w-full"
                  />
                  {isLoadingCep && <Loader2 className="absolute right-0 w-3 h-3 animate-spin text-slate-400" />}
                </div>
              </div>
              <InputField
                label="Logradouro"
                name="street"
                value={formData.street || ''}
                onChange={handleInputChange}
                className="col-span-5"
              />
              <InputField
                label="Número"
                name="number"
                value={formData.number || ''}
                onChange={handleInputChange}
                className="col-span-1"
              />
              <InputField
                label="Complemento"
                name="complement"
                value={formData.complement || ''}
                onChange={handleInputChange}
                className="col-span-4 border-r-0"
              />
            </div>
            <div className="grid grid-cols-12">
              <InputField
                label="Bairro"
                name="neighborhood"
                value={formData.neighborhood || ''}
                onChange={handleInputChange}
                className="col-span-5"
              />
              <InputField
                label="Município"
                name="city"
                value={formData.city || ''}
                onChange={handleInputChange}
                className="col-span-6"
              />
              <InputField
                label="UF"
                name="state"
                value={formData.state || ''}
                onChange={handleInputChange}
                className="col-span-1 border-r-0 text-center"
              />
            </div>
          </div>

          {/* Dados Fiscais e Contato */}
          <SectionHeader title="Dados Fiscais e Contato" />
          <div className="border border-slate-200 rounded-b-xl overflow-hidden bg-slate-50/30">
            <div className="grid grid-cols-12 border-b border-slate-200">
              <div className="col-span-3 relative flex flex-col border-r border-slate-200 p-1.5">
                <label className="text-[7px] text-slate-400 uppercase font-bold mb-0.5">Inscrição Estadual</label>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    name="stateRegistration"
                    value={formData.stateRegistration || ''}
                    onChange={handleInputChange}
                    className="bg-transparent outline-none text-[10px] font-bold text-slate-700 w-full"
                  />
                  <Search className="absolute right-0 w-3 h-3 text-slate-400 cursor-pointer hover:text-slate-600 transition-colors" />
                </div>
              </div>
              <InputField
                label="Inscrição Municipal"
                name="municipalRegistration"
                value={formData.municipalRegistration || ''}
                onChange={handleInputChange}
                className="col-span-3"
              />
              <InputField
                label="NIRE / OAB / Cartório"
                name="nire"
                value={formData.nire || ''}
                onChange={handleInputChange}
                className="col-span-3"
              />
              <InputField
                label="Última NF-e"
                name="lastNfe"
                value={formData.lastNfe || ''}
                onChange={handleInputChange}
                placeholder="Número da Nota"
                className="col-span-3 border-r-0"
              />
            </div>
            <div className="grid grid-cols-12">
              <InputField
                label="Telefone"
                name="phone"
                value={formData.phone || ''}
                onChange={handleInputChange}
                className="col-span-5"
              />
              <InputField
                label="Email"
                name="email"
                type="email"
                value={formData.email || ''}
                onChange={handleInputChange}
                className="col-span-7 border-r-0"
              />
            </div>
          </div>

          {/* Acessos e Certificado */}
          <SectionHeader title="Credenciais e Certificado" />
          <div className="border border-slate-200 rounded-b-xl overflow-hidden bg-slate-50/30">
            <div className="grid grid-cols-12 border-b border-slate-200">
              <InputField
                label="Login Prefeitura"
                name="cityHallLogin"
                value={formData.cityHallLogin || ''}
                onChange={handleInputChange}
                className="col-span-3"
              />
              <InputField
                label="Senha Prefeitura"
                name="cityHallPassword"
                value={formData.cityHallPassword || ''}
                onChange={handleInputChange}
                className="col-span-3"
              />
              <InputField
                label="Login Usuário"
                name="userLogin"
                value={formData.userLogin || ''}
                onChange={handleInputChange}
                className="col-span-3"
              />
              <InputField
                label="Senha Usuário"
                name="userPassword"
                value={formData.userPassword || ''}
                onChange={handleInputChange}
                className="col-span-3 border-r-0"
              />
            </div>
            <div className="grid grid-cols-12">
              <div className="col-span-6 flex flex-col border-r border-slate-200 p-1.5">
                <label className="text-[7px] text-slate-400 uppercase font-bold mb-0.5">Certificado Digital (.pfx/.p12)</label>
                <label className="cursor-pointer flex items-center gap-2 text-[10px] font-bold text-slate-600 hover:text-slate-900 transition-colors">
                  <Upload className="w-3 h-3 text-slate-400" />
                  {formData.certificateFile ? 'Arquivo Selecionado' : 'Importar Arquivo'}
                  <input type="file" className="hidden" onChange={(e) => setFormData(prev => ({ ...prev, certificateFile: e.target.files?.[0] }))} />
                </label>
              </div>
              <InputField
                label="Senha Certificado"
                name="certificatePassword"
                type="password"
                value={formData.certificatePassword || ''}
                onChange={handleInputChange}
                className="col-span-2"
              />
              <InputField
                label="Data Emissão Cert."
                name="certificateDate"
                type="date"
                value={formData.certificateDate || ''}
                onChange={handleInputChange}
                className="col-span-2"
              />
              <InputField
                label="Vencimento Cert."
                name="certificateExpiry"
                type="date"
                value={formData.certificateExpiry || ''}
                onChange={handleInputChange}
                className="col-span-2 border-r-0"
              />
            </div>
          </div>

          {/* Acesso Simples Nacional - Compact Frame */}
          <div className="mt-3 border-2 border-dashed border-blue-200 rounded-xl p-3 bg-blue-50/30 relative">
            <span className="absolute -top-2.5 left-3 bg-white px-2 text-[8px] font-black text-blue-500 uppercase tracking-widest">Acesso Simples Nacional</span>
            <div className="grid grid-cols-3 gap-3">
              <div className="flex flex-col">
                <label className="text-[7px] text-blue-400 uppercase font-bold mb-0.5">CNPJ</label>
                <input
                  type="text"
                  name="simplesNacionalCnpj"
                  value={formData.simplesNacionalCnpj || ''}
                  onChange={handleInputChange}
                  placeholder="00.000.000/0000-00"
                  className="bg-white outline-none text-[10px] font-bold text-slate-700 w-full px-2 py-1.5 border border-blue-100 rounded-md focus:border-blue-300 transition-colors"
                />
              </div>
              <div className="flex flex-col">
                <label className="text-[7px] text-blue-400 uppercase font-bold mb-0.5">CPF</label>
                <input
                  type="text"
                  name="simplesNacionalCpf"
                  value={formData.simplesNacionalCpf || ''}
                  onChange={handleInputChange}
                  placeholder="000.000.000-00"
                  className="bg-white outline-none text-[10px] font-bold text-slate-700 w-full px-2 py-1.5 border border-blue-100 rounded-md focus:border-blue-300 transition-colors"
                />
              </div>
              <div className="flex flex-col">
                <label className="text-[7px] text-blue-400 uppercase font-bold mb-0.5">Código de Acesso</label>
                <input
                  type="text"
                  name="simplesNacionalAccess"
                  value={formData.simplesNacionalAccess || ''}
                  onChange={handleInputChange}
                  className="bg-white outline-none text-[10px] font-bold text-slate-700 w-full px-2 py-1.5 border border-blue-100 rounded-md focus:border-blue-300 transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Permissões de Acesso */}
          <SectionHeader title="Módulos Visíveis para o Cliente" />
          <div className="border border-slate-200 rounded-b-xl overflow-hidden bg-slate-50/30 p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {CLIENT_VIEWS.map(view => (
                <label key={view.id} className="flex items-center gap-2.5 cursor-pointer group">
                  <div className="relative flex items-center justify-center">
                    <input
                      type="checkbox"
                      checked={formData.visibleViews?.includes(view.id)}
                      onChange={(e) => {
                        const currentViews = formData.visibleViews || [];
                        const newViews = e.target.checked
                          ? [...currentViews, view.id]
                          : currentViews.filter(v => v !== view.id);
                        setFormData(prev => ({ ...prev, visibleViews: newViews }));
                      }}
                      className="peer appearance-none w-4 h-4 border-2 border-slate-200 rounded-md checked:bg-slate-800 checked:border-slate-800 transition-all cursor-pointer"
                    />
                    <CheckCircle2 className="absolute w-2.5 h-2.5 text-white scale-0 peer-checked:scale-100 transition-transform pointer-events-none" />
                  </div>
                  <span className="text-[9px] font-black text-slate-500 group-hover:text-slate-800 transition-colors uppercase tracking-widest leading-none">
                    {view.label}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // List View - DataGrid Style
  return (
    <div className="flex flex-col gap-4 animate-fade-in h-[calc(100vh-120px)]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-serif font-bold text-slate-800">Clientes</h2>
          <p className="text-slate-500 text-sm">Gerencie sua carteira de empresas.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchClients(true)}
            disabled={isRefreshing || isLoading}
            title="Sincronizar Banco"
            className="p-2.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-all border border-slate-200 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => {
              setFormData({
                status: 'Ativo',
                taxRegime: 'Simples Nacional',
                visibleViews: CLIENT_VIEWS.map(v => v.id)
              });
              setViewMode('FORM');
            }}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white px-5 py-2.5 rounded-xl font-bold font-serif shadow-md transition-all active:scale-95 text-xs"
          >
            <Plus className="w-4 h-4" />
            Novo Cliente
          </button>
        </div>
      </div>

      {/* DataGrid Container */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col flex-1 min-h-0">
        {/* Group Bar */}
        <div className="bg-gradient-to-r from-slate-100 to-slate-50 border-b border-slate-200 px-4 py-2 flex items-center justify-center gap-2">
          <Search className="w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por código, nome, CNPJ ou cidade..."
            className="bg-transparent text-xs text-slate-500 font-medium outline-none w-full max-w-md text-center placeholder:text-slate-400"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <span className="text-[9px] font-black text-slate-400 bg-white px-2 py-0.5 rounded border border-slate-200 shrink-0">
              {filteredClients.length} resultado(s)
            </span>
          )}
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

        {isLoading ? (
          <div className="p-20 flex flex-col items-center justify-center gap-3 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-slate-300" />
            <p className="text-[10px] font-black uppercase tracking-widest">Sincronizando dados...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              {/* Column Headers */}
              <thead>
                <tr className="bg-slate-50 border-b-2 border-slate-200">
                  {[
                    { key: 'codigo', label: 'Código', width: 'w-20' },
                    { key: 'status', label: 'Status', width: 'w-24' },
                    { key: 'empresa', label: 'Empresa', width: 'min-w-[200px]' },
                    { key: 'cnpj', label: 'CNPJ', width: 'w-40' },
                    { key: 'cidade', label: 'Cidade/UF', width: 'w-36' },
                    { key: 'regime', label: 'Regime', width: 'w-36' },
                    { key: 'senha', label: 'Senha Usuário', width: 'w-32' },
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
                  <th className="w-16 px-2 py-2.5 text-center">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Ações</span>
                  </th>
                </tr>
              </thead>

              {/* Data Rows */}
              <tbody>
                {filteredClients.length > 0 ? (
                  filteredClients.map((client, idx) => (
                    <tr
                      key={client.id}
                      className={`border-b border-slate-100 transition-colors group cursor-default ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'
                        } hover:bg-blue-50/50`}
                    >
                      {/* Código */}
                      {!hiddenColumns.includes('codigo') && (
                        <td className="px-2 py-1.5 border-r border-slate-100">
                          <span className="text-[11px] font-mono font-bold text-slate-600">{client.code || '-'}</span>
                        </td>
                      )}
                      {/* Status */}
                      {!hiddenColumns.includes('status') && (
                        <td className="px-2 py-1.5 border-r border-slate-100">
                          <div className="flex items-center gap-1.5">
                            <div className={`w-2 h-2 rounded-full shrink-0 ${client.status === 'Ativo' ? 'bg-green-500' :
                              client.status === 'Com Manutenção' ? 'bg-amber-500' :
                                client.status === 'Sem Manutenção' ? 'bg-slate-400' :
                                  'bg-red-400'
                              }`} />
                            <span className={`text-[11px] font-bold ${client.status === 'Ativo' ? 'text-green-700' :
                              client.status === 'Com Manutenção' ? 'text-amber-600' :
                                client.status === 'Sem Manutenção' ? 'text-slate-500' :
                                  'text-red-500'
                              }`}>
                              {client.status}
                            </span>
                          </div>
                        </td>
                      )}
                      {/* Empresa */}
                      {!hiddenColumns.includes('empresa') && (
                        <td className="px-2 py-1.5 border-r border-slate-100">
                          <span className="text-[11px] font-bold text-slate-800 truncate block max-w-[280px]" title={client.name}>
                            {client.name}
                          </span>
                        </td>
                      )}
                      {/* CNPJ */}
                      {!hiddenColumns.includes('cnpj') && (
                        <td className="px-2 py-1.5 border-r border-slate-100">
                          <span className="text-[11px] font-mono text-slate-600">{client.cnpj}</span>
                        </td>
                      )}
                      {/* Cidade/UF */}
                      {!hiddenColumns.includes('cidade') && (
                        <td className="px-2 py-1.5 border-r border-slate-100">
                          <span className="text-[11px] text-slate-600 font-medium truncate block">
                            {client.city ? `${client.city}/${client.state}` : <span className="text-slate-300 italic">—</span>}
                          </span>
                        </td>
                      )}
                      {/* Regime */}
                      {!hiddenColumns.includes('regime') && (
                        <td className="px-2 py-1.5 border-r border-slate-100">
                          <span className="text-[10px] font-bold text-slate-500 truncate block">{client.taxRegime || '—'}</span>
                        </td>
                      )}
                      {/* Senha */}
                      {!hiddenColumns.includes('senha') && (
                        <td className="px-2 py-1.5 border-r border-slate-100">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-slate-600 text-[11px] w-16 truncate">
                              {visiblePasswords[client.id] ? client.userPassword : '••••••'}
                            </span>
                            <button
                              onClick={() => togglePasswordVisibility(client.id)}
                              className="text-slate-300 hover:text-slate-600 transition-colors p-0.5"
                              title={visiblePasswords[client.id] ? "Ocultar" : "Ver"}
                            >
                              {visiblePasswords[client.id] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                            </button>
                          </div>
                        </td>
                      )}
                      {/* Ações */}
                      <td className="px-2 py-1.5 text-center">
                        <div className="flex justify-center items-center gap-0.5">
                          <button
                            onClick={() => {
                              if (onImpersonate) {
                                onImpersonate(client.id);
                              } else {
                                alert('Acessar: ' + client.name);
                              }
                            }}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-all"
                            title="Acessar"
                          >
                            <LogIn className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleEdit(client)}
                            className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-md transition-all"
                            title="Editar"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(client.id)}
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
                    <td colSpan={8 - hiddenColumns.length} className="px-4 py-12 text-center">
                      <p className="text-slate-400 text-sm mb-2">Nenhum cliente encontrado para "{searchTerm}".</p>
                      <p className="text-[10px] text-slate-300 uppercase font-black tracking-widest leading-loose">
                        Tente clicar no ícone de sincronizar acima ou criar um novo cliente no botão "+".
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Spacer to push footer down */}
        <div className="flex-1" />

        {/* Footer Bar */}
        <div className="bg-slate-50 border-t border-slate-200 px-4 py-2 flex items-center justify-between mt-auto">
          <span className="text-[10px] font-bold text-slate-400">
            {filteredClients.length} registro(s)
          </span>
          <span className="text-[10px] text-slate-300">
            {isRefreshing && <RefreshCw className="w-3 h-3 animate-spin inline mr-1" />}
            Fact ERP Contábil
          </span>
        </div>
      </div>
    </div>
  );
};

export default Clients;