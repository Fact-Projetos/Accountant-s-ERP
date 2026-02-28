import React, { useState } from 'react';
import { partnerService } from '../../services/partnerService';
import {
  Import, FileCheck, AlertTriangle, FileText,
  Package, Calendar, Search, Filter, Eye, RefreshCw,
  ArrowLeft, Printer, Download, MapPin, Truck,
  Scale, Info, User, Building2, ChevronRight, Save, Plus, Edit, X
} from 'lucide-react';

interface TaxInfo {
  origin: string;
  cst: string;
  base: number;
  rate: number;
  value: number;
}

interface InvoiceItem {
  code: string;
  ean: string;
  description: string;
  ncm: string;
  cfop: string;
  unit: string;
  qty: number;
  unitValue: number;
  totalValue: number;
  freight: number;
  insurance: number;
  others: number;
  // Details for DI and Taxes
  di: {
    number: string;
    date: string;
    addition: string;
    sequence: string;
    date2: string;
    location: string;
    uf: string;
  };
  simples: TaxInfo;
  icms: TaxInfo;
  ipi: TaxInfo;
  pis: TaxInfo;
  cofins: TaxInfo;
  ii: TaxInfo;
}

interface ImportedXml {
  id: number;
  key: string;
  number: string;
  date: string;
  supplier: string;
  document: string;
  value: number;
  status: 'Processado' | 'Erro' | 'Pendente';
  itemsCount: number;
  nature: string;
  cfop: string;
  ie: string;
  personType: 'PJ' | 'PF';
  tradeName?: string;
  address: string;
  addressNumber?: string;
  complement?: string;
  neighborhood: string;
  zipCode: string;
  city: string;
  uf: string;
  phone: string;
  email?: string;
  issueDate: string;
  items: InvoiceItem[];
  totals: {
    bcIcms: number;
    icmsValue: number;
    bcIcmsSt: number;
    icmsStValue: number;
    totalProducts: number;
    freight: number;
    insurance: number;
    otherExpenses: number;
    ipiValue: number;
    totalInvoice: number;
  };
  transport: {
    name: string;
    freightBy: string;
    antt: string;
    placa: string;
    uf: string;
    cnpjCpf: string;
    qty: number;
    species: string;
    brand: string;
    numbering: string;
    weightGross: number;
    weightNet: number;
    address: string;
    city: string;
    ie: string;
  };
  additionalInfo: string;
}

// UI Components - Defined outside to prevent focus loss
const SectionHeader = ({ title }: { title: string }) => (
  <div className="bg-[#4a5568] text-white p-2 text-[10px] font-bold tracking-wide rounded-t-lg mt-4 first:mt-0">
    {title.toUpperCase()}
  </div>
);

const InputField = ({ label, value, onChange, className = "", type = "text", placeholder = "", readOnly = false }: any) => (
  <div className={`flex flex-col border-r border-slate-200 p-1.5 last:border-0 ${className}`}>
    <label className="text-[7px] text-slate-400 uppercase font-bold mb-0.5">{label}</label>
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      readOnly={readOnly}
      className={`bg-transparent outline-none text-[9px] font-bold text-slate-700 w-full ${readOnly ? 'cursor-default' : ''}`}
    />
  </div>
);

const ImportNfe: React.FC = () => {
  const [viewMode, setViewMode] = useState<'LIST' | 'EDIT'>('LIST');
  const [formData, setFormData] = useState<ImportedXml | null>(null);
  const [activeTaxItemIndex, setActiveTaxItemIndex] = useState<number | null>(null);

  const initialTax = (): TaxInfo => ({ origin: '1', cst: '', base: 0, rate: 0, value: 0 });
  const initialDI = () => ({ number: '', date: '', addition: '1', sequence: '1', date2: '', location: '', uf: '' });

  const defaultInvoice: ImportedXml = {
    id: 1,
    key: '',
    number: '',
    date: new Date().toLocaleDateString('pt-BR'),
    supplier: '',
    document: '',
    value: 0,
    status: 'Pendente',
    itemsCount: 0,
    nature: 'IMPORTAÇÃO',
    cfop: '',
    ie: '',
    personType: 'PJ',
    tradeName: '',
    address: '',
    addressNumber: '',
    complement: '',
    neighborhood: '',
    zipCode: '',
    city: '',
    uf: '',
    phone: '',
    email: '',
    issueDate: '',
    items: [],
    totals: { bcIcms: 0, icmsValue: 0, bcIcmsSt: 0, icmsStValue: 0, totalProducts: 0, freight: 0, insurance: 0, otherExpenses: 0, ipiValue: 0, totalInvoice: 0 },
    transport: { name: '', freightBy: '0-REMETENTE', antt: '', placa: '', uf: '', cnpjCpf: '', qty: 0, species: '', brand: '', numbering: '', weightGross: 0, weightNet: 0, address: '', city: '', ie: '' },
    additionalInfo: ''
  };

  const [history] = useState<ImportedXml[]>([
    {
      ...defaultInvoice,
      id: 1,
      number: '000407',
      supplier: 'ZHAOQING CARLAS INDUSTRIAL CO..',
      document: '61.565.780/0001-00',
      value: 12982.41,
      status: 'Processado',
      itemsCount: 2,
      nature: 'USO E CONSUMO',
      cfop: '3556',
      items: [
        {
          code: 'N-MW-Y01', ean: 'SEM GTIN', description: 'N-MW-Y01 - FILMES PLASTICOS...', ncm: '39191010', cfop: '3556', unit: 'ROLO', qty: 4, unitValue: 1723.87, totalValue: 6895.48, freight: 0, insurance: 0, others: 0,
          di: initialDI(), simples: initialTax(), icms: initialTax(), ipi: initialTax(), pis: initialTax(), cofins: initialTax(), ii: initialTax()
        },
      ],
      totals: { ...defaultInvoice.totals, bcIcms: 12982.41, icmsValue: 2336.83, totalProducts: 8751.60, totalInvoice: 12982.41 }
    }
  ]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
  };

  const handleEdit = (invoice: ImportedXml) => {
    setFormData({ ...invoice });
    setViewMode('EDIT');
  };

  const handleInputChange = (path: string, value: any) => {
    if (!formData) return;
    const newFormData = { ...formData };
    const parts = path.split('.');
    let current: any = newFormData;
    for (let i = 0; i < parts.length - 1; i++) {
      current = current[parts[i]];
    }
    current[parts[parts.length - 1]] = value;
    setFormData(newFormData);
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    if (!formData) return;
    const newItems = [...formData.items];
    const parts = field.split('.');
    let current: any = newItems[index];

    for (let i = 0; i < parts.length - 1; i++) {
      current = current[parts[i]];
    }
    current[parts[parts.length - 1]] = value;

    if (field === 'qty' || field === 'unitValue') {
      newItems[index].totalValue = (newItems[index].qty || 0) * (newItems[index].unitValue || 0);
    }

    setFormData({ ...formData, items: newItems });
  };

  const handleImportXml = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(text, "text/xml");

        const getText = (selector: string) => xmlDoc.querySelector(selector)?.textContent || '';

        const newInvoice: ImportedXml = {
          ...defaultInvoice,
          id: Date.now(),
          number: getText('nNF'),
          supplier: getText('dest xNome') || getText('emit xNome'),
          document: getText('dest CNPJ') || getText('dest CPF') || getText('emit CNPJ'),
          ie: getText('dest IE') || getText('emit IE'),
          nature: getText('natOp') || 'IMPORTAÇÃO',
          cfop: getText('det prod CFOP') || '',
          address: getText('dest enderDest xLgr') || getText('emit enderEmit xLgr'),
          neighborhood: getText('dest enderDest xBairro') || getText('emit enderEmit xBairro'),
          city: getText('dest enderDest xMun') || getText('emit enderEmit xMun'),
          uf: getText('dest enderDest UF') || getText('emit enderEmit UF'),
          zipCode: getText('dest enderDest CEP') || getText('emit enderEmit CEP'),
          date: getText('dhEmi').substring(0, 10).split('-').reverse().join('/') || getText('dEmi').split('-').reverse().join('/') || new Date().toLocaleDateString('pt-BR'),
          issueDate: getText('dhEmi') || getText('dEmi'),
          value: parseFloat(getText('vNF')) || 0,
          items: Array.from(xmlDoc.querySelectorAll('det')).map(det => ({
            code: det.querySelector('cProd')?.textContent || '',
            ean: det.querySelector('cEAN')?.textContent || 'SEM GTIN',
            description: det.querySelector('xProd')?.textContent || '',
            ncm: det.querySelector('NCM')?.textContent || '',
            cfop: det.querySelector('CFOP')?.textContent || '',
            st: det.querySelector('CST')?.textContent || det.querySelector('CSOSN')?.textContent || '',
            unit: det.querySelector('uCom')?.textContent || '',
            qty: parseFloat(det.querySelector('qCom')?.textContent || '0'),
            unitValue: parseFloat(det.querySelector('vUnCom')?.textContent || '0'),
            totalValue: parseFloat(det.querySelector('vProd')?.textContent || '0'),
            freight: parseFloat(det.querySelector('vFrete')?.textContent || '0'),
            insurance: parseFloat(det.querySelector('vSeg')?.textContent || '0'),
            others: parseFloat(det.querySelector('vOutro')?.textContent || '0'),
            di: initialDI(),
            simples: { ...initialTax(), cst: det.querySelector('CSOSN')?.textContent || '' },
            icms: { ...initialTax(), cst: det.querySelector('CST')?.textContent || '', base: parseFloat(det.querySelector('vBC')?.textContent || '0'), rate: parseFloat(det.querySelector('pICMS')?.textContent || '0'), value: parseFloat(det.querySelector('vICMS')?.textContent || '0') },
            ipi: { ...initialTax(), cst: det.querySelector('cstIPI')?.textContent || '', base: parseFloat(det.querySelector('vBCIPI')?.textContent || '0'), rate: parseFloat(det.querySelector('pIPI')?.textContent || '0'), value: parseFloat(det.querySelector('vIPI')?.textContent || '0') },
            pis: { ...initialTax(), cst: det.querySelector('cstPIS')?.textContent || '', base: parseFloat(det.querySelector('vBCPIS')?.textContent || '0'), rate: parseFloat(det.querySelector('pPIS')?.textContent || '0'), value: parseFloat(det.querySelector('vPIS')?.textContent || '0') },
            cofins: { ...initialTax(), cst: det.querySelector('cstCOFINS')?.textContent || '', base: parseFloat(det.querySelector('vBCCOFINS')?.textContent || '0'), rate: parseFloat(det.querySelector('pCOFINS')?.textContent || '0'), value: parseFloat(det.querySelector('vCOFINS')?.textContent || '0') },
            ii: initialTax(),
          })),
          totals: {
            bcIcms: parseFloat(getText('vBC')) || 0,
            icmsValue: parseFloat(getText('vICMS')) || 0,
            bcIcmsSt: parseFloat(getText('vBCST')) || 0,
            icmsStValue: parseFloat(getText('vST')) || 0,
            totalProducts: parseFloat(getText('vProd')) || 0,
            freight: parseFloat(getText('vFrete')) || 0,
            insurance: parseFloat(getText('vSeg')) || 0,
            otherExpenses: parseFloat(getText('vOutro')) || 0,
            ipiValue: parseFloat(getText('vIPI')) || 0,
            totalInvoice: parseFloat(getText('vNF')) || 0,
          },
          transport: {
            ...defaultInvoice.transport,
            name: getText('transp transporta xNome'),
            cnpjCpf: getText('transp transporta CNPJ'),
            placa: getText('transp veicTransp placa'),
            uf: getText('transp veicTransp UF'),
            qty: parseFloat(getText('transp vol qVol')) || 0,
            weightGross: parseFloat(getText('transp vol pesoB')) || 0,
            weightNet: parseFloat(getText('transp vol pesoL')) || 0,
          }
        };

        setFormData(newInvoice);
        alert('XML importado com sucesso!');
      } catch (err) {
        console.error('Erro ao ler XML:', err);
        alert('Erro ao processar o XML.');
      }
    };
    reader.readAsText(file);
  };

  // --- RENDERING TAX MODAL ---
  const renderTaxModal = () => {
    if (activeTaxItemIndex === null || !formData) return null;
    const item = formData.items[activeTaxItemIndex];

    const TaxRow = ({ label, taxKey }: { label: string, taxKey: keyof InvoiceItem }) => {
      const tax = item[taxKey] as TaxInfo;
      return (
        <tr className="divide-x divide-slate-200 bg-white hover:bg-slate-50 transition-colors">
          <td className="p-2 text-[9px] font-bold text-slate-700 w-32">{label}</td>
          <td className="p-1"><input value={tax.origin} onChange={e => handleItemChange(activeTaxItemIndex, `${taxKey}.origin`, e.target.value)} className="w-full text-center bg-transparent outline-none text-[9px]" /></td>
          <td className="p-1"><input value={tax.cst} onChange={e => handleItemChange(activeTaxItemIndex, `${taxKey}.cst`, e.target.value)} className="w-full text-center bg-transparent outline-none text-[9px]" /></td>
          <td className="p-1"><input type="number" value={tax.base} onChange={e => handleItemChange(activeTaxItemIndex, `${taxKey}.base`, parseFloat(e.target.value))} className="w-full text-right bg-transparent outline-none text-[9px] pr-1" /></td>
          <td className="p-1"><input type="number" value={tax.rate} onChange={e => handleItemChange(activeTaxItemIndex, `${taxKey}.rate`, parseFloat(e.target.value))} className="w-full text-right bg-transparent outline-none text-[9px] pr-1" /></td>
          <td className="p-1"><input type="number" value={tax.value} onChange={e => handleItemChange(activeTaxItemIndex, `${taxKey}.value`, parseFloat(e.target.value))} className="w-full text-right bg-transparent outline-none text-[9px] pr-1 font-bold" /></td>
        </tr>
      );
    };

    return (
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
        <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden animate-in zoom-in-95 duration-200">
          <div className="bg-slate-800 p-4 flex items-center justify-between text-white">
            <div className="flex items-center gap-3">
              <Scale className="w-5 h-5 text-gold-400" />
              <div>
                <h3 className="text-sm font-bold leading-tight">DETALHAMENTO DE IMPOSTOS E DI</h3>
                <p className="text-[10px] text-slate-400 uppercase tracking-widest">{item.description}</p>
              </div>
            </div>
            <button onClick={() => setActiveTaxItemIndex(null)} className="p-2 hover:bg-slate-700 rounded-full transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 space-y-6 overflow-y-auto max-h-[80vh]">
            {/* DI Section */}
            <div>
              <SectionHeader title="Informações da Declaração de Importação (DI)" />
              <div className="border border-slate-200 rounded-b-xl overflow-hidden bg-slate-50/20">
                <div className="grid grid-cols-10 divide-x divide-slate-200 border-b border-slate-200">
                  <InputField label="Número (DI)" value={item.di.number} onChange={(e: any) => handleItemChange(activeTaxItemIndex, 'di.number', e.target.value)} className="col-span-2" />
                  <InputField label="Data (DI)" value={item.di.date} onChange={(e: any) => handleItemChange(activeTaxItemIndex, 'di.date', e.target.value)} className="col-span-2 text-center" />
                  <InputField label="Número da Adição" value={item.di.addition} onChange={(e: any) => handleItemChange(activeTaxItemIndex, 'di.addition', e.target.value)} className="col-span-2 text-center" />
                  <InputField label="Número Sequencial" value={item.di.sequence} onChange={(e: any) => handleItemChange(activeTaxItemIndex, 'di.sequence', e.target.value)} className="col-span-2 text-center" />
                  <InputField label="Data (DI)" value={item.di.date2} onChange={(e: any) => handleItemChange(activeTaxItemIndex, 'di.date2', e.target.value)} className="col-span-2 text-center" />
                </div>
                <div className="grid grid-cols-12 divide-x divide-slate-200">
                  <InputField label="Local do Desembaraço" value={item.di.location} onChange={(e: any) => handleItemChange(activeTaxItemIndex, 'di.location', e.target.value)} className="col-span-11" />
                  <InputField label="UF" value={item.di.uf} onChange={(e: any) => handleItemChange(activeTaxItemIndex, 'di.uf', e.target.value)} className="col-span-1 text-center" />
                </div>
              </div>
            </div>

            {/* Taxes Section */}
            <div>
              <SectionHeader title="Informações de Impostos" />
              <div className="border border-slate-200 rounded-b-xl overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50 text-[8px] font-black text-slate-400 uppercase tracking-tight border-b border-slate-200">
                    <tr className="divide-x divide-slate-200">
                      <th className="p-2">Imposto</th>
                      <th className="p-2 text-center">Origem</th>
                      <th className="p-2 text-center">CST/CSOSN</th>
                      <th className="p-2 text-right">Base de Cálculo</th>
                      <th className="p-2 text-right">Aliquota</th>
                      <th className="p-2 text-right">Valor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    <TaxRow label="Simples Nacional" taxKey="simples" />
                    <TaxRow label="ICMS" taxKey="icms" />
                    <TaxRow label="IPI" taxKey="ipi" />
                    <TaxRow label="PIS" taxKey="pis" />
                    <TaxRow label="COFINS" taxKey="cofins" />
                    <TaxRow label="I.I." taxKey="ii" />
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <button
                onClick={() => setActiveTaxItemIndex(null)}
                className="bg-slate-800 text-white px-8 py-2.5 rounded-xl text-xs font-bold hover:bg-slate-900 shadow-md transition-all active:scale-95"
              >
                Salvar Alterações
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const handleFinish = () => {
    if (formData) {
      partnerService.addOrUpdatePartner({
        type: 'fornecedor',
        name: formData.supplier,
        document: formData.document,
        phone: formData.phone || '',
        stateRegistration: formData.ie,
        zipCode: formData.zipCode,
        street: formData.address,
        neighborhood: formData.neighborhood,
        city: formData.city,
        state: formData.uf,
      });
    }
    setViewMode('LIST');
  };

  if (viewMode === 'EDIT' && formData) {
    return (
      <div className="space-y-4 animate-fade-in pb-10 max-w-[1600px] mx-auto relative cursor-default">
        {renderTaxModal()}
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div className="flex items-center gap-3">
            <button onClick={() => setViewMode('LIST')} className="p-1.5 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-serif font-bold text-slate-800 tracking-tight">Lançamento de Nota de Importação</h2>
          </div>
          <div className="flex gap-2">
            <input type="file" id="xml-upload-desp" className="hidden" accept=".xml" onChange={handleImportXml} />
            <button
              onClick={() => document.getElementById('xml-upload-desp')?.click()}
              className="flex items-center gap-2 bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-xl text-xs font-bold hover:bg-slate-50 transition-all shadow-sm active:scale-95"
            >
              <Import className="w-4 h-4 text-slate-500" /> Importar XML
            </button>
            <button onClick={handleFinish} className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white px-6 py-2 rounded-xl text-xs font-bold shadow-md transition-all active:scale-95">
              <Save className="w-4 h-4" /> Finalizar Lançamento
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden p-6 space-y-2">

          <SectionHeader title="Informação da Operação" />
          <div className="grid grid-cols-12 border border-slate-200 rounded-b-xl overflow-hidden bg-slate-50/30">
            <InputField label="CFOP" value={formData.cfop} onChange={(e: any) => handleInputChange('cfop', e.target.value)} className="col-span-1" />
            <InputField label="Natureza da Operação" value={formData.nature} onChange={(e: any) => handleInputChange('nature', e.target.value)} className="col-span-9" />
            <InputField label="Data Emissão" value={formData.date} onChange={(e: any) => handleInputChange('date', e.target.value)} className="col-span-2 text-right" />
          </div>

          <SectionHeader title="Identificação do Fornecedor / Remetente" />
          <div className="border border-slate-200 rounded-b-xl overflow-hidden bg-slate-50/30">
            <div className="grid grid-cols-12 border-b border-slate-200">
              <div className="col-span-2 flex items-center border-r border-slate-200 bg-slate-50 px-2">
                <div className="flex bg-slate-200/50 p-0.5 rounded-lg w-full">
                  <button
                    onClick={() => handleInputChange('personType', 'PJ')}
                    className={`flex-1 py-1 text-[9px] font-black rounded-md transition-all ${formData.personType === 'PJ' ? 'bg-white shadow text-slate-800' : 'text-slate-400'}`}
                  >
                    PJ
                  </button>
                  <button
                    onClick={() => handleInputChange('personType', 'PF')}
                    className={`flex-1 py-1 text-[9px] font-black rounded-md transition-all ${formData.personType === 'PF' ? 'bg-white shadow text-slate-800' : 'text-slate-400'}`}
                  >
                    PF
                  </button>
                </div>
              </div>
              <InputField
                label={formData.personType === 'PJ' ? 'CNPJ' : 'CPF'}
                value={formData.document}
                onChange={(e: any) => handleInputChange('document', e.target.value)}
                placeholder={formData.personType === 'PJ' ? '00.000.000/0000-00' : '000.000.000-00'}
                className="col-span-2"
              />
              <InputField
                label="Razão Social / Nome"
                value={formData.supplier}
                onChange={(e: any) => handleInputChange('supplier', e.target.value)}
                className="col-span-5"
              />
              <InputField
                label="Nome Fantasia"
                value={formData.tradeName}
                onChange={(e: any) => handleInputChange('tradeName', e.target.value)}
                className="col-span-3 border-r-0"
              />
            </div>
            <div className="grid grid-cols-12 border-b border-slate-200">
              <InputField label="CEP" value={formData.zipCode} onChange={(e: any) => handleInputChange('zipCode', e.target.value)} className="col-span-2" />
              <InputField label="Endereço" value={formData.address} onChange={(e: any) => handleInputChange('address', e.target.value)} className="col-span-5" />
              <InputField label="Número" value={formData.addressNumber} onChange={(e: any) => handleInputChange('addressNumber', e.target.value)} className="col-span-1" />
              <InputField label="Complemento" value={formData.complement} onChange={(e: any) => handleInputChange('complement', e.target.value)} className="col-span-2" />
              <InputField label="Bairro" value={formData.neighborhood} onChange={(e: any) => handleInputChange('neighborhood', e.target.value)} className="col-span-2 border-r-0" />
            </div>
            <div className="grid grid-cols-12">
              <InputField label="Município" value={formData.city} onChange={(e: any) => handleInputChange('city', e.target.value)} className="col-span-4" />
              <InputField label="UF" value={formData.uf} onChange={(e: any) => handleInputChange('uf', e.target.value)} className="col-span-1 text-center" />
              <InputField label="Inscrição Estadual" value={formData.ie} onChange={(e: any) => handleInputChange('ie', e.target.value)} className="col-span-2" />
              <InputField label="Telefone" value={formData.phone} onChange={(e: any) => handleInputChange('phone', e.target.value)} className="col-span-2" />
              <InputField label="E-mail" value={formData.email} onChange={(e: any) => handleInputChange('email', e.target.value)} className="col-span-3 border-r-0" />
            </div>
          </div>

          <SectionHeader title="Dados dos produtos" />
          <div className="border border-slate-200 rounded-b-xl overflow-hidden">
            <table className="w-full text-center border-collapse text-[9px]">
              <thead className="bg-slate-50 text-[7px] border-b border-slate-200 text-slate-500 uppercase font-black">
                <tr className="divide-x divide-slate-100">
                  <th className="p-2">Codigo</th>
                  <th className="p-2">EAN</th>
                  <th className="p-2 w-[25%] text-left">Descrição do Produto</th>
                  <th className="p-2">NCM</th>
                  <th className="p-2">CFOP</th>
                  <th className="p-2">Unid</th>
                  <th className="p-2">Qtd.</th>
                  <th className="p-2">V.Uni</th>
                  <th className="p-2">Total</th>
                  <th className="p-2">Frete</th>
                  <th className="p-2">Seguro</th>
                  <th className="p-2">Outros</th>
                  <th className="p-2">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {formData.items.map((item, idx) => (
                  <tr key={idx} className="divide-x divide-slate-100 hover:bg-slate-50/50 transition-colors">
                    <td className="p-1"><input value={item.code} onChange={e => handleItemChange(idx, 'code', e.target.value)} className="w-full bg-transparent outline-none text-center font-bold" /></td>
                    <td className="p-1"><input value={item.ean} onChange={e => handleItemChange(idx, 'ean', e.target.value)} className="w-full bg-transparent outline-none text-center" /></td>
                    <td className="p-1 text-left"><textarea value={item.description} onChange={e => handleItemChange(idx, 'description', e.target.value)} className="w-full bg-transparent outline-none resize-none leading-tight" /></td>
                    <td className="p-1"><input value={item.ncm} onChange={e => handleItemChange(idx, 'ncm', e.target.value)} className="w-full bg-transparent outline-none text-center" /></td>
                    <td className="p-1"><input value={item.cfop} onChange={e => handleItemChange(idx, 'cfop', e.target.value)} className="w-full bg-transparent outline-none text-center" /></td>
                    <td className="p-1"><input value={item.unit} onChange={e => handleItemChange(idx, 'unit', e.target.value)} className="w-full bg-transparent outline-none text-center" /></td>
                    <td className="p-1 font-bold"><input type="number" value={item.qty} onChange={e => handleItemChange(idx, 'qty', parseFloat(e.target.value))} className="w-full bg-transparent outline-none text-center" /></td>
                    <td className="p-1"><input type="number" value={item.unitValue} onChange={e => handleItemChange(idx, 'unitValue', parseFloat(e.target.value))} className="w-full bg-transparent outline-none text-center" /></td>
                    <td className="p-1 font-black text-slate-900">{item.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                    <td className="p-1"><input type="number" value={item.freight} onChange={e => handleItemChange(idx, 'freight', parseFloat(e.target.value))} className="w-full bg-transparent outline-none text-center" /></td>
                    <td className="p-1"><input type="number" value={item.insurance} onChange={e => handleItemChange(idx, 'insurance', parseFloat(e.target.value))} className="w-full bg-transparent outline-none text-center" /></td>
                    <td className="p-1"><input type="number" value={item.others} onChange={e => handleItemChange(idx, 'others', parseFloat(e.target.value))} className="w-full bg-transparent outline-none text-center" /></td>
                    <td className="p-1">
                      <button
                        onClick={() => setActiveTaxItemIndex(idx)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-0.5 rounded text-[8px] font-bold shadow-sm transition-all active:scale-90"
                      >
                        Impostos
                      </button>
                    </td>
                  </tr>
                ))}
                <tr className="bg-slate-50/30">
                  <td colSpan={13} className="p-2">
                    <button onClick={() => setFormData({
                      ...formData, items: [...formData.items, {
                        code: '', ean: 'SEM GTIN', description: '', ncm: '', cfop: '', unit: 'UN', qty: 1, unitValue: 0, totalValue: 0, freight: 0, insurance: 0, others: 0,
                        di: initialDI(), simples: initialTax(), icms: initialTax(), ipi: initialTax(), pis: initialTax(), cofins: initialTax(), ii: initialTax()
                      }]
                    })} className="flex items-center gap-1 mx-auto text-[8px] font-bold text-slate-500 hover:text-slate-800 transition-colors">
                      <Plus className="w-3 h-3" /> ADICIONAR PRODUTO
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <SectionHeader title="Dados do Transportador" />
          <div className="border border-slate-200 rounded-b-xl overflow-hidden bg-slate-50/30">
            <div className="grid grid-cols-12 border-b border-slate-200">
              <InputField label="Nome / Razão Social" value={formData.transport.name} onChange={(e: any) => handleInputChange('transport.name', e.target.value)} className="col-span-6" />
              <InputField label="Frete por conta" value={formData.transport.freightBy} onChange={(e: any) => handleInputChange('transport.freightBy', e.target.value)} className="col-span-2" />
              <InputField label="Codigo ANTT" value={formData.transport.antt} onChange={(e: any) => handleInputChange('transport.antt', e.target.value)} className="col-span-1" />
              <InputField label="Placa do Veículo" value={formData.transport.placa} onChange={(e: any) => handleInputChange('transport.placa', e.target.value)} className="col-span-1" />
              <InputField label="UF" value={formData.transport.uf} onChange={(e: any) => handleInputChange('transport.uf', e.target.value)} className="col-span-1 text-center" />
              <InputField label="CNPJ/CPF" value={formData.transport.cnpjCpf} onChange={(e: any) => handleInputChange('transport.cnpjCpf', e.target.value)} className="col-span-1" />
            </div>
            <div className="grid grid-cols-12 divide-x divide-slate-200 shadow-inner">
              <InputField label="Quantidade" value={formData.transport.qty} onChange={(e: any) => handleInputChange('transport.qty', e.target.value)} className="col-span-1" />
              <InputField label="Espécie" value={formData.transport.species} onChange={(e: any) => handleInputChange('transport.species', e.target.value)} className="col-span-3" />
              <InputField label="Marca" value={formData.transport.brand} onChange={(e: any) => handleInputChange('transport.brand', e.target.value)} className="col-span-2" />
              <InputField label="Numeração" value={formData.transport.numbering} onChange={(e: any) => handleInputChange('transport.numbering', e.target.value)} className="col-span-2" />
              <InputField label="Peso Bruto" value={formData.transport.weightGross} onChange={(e: any) => handleInputChange('transport.weightGross', e.target.value)} className="col-span-2 text-right" />
              <InputField label="Peso Líquido" value={formData.transport.weightNet} onChange={(e: any) => handleInputChange('transport.weightNet', e.target.value)} className="col-span-2 text-right border-r-0" />
            </div>
          </div>

          <SectionHeader title="Calculo dos Impostos" />
          <div className="border border-slate-200 rounded-b-xl overflow-hidden bg-slate-50/10">
            <div className="grid grid-cols-5 divide-x divide-slate-100">
              <InputField label="Base de Cálc ICMS" value={formData.totals.bcIcms.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} className="text-right" />
              <InputField label="Valor do ICMS" value={formData.totals.icmsValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} className="text-right font-black text-slate-900" />
              <InputField label="Vl ICMS Subst." value={formData.totals.icmsStValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} className="text-right" />
              <InputField label="Vl Total Produtos" value={formData.totals.totalProducts.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} className="text-right font-black" />
              <div className="p-1.5 flex flex-col justify-center bg-slate-50">
                <label className="text-[7px] text-slate-500 uppercase font-black">VALOR TOTAL DA NOTA</label>
                <span className="text-sm font-black text-slate-900 text-right">{formatCurrency(formData.totals.totalInvoice)}</span>
              </div>
            </div>
            <div className="grid grid-cols-5 divide-x divide-slate-100 border-t border-slate-100">
              <InputField label="Valor do Frete" value={formData.totals.freight.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} className="text-right" />
              <InputField label="Valor do Seguro" value={formData.totals.insurance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} className="text-right" />
              <InputField label="Desp. Acessórias" value={formData.totals.otherExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} className="text-right font-bold text-amber-600" />
              <InputField label="Valor do IPI" value={formData.totals.ipiValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} className="text-right" />
              <div className="p-1.5 flex items-center justify-center bg-slate-800 text-white rounded-br-xl">
                <span className="text-[7px] font-black italic text-slate-400">CONFERIR VALORES COM O DOCUMENTO FÍSICO</span>
              </div>
            </div>
          </div>

          <SectionHeader title="Dados Adicionais / Observações" />
          <div className="border border-slate-200 rounded-b-xl overflow-hidden p-2 bg-slate-50/30">
            <textarea
              className="w-full min-h-[60px] bg-transparent outline-none text-[9px] font-medium text-slate-600 uppercase leading-tight resize-none"
              placeholder="Informações complementares, referências de importação (DI), valores Siscomex..."
              value={formData.additionalInfo}
              onChange={(e) => handleInputChange('additionalInfo', e.target.value)}
            />
          </div>

        </div>
      </div>
    );
  }

  // --- LIST VIEW ---
  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-serif font-bold text-slate-800">Notas de Importação</h2>
          <p className="text-slate-500 text-sm">Gerenciamento e lançamento de NF-e e documentos fiscais.</p>
        </div>
        <button onClick={() => { setFormData(defaultInvoice); setViewMode('EDIT'); }} className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white px-5 py-2.5 rounded-xl font-bold shadow-md transition-all active:scale-95 text-xs">
          <Plus className="w-4 h-4" /> Lançar Importação Manual
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-[2rem] p-12 flex flex-col items-center justify-center text-center hover:border-slate-300 hover:bg-slate-50/50 transition-all cursor-pointer group shadow-sm overflow-hidden relative"
        onClick={() => { setFormData(defaultInvoice); setViewMode('EDIT'); }}>
        <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-transparent via-slate-200 to-transparent opacity-0 group-hover:opacity-100 transition-all" />
        <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mb-6 group-hover:bg-white group-hover:scale-110 transition-all text-slate-400 group-hover:text-slate-600 shadow-inner group-hover:shadow-md">
          <Import className="w-10 h-10" />
        </div>
        <h3 className="text-xl font-serif font-bold text-slate-700">Importação de Arquivos XML</h3>
        <p className="text-slate-400 text-sm mt-2 max-w-sm">
          Clique ou arraste o XML enviado pelo despachante para preenchimento automático.
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-slate-400" />
            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-widest">Histórico de Lançamentos</h3>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-50/50 text-[10px] uppercase font-bold text-slate-400 border-b border-slate-100 text-left">
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Documento</th>
                <th className="px-6 py-4">Fornecedor</th>
                <th className="px-6 py-4 text-right">Valor Total</th>
                <th className="px-6 py-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-xs text-slate-600">
              {history.map(item => (
                <tr key={item.id} className="hover:bg-slate-50/30 transition-colors group">
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-lg font-bold text-[9px] uppercase border ${item.status === 'Processado' ? 'bg-green-50 text-green-700 border-green-100' :
                      'bg-amber-50 text-amber-700 border-amber-100'
                      }`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-black text-slate-700">NF-e {item.number}</td>
                  <td className="px-6 py-4 font-medium text-slate-700">{item.supplier}</td>
                  <td className="px-6 py-4 text-right font-black text-slate-800">{formatCurrency(item.value)}</td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => handleEdit(item)} className="p-2 hover:bg-slate-100 text-slate-400 hover:text-slate-800 rounded-lg transition-all">
                        <Edit className="w-4 h-4" />
                      </button>
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

export default ImportNfe;