import React, { useState, useEffect, useRef } from 'react';
import {
  Package, Search, Upload, CloudDownload, Plus, Edit, Trash2,
  ArrowLeft, Save, Calculator, AlertCircle, FileSignature,
  CheckSquare, Square, Check, MoreVertical, Loader2, Truck, CreditCard,
  FileText, User, MapPin, ShoppingBag, FileCheck, CheckCircle2, ChevronRight, Receipt, MoreHorizontal, X
} from 'lucide-react';
import { supabase } from '../../services/supabase';

// UI Components - Standardizing with Sales/Clients
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

const SelectField = ({ label, value, name, onChange, options, className = "", disabled = false }: any) => (
  <div className={`flex flex-col border-r border-slate-200 p-1.5 last:border-0 ${className}`}>
    <label className="text-[7px] text-slate-400 uppercase font-bold mb-0.5">{label}</label>
    <select
      name={name}
      value={value}
      onChange={onChange}
      disabled={disabled}
      className={`bg-transparent outline-none text-[10px] font-bold text-slate-700 w-full appearance-none ${disabled ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      {options.map((opt: any) => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  </div>
);

// Interface do Produto atualizada com novos campos
interface Product {
  id: string;
  isRequired: boolean;
  entryDate: string;
  code: string;
  nameFiscal: string;
  nameInternal: string;
  supplier: string;

  // Fiscal Info
  ncm: string;
  cest: string;
  cstCsosn: string;
  cstPis: string;
  cstCofins: string;
  cstIpi: string;
  enquadramentoIpi: string;
  cfopSupplier: string;
  cfopExitInternal: string;
  cfopExitInterstate: string;
  codigoBeneficio: string;

  // Regime Normal fields
  origem: string;
  bcIcms: number;
  aliqIcms: number;
  valorIcms: number;
  bcPis: number;
  aliqPis: number;
  valorPis: number;
  bcCofins: number;
  aliqCofins: number;
  valorCofins: number;
  bcIpi: number;
  aliqIpi: number;
  valorIpi: number;

  // Values
  unit: string;
  costPrice: number;
  qty: number;
  totalCost: number;
  salePrice: number;

  status: 'Validado' | 'Pendente' | 'Cancelado';
  isXmlImported: boolean;
  xmlKey?: string;
}

// Interface para a Nota de Entrada (NF-e de Compra)
interface EntryInvoiceForm {
  personType: 'PJ' | 'PF';
  document: string;
  name: string;
  tradeName?: string;
  zipCode: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
  ie?: string;
  phone?: string;
  email?: string;
  operationNature: string;
  entryDate: string;
  items: Product[];
  freightValue: number;
  totalAmount: number;
  additionalInfo: string;
}

interface InventoryProps {
  companyId?: string;
}

const Inventory: React.FC<InventoryProps> = ({ companyId }) => {
  const [viewMode, setViewMode] = useState<'LIST' | 'FORM' | 'INVOICE_FORM' | 'MANIFEST_LIST'>('LIST');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [loadingCnpj, setLoadingCnpj] = useState(false);
  const [loadingCep, setLoadingCep] = useState(false);
  const [loadingXml, setLoadingXml] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const xmlInputRef = useRef<HTMLInputElement>(null);

  // Products from database
  const [products, setProducts] = useState<Product[]>([]);
  const [taxRegime, setTaxRegime] = useState<string>('Simples Nacional');
  const isRegimeNormal = taxRegime === 'Lucro Presumido' || taxRegime === 'Lucro Real';

  // Fetch products from Supabase
  const fetchProducts = async () => {
    if (!companyId) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('inventory')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform from DB format to Product interface
      const transformedProducts: Product[] = (data || []).map(item => ({
        id: item.id,
        isRequired: true, // Default
        entryDate: new Date(item.entry_date || item.created_at).toLocaleDateString('pt-BR'),
        code: item.code || '',
        nameFiscal: item.name,
        nameInternal: item.description || item.name,
        supplier: item.supplier || '',
        ncm: item.ncm || '',
        cest: item.cest || '',
        cstCsosn: item.cst_csosn || '102',
        cstPis: item.cst_pis || '99',
        cstCofins: item.cst_cofins || '99',
        cstIpi: item.cst_ipi || '99',
        enquadramentoIpi: item.enquadramento_ipi || '',
        cfopSupplier: item.cfop_supplier || '',
        cfopExitInternal: item.cfop_exit_internal || '',
        cfopExitInterstate: item.cfop_exit_interstate || '',
        codigoBeneficio: item.codigo_beneficio || '',
        origem: item.origem || '0',
        bcIcms: parseFloat(item.bc_icms) || 0,
        aliqIcms: parseFloat(item.aliq_icms) || 0,
        valorIcms: parseFloat(item.valor_icms) || 0,
        bcPis: parseFloat(item.bc_pis) || 0,
        aliqPis: parseFloat(item.aliq_pis) || 0,
        valorPis: parseFloat(item.valor_pis) || 0,
        bcCofins: parseFloat(item.bc_cofins) || 0,
        aliqCofins: parseFloat(item.aliq_cofins) || 0,
        valorCofins: parseFloat(item.valor_cofins) || 0,
        bcIpi: parseFloat(item.bc_ipi) || 0,
        aliqIpi: parseFloat(item.aliq_ipi) || 0,
        valorIpi: parseFloat(item.valor_ipi) || 0,
        unit: item.unit || 'UN',
        costPrice: parseFloat(item.cost_price) || parseFloat(item.unit_price) || 0,
        qty: parseFloat(item.current_stock) || 0,
        totalCost: (parseFloat(item.cost_price) || parseFloat(item.unit_price) || 0) * (parseFloat(item.current_stock) || 0),
        salePrice: parseFloat(item.sale_price) || 0,
        status: (item.is_xml_imported ? 'Validado' : (item.status === 'OK' || item.status === 'Validado' ? 'Validado' : 'Pendente')) as 'Validado' | 'Pendente' | 'Cancelado',
        isXmlImported: item.is_xml_imported || false,
        xmlKey: item.xml_key || ''
      }));

      setProducts(transformedProducts);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch products on mount and when companyId changes
  useEffect(() => {
    if (companyId) {
      fetchProducts();
      // Fetch company tax regime
      (async () => {
        const { data } = await supabase
          .from('companies')
          .select('tax_regime')
          .eq('id', companyId)
          .single();
        if (data?.tax_regime) setTaxRegime(data.tax_regime);
      })();
    } else {
      setProducts([]);
    }
  }, [companyId]);

  // Click outside menu handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActiveMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Form States
  const [formData, setFormData] = useState<Product>({
    id: '', isRequired: true, entryDate: new Date().toLocaleDateString('pt-BR'),
    code: '', nameFiscal: '', nameInternal: '', supplier: '',
    ncm: '', cest: '', cstCsosn: '102', cstPis: '99', cstCofins: '99', cstIpi: '99',
    unit: 'UN', costPrice: 0, qty: 0, totalCost: 0, salePrice: 0, status: 'Pendente', isXmlImported: false, xmlKey: ''
  });

  const [invoiceForm, setInvoiceForm] = useState<EntryInvoiceForm>({
    personType: 'PJ', document: '', name: '', tradeName: '', zipCode: '', street: '', number: '', complement: '',
    neighborhood: '', city: '', state: '', ie: '', phone: '', email: '', operationNature: 'Compra para Comercialização',
    entryDate: new Date().toISOString().split('T')[0], items: [], freightValue: 0, totalAmount: 0, additionalInfo: ''
  });

  const [manifestInvoices, setManifestInvoices] = useState<any[]>([]);
  const [manifestError, setManifestError] = useState<string>('');

  // Fetch manifest invoices from database (cached results) on mount
  useEffect(() => {
    if (companyId) {
      (async () => {
        const { data } = await supabase
          .from('manifest_invoices')
          .select('*')
          .eq('company_id', companyId)
          .order('created_at', { ascending: false });

        if (data && data.length > 0) {
          setManifestInvoices(data.map((inv: any) => ({
            key: inv.chave_nfe || '',
            issuer: inv.nome_emitente || 'Desconhecido',
            document: inv.cnpj_emitente || '',
            date: inv.data_emissao ? new Date(inv.data_emissao).toLocaleDateString('pt-BR') : '',
            value: parseFloat(inv.valor_nfe) || 0,
            status: inv.sit_nfe === '1' ? 'Autorizada' : inv.sit_nfe === '3' ? 'Cancelada' : 'Disponível',
            nsu: inv.nsu,
            id: inv.id
          })));
        }
      })();
    }
  }, [companyId]);

  // Fetch manifest invoices from SEFAZ via automation server
  const fetchManifestFromSefaz = async () => {
    if (!companyId) return;
    setLoadingManifest(true);
    setManifestError('');

    try {
      // 1. Get company certificate and data
      const { data: company, error: compError } = await supabase
        .from('companies')
        .select('cnpj, state, certificate_base64, certificate_password, last_nsu')
        .eq('id', companyId)
        .single();

      if (compError || !company) throw new Error('Empresa não encontrada.');

      if (!company.certificate_base64) {
        throw new Error('Certificado digital não cadastrado. Vá em Cadastro de Clientes e faça o upload do arquivo .pfx.');
      }
      if (!company.certificate_password) {
        throw new Error('Senha do certificado não cadastrada.');
      }

      // 2. Call automation server
      const response = await fetch('http://localhost:3099/manifest/consulta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          certificateBase64: company.certificate_base64,
          certificatePassword: company.certificate_password,
          cnpj: company.cnpj,
          uf: company.state || 'RJ',
          ultNSU: company.last_nsu || '0'
        })
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Erro na comunicação com SEFAZ');
      }

      console.log(`[Manifest] SEFAZ: ${result.cStat} - ${result.xMotivo}`);
      console.log(`[Manifest] Notas: ${result.notas?.length || 0}, ultNSU: ${result.ultNSU}`);

      // 3. Save results to manifest_invoices table
      if (result.notas && result.notas.length > 0) {
        for (const nota of result.notas) {
          await supabase.from('manifest_invoices').upsert({
            company_id: companyId,
            nsu: nota.nsu,
            chave_nfe: nota.chaveNfe,
            cnpj_emitente: nota.cnpjEmitente,
            nome_emitente: nota.nomeEmitente,
            ie_emitente: nota.ieEmitente,
            data_emissao: nota.dataEmissao ? nota.dataEmissao.substring(0, 10) : null,
            valor_nfe: nota.valorNfe,
            sit_nfe: nota.sitNfe,
            tipo_operacao: nota.tipoOperacao,
            xml_resumo: nota.xmlResumo,
            status: 'Disponível'
          }, { onConflict: 'company_id,chave_nfe' });
        }
      }

      // 4. Update last_nsu
      if (result.ultNSU) {
        await supabase.from('companies').update({ last_nsu: result.ultNSU }).eq('id', companyId);
      }

      // 5. Reload from database  
      const { data: updatedInvoices } = await supabase
        .from('manifest_invoices')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (updatedInvoices) {
        setManifestInvoices(updatedInvoices.map((inv: any) => ({
          key: inv.chave_nfe || '',
          issuer: inv.nome_emitente || 'Desconhecido',
          document: inv.cnpj_emitente || '',
          date: inv.data_emissao ? new Date(inv.data_emissao).toLocaleDateString('pt-BR') : '',
          value: parseFloat(inv.valor_nfe) || 0,
          status: inv.sit_nfe === '1' ? 'Autorizada' : inv.sit_nfe === '3' ? 'Cancelada' : 'Disponível',
          nsu: inv.nsu,
          id: inv.id
        })));
      }

      // Show result message
      if (result.notas && result.notas.length > 0) {
        alert(`✅ ${result.notas.length} nota(s) encontrada(s) na SEFAZ!\n\ncStat: ${result.cStat}\n${result.xMotivo}`);
      } else {
        alert(`ℹ️ Nenhuma nota nova encontrada.\n\ncStat: ${result.cStat}\n${result.xMotivo}`);
      }

    } catch (err: any) {
      console.error('[Manifest] Erro:', err);
      setManifestError(err.message);

      if (err.message?.includes('Failed to fetch') || err.message?.includes('NetworkError')) {
        alert('❌ Servidor de automação não está rodando.\n\nInicie com: cd automation-server && node server.js');
      } else {
        alert(`❌ Erro: ${err.message}`);
      }
    } finally {
      setLoadingManifest(false);
    }
  };

  const [loadingManifest, setLoadingManifest] = useState(false);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  // CNPJ/CEP Handlers (Shared logic style with Sales)
  const handleCnpjBlur = () => {
    if (invoiceForm.document.length >= 14) {
      const cleanCnpj = invoiceForm.document.replace(/\D/g, '');
      if (cleanCnpj.length !== 14) return;
      setLoadingCnpj(true);
      const callbackName = `cnpjCallback_inv_${Math.random().toString(36).substr(2, 9)}`;
      const script = document.createElement('script');
      (window as any)[callbackName] = (data: any) => {
        delete (window as any)[callbackName];
        document.body.removeChild(script);
        if (data.status !== 'ERROR' && data.nome) {
          setInvoiceForm(prev => ({ ...prev, name: data.nome, zipCode: data.cep, street: data.logradouro, number: data.numero, complement: data.complemento, neighborhood: data.bairro, city: data.municipio, state: data.uf }));
        }
        setLoadingCnpj(false);
      };
      script.src = `https://www.receitaws.com.br/v1/cnpj/${cleanCnpj}?callback=${callbackName}`;
      document.body.appendChild(script);
    }
  };

  const handleCepBlur = async () => {
    const cleanCep = invoiceForm.zipCode.replace(/\D/g, '');
    if (cleanCep.length === 8) {
      setLoadingCep(true);
      try {
        const res = await fetch(`https://brasilapi.com.br/api/cep/v1/${cleanCep}`);
        if (res.ok) {
          const data = await res.json();
          setInvoiceForm(prev => ({ ...prev, street: data.street, neighborhood: data.neighborhood, city: data.city, state: data.state }));
        }
      } catch (e) { } finally { setLoadingCep(false); }
    }
  };

  // Handlers
  const handleInputChange = (field: keyof Product, value: any) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      if (field === 'costPrice' || field === 'qty') updated.totalCost = updated.costPrice * updated.qty;
      return updated;
    });
  };

  const handleEdit = (prod: Product) => {
    setFormData({ ...prod });
    setViewMode('FORM');
    setActiveMenu(null);
  };

  const handleNew = () => {
    setFormData({ id: '', isRequired: true, entryDate: new Date().toLocaleDateString('pt-BR'), code: '', nameFiscal: '', nameInternal: '', supplier: '', ncm: '', cest: '', cstCsosn: '102', cstPis: '99', cstCofins: '99', cstIpi: '99', enquadramentoIpi: '', cfopSupplier: '', cfopExitInternal: '', cfopExitInterstate: '', codigoBeneficio: '', origem: '0', bcIcms: 0, aliqIcms: 0, valorIcms: 0, bcPis: 0, aliqPis: 0, valorPis: 0, bcCofins: 0, aliqCofins: 0, valorCofins: 0, bcIpi: 0, aliqIpi: 0, valorIpi: 0, unit: 'UN', costPrice: 0, qty: 0, totalCost: 0, salePrice: 0, status: 'Pendente', isXmlImported: false, xmlKey: '' });
    setViewMode('FORM');
  };

  const handleSave = async () => {
    if (!companyId) return;
    if (!formData.code || !formData.nameFiscal) {
      alert("Campos obrigatórios: Código e Descrição Fiscal");
      return;
    }

    setIsLoading(true);
    try {
      const productData = {
        company_id: companyId,
        code: formData.code,
        name: formData.nameFiscal,
        description: formData.nameInternal || formData.nameFiscal,
        unit: formData.unit,
        cost_price: formData.costPrice,
        unit_price: formData.costPrice, // Backward compatibility
        sale_price: formData.salePrice,
        current_stock: formData.qty,
        ncm: formData.ncm,
        cest: formData.cest,
        cst_csosn: formData.cstCsosn,
        cst_pis: formData.cstPis,
        cst_cofins: formData.cstCofins,
        cst_ipi: formData.cstIpi,
        enquadramento_ipi: formData.enquadramentoIpi,
        cfop_supplier: formData.cfopSupplier,
        cfop_exit_internal: formData.cfopExitInternal,
        cfop_exit_interstate: formData.cfopExitInterstate,
        codigo_beneficio: formData.codigoBeneficio,
        origem: formData.origem,
        bc_icms: formData.bcIcms,
        aliq_icms: formData.aliqIcms,
        valor_icms: formData.valorIcms,
        bc_pis: formData.bcPis,
        aliq_pis: formData.aliqPis,
        valor_pis: formData.valorPis,
        bc_cofins: formData.bcCofins,
        aliq_cofins: formData.aliqCofins,
        valor_cofins: formData.valorCofins,
        bc_ipi: formData.bcIpi,
        aliq_ipi: formData.aliqIpi,
        valor_ipi: formData.valorIpi,
        supplier: formData.supplier,
        xml_key: formData.xmlKey || null,
        is_xml_imported: formData.isXmlImported,
        status: formData.status,
        entry_date: new Date().toISOString()
      };

      let error;
      if (formData.id) {
        // Update existing product
        const result = await supabase
          .from('inventory')
          .update(productData)
          .eq('id', formData.id);
        error = result.error;
      } else {
        // Insert new product
        const result = await supabase
          .from('inventory')
          .insert(productData);
        error = result.error;
      }

      if (error) throw error;

      alert('Produto salvo com sucesso!');
      setViewMode('LIST');
      fetchProducts();
    } catch (error: any) {
      console.error('Error saving product:', error);
      alert('Erro ao salvar produto: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSelectAll = () => {
    const selectableProducts = products.filter(p => p.status === 'Pendente');
    if (selectedIds.length === selectableProducts.length) setSelectedIds([]);
    else setSelectedIds(selectableProducts.map(p => p.id));
  };

  const toggleSelect = (id: string) => {
    const product = products.find(p => p.id === id);
    if (!product || product.status === 'OK') return;
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleConvertToNfe = (productIds: string[]) => {
    if (productIds.length === 0) return;
    const itemsToConvert = products.filter(p => productIds.includes(p.id));
    setInvoiceForm(prev => ({
      ...prev,
      items: itemsToConvert,
      totalAmount: itemsToConvert.reduce((acc, item) => acc + item.totalCost, 0)
    }));
    setViewMode('INVOICE_FORM');
    setActiveMenu(null);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Deseja realmente excluir este produto?')) return;

    try {
      const { error } = await supabase
        .from('inventory')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setActiveMenu(null);
      fetchProducts();
    } catch (error: any) {
      alert('Erro ao excluir: ' + error.message);
    }
  };

  const handleSaveInvoice = () => {
    alert("Nota Fiscal de Entrada emitida com sucesso!");
    const ids = invoiceForm.items.map(i => i.id);
    setProducts(prev => prev.map(p => ids.includes(p.id) ? { ...p, status: 'OK' } : p));
    setSelectedIds([]);
    setViewMode('LIST');
  };

  // Função para importar XML
  const handleXmlImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoadingXml(true);
    try {
      const text = await file.text();
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(text, 'text/xml');

      // Check for parsing errors
      const parserError = xmlDoc.getElementsByTagName('parsererror');
      if (parserError.length > 0) {
        throw new Error('XML inválido ou corrompido.');
      }

      // Extract NFe key
      const infNFeElement = xmlDoc.getElementsByTagName('infNFe')[0];
      const nfeKey = infNFeElement?.getAttribute('Id')?.replace('NFe', '') || '';

      // Extract emitter (fornecedor)
      const emit = xmlDoc.getElementsByTagName('emit')[0];
      const supplierName = emit?.getElementsByTagName('xNome')[0]?.textContent || 'Fornecedor Desconhecido';
      // Get UF from enderEmit (emitter address)
      const enderEmit = emit?.getElementsByTagName('enderEmit')[0];
      const supplierUF = enderEmit?.getElementsByTagName('UF')[0]?.textContent || '';

      // Pre-fetch all fiscal matrix mappings for this company to avoid multiple queries
      let fiscalMatrix: any[] = [];
      if (companyId) {
        const { data: matrixData } = await supabase
          .from('fiscal_cfop_mapping')
          .select('*')
          .eq('company_id', companyId);
        fiscalMatrix = matrixData || [];
      }

      // Extract products from <det> tags
      const detElements = xmlDoc.getElementsByTagName('det');
      const importedProducts: Product[] = [];

      for (let i = 0; i < detElements.length; i++) {
        const det = detElements[i];
        const prod = det.getElementsByTagName('prod')[0];
        const imposto = det.getElementsByTagName('imposto')[0];

        if (!prod) continue;

        // Basic product info
        const cProd = prod.getElementsByTagName('cProd')[0]?.textContent || `PROD-${Date.now()}-${i}`;
        const xProd = prod.getElementsByTagName('xProd')[0]?.textContent || 'Produto Importado';
        const ncm = prod.getElementsByTagName('NCM')[0]?.textContent || '';
        const cest = prod.getElementsByTagName('CEST')[0]?.textContent || '';
        const cfopXml = prod.getElementsByTagName('CFOP')[0]?.textContent || '';
        const uCom = prod.getElementsByTagName('uCom')[0]?.textContent || 'UN';
        const qCom = parseFloat(prod.getElementsByTagName('qCom')[0]?.textContent || '0');
        const vUnCom = parseFloat(prod.getElementsByTagName('vUnCom')[0]?.textContent || '0');
        const vProd = parseFloat(prod.getElementsByTagName('vProd')[0]?.textContent || '0');

        // Extract tax info (CST)
        let cstCsosn = '102';
        let cstPis = '99';
        let cstCofins = '99';
        let cstIpi = '99';

        if (imposto) {
          // ICMS
          const icms = imposto.getElementsByTagName('ICMS')[0];
          if (icms) {
            const csosn = icms.getElementsByTagName('CSOSN')[0]?.textContent ||
              icms.getElementsByTagName('CST')[0]?.textContent;
            if (csosn) cstCsosn = csosn;
          }

          // PIS
          const pis = imposto.getElementsByTagName('PIS')[0];
          if (pis) {
            const cst = pis.getElementsByTagName('CST')[0]?.textContent;
            if (cst) cstPis = cst;
          }

          // COFINS
          const cofins = imposto.getElementsByTagName('COFINS')[0];
          if (cofins) {
            const cst = cofins.getElementsByTagName('CST')[0]?.textContent;
            if (cst) cstCofins = cst;
          }

          // IPI
          const ipi = imposto.getElementsByTagName('IPI')[0];
          if (ipi) {
            const cst = ipi.getElementsByTagName('CST')[0]?.textContent;
            if (cst) cstIpi = cst;
          }
        }

        // Lookup fiscal matrix (De-Para NF-e) to auto-fill CFOPs and CSTs
        let cfopExitInternal = '';
        let cfopExitInterstate = '';
        let enquadramentoIpi = '';
        let matrixMatch: any = null;

        if (cfopXml && fiscalMatrix.length > 0) {
          // Try exact match: CFOP + UF
          matrixMatch = fiscalMatrix.find(m => m.cfop_supplier === cfopXml && m.uf === supplierUF);
          // Fallback: match by CFOP only (ignore UF)
          if (!matrixMatch) {
            matrixMatch = fiscalMatrix.find(m => m.cfop_supplier === cfopXml);
          }

          if (matrixMatch) {
            cfopExitInternal = matrixMatch.cfop_exit_internal || '';
            cfopExitInterstate = matrixMatch.cfop_exit_interstate || '';
            if (matrixMatch.cst_pis_cofins) {
              cstPis = matrixMatch.cst_pis_cofins;
              cstCofins = matrixMatch.cst_pis_cofins;
            }
            if (matrixMatch.cst_ipi) cstIpi = matrixMatch.cst_ipi;
            if (matrixMatch.enquadramento_ipi) enquadramentoIpi = matrixMatch.enquadramento_ipi;
          }
        }

        // Extract Regime Normal values from XML
        let origem = '0';
        let bcIcms = 0, aliqIcms = 0, valorIcms = 0;
        let bcPis = 0, aliqPis = 0, valorPis = 0;
        let bcCofins = 0, aliqCofins = 0, valorCofins = 0;
        let bcIpi = 0, aliqIpi = 0, valorIpi = 0;

        if (imposto) {
          // ICMS details
          const icms = imposto.getElementsByTagName('ICMS')[0];
          if (icms) {
            // Get the actual ICMS child (ICMS00, ICMS10, etc.)
            const icmsChild = icms.children[0];
            if (icmsChild) {
              const origVal = icmsChild.getElementsByTagName('orig')[0]?.textContent;
              if (origVal) origem = origVal;
              bcIcms = parseFloat(icmsChild.getElementsByTagName('vBC')[0]?.textContent || '0');
              aliqIcms = parseFloat(icmsChild.getElementsByTagName('pICMS')[0]?.textContent || '0');
              valorIcms = parseFloat(icmsChild.getElementsByTagName('vICMS')[0]?.textContent || '0');
            }
          }
          // PIS details
          const pisEl = imposto.getElementsByTagName('PIS')[0];
          if (pisEl) {
            const pisChild = pisEl.children[0];
            if (pisChild) {
              bcPis = parseFloat(pisChild.getElementsByTagName('vBC')[0]?.textContent || '0');
              aliqPis = parseFloat(pisChild.getElementsByTagName('pPIS')[0]?.textContent || '0');
              valorPis = parseFloat(pisChild.getElementsByTagName('vPIS')[0]?.textContent || '0');
            }
          }
          // COFINS details
          const cofinsEl = imposto.getElementsByTagName('COFINS')[0];
          if (cofinsEl) {
            const cofinsChild = cofinsEl.children[0];
            if (cofinsChild) {
              bcCofins = parseFloat(cofinsChild.getElementsByTagName('vBC')[0]?.textContent || '0');
              aliqCofins = parseFloat(cofinsChild.getElementsByTagName('pCOFINS')[0]?.textContent || '0');
              valorCofins = parseFloat(cofinsChild.getElementsByTagName('vCOFINS')[0]?.textContent || '0');
            }
          }
          // IPI details
          const ipiEl = imposto.getElementsByTagName('IPI')[0];
          if (ipiEl) {
            bcIpi = parseFloat(ipiEl.getElementsByTagName('vBC')[0]?.textContent || '0');
            aliqIpi = parseFloat(ipiEl.getElementsByTagName('pIPI')[0]?.textContent || '0');
            valorIpi = parseFloat(ipiEl.getElementsByTagName('vIPI')[0]?.textContent || '0');
          }
        }

        // Apply aliquotas from fiscal matrix if > 0 (overrides XML values)
        if (matrixMatch) {
          if (matrixMatch.aliq_icms > 0) aliqIcms = parseFloat(matrixMatch.aliq_icms) || 0;
          if (matrixMatch.aliq_pis > 0) aliqPis = parseFloat(matrixMatch.aliq_pis) || 0;
          if (matrixMatch.aliq_cofins > 0) aliqCofins = parseFloat(matrixMatch.aliq_cofins) || 0;
          if (matrixMatch.aliq_ipi > 0) aliqIpi = parseFloat(matrixMatch.aliq_ipi) || 0;
        }

        const newProduct: Product = {
          id: '', // Will be generated by Supabase
          isRequired: true,
          entryDate: new Date().toLocaleDateString('pt-BR'),
          code: cProd,
          nameFiscal: xProd.toUpperCase(),
          nameInternal: xProd,
          supplier: supplierName,
          ncm: ncm,
          cest: cest,
          cstCsosn: cstCsosn,
          cstPis: cstPis,
          cstCofins: cstCofins,
          cstIpi: cstIpi,
          enquadramentoIpi: enquadramentoIpi,
          cfopSupplier: cfopXml,
          cfopExitInternal: cfopExitInternal,
          cfopExitInterstate: cfopExitInterstate,
          codigoBeneficio: '',
          origem: origem,
          bcIcms: bcIcms,
          aliqIcms: aliqIcms,
          valorIcms: valorIcms,
          bcPis: bcPis,
          aliqPis: aliqPis,
          valorPis: valorPis,
          bcCofins: bcCofins,
          aliqCofins: aliqCofins,
          valorCofins: valorCofins,
          bcIpi: bcIpi,
          aliqIpi: aliqIpi,
          valorIpi: valorIpi,
          unit: uCom.toUpperCase(),
          costPrice: vUnCom,
          qty: qCom,
          totalCost: vProd,
          salePrice: vUnCom * 1.5, //  Margem padrão 50%
          status: 'Validado',
          isXmlImported: true,
          xmlKey: nfeKey
        };

        importedProducts.push(newProduct);
      }

      if (importedProducts.length === 0) {
        alert('Nenhum produto encontrado no XML.');
        return;
      }

      // Save products to Supabase
      if (!companyId) {
        alert('Erro: Empresa não identificada.');
        return;
      }

      const productsToInsert = importedProducts.map(p => ({
        company_id: companyId,
        code: p.code,
        name: p.nameFiscal,
        description: p.nameInternal,
        unit: p.unit,
        cost_price: p.costPrice,
        unit_price: p.costPrice,
        sale_price: p.salePrice,
        current_stock: p.qty,
        ncm: p.ncm,
        cest: p.cest,
        cst_csosn: p.cstCsosn,
        cst_pis: p.cstPis,
        cst_cofins: p.cstCofins,
        cst_ipi: p.cstIpi,
        enquadramento_ipi: p.enquadramentoIpi,
        cfop_supplier: p.cfopSupplier,
        cfop_exit_internal: p.cfopExitInternal,
        cfop_exit_interstate: p.cfopExitInterstate,
        codigo_beneficio: p.codigoBeneficio,
        origem: p.origem,
        bc_icms: p.bcIcms,
        aliq_icms: p.aliqIcms,
        valor_icms: p.valorIcms,
        bc_pis: p.bcPis,
        aliq_pis: p.aliqPis,
        valor_pis: p.valorPis,
        bc_cofins: p.bcCofins,
        aliq_cofins: p.aliqCofins,
        valor_cofins: p.valorCofins,
        bc_ipi: p.bcIpi,
        aliq_ipi: p.aliqIpi,
        valor_ipi: p.valorIpi,
        supplier: p.supplier,
        xml_key: p.xmlKey || null,
        is_xml_imported: true,
        status: 'Validado',
        entry_date: new Date().toISOString()
      }));

      const { error: insertError } = await supabase
        .from('inventory')
        .insert(productsToInsert);

      if (insertError) throw insertError;

      alert(`${importedProducts.length} produto(s) importado(s) e salvos com sucesso!`);
      fetchProducts();
    } catch (error: any) {
      console.error('Error parsing XML:', error);
      alert('Erro ao importar XML: ' + error.message);
    } finally {
      setLoadingXml(false);
      // Clear the input
      if (xmlInputRef.current) xmlInputRef.current.value = '';
    }
  };

  // --- MANIFEST LIST VIEW (Busca Notas) ---
  if (viewMode === 'MANIFEST_LIST') {
    return (
      <div className="space-y-4 animate-fade-in pb-10 max-w-[1600px] mx-auto">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setViewMode('LIST')}
              className="p-1.5 hover:bg-slate-100 rounded-full text-slate-500 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h2 className="text-xl font-serif font-bold text-slate-800 tracking-tight">Notas Fiscais Disponíveis</h2>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Manifestação do Destinatário (SEFAZ)</p>
            </div>
          </div>
          <button
            onClick={fetchManifestFromSefaz}
            disabled={loadingManifest}
            className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-5 py-2 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
          >
            {loadingManifest ? <Loader2 className="w-4 h-4 animate-spin" /> : <CloudDownload className="w-4 h-4" />}
            Atualizar Lista
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-50/50 text-[10px] uppercase font-bold text-slate-400 border-b border-slate-100 text-left">
                <th className="px-6 py-4">Chave de Acesso</th>
                <th className="px-6 py-4">Emitente / Fornecedor</th>
                <th className="px-6 py-4">Data Emissão</th>
                <th className="px-6 py-4 text-right">Valor Total</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-xs text-slate-600">
              {manifestInvoices.map(inv => (
                <tr key={inv.key} className="hover:bg-slate-50/30 transition-colors group">
                  <td className="px-6 py-4 font-mono text-[10px] text-slate-500 tracking-tighter">
                    {inv.key.match(/.{1,4}/g)?.join(' ')}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-black text-slate-700 uppercase">{inv.issuer}</span>
                      <span className="text-[9px] text-slate-400 font-bold">{inv.document}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-medium">{inv.date}</td>
                  <td className="px-6 py-4 text-right font-black text-slate-800">
                    {formatCurrency(inv.value)}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="px-2 py-0.5 rounded bg-green-50 text-green-700 text-[9px] font-black uppercase border border-green-100">
                      {inv.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button
                      onClick={() => alert(`Iniciando importação da nota: ${inv.key}`)}
                      className="bg-slate-800 hover:bg-slate-900 text-white px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-sm"
                    >
                      Importar XML
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // --- INVOICE FORM VIEW ---
  if (viewMode === 'INVOICE_FORM') {
    return (
      <div className="space-y-4 animate-fade-in pb-10 max-w-[1600px] mx-auto">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setViewMode('LIST')}
              className="p-1.5 hover:bg-slate-100 rounded-full text-slate-500 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h2 className="text-xl font-serif font-bold text-slate-800 tracking-tight">Emitir NF-e de Entrada</h2>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Nota Fiscal Avulsa (Entrada/Compra)</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-6">
          {/* Coluna Esquerda: Fornecedor e Itens */}
          <div className="col-span-8 space-y-6">
            <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden p-6 space-y-2">
              <SectionHeader title="Identificação do Fornecedor / Remetente" />
              <div className="border border-slate-200 rounded-b-xl overflow-hidden bg-slate-50/30">
                <div className="grid grid-cols-12 border-b border-slate-200">
                  <div className="col-span-2 flex items-center border-r border-slate-200 bg-slate-50 px-2">
                    <div className="flex bg-slate-200/50 p-0.5 rounded-lg w-full">
                      <button
                        onClick={() => setInvoiceForm({ ...invoiceForm, personType: 'PJ' })}
                        className={`flex-1 py-1 text-[9px] font-black rounded-md transition-all ${invoiceForm.personType === 'PJ' ? 'bg-white shadow text-slate-800' : 'text-slate-400'}`}
                      >
                        PJ
                      </button>
                      <button
                        onClick={() => setInvoiceForm({ ...invoiceForm, personType: 'PF' })}
                        className={`flex-1 py-1 text-[9px] font-black rounded-md transition-all ${invoiceForm.personType === 'PF' ? 'bg-white shadow text-slate-800' : 'text-slate-400'}`}
                      >
                        PF
                      </button>
                    </div>
                  </div>
                  <InputField
                    label={invoiceForm.personType === 'PJ' ? 'CNPJ' : 'CPF'}
                    value={invoiceForm.document}
                    onChange={(e: any) => setInvoiceForm({ ...invoiceForm, document: e.target.value })}
                    onBlur={handleCnpjBlur}
                    placeholder={invoiceForm.personType === 'PJ' ? '00.000.000/0000-00' : '000.000.000-00'}
                    className="col-span-2"
                  />
                  <InputField
                    label="Razão Social / Nome"
                    value={invoiceForm.name}
                    onChange={(e: any) => setInvoiceForm({ ...invoiceForm, name: e.target.value })}
                    className="col-span-5"
                  />
                  <InputField
                    label="Nome Fantasia"
                    value={invoiceForm.tradeName}
                    onChange={(e: any) => setInvoiceForm({ ...invoiceForm, tradeName: e.target.value })}
                    className="col-span-3 border-r-0"
                  />
                </div>
                <div className="grid grid-cols-12 border-b border-slate-200">
                  <InputField label="CEP" value={invoiceForm.zipCode} onChange={(e: any) => setInvoiceForm({ ...invoiceForm, zipCode: e.target.value })} onBlur={handleCepBlur} className="col-span-2" />
                  <InputField label="Endereço" value={invoiceForm.street} onChange={(e: any) => setInvoiceForm({ ...invoiceForm, street: e.target.value })} className="col-span-5" />
                  <InputField label="Número" value={invoiceForm.number} onChange={(e: any) => setInvoiceForm({ ...invoiceForm, number: e.target.value })} className="col-span-1" />
                  <InputField label="Complemento" value={invoiceForm.complement} onChange={(e: any) => setInvoiceForm({ ...invoiceForm, complement: e.target.value })} className="col-span-2" />
                  <InputField label="Bairro" value={invoiceForm.neighborhood} onChange={(e: any) => setInvoiceForm({ ...invoiceForm, neighborhood: e.target.value })} className="col-span-2 border-r-0" />
                </div>
                <div className="grid grid-cols-12">
                  <InputField label="Município" value={invoiceForm.city} onChange={(e: any) => setInvoiceForm({ ...invoiceForm, city: e.target.value })} className="col-span-4" />
                  <InputField label="UF" value={invoiceForm.state} onChange={(e: any) => setInvoiceForm({ ...invoiceForm, state: e.target.value })} className="col-span-1 text-center" />
                  <InputField label="Inscrição Estadual" value={invoiceForm.ie} onChange={(e: any) => setInvoiceForm({ ...invoiceForm, ie: e.target.value })} className="col-span-2" />
                  <InputField label="Telefone" value={invoiceForm.phone} onChange={(e: any) => setInvoiceForm({ ...invoiceForm, phone: e.target.value })} className="col-span-2" />
                  <InputField label="E-mail" value={invoiceForm.email} onChange={(e: any) => setInvoiceForm({ ...invoiceForm, email: e.target.value })} className="col-span-3 border-r-0" />
                </div>
              </div>

              <SectionHeader title="Itens da Nota de Entrada" />
              <div className="border border-slate-200 rounded-b-xl overflow-hidden shadow-sm">
                <table className="w-full text-center border-collapse text-[10px]">
                  <thead className="bg-[#4a5568] text-white text-[7px] uppercase font-black">
                    <tr className="divide-x divide-slate-600">
                      <th className="p-2 w-20">Codigo</th>
                      <th className="p-2 text-left">Descrição Fiscal</th>
                      <th className="p-2 w-16">Qtd</th>
                      <th className="p-2 w-24 text-right">Vl Unit</th>
                      <th className="p-2 w-28 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {invoiceForm.items.map((item, idx) => (
                      <tr key={idx} className="divide-x divide-slate-100 hover:bg-slate-50/50 transition-colors">
                        <td className="p-2 font-mono text-slate-500">{item.code}</td>
                        <td className="p-2 text-left font-black text-slate-700">{item.nameFiscal}</td>
                        <td className="p-2 font-black">{item.qty}</td>
                        <td className="p-2 text-right text-slate-600">{formatCurrency(item.costPrice)}</td>
                        <td className="p-2 text-right font-black text-slate-900 pr-2">{formatCurrency(item.totalCost)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Coluna Direita: Dados do Documento e Resumo */}
          <div className="col-span-4 space-y-6">
            <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden p-6 space-y-2">
              <SectionHeader title="Dados do Documento" />
              <div className="border border-slate-200 rounded-b-xl p-4 bg-white space-y-4">
                <div className="flex flex-col border border-slate-200 p-3 rounded-xl bg-slate-50/30">
                  <label className="text-[8px] text-slate-400 uppercase font-black mb-1">Natureza da Operação</label>
                  <input
                    value={invoiceForm.operationNature}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, operationNature: e.target.value })}
                    className="bg-transparent outline-none text-xs font-black text-slate-700"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col border border-slate-200 p-3 rounded-xl bg-slate-50/30">
                    <label className="text-[8px] text-slate-400 uppercase font-black mb-1">Data de Entrada</label>
                    <input
                      type="date"
                      value={invoiceForm.entryDate}
                      onChange={e => setInvoiceForm({ ...invoiceForm, entryDate: e.target.value })}
                      className="bg-transparent outline-none text-xs font-bold text-slate-700"
                    />
                  </div>
                  <div className="flex flex-col border border-slate-200 p-3 rounded-xl bg-slate-50/30">
                    <label className="text-[8px] text-slate-400 uppercase font-black mb-1">Valor Frete (R$)</label>
                    <input
                      type="number"
                      value={invoiceForm.freightValue}
                      onChange={e => setInvoiceForm({ ...invoiceForm, freightValue: parseFloat(e.target.value) || 0 })}
                      className="bg-transparent outline-none text-xs font-bold text-slate-700 text-right"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Resumo Financeiro Premium */}
            <div className="bg-slate-800 rounded-3xl p-8 text-white space-y-8 shadow-2xl relative overflow-hidden group">
              <div className="absolute -bottom-4 -right-4 w-32 h-32 bg-white/5 rounded-full blur-3xl group-hover:bg-white/10 transition-all duration-500"></div>

              <div className="relative z-10 space-y-6">
                <div>
                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Soma dos Itens</p>
                  <p className="text-2xl font-black font-mono tracking-tight">{formatCurrency(invoiceForm.totalAmount)}</p>
                </div>

                <div className="flex justify-between items-end border-b border-slate-700 pb-6">
                  <div>
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Frete</p>
                    <p className="text-sm font-bold font-mono text-slate-300">+{formatCurrency(invoiceForm.freightValue)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-amber-400 font-black uppercase tracking-widest mb-1">TOTAL DA NOTA</p>
                    <p className="text-4xl font-black font-mono text-amber-400 tracking-tighter">
                      {formatCurrency(invoiceForm.totalAmount + invoiceForm.freightValue)}
                    </p>
                  </div>
                </div>

                <button onClick={handleSaveInvoice} className="w-full flex items-center justify-center gap-3 bg-white text-slate-900 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg hover:bg-slate-50 transition-all active:scale-95 group">
                  <FileCheck className="w-5 h-5 text-slate-400 group-hover:text-slate-900 transition-colors" />
                  Finalizar Nota de Entrada
                </button>
              </div>
            </div>

            {/* Dados Adicionais */}
            <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden p-6 space-y-2">
              <SectionHeader title="Informações Adicionais" />
              <textarea
                className="w-full min-h-[100px] bg-slate-50/30 border border-slate-200 rounded-xl p-3 outline-none text-[10px] font-medium text-slate-600 uppercase leading-tight resize-none focus:border-slate-400 transition-all"
                placeholder="Observações complementares..."
                value={invoiceForm.additionalInfo}
                onChange={(e) => setInvoiceForm({ ...invoiceForm, additionalInfo: e.target.value })}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- FORM VIEW (Product Edit) ---
  if (viewMode === 'FORM') {
    const margin = formData.costPrice > 0 ? ((formData.salePrice - formData.costPrice) / formData.costPrice) * 100 : 0;
    return (
      <div className="space-y-4 animate-fade-in pb-10 max-w-[1600px] mx-auto">
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
                {formData.id ? 'Editar Produto' : 'Novo Produto'}
              </h2>
              <div className="flex items-center gap-2">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                  Gestão Fiscal de Itens
                </p>
                {formData.isXmlImported && (
                  <span className="flex items-center gap-1 text-[8px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-black uppercase tracking-tighter border border-slate-200">
                    <AlertCircle className="w-2.5 h-2.5" /> Importado via XML
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('LIST')}
              className="bg-white border border-slate-200 text-slate-600 hover:text-red-600 hover:border-red-200 px-6 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-95"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white px-8 py-2.5 rounded-xl text-xs font-bold shadow-md transition-all active:scale-95"
            >
              <Save className="w-4 h-4" /> Salvar Produto
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden p-6 space-y-2">
          <SectionHeader title="Dados de Identificação" />
          <div className="border border-slate-200 rounded-b-xl overflow-hidden bg-slate-50/30">
            <div className="grid grid-cols-12 border-b border-slate-200">
              <SelectField
                label="Obrigatoriedade"
                value={formData.isRequired ? 'Sim' : 'Não'}
                onChange={(e: any) => handleInputChange('isRequired', e.target.value === 'Sim')}
                className="col-span-2"
                disabled={formData.isXmlImported}
                options={[
                  { label: 'Sim', value: 'Sim' },
                  { label: 'Não', value: 'Não' }
                ]}
              />
              <InputField
                label="Código"
                value={formData.code}
                onChange={(e: any) => handleInputChange('code', e.target.value)}
                readOnly={formData.isXmlImported}
                className="col-span-2"
              />
              <InputField
                label="Descrição (Fiscal)"
                value={formData.nameFiscal}
                onChange={(e: any) => handleInputChange('nameFiscal', e.target.value)}
                readOnly={formData.isXmlImported}
                className="col-span-5"
              />
              <InputField
                label="Nome Interno"
                value={formData.nameInternal}
                onChange={(e: any) => handleInputChange('nameInternal', e.target.value)}
                className="col-span-3 border-r-0"
              />
            </div>
            <div className="grid grid-cols-12">
              <InputField
                label="Fornecedor"
                value={formData.supplier}
                onChange={(e: any) => handleInputChange('supplier', e.target.value)}
                className="col-span-4"
              />
              <InputField
                label="Chave XML (Importação)"
                value={formData.xmlKey || ''}
                onChange={(e: any) => handleInputChange('xmlKey', e.target.value)}
                readOnly={formData.isXmlImported}
                placeholder="Chave de acesso da NF-e vinculada"
                className="col-span-8 border-r-0"
              />
            </div>
          </div>

          <SectionHeader title="Classificação Fiscal" />
          <div className="border border-slate-200 rounded-b-xl overflow-hidden bg-slate-50/30">
            {/* Row 1: NCM, CEST, Origem (regime normal), CST/CSOSN */}
            <div className="grid grid-cols-12 border-b border-slate-200">
              <InputField
                label="NCM"
                value={formData.ncm}
                onChange={(e: any) => handleInputChange('ncm', e.target.value)}
                readOnly={formData.isXmlImported}
                className="col-span-2"
              />
              <InputField
                label="CEST"
                value={formData.cest}
                onChange={(e: any) => handleInputChange('cest', e.target.value)}
                readOnly={formData.isXmlImported}
                className="col-span-2"
              />
              {isRegimeNormal && (
                <SelectField
                  label="Origem"
                  value={formData.origem}
                  onChange={(e: any) => handleInputChange('origem', e.target.value)}
                  className="col-span-1"
                  options={[
                    { label: '0 - Nacional', value: '0' },
                    { label: '1 - Estrangeira (importação direta)', value: '1' },
                    { label: '2 - Estrangeira (adquirida no mercado interno)', value: '2' },
                    { label: '3 - Nacional (conteúdo importação > 40%)', value: '3' },
                    { label: '5 - Nacional (conteúdo importação ≤ 40%)', value: '5' },
                    { label: '6 - Estrangeira (importação direta, sem similar)', value: '6' },
                    { label: '7 - Estrangeira (adquirida, sem similar)', value: '7' },
                    { label: '8 - Nacional (conteúdo importação > 70%)', value: '8' }
                  ]}
                />
              )}
              <SelectField
                label={isRegimeNormal ? "CST ICMS" : "CST / CSOSN"}
                value={formData.cstCsosn}
                onChange={(e: any) => handleInputChange('cstCsosn', e.target.value)}
                className={isRegimeNormal ? "col-span-7 border-r-0" : "col-span-8 border-r-0"}
                options={isRegimeNormal ? [
                  { label: '00 - Tributada integralmente', value: '00' },
                  { label: '10 - Tributada com cobrança do ICMS por ST', value: '10' },
                  { label: '20 - Com redução de base de cálculo', value: '20' },
                  { label: '30 - Isenta/não tributada com cobrança ST', value: '30' },
                  { label: '40 - Isenta', value: '40' },
                  { label: '41 - Não tributada', value: '41' },
                  { label: '50 - Suspensão', value: '50' },
                  { label: '51 - Diferimento', value: '51' },
                  { label: '60 - ICMS cobrado anteriormente por ST', value: '60' },
                  { label: '70 - Redução BC com cobrança ST', value: '70' },
                  { label: '90 - Outros', value: '90' }
                ] : [
                  { label: '102 - Simples Nacional sem crédito', value: '102' },
                  { label: '101 - Simples Nacional com crédito', value: '101' },
                  { label: '500 - ICMS cobrado anteriormente por ST', value: '500' },
                  { label: '900 - Outros', value: '900' }
                ]}
              />
            </div>

            {/* Row 2 (Regime Normal): ICMS - B.C, Alíquota, Valor */}
            {isRegimeNormal && (
              <div className="grid grid-cols-12 border-b border-slate-200">
                <InputField
                  label="B.C ICMS"
                  value={formData.bcIcms}
                  onChange={(e: any) => handleInputChange('bcIcms', parseFloat(e.target.value) || 0)}
                  className="col-span-4"
                />
                <InputField
                  label="Alíq. ICMS %"
                  value={formData.aliqIcms}
                  onChange={(e: any) => handleInputChange('aliqIcms', parseFloat(e.target.value) || 0)}
                  className="col-span-4"
                />
                <InputField
                  label="Valor ICMS"
                  value={formData.valorIcms}
                  onChange={(e: any) => handleInputChange('valorIcms', parseFloat(e.target.value) || 0)}
                  className="col-span-4 border-r-0"
                />
              </div>
            )}

            {/* Row 3: CST PIS + detalhes (regime normal) */}
            <div className="grid grid-cols-12 border-b border-slate-200">
              <InputField
                label="CST PIS"
                value={formData.cstPis}
                onChange={(e: any) => handleInputChange('cstPis', e.target.value)}
                className={isRegimeNormal ? "col-span-3" : "col-span-4"}
              />
              {isRegimeNormal && (
                <>
                  <InputField
                    label="B.C PIS"
                    value={formData.bcPis}
                    onChange={(e: any) => handleInputChange('bcPis', parseFloat(e.target.value) || 0)}
                    className="col-span-3"
                  />
                  <InputField
                    label="Alíq. PIS %"
                    value={formData.aliqPis}
                    onChange={(e: any) => handleInputChange('aliqPis', parseFloat(e.target.value) || 0)}
                    className="col-span-3"
                  />
                  <InputField
                    label="Valor PIS"
                    value={formData.valorPis}
                    onChange={(e: any) => handleInputChange('valorPis', parseFloat(e.target.value) || 0)}
                    className="col-span-3 border-r-0"
                  />
                </>
              )}
              {!isRegimeNormal && (
                <>
                  <InputField
                    label="CST COFINS"
                    value={formData.cstCofins}
                    onChange={(e: any) => handleInputChange('cstCofins', e.target.value)}
                    className="col-span-4"
                  />
                  <InputField
                    label="CST IPI"
                    value={formData.cstIpi}
                    onChange={(e: any) => handleInputChange('cstIpi', e.target.value)}
                    className="col-span-2"
                  />
                  <InputField
                    label="Enquadramento IPI"
                    value={formData.enquadramentoIpi}
                    onChange={(e: any) => handleInputChange('enquadramentoIpi', e.target.value)}
                    className="col-span-2 border-r-0"
                  />
                </>
              )}
            </div>

            {/* Row 4 (Regime Normal): CST COFINS + detalhes */}
            {isRegimeNormal && (
              <div className="grid grid-cols-12 border-b border-slate-200">
                <InputField
                  label="CST COFINS"
                  value={formData.cstCofins}
                  onChange={(e: any) => handleInputChange('cstCofins', e.target.value)}
                  className="col-span-3"
                />
                <InputField
                  label="B.C COFINS"
                  value={formData.bcCofins}
                  onChange={(e: any) => handleInputChange('bcCofins', parseFloat(e.target.value) || 0)}
                  className="col-span-3"
                />
                <InputField
                  label="Alíq. COFINS %"
                  value={formData.aliqCofins}
                  onChange={(e: any) => handleInputChange('aliqCofins', parseFloat(e.target.value) || 0)}
                  className="col-span-3"
                />
                <InputField
                  label="Valor COFINS"
                  value={formData.valorCofins}
                  onChange={(e: any) => handleInputChange('valorCofins', parseFloat(e.target.value) || 0)}
                  className="col-span-3 border-r-0"
                />
              </div>
            )}

            {/* Row 5 (Regime Normal): CST IPI + detalhes */}
            {isRegimeNormal && (
              <div className="grid grid-cols-12 border-b border-slate-200">
                <InputField
                  label="CST IPI"
                  value={formData.cstIpi}
                  onChange={(e: any) => handleInputChange('cstIpi', e.target.value)}
                  className="col-span-2"
                />
                <InputField
                  label="B.C IPI"
                  value={formData.bcIpi}
                  onChange={(e: any) => handleInputChange('bcIpi', parseFloat(e.target.value) || 0)}
                  className="col-span-3"
                />
                <InputField
                  label="Alíq. IPI %"
                  value={formData.aliqIpi}
                  onChange={(e: any) => handleInputChange('aliqIpi', parseFloat(e.target.value) || 0)}
                  className="col-span-2"
                />
                <InputField
                  label="Valor IPI"
                  value={formData.valorIpi}
                  onChange={(e: any) => handleInputChange('valorIpi', parseFloat(e.target.value) || 0)}
                  className="col-span-3"
                />
                <InputField
                  label="Enquadramento IPI"
                  value={formData.enquadramentoIpi}
                  onChange={(e: any) => handleInputChange('enquadramentoIpi', e.target.value)}
                  className="col-span-2 border-r-0"
                />
              </div>
            )}

            {/* Row CFOPs + Código Benefício - always visible */}
            <div className="grid grid-cols-12">
              <InputField
                label="CFOP Fornecedor"
                value={formData.cfopSupplier}
                onChange={(e: any) => handleInputChange('cfopSupplier', e.target.value)}
                readOnly={formData.isXmlImported}
                className="col-span-3"
              />
              <InputField
                label="CFOP Saída Interna"
                value={formData.cfopExitInternal}
                onChange={(e: any) => handleInputChange('cfopExitInternal', e.target.value)}
                className="col-span-3"
              />
              <InputField
                label="CFOP Saída Interestadual"
                value={formData.cfopExitInterstate}
                onChange={(e: any) => handleInputChange('cfopExitInterstate', e.target.value)}
                className="col-span-3"
              />
              <InputField
                label="Cód. Benefício"
                value={formData.codigoBeneficio}
                onChange={(e: any) => handleInputChange('codigoBeneficio', e.target.value)}
                className="col-span-3 border-r-0"
              />
            </div>
          </div>

          <SectionHeader title="Valores e Estoque" />
          <div className="border border-slate-200 rounded-b-xl overflow-hidden bg-slate-50/30">
            <div className="grid grid-cols-12">
              <SelectField
                label="Unidade"
                value={formData.unit}
                onChange={(e: any) => handleInputChange('unit', e.target.value)}
                className="col-span-2"
                disabled={formData.isXmlImported}
                options={[
                  { label: 'UNIDADE (UN)', value: 'UN' },
                  { label: 'CAIXA (CX)', value: 'CX' },
                  { label: 'QUILO (KG)', value: 'KG' },
                  { label: 'METRO (MT)', value: 'MT' },
                  { label: 'LITRO (LT)', value: 'LT' },
                  { label: 'SERVIÇO (SV)', value: 'SV' }
                ]}
              />
              <InputField
                label="Custo Unitário (R$)"
                type="number"
                value={formData.costPrice}
                onChange={(e: any) => handleInputChange('costPrice', parseFloat(e.target.value) || 0)}
                readOnly={formData.isXmlImported}
                className="col-span-2"
              />
              <InputField
                label="Quantidade em Estoque"
                type="number"
                value={formData.qty}
                onChange={(e: any) => handleInputChange('qty', parseFloat(e.target.value) || 0)}
                readOnly={formData.isXmlImported}
                className="col-span-2 font-bold"
              />
              <div className="col-span-3 flex flex-col border-r border-slate-200 p-1.5 bg-slate-100/50">
                <label className="text-[7px] text-slate-400 uppercase font-bold mb-0.5">Custo Total de Estoque</label>
                <div className="text-[10px] font-black text-slate-500 font-mono mt-0.5">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(formData.totalCost)}
                </div>
              </div>
              <div className="col-span-3 flex flex-col p-1.5 bg-slate-800 text-white border-none">
                <div className="flex justify-between items-center mb-0.5">
                  <label className="text-[7px] text-slate-400 uppercase font-bold tracking-widest">Preço de Venda (Sugerido)</label>
                  {formData.costPrice > 0 && (
                    <span className={`text-[8px] font-black px-1 rounded ${margin >= 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                      {margin >= 0 ? '+' : ''}{margin.toFixed(0)}% MARGEM
                    </span>
                  )}
                </div>
                <input
                  type="number"
                  value={formData.salePrice}
                  onChange={(e) => handleInputChange('salePrice', parseFloat(e.target.value) || 0)}
                  className="bg-transparent outline-none text-sm font-black text-white w-full placeholder-slate-500"
                  placeholder="0,00"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const selectableCount = products.filter(p => p.status === 'NULL').length;
  const allSelectableDisabled = products.filter(p => p.status === 'NULL').length === 0;

  // --- LIST VIEW ---
  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-serif font-bold text-slate-800">Estoque</h2>
          <p className="text-slate-500 text-sm">Controle fiscal de produtos e gestão de saldos.</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            ref={xmlInputRef}
            type="file"
            accept=".xml"
            onChange={handleXmlImport}
            className="hidden"
          />
          <button
            onClick={() => xmlInputRef.current?.click()}
            disabled={loadingXml}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold bg-green-600 hover:bg-green-700 text-white shadow-md transition-all active:scale-95 text-xs disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loadingXml ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            Importar XML
          </button>
          <button
            onClick={() => setViewMode('MANIFEST_LIST')}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold bg-[#f8fafc] border border-slate-200 text-slate-600 hover:bg-slate-100 shadow-sm transition-all active:scale-95 text-xs"
          >
            <Search className="w-4 h-4" /> Busca Notas
          </button>
          <button
            onClick={() => handleConvertToNfe(selectedIds)}
            disabled={selectedIds.length === 0}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold shadow-md transition-all active:scale-95 text-xs ${selectedIds.length > 0
              ? 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer'
              : 'bg-slate-100 text-slate-400 cursor-not-allowed'
              }`}
          >
            <FileSignature className="w-4 h-4" /> Converter em NF-e {selectedIds.length > 0 ? `(${selectedIds.length})` : ''}
          </button>
          <button onClick={handleNew} className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white px-5 py-2.5 rounded-xl font-bold shadow-md transition-all active:scale-95 text-xs">
            <Plus className="w-4 h-4" /> Novo Produto
          </button>
        </div>
      </div>

      {/* Sefaz Tooltube matching NF-e style */}
      <div className="bg-slate-800 p-4 rounded-2xl shadow-xl flex flex-wrap gap-4 items-center">
        <div className="flex items-center gap-2 text-slate-300">
          <CloudDownload className="w-5 h-5" />
          <span className="text-[10px] font-black uppercase tracking-widest leading-none">Busca Sefaz</span>
        </div>
        <div className="relative flex-1 min-w-[300px]">
          <input
            type="text"
            placeholder="Cole aqui a Chave de Acesso (44 dígitos)..."
            className="w-full pl-4 pr-4 py-2 bg-slate-700/50 border border-slate-600 rounded-xl text-xs text-white placeholder-slate-500 focus:border-slate-400 outline-none transition-all font-mono"
          />
        </div>
        <button className="bg-white hover:bg-slate-100 text-slate-900 px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-md active:scale-95">
          Consultar
        </button>
      </div>

      {/* DataGrid Container */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col flex-1 min-h-0">
        {/* Search Bar */}
        <div className="bg-gradient-to-r from-slate-100 to-slate-50 border-b border-slate-200 px-4 py-2 flex items-center justify-center gap-2">
          <Search className="w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Pesquisar por descrição, código ou fornecedor..."
            className="bg-transparent text-xs text-slate-500 font-medium outline-none w-full max-w-md text-center placeholder:text-slate-400"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {selectedIds.length > 0 && (
            <button onClick={() => setSelectedIds([])} className="text-[10px] font-black text-red-400 hover:text-red-600 uppercase tracking-widest px-2 ml-4">
              Limpar Seleção ({selectedIds.length})
            </button>
          )}
        </div>

        <div className="overflow-x-auto flex-1">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b-2 border-slate-200">
                <th className="w-10 px-2 py-2.5 text-center border-r border-slate-200">
                  <button onClick={toggleSelectAll} disabled={allSelectableDisabled} className={`flex items-center justify-center mx-auto ${allSelectableDisabled ? 'opacity-20 cursor-not-allowed' : 'text-slate-400 hover:text-slate-800'}`}>
                    {selectedIds.length === selectableCount && selectableCount > 0 ? <CheckSquare className="w-4 h-4 text-slate-800" /> : <Square className="w-4 h-4" />}
                  </button>
                </th>
                {[
                  { key: 'codigo', label: 'Código / Entrada', width: 'w-32' },
                  { key: 'produto', label: 'Produto (Fis / Int)', width: 'min-w-[180px]' },
                  { key: 'fornecedor', label: 'Fornecedor / NCM', width: 'min-w-[140px]' },
                  { key: 'preco', label: 'Preço Custo', width: 'w-28' },
                  { key: 'saldo', label: 'Saldo', width: 'w-20' },
                  { key: 'margem', label: 'Margem / Venda', width: 'w-28' },
                  { key: 'status', label: 'Status', width: 'w-24' },
                ].map((col) => (
                  <th
                    key={col.key}
                    className={`${col.width} text-left px-2 py-2.5 border-r border-slate-200 last:border-r-0 select-none group cursor-default`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider truncate">{col.label}</span>
                    </div>
                  </th>
                ))}
                <th className="w-28 px-2 py-2.5 text-center">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Ações</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {products.filter(p => p.nameFiscal.toLowerCase().includes(searchTerm.toLowerCase()) || p.code.toLowerCase().includes(searchTerm.toLowerCase())).map((prod, idx) => (
                <tr key={prod.id} className={`border-b border-slate-100 transition-colors group cursor-default ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'} hover:bg-blue-50/50 ${selectedIds.includes(prod.id) ? 'bg-blue-50/60' : ''}`}>
                  <td className="px-2 py-1.5 text-center border-r border-slate-100">
                    <button onClick={() => toggleSelect(prod.id)} disabled={prod.status === 'OK'} className={`flex items-center justify-center mx-auto transition-colors ${prod.status === 'OK' ? 'opacity-10 cursor-not-allowed' : 'text-slate-300 hover:text-slate-600'}`}>
                      {selectedIds.includes(prod.id) ? <CheckSquare className="w-4 h-4 text-slate-800" /> : <Square className="w-4 h-4" />}
                    </button>
                  </td>
                  <td className="px-2 py-1.5 border-r border-slate-100">
                    <div className="flex flex-col">
                      <span className="text-[11px] font-bold font-mono text-slate-700">{prod.code}</span>
                      <span className="text-[9px] text-slate-400 font-bold uppercase">{prod.entryDate}</span>
                    </div>
                  </td>
                  <td className="px-2 py-1.5 border-r border-slate-100">
                    <div className="flex flex-col max-w-[200px]">
                      <span className="text-[11px] font-bold text-slate-700 truncate uppercase" title={prod.nameFiscal}>{prod.nameFiscal}</span>
                      <span className="text-[9px] text-slate-400 font-bold truncate italic">{prod.nameInternal}</span>
                    </div>
                  </td>
                  <td className="px-2 py-1.5 border-r border-slate-100">
                    <div className="flex flex-col max-w-[150px]">
                      <span className="text-[11px] font-bold text-slate-600 truncate">{prod.supplier}</span>
                      <span className="text-[9px] text-slate-400 font-mono italic">{prod.ncm || 'SEM NCM'}</span>
                    </div>
                  </td>
                  <td className="px-2 py-1.5 border-r border-slate-100 text-right">
                    <span className="text-[11px] font-medium text-slate-600">{formatCurrency(prod.costPrice)}</span>
                  </td>
                  <td className="px-2 py-1.5 border-r border-slate-100 text-center">
                    <span className={`inline-block px-1.5 py-0.5 rounded font-bold font-mono text-[10px] ${prod.qty > 0 ? 'bg-slate-100 text-slate-800' : 'bg-red-50 text-red-400'}`}>
                      {prod.qty} <span className="text-[8px] uppercase">{prod.unit}</span>
                    </span>
                  </td>
                  <td className="px-2 py-1.5 border-r border-slate-100 text-right">
                    <div className="flex flex-col items-end">
                      <span className="text-[11px] font-bold text-slate-800">{formatCurrency(prod.salePrice)}</span>
                      {prod.costPrice > 0 && (
                        <span className={`text-[8px] font-bold ${((prod.salePrice - prod.costPrice) / prod.costPrice) >= 0 ? 'text-green-500' : 'text-red-400'}`}>
                          {((prod.salePrice - prod.costPrice) / prod.costPrice * 100).toFixed(0)}% MARGEM
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-2 py-1.5 border-r border-slate-100 text-center">
                    <div className="flex items-center justify-center gap-1 font-bold uppercase text-[9px]">
                      <div className={`w-1.5 h-1.5 rounded-full ${prod.status === 'Validado' ? 'bg-green-500' : 'bg-orange-400 animate-pulse'}`}></div>
                      <span className={prod.status === 'Validado' ? 'text-green-700' : 'text-orange-500'}>{prod.status === 'Validado' ? 'Validado' : 'Pendente'}</span>
                    </div>
                  </td>
                  {/* Ações */}
                  <td className="px-2 py-1.5 text-center">
                    <div className="flex justify-center items-center gap-0.5">
                      {prod.status === 'NULL' && (
                        <button
                          onClick={() => handleConvertToNfe([prod.id])}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-all"
                          title="Gerar NF-e"
                        >
                          <FileSignature className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => handleEdit(prod)}
                        className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-md transition-all"
                        title="Editar Produto"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(prod.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-all"
                        title="Excluir"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-4 py-2 flex items-center justify-between mt-auto">
          <span className="text-[10px] font-bold text-slate-400">
            {products.length} registro(s)
          </span>
          <span className="text-[10px] text-slate-300">
            Fact ERP Contábil
          </span>
        </div>
      </div>
    </div>
  );
};

export default Inventory;