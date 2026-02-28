import React, { useState, useEffect, useRef, useCallback } from 'react';
import { partnerService } from '../../services/partnerService';
import {
  Plus, Search, Filter, Printer, Calendar, FileText, Eye, Edit, Trash2,
  Send, FileCheck, ArrowLeft, Save, Truck, CreditCard, Calculator, Loader2, AlertCircle, CheckCircle2, X, ChevronRight, MoreHorizontal, Receipt, DollarSign, Download
} from 'lucide-react';

// Interfaces for Form
interface SaleItem {
  id: number;
  productId: string | null;
  code: string;
  descFiscal: string;
  descInternal: string;
  unitPrice: number;
  qty: number;
  total: number;
  maxStock: number;
  // Fiscal fields (from inventory)
  ncm: string;
  cfop: string;
  cstIcms: string;
  origem: string;
  aliqIcms: number;
  aliqPis: number;
  aliqCofins: number;
  cstPis: string;
  cstCofins: string;
  cstIpi: string;
  aliqIpi: number;
}

interface InventoryProduct {
  id: string;
  code: string;
  name: string;
  description: string;
  sale_price: number;
  current_stock: number;
  // Fiscal data
  ncm: string;
  cfop_exit_internal: string;
  cfop_exit_interstate: string;
  cst_csosn: string;
  origem: string;
  aliq_icms: number;
  cst_pis: string;
  aliq_pis: number;
  cst_cofins: string;
  aliq_cofins: number;
  cst_ipi: string;
  aliq_ipi: number;
}

interface PaymentItem {
  id: number;
  method: string;
  amount: number;
}

interface SaleForm {
  id?: number;
  personType: 'PJ' | 'PF';
  document: string; // CNPJ or CPF
  name: string;
  tradeName: string;
  zipCode: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
  stateRegistration: string;
  phone: string;
  email: string;

  items: SaleItem[];

  freightType: 'CIF' | 'FOB' | 'Sem Frete';
  freightValue: number;
  discountValue: number;

  // Refactored Payment Section
  payments: PaymentItem[];

  additionalInfo: string;
}

// UI Components - Defined outside to prevent re-creation and loss of focus on re-render
const SectionHeader = ({ title }: { title: string }) => (
  <div className="bg-[#4a5568] text-white p-2 text-[10px] font-bold tracking-wide rounded-t-lg mt-4 first:mt-0">
    {title.toUpperCase()}
  </div>
);

const InputField = ({ label, value, onChange, onBlur, className = "", type = "text", readOnly = false, placeholder = "" }: any) => (
  <div className={`flex flex-col border-r border-slate-200 p-1.5 last:border-0 ${className}`}>
    <label className="text-[7px] text-slate-400 uppercase font-bold mb-0.5">{label}</label>
    <input
      type={type}
      value={value}
      onChange={onChange}
      onBlur={onBlur}
      readOnly={readOnly}
      placeholder={placeholder}
      className={`bg-transparent outline-none text-[10px] font-bold text-slate-700 w-full ${readOnly ? 'opacity-70' : ''}`}
    />
  </div>
);

import { supabase } from '../../services/supabase';

// ... other imports ...

interface SalesProps {
  companyId?: string | null;
}

const Sales: React.FC<SalesProps> = ({ companyId }) => {
  const [sales, setSales] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const [viewMode, setViewMode] = useState<'LIST' | 'FORM'>('LIST');
  const [searchTerm, setSearchTerm] = useState('');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [showDanfe, setShowDanfe] = useState(false);
  const [selectedSale, setSelectedSale] = useState<any>(null);
  const [companyData, setCompanyData] = useState<any>(null);
  const [taxRegime, setTaxRegime] = useState<string>('Simples Nacional');
  const isRegimeNormal = taxRegime === 'Lucro Presumido' || taxRegime === 'Lucro Real';

  // Inventory / Product Search State
  const [inventoryProducts, setInventoryProducts] = useState<InventoryProduct[]>([]);
  const [activeSearchItemId, setActiveSearchItemId] = useState<number | null>(null);
  const [activeSearchField, setActiveSearchField] = useState<'code' | 'descFiscal' | 'descInternal' | null>(null);
  const [filteredProducts, setFilteredProducts] = useState<InventoryProduct[]>([]);
  const searchDropdownRef = useRef<HTMLDivElement>(null);

  // Form State
  const [loadingCnpj, setLoadingCnpj] = useState(false);
  const [loadingCep, setLoadingCep] = useState(false);
  const [formData, setFormData] = useState<SaleForm>({
    personType: 'PJ',
    document: '',
    name: '',
    tradeName: '',
    zipCode: '',
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: '',
    stateRegistration: '',
    phone: '',
    email: '',
    items: [],
    freightType: 'Sem Frete',
    freightValue: 0,
    discountValue: 0,
    payments: [],
    additionalInfo: ''
  });

  const fetchSales = async () => {
    if (!companyId) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('sales')
        .select(`
          *,
          partners (name, document, email, phone, zip_code, street, number, complement, neighborhood, city, state),
          sale_items (id, product_id, code, desc_fiscal, desc_internal, qty, unit_price, total)
        `)
        .eq('company_id', companyId)
        .order('date', { ascending: false });

      if (error) throw error;
      setSales(data || []);
    } catch (error) {
      console.error('Error fetching sales:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCompanyData = async () => {
    if (!companyId) return;
    const { data } = await supabase
      .from('companies')
      .select('name, trade_name, cnpj, state_registration, street, number, complement, neighborhood, city, state, zip_code, phone, email, tax_regime')
      .eq('id', companyId)
      .single();
    if (data) setCompanyData(data);
  };

  const generateXml = (sale: any) => {
    const items = sale.sale_items || [];
    const partner = sale.partners || {};
    const comp = companyData || {};
    const xmlItems = items.map((item: any, i: number) => `
    <det nItem="${i + 1}">
      <prod>
        <cProd>${item.code || ''}</cProd>
        <xProd>${item.desc_fiscal || item.desc_internal || ''}</xProd>
        <qCom>${item.qty || 0}</qCom>
        <vUnCom>${(item.unit_price || 0).toFixed(2)}</vUnCom>
        <vProd>${(item.total || 0).toFixed(2)}</vProd>
      </prod>
    </det>`).join('');

    return `<?xml version="1.0" encoding="UTF-8"?>
<nfeProc xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">
  <NFe xmlns="http://www.portalfiscal.inf.br/nfe">
    <infNFe Id="NFe${sale.id}" versao="4.00">
      <ide>
        <cUF>35</cUF>
        <natOp>VENDA DE MERCADORIA</natOp>
        <mod>55</mod>
        <serie>1</serie>
        <nNF>${sale.id.slice(0, 6).toUpperCase()}</nNF>
        <dhEmi>${new Date(sale.date).toISOString()}</dhEmi>
        <tpNF>1</tpNF>
        <idDest>1</idDest>
        <tpAmb>2</tpAmb>
        <finNFe>1</finNFe>
      </ide>
      <emit>
        <CNPJ>${(comp.cnpj || '').replace(/\D/g, '')}</CNPJ>
        <xNome>${comp.name || ''}</xNome>
        <xFant>${comp.trade_name || ''}</xFant>
        <enderEmit>
          <xLgr>${comp.street || ''}</xLgr>
          <nro>${comp.number || ''}</nro>
          <xBairro>${comp.neighborhood || ''}</xBairro>
          <xMun>${comp.city || ''}</xMun>
          <UF>${comp.state || ''}</UF>
          <CEP>${(comp.zip_code || '').replace(/\D/g, '')}</CEP>
        </enderEmit>
        <IE>${(comp.state_registration || '').replace(/\D/g, '')}</IE>
        <CRT>${comp.tax_regime === 'Simples Nacional' ? '1' : '3'}</CRT>
      </emit>
      <dest>
        <CPF>${(partner.document || '').replace(/\D/g, '')}</CPF>
        <xNome>${partner.name || ''}</xNome>
        <enderDest>
          <xLgr>${partner.street || ''}</xLgr>
          <nro>${partner.number || ''}</nro>
          <xBairro>${partner.neighborhood || ''}</xBairro>
          <xMun>${partner.city || ''}</xMun>
          <UF>${partner.state || ''}</UF>
          <CEP>${(partner.zip_code || '').replace(/\D/g, '')}</CEP>
        </enderDest>
      </dest>${xmlItems}
      <total>
        <ICMSTot>
          <vProd>${(sale.total_amount || 0).toFixed(2)}</vProd>
          <vFrete>${(sale.freight_value || 0).toFixed(2)}</vFrete>
          <vNF>${(sale.total_amount || 0).toFixed(2)}</vNF>
        </ICMSTot>
      </total>
      <transp>
        <modFrete>${sale.freight_type === 'CIF' ? '0' : sale.freight_type === 'FOB' ? '1' : '9'}</modFrete>
      </transp>
      <infAdic>
        <infCpl>${sale.additional_info || ''}</infCpl>
      </infAdic>
    </infNFe>
  </NFe>
</nfeProc>`;
  };

  const handleDownloadXml = (sale: any) => {
    const xml = generateXml(sale);
    const blob = new Blob([xml], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `NFe_PED-${sale.id.slice(0, 6).toUpperCase()}.xml`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Fetch inventory products
  const fetchInventory = async () => {
    if (!companyId) return;
    try {
      const { data, error } = await supabase
        .from('inventory')
        .select('id, code, name, description, sale_price, current_stock, ncm, cfop_exit_internal, cfop_exit_interstate, cst_csosn, origem, aliq_icms, cst_pis, aliq_pis, cst_cofins, aliq_cofins, cst_ipi, aliq_ipi')
        .eq('company_id', companyId)
        .gt('current_stock', 0)
        .order('name', { ascending: true });

      if (error) throw error;
      setInventoryProducts(data || []);
    } catch (error) {
      console.error('Error fetching inventory:', error);
    }
  };

  useEffect(() => {
    if (companyId) {
      fetchSales();
      fetchInventory();
      fetchCompanyData();
      // Fetch tax regime
      (async () => {
        const { data } = await supabase
          .from('companies')
          .select('tax_regime')
          .eq('id', companyId)
          .single();
        if (data?.tax_regime) setTaxRegime(data.tax_regime);
      })();
    } else {
      setSales([]);
      setInventoryProducts([]);
    }
  }, [companyId]);

  // Logic: Initialize Form
  useEffect(() => {
    if (viewMode === 'FORM') {
      if (formData.items.length === 0) handleAddRow();
      if (formData.payments.length === 0) handleAddPayment();
    }
  }, [viewMode]);

  // Close search dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchDropdownRef.current && !searchDropdownRef.current.contains(event.target as Node)) {
        setActiveSearchItemId(null);
        setActiveSearchField(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // --- ITEM HANDLERS ---
  const handleAddRow = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { id: Date.now(), productId: null, code: '', descFiscal: '', descInternal: '', unitPrice: 0, qty: 1, total: 0, maxStock: 0, ncm: '', cfop: '', cstIcms: '', origem: '0', aliqIcms: 0, aliqPis: 0, aliqCofins: 0, cstPis: '', cstCofins: '', cstIpi: '', aliqIpi: 0 }]
    }));
  };

  const handleRemoveRow = (id: number) => {
    if (formData.items.length > 1) {
      setFormData(prev => ({
        ...prev,
        items: prev.items.filter(item => item.id !== id)
      }));
    }
  };

  const handleItemChange = (id: number, field: keyof SaleItem, value: any) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map(item => {
        if (item.id === id) {
          const updatedItem = { ...item, [field]: value };
          // Validate qty against max stock
          if (field === 'qty' && updatedItem.maxStock > 0) {
            const newQty = parseFloat(value) || 0;
            if (newQty > updatedItem.maxStock) {
              updatedItem.qty = updatedItem.maxStock;
              alert(`Quantidade máxima em estoque: ${updatedItem.maxStock}`);
            }
          }
          // Auto calc total
          if (field === 'qty' || field === 'unitPrice') {
            updatedItem.total = updatedItem.qty * updatedItem.unitPrice;
          }
          return updatedItem;
        }
        return item;
      })
    }));
  };

  // --- PRODUCT SEARCH ---
  const handleFieldSearch = (itemId: number, field: 'code' | 'descFiscal' | 'descInternal', value: string) => {
    // Update the item's own field value
    handleItemChange(itemId, field, value);
    setActiveSearchItemId(itemId);
    setActiveSearchField(field);

    if (value.trim().length === 0) {
      setFilteredProducts([]);
      return;
    }

    const q = value.toLowerCase();
    // Filter already-used product IDs (except the current item)
    const usedProductIds = formData.items
      .filter(item => item.id !== itemId && item.productId)
      .map(item => item.productId);

    const results = inventoryProducts.filter(p => {
      if (usedProductIds.includes(p.id)) return false;
      // Each field searches its own column
      if (field === 'code') return (p.code || '').toLowerCase().includes(q);
      if (field === 'descFiscal') return (p.name || '').toLowerCase().includes(q);
      if (field === 'descInternal') return (p.description || '').toLowerCase().includes(q);
      return false;
    });
    setFilteredProducts(results.slice(0, 8));
  };

  const handleProductSelect = (itemId: number, product: InventoryProduct) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map(item => {
        if (item.id === itemId) {
          return {
            ...item,
            productId: product.id,
            code: product.code || '',
            descFiscal: product.name || '',
            descInternal: product.description || product.name || '',
            unitPrice: parseFloat(String(product.sale_price)) || 0,
            qty: 1,
            total: parseFloat(String(product.sale_price)) || 0,
            maxStock: parseFloat(String(product.current_stock)) || 0,
            ncm: product.ncm || '',
            cfop: product.cfop_exit_internal || '',
            cstIcms: product.cst_csosn || '',
            origem: product.origem || '0',
            aliqIcms: parseFloat(String(product.aliq_icms)) || 0,
            cstPis: product.cst_pis || '',
            aliqPis: parseFloat(String(product.aliq_pis)) || 0,
            cstCofins: product.cst_cofins || '',
            aliqCofins: parseFloat(String(product.aliq_cofins)) || 0,
            cstIpi: product.cst_ipi || '',
            aliqIpi: parseFloat(String(product.aliq_ipi)) || 0
          };
        }
        return item;
      })
    }));
    setActiveSearchItemId(null);
    setActiveSearchField(null);
    setFilteredProducts([]);
  };

  const clearProductFromItem = (itemId: number) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map(item => {
        if (item.id === itemId) {
          return { ...item, productId: null, code: '', descFiscal: '', descInternal: '', unitPrice: 0, qty: 1, total: 0, maxStock: 0, ncm: '', cfop: '', cstIcms: '', origem: '0', aliqIcms: 0, aliqPis: 0, aliqCofins: 0, cstPis: '', cstCofins: '', cstIpi: '', aliqIpi: 0 };
        }
        return item;
      })
    }));
  };

  // --- PAYMENT HANDLERS ---
  const handleAddPayment = () => {
    setFormData(prev => ({
      ...prev,
      payments: [...prev.payments, { id: Date.now(), method: 'Dinheiro', amount: 0 }]
    }));
  };

  const handleRemovePayment = (id: number) => {
    if (formData.payments.length > 1) {
      setFormData(prev => ({
        ...prev,
        payments: prev.payments.filter(p => p.id !== id)
      }));
    }
  };

  const handlePaymentChange = (id: number, field: keyof PaymentItem, value: any) => {
    setFormData(prev => ({
      ...prev,
      payments: prev.payments.map(p => {
        if (p.id === id) {
          return { ...p, [field]: value };
        }
        return p;
      })
    }));
  };

  const handleInputChange = (field: keyof SaleForm, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // CNPJ Search using ReceitaWS
  const handleDocumentBlur = () => {
    if (formData.personType === 'PJ' && formData.document.length >= 14) {
      const cleanCnpj = formData.document.replace(/\D/g, '');
      if (cleanCnpj.length !== 14) return;

      setLoadingCnpj(true);

      const callbackName = `cnpjCallback_sales_${Math.random().toString(36).substr(2, 9)}`;
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
        setLoadingCnpj(false);
      };

      script.src = `https://www.receitaws.com.br/v1/cnpj/${cleanCnpj}?callback=${callbackName}`;
      script.onerror = () => {
        delete (window as any)[callbackName];
        document.body.removeChild(script);
        setLoadingCnpj(false);
        alert('Erro ao consultar o CNPJ. Tente novamente mais tarde.');
      };
      document.body.appendChild(script);
    }
  };

  const handleCepBlur = async () => {
    const cleanCep = formData.zipCode?.replace(/\D/g, '');
    if (cleanCep && cleanCep.length === 8) {
      setLoadingCep(true);
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
        setLoadingCep(false);
      }
    }
  };

  // --- CALCULATIONS ---
  const totalItems = formData.items.reduce((acc, item) => acc + item.total, 0);
  const discountValue = Number(formData.discountValue) || 0;
  const freightValue = Number(formData.freightValue) || 0;
  const totalSale = totalItems - discountValue + freightValue;
  const totalPaid = formData.payments.reduce((acc, p) => acc + p.amount, 0);

  // Rateio proporcional de desconto e frete por item
  const itemsWithRateio = formData.items.map(item => {
    const proportion = totalItems > 0 ? item.total / totalItems : 0;
    const discountShare = +(discountValue * proportion).toFixed(2);
    const freightShare = +(freightValue * proportion).toFixed(2);
    const bcItem = item.total - discountShare + freightShare;
    return {
      ...item,
      discountShare,
      freightShare,
      bc: bcItem,
      valorIcms: +(bcItem * (item.aliqIcms / 100)).toFixed(2),
      valorPis: +(bcItem * (item.aliqPis / 100)).toFixed(2),
      valorCofins: +(bcItem * (item.aliqCofins / 100)).toFixed(2),
      valorIpi: +(bcItem * (item.aliqIpi / 100)).toFixed(2),
    };
  });

  // Totais de impostos (para resumo)
  const totalIcms = itemsWithRateio.reduce((acc, i) => acc + i.valorIcms, 0);
  const totalPis = itemsWithRateio.reduce((acc, i) => acc + i.valorPis, 0);
  const totalCofins = itemsWithRateio.reduce((acc, i) => acc + i.valorCofins, 0);
  const totalIpi = itemsWithRateio.reduce((acc, i) => acc + i.valorIpi, 0);

  // Validation Logic
  const difference = totalSale - totalPaid;
  const isBalanced = Math.abs(difference) < 0.01; // Tolerance for float errors

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const formatDocument = (doc: string, type: 'PJ' | 'PF') => {
    const clean = doc.replace(/\D/g, '');
    if (type === 'PJ' && clean.length === 14) {
      return clean.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
    }
    if (type === 'PF' && clean.length === 11) {
      return clean.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
    }
    return doc;
  };

  const formatCEP = (cep: string) => {
    const clean = cep.replace(/\D/g, '');
    if (clean.length !== 8) return cep;
    return clean.replace(/^(\d{5})(\d{3})$/, '$1-$2');
  };

  const handleSave = async () => {
    if (!companyId) return;
    if (!formData.document) {
      alert("Informe o documento do cliente.");
      return;
    }

    // Check balance
    const totalItens = formData.items.reduce((acc, item) => acc + (item.qty * item.unitPrice), 0);
    const totalFrete = parseFloat(formData.freightValue.toString()) || 0;
    const totalDesc = parseFloat(formData.discountValue.toString()) || 0;
    const totalVenda = totalItens - totalDesc + totalFrete;
    const totalPago = formData.payments.reduce((acc, p) => acc + (parseFloat(p.amount.toString()) || 0), 0);

    const diff = Math.abs(totalVenda - totalPago);
    if (diff > 0.05) { // 5 cents tolerance
      alert(`O total dos pagamentos (R$ ${totalPago.toFixed(2)}) deve ser igual ao total da venda (R$ ${totalVenda.toFixed(2)}).`);
      return;
    }

    setIsLoading(true);
    try {
      const cleanDoc = formData.document.replace(/\D/g, '');
      const docType = formData.personType === 'PJ' ? 'CNPJ' : 'CPF';
      let formattedDoc = cleanDoc;
      if (docType === 'CNPJ' && cleanDoc.length === 14) {
        formattedDoc = cleanDoc.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
      } else if (docType === 'CPF' && cleanDoc.length === 11) {
        formattedDoc = cleanDoc.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "$1.$2.$3-$4");
      }

      // 1. Upsert Partner
      let partnerId;
      const { data: existingPartner } = await supabase
        .from('partners')
        .select('id')
        .eq('company_id', companyId)
        .eq('document', formattedDoc)
        .maybeSingle();

      if (existingPartner) {
        partnerId = existingPartner.id;
        // Optional: Update partner details if needed
      } else {
        const { data: newPartner, error: partnerError } = await supabase
          .from('partners')
          .insert({
            company_id: companyId,
            type: 'cliente',
            name: formData.name,
            document: formattedDoc,
            email: formData.email,
            phone: formData.phone,
            zip_code: formData.zipCode,
            street: formData.street,
            number: formData.number,
            complement: formData.complement,
            neighborhood: formData.neighborhood,
            city: formData.city,
            state: formData.state,
            status: 'Ativo'
          })
          .select()
          .single();

        if (partnerError) throw new Error('Erro ao salvar cliente: ' + partnerError.message);
        partnerId = newPartner.id;
      }

      // 2. Insert Sale
      const { data: newSale, error: saleError } = await supabase
        .from('sales')
        .insert({
          company_id: companyId,
          partner_id: partnerId,
          date: new Date().toISOString(),
          total_amount: totalVenda,
          freight_type: formData.freightType,
          freight_value: totalFrete,
          discount_value: totalDesc,
          additional_info: formData.additionalInfo,
          status: 'Pendente'
        })
        .select()
        .single();

      if (saleError) throw new Error('Erro ao salvar venda: ' + saleError.message);

      // 3. Insert Sale Items (with fiscal data and rateio)
      const itemsToInsert = itemsWithRateio.map(item => ({
        sale_id: newSale.id,
        product_id: item.productId || null,
        code: item.code,
        desc_fiscal: item.descFiscal,
        desc_internal: item.descInternal || item.descFiscal,
        unit_price: item.unitPrice,
        qty: item.qty,
        total: item.total,
        discount_share: item.discountShare,
        freight_share: item.freightShare,
        ncm: item.ncm,
        cfop: item.cfop,
        cst_icms: item.cstIcms,
        origem: item.origem,
        bc_icms: item.bc,
        aliq_icms: item.aliqIcms,
        valor_icms: item.valorIcms,
        cst_pis: item.cstPis,
        bc_pis: item.bc,
        aliq_pis: item.aliqPis,
        valor_pis: item.valorPis,
        cst_cofins: item.cstCofins,
        bc_cofins: item.bc,
        aliq_cofins: item.aliqCofins,
        valor_cofins: item.valorCofins,
        cst_ipi: item.cstIpi,
        bc_ipi: item.bc,
        aliq_ipi: item.aliqIpi,
        valor_ipi: item.valorIpi
      }));

      const { error: itemsError } = await supabase
        .from('sale_items')
        .insert(itemsToInsert);

      if (itemsError) throw new Error('Erro ao salvar itens: ' + itemsError.message);

      // 4. Dar baixa no estoque (decrementar current_stock)
      for (const item of formData.items) {
        if (item.productId && item.qty > 0) {
          const { error: stockError } = await supabase
            .from('inventory')
            .update({ current_stock: Math.max(0, item.maxStock - item.qty) })
            .eq('id', item.productId);

          if (stockError) {
            console.error(`Erro ao atualizar estoque do produto ${item.code}:`, stockError);
          }
        }
      }

      alert('Venda salva com sucesso! Estoque atualizado.');
      setViewMode('LIST');
      fetchSales();

    } catch (error: any) {
      console.error('Error saving sale:', error);
      alert('Erro ao salvar venda: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // --- FORM VIEW ---

  // --- FORM VIEW ---
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
              <h2 className="text-xl font-serif font-bold text-slate-800 tracking-tight">Lançamento de Venda</h2>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Nº Venda: <span className="text-slate-900">AUTO-002345</span></p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setViewMode('LIST')} className="flex items-center gap-2 bg-slate-200 hover:bg-slate-300 text-slate-700 px-6 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-95">
              <ArrowLeft className="w-4 h-4" /> Voltar
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden p-6 space-y-2">

          {/* Dados do Cliente */}
          <SectionHeader title="Identificação do Cliente / Destinatário" />
          <div className="border border-slate-200 rounded-b-xl overflow-hidden bg-slate-50/30">
            <div className="grid grid-cols-12 border-b border-slate-200">
              <div className="col-span-2 flex items-center border-r border-slate-200 bg-slate-50 px-2">
                <div className="flex bg-slate-200/50 p-0.5 rounded-lg w-full">
                  <button
                    onClick={() => setFormData(prev => ({ ...prev, personType: 'PJ' }))}
                    className={`flex-1 py-1 text-[9px] font-black rounded-md transition-all ${formData.personType === 'PJ' ? 'bg-white shadow text-slate-800' : 'text-slate-400'}`}
                  >
                    PJ
                  </button>
                  <button
                    onClick={() => setFormData(prev => ({ ...prev, personType: 'PF' }))}
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
                onBlur={handleDocumentBlur}
                placeholder={formData.personType === 'PJ' ? '00.000.000/0000-00' : '000.000.000-00'}
                className="col-span-2"
              />
              <InputField
                label="Razão Social / Nome"
                value={formData.name}
                onChange={(e: any) => handleInputChange('name', e.target.value)}
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
              <InputField label="CEP" value={formData.zipCode} onChange={(e: any) => handleInputChange('zipCode', e.target.value)} onBlur={handleCepBlur} className="col-span-2" />
              <InputField label="Endereço" value={formData.street} onChange={(e: any) => handleInputChange('street', e.target.value)} className="col-span-5" />
              <InputField label="Número" value={formData.number} onChange={(e: any) => handleInputChange('number', e.target.value)} className="col-span-1" />
              <InputField label="Complemento" value={formData.complement} onChange={(e: any) => handleInputChange('complement', e.target.value)} className="col-span-2" />
              <InputField label="Bairro" value={formData.neighborhood} onChange={(e: any) => handleInputChange('neighborhood', e.target.value)} className="col-span-2 border-r-0" />
            </div>
            <div className="grid grid-cols-12">
              <InputField label="Município" value={formData.city} onChange={(e: any) => handleInputChange('city', e.target.value)} className="col-span-4" />
              <InputField label="UF" value={formData.state} onChange={(e: any) => handleInputChange('state', e.target.value)} className="col-span-1 text-center" />
              <InputField label="Inscrição Estadual" value={formData.stateRegistration} onChange={(e: any) => handleInputChange('stateRegistration', e.target.value)} className="col-span-2" />
              <InputField label="Telefone" value={formData.phone} onChange={(e: any) => handleInputChange('phone', e.target.value)} className="col-span-2" />
              <InputField label="E-mail" value={formData.email} onChange={(e: any) => handleInputChange('email', e.target.value)} className="col-span-3 border-r-0" />
            </div>
          </div>

          {/* Itens da Venda */}
          <SectionHeader title="Dados dos Produtos e Serviços" />
          <div className="border border-slate-200 rounded-b-xl" style={{ position: 'relative', overflow: 'visible' }}>
            <table className="w-full text-center border-collapse text-[10px]">
              <thead className="bg-slate-50 text-[7px] border-b border-slate-200 text-slate-500 uppercase font-black">
                <tr className="divide-x divide-slate-100">
                  <th className="p-2 w-24">Código</th>
                  <th className="p-2 text-left">Descrição Fiscal (NF-e)</th>
                  <th className="p-2 text-left">Descrição Interna</th>
                  <th className="p-2 w-24 text-right">Vl. Unit.</th>
                  <th className="p-2 w-20">Qtd</th>
                  <th className="p-2 w-16">Estoque</th>
                  <th className="p-2 w-32 text-right">Subtotal</th>
                  <th className="p-2 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {formData.items.map((item) => (
                  <tr key={item.id} className="divide-x divide-slate-100 hover:bg-slate-50/50 transition-colors">
                    {/* Código - pesquisa pela coluna code */}
                    <td className="p-1">
                      {item.productId ? (
                        <div className="flex items-center gap-1">
                          <span className="font-bold text-slate-700 text-center flex-1">{item.code}</span>
                          <button onClick={() => clearProductFromItem(item.id)} className="text-slate-300 hover:text-red-500 transition-colors flex-shrink-0" title="Limpar produto">
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <input
                          value={item.code}
                          onChange={e => handleFieldSearch(item.id, 'code', e.target.value)}
                          onFocus={() => { setActiveSearchItemId(item.id); setActiveSearchField('code'); if (item.code) handleFieldSearch(item.id, 'code', item.code); }}
                          placeholder="Código..."
                          className="w-full bg-transparent outline-none text-center font-bold"
                        />
                      )}
                    </td>
                    {/* Descrição Fiscal - pesquisa pela coluna name */}
                    <td className="p-1 text-left">
                      {item.productId ? (
                        <span className="text-[10px] text-slate-700">{item.descFiscal}</span>
                      ) : (
                        <input
                          value={item.descFiscal}
                          onChange={e => handleFieldSearch(item.id, 'descFiscal', e.target.value)}
                          onFocus={() => { setActiveSearchItemId(item.id); setActiveSearchField('descFiscal'); if (item.descFiscal) handleFieldSearch(item.id, 'descFiscal', item.descFiscal); }}
                          placeholder="Descrição fiscal..."
                          className="w-full bg-transparent outline-none"
                        />
                      )}
                    </td>
                    {/* Descrição Interna - pesquisa pela coluna description */}
                    <td className="p-1 text-left">
                      {item.productId ? (
                        <span className="text-[10px] text-slate-500 italic">{item.descInternal}</span>
                      ) : (
                        <input
                          value={item.descInternal}
                          onChange={e => handleFieldSearch(item.id, 'descInternal', e.target.value)}
                          onFocus={() => { setActiveSearchItemId(item.id); setActiveSearchField('descInternal'); if (item.descInternal) handleFieldSearch(item.id, 'descInternal', item.descInternal); }}
                          placeholder="Descrição interna..."
                          className="w-full bg-transparent outline-none opacity-60 italic"
                        />
                      )}
                    </td>
                    {/* Vl. Unit. */}
                    <td className="p-1">
                      <input type="number" value={item.unitPrice} onChange={e => handleItemChange(item.id, 'unitPrice', parseFloat(e.target.value) || 0)} className="w-full bg-transparent outline-none text-right font-bold" />
                    </td>
                    {/* Qtd */}
                    <td className="p-1">
                      <input
                        type="number"
                        value={item.qty}
                        min={1}
                        max={item.maxStock > 0 ? item.maxStock : undefined}
                        onChange={e => handleItemChange(item.id, 'qty', parseFloat(e.target.value) || 0)}
                        className={`w-full bg-transparent outline-none text-center font-bold ${item.maxStock > 0 && item.qty >= item.maxStock ? 'text-amber-600' : ''}`}
                      />
                    </td>
                    {/* Estoque */}
                    <td className="p-1 text-center">
                      {item.maxStock > 0 ? (
                        <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${item.qty > item.maxStock ? 'bg-red-50 text-red-600' : item.qty === item.maxStock ? 'bg-amber-50 text-amber-600' : 'bg-green-50 text-green-600'}`}>
                          {item.maxStock}
                        </span>
                      ) : (
                        <span className="text-[9px] text-slate-300">—</span>
                      )}
                    </td>
                    {/* Subtotal */}
                    <td className="p-1 text-right font-black text-slate-800 pr-3">
                      {formatCurrency(item.total)}
                    </td>
                    <td className="p-1 text-center">
                      <button onClick={() => handleRemoveRow(item.id)} className="text-slate-300 hover:text-red-500 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                    </td>
                  </tr>
                ))}
                <tr className="bg-slate-50/30">
                  <td colSpan={8} className="p-2">
                    <button onClick={handleAddRow} className="flex items-center gap-1 mx-auto text-[8px] font-bold text-slate-500 hover:text-slate-800 transition-colors">
                      <Plus className="w-3 h-3" /> ADICIONAR ITEM
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Dropdown flutuante de resultados - sobrepõe o conteúdo abaixo */}
            {activeSearchItemId !== null && filteredProducts.length > 0 && (
              <div
                ref={searchDropdownRef}
                className="absolute left-0 right-0 z-[100] bg-white border border-slate-200 rounded-xl shadow-2xl animate-fade-in"
                style={{ top: '100%', maxHeight: '300px', overflowY: 'auto' }}
              >
                <div className="bg-gradient-to-r from-slate-50 to-slate-100 px-4 py-2 border-b border-slate-200 flex items-center justify-between sticky top-0 z-10">
                  <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                    <Search className="w-3.5 h-3.5" />
                    {filteredProducts.length} produto(s) encontrado(s) — pesquisando por {activeSearchField === 'code' ? 'código' : activeSearchField === 'descFiscal' ? 'descrição fiscal' : 'descrição interna'}
                  </span>
                  <button onClick={() => { setActiveSearchItemId(null); setActiveSearchField(null); setFilteredProducts([]); }} className="text-slate-400 hover:text-red-500 transition-colors p-0.5 rounded hover:bg-red-50">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                {filteredProducts.map(p => (
                  <button
                    key={p.id}
                    onClick={() => handleProductSelect(activeSearchItemId!, p)}
                    className="w-full text-left px-4 py-2.5 hover:bg-blue-50 transition-all border-b border-slate-100 last:border-0 group/item"
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-[10px] font-mono font-black text-slate-600 bg-slate-100 px-2 py-1 rounded min-w-[60px] text-center group-hover/item:bg-blue-100 group-hover/item:text-blue-700 transition-colors">{p.code || '—'}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-bold text-slate-700 truncate group-hover/item:text-blue-700 transition-colors">{p.name}</p>
                        {p.description && p.description !== p.name && (
                          <p className="text-[9px] text-slate-400 italic truncate">{p.description}</p>
                        )}
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-[11px] font-black text-green-600">{formatCurrency(parseFloat(String(p.sale_price)) || 0)}</p>
                        <p className="text-[9px] font-bold text-slate-400">Estoque: <span className="text-slate-600 font-black">{p.current_stock}</span></p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Pagamento e Frete */}
          <div className="grid grid-cols-12 gap-2 mt-4">
            <div className="col-span-8 space-y-2">
              <SectionHeader title="Dados de Pagamento, Frete e Desconto" />
              <div className="border border-slate-200 rounded-b-xl overflow-hidden bg-slate-50/30">
                <div className="grid grid-cols-12 border-b border-slate-200">
                  <div className="col-span-4 flex flex-col border-r border-slate-200 p-1.5">
                    <label className="text-[7px] text-slate-400 uppercase font-bold mb-0.5">Tipo de Frete</label>
                    <select
                      value={formData.freightType}
                      onChange={(e) => handleInputChange('freightType', e.target.value)}
                      className="bg-transparent outline-none text-[10px] font-bold text-slate-700 w-full appearance-none cursor-pointer"
                    >
                      <option>Sem Frete</option>
                      <option>CIF (Remetente)</option>
                      <option>FOB (Destinatário)</option>
                    </select>
                  </div>
                  <InputField
                    label="Valor do Frete (R$)"
                    type="number"
                    value={formData.freightValue}
                    onChange={(e: any) => handleInputChange('freightValue', parseFloat(e.target.value) || 0)}
                    className="col-span-4"
                  />
                  <InputField
                    label="Desconto (R$)"
                    type="number"
                    value={formData.discountValue}
                    onChange={(e: any) => handleInputChange('discountValue', parseFloat(e.target.value) || 0)}
                    className="col-span-4 border-r-0"
                  />
                </div>
                {/* Pagamentos */}
                <div className="p-0">
                  <table className="w-full text-[10px] border-collapse">
                    <thead className="bg-slate-100/50 text-[7px] text-slate-500 uppercase font-black border-b border-slate-200">
                      <tr className="divide-x divide-slate-200">
                        <th className="p-1 px-4 text-left">Meio de Pagamento</th>
                        <th className="p-1 px-4 text-right">Valor Pago (R$)</th>
                        <th className="p-1 px-4 w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {formData.payments.map((p) => (
                        <tr key={p.id} className="divide-x divide-slate-100">
                          <td className="p-1 px-2">
                            <select
                              value={p.method}
                              onChange={e => handlePaymentChange(p.id, 'method', e.target.value)}
                              className="w-full bg-transparent outline-none font-bold text-slate-700"
                            >
                              <option>Dinheiro</option>
                              <option>PIX</option>
                              <option>Cartão Crédito</option>
                              <option>Cartão Débito</option>
                              <option>Boleto Bancário</option>
                            </select>
                          </td>
                          <td className="p-1 px-2">
                            <input type="number" value={p.amount} onChange={e => handlePaymentChange(p.id, 'amount', parseFloat(e.target.value) || 0)} className="w-full bg-transparent outline-none text-right font-black" />
                          </td>
                          <td className="p-1 text-center">
                            <button onClick={() => handleRemovePayment(p.id)} className="text-slate-300 hover:text-red-500"><X className="w-3 h-3" /></button>
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-white/50">
                        <td colSpan={3} className="p-1.5">
                          <button onClick={handleAddPayment} className="flex items-center gap-1 mx-auto text-[7px] font-black text-slate-400 hover:text-slate-600 transition-colors uppercase">
                            <Plus className="w-2.5 h-2.5" /> Adicionar Parcela
                          </button>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <SectionHeader title="Informações Adicionais" />
              <div className="border border-slate-200 rounded-b-xl overflow-hidden bg-slate-50/30 p-2">
                <textarea
                  value={formData.additionalInfo}
                  onChange={e => handleInputChange('additionalInfo', e.target.value)}
                  className="w-full h-12 bg-transparent outline-none text-[10px] font-medium text-slate-600 resize-none leading-tight"
                  placeholder="Observações complementares da venda..."
                />
              </div>
            </div>

            {/* Resumo Financeiro */}
            <div className="col-span-4 space-y-2">
              <SectionHeader title="Resumo de Valores" />
              <div className="bg-slate-800 rounded-b-xl p-6 text-white space-y-6 shadow-xl relative overflow-hidden group">
                <Calculator className="absolute -bottom-4 -right-4 w-24 h-24 text-slate-700/30 rotate-12 group-hover:rotate-0 transition-all duration-500" />

                <div className="relative z-10 space-y-4">
                  <div>
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Total dos Itens</p>
                    <p className="text-lg font-bold font-mono">{formatCurrency(totalItems)}</p>
                  </div>

                  <div className="flex justify-between items-end border-b border-slate-700 pb-4">
                    <div className="space-y-1">
                      <div>
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Frete</p>
                        <p className="text-sm font-bold font-mono text-slate-300">+{formatCurrency(freightValue)}</p>
                      </div>
                      {discountValue > 0 && (
                        <div>
                          <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Desconto</p>
                          <p className="text-sm font-bold font-mono text-red-400">-{formatCurrency(discountValue)}</p>
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-gold-400 font-black uppercase tracking-widest">VALOR TOTAL</p>
                      <p className="text-3xl font-black font-mono text-gold-400">{formatCurrency(totalSale)}</p>
                    </div>
                  </div>

                  {/* Resumo de Impostos - somente Regime Normal */}
                  {isRegimeNormal && totalItems > 0 && (
                    <div className="border-b border-slate-700 pb-4 space-y-1">
                      <p className="text-[8px] text-slate-500 font-black uppercase tracking-widest mb-2">Impostos Calculados</p>
                      <div className="flex justify-between text-[10px]">
                        <span className="text-slate-400">ICMS</span>
                        <span className="font-bold font-mono text-amber-300">{formatCurrency(totalIcms)}</span>
                      </div>
                      <div className="flex justify-between text-[10px]">
                        <span className="text-slate-400">PIS</span>
                        <span className="font-bold font-mono text-amber-300">{formatCurrency(totalPis)}</span>
                      </div>
                      <div className="flex justify-between text-[10px]">
                        <span className="text-slate-400">COFINS</span>
                        <span className="font-bold font-mono text-amber-300">{formatCurrency(totalCofins)}</span>
                      </div>
                      <div className="flex justify-between text-[10px]">
                        <span className="text-slate-400">IPI</span>
                        <span className="font-bold font-mono text-amber-300">{formatCurrency(totalIpi)}</span>
                      </div>
                      <div className="flex justify-between text-[10px] pt-1 border-t border-slate-700">
                        <span className="text-slate-300 font-bold">Total Impostos</span>
                        <span className="font-black font-mono text-amber-200">{formatCurrency(totalIcms + totalPis + totalCofins + totalIpi)}</span>
                      </div>
                    </div>
                  )}

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Total Pago</p>
                      <span className={`text-[8px] px-1.5 py-0.5 rounded font-black uppercase ${isBalanced ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                        {isBalanced ? 'CONFERIDO' : 'DIVERGENTE'}
                      </span>
                    </div>
                    <p className={`text-xl font-bold font-mono ${isBalanced ? 'text-green-400' : 'text-white'}`}>{formatCurrency(totalPaid)}</p>
                  </div>

                  {!isBalanced && (
                    <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                      <p className="text-[9px] font-black text-red-300 uppercase leading-none mb-1">Diferença / Saldo</p>
                      <p className="text-lg font-black text-red-200 font-mono tracking-tighter">
                        {difference > 0 ? `FALTAM ${formatCurrency(difference)}` : `EXCEDENTE ${formatCurrency(Math.abs(difference))}`}
                      </p>
                    </div>
                  )}

                  {isBalanced && (
                    <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-green-400" />
                      <p className="text-[10px] font-black text-green-200 uppercase">Valores em equilíbrio</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Botão Finalizar Venda - no final do formulário */}
          <div className="flex justify-end gap-3 pt-4 mt-4 border-t border-slate-200">
            <button onClick={() => setViewMode('LIST')} className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-600 px-6 py-3 rounded-xl text-sm font-bold transition-all active:scale-95">
              <ArrowLeft className="w-4 h-4" /> Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={!isBalanced || isLoading}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-10 py-3 rounded-xl text-sm font-bold shadow-lg hover:shadow-xl transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
              {isLoading ? 'Salvando...' : 'Finalizar Venda'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- LIST VIEW ---
  const [hiddenColumns, setHiddenColumns] = useState<string[]>([]);

  return (
    <div className="flex flex-col gap-4 animate-fade-in h-[calc(100vh-120px)]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-serif font-bold text-slate-800">Vendas</h2>
          <p className="text-slate-500 text-sm">Gerencie suas vendas e emita notas fiscais (Saídas).</p>
        </div>
        <button
          onClick={() => setViewMode('FORM')}
          className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white px-5 py-2.5 rounded-xl font-bold shadow-md transition-all active:scale-95 text-xs"
        >
          <Plus className="w-4 h-4" /> Nova Venda (Faturamento)
        </button>
      </div>

      {/* DataGrid Container */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col flex-1 min-h-0">
        {/* Search Bar */}
        <div className="bg-gradient-to-r from-slate-100 to-slate-50 border-b border-slate-200 px-4 py-2 flex items-center justify-center gap-2">
          <Search className="w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Pesquisar por cliente, documento ou número da nota..."
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

        {isLoading ? (
          <div className="p-20 flex flex-col items-center justify-center gap-3 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-slate-300" />
            <p className="text-[10px] font-black uppercase tracking-widest">Sincronizando dados...</p>
          </div>
        ) : (
          <div className="overflow-x-auto flex-1">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b-2 border-slate-200">
                  {[
                    { key: 'venda', label: 'Nº Venda / NFe', width: 'w-36' },
                    { key: 'data', label: 'Data', width: 'w-24' },
                    { key: 'cliente', label: 'Cliente / Destinatário', width: 'min-w-[180px]' },
                    { key: 'produto', label: 'Produto', width: 'min-w-[140px]' },
                    { key: 'valor', label: 'Valor Total', width: 'w-28' },
                    { key: 'status', label: 'Status', width: 'w-24' },
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
                {sales.length > 0 ? (
                  sales.map((item, idx) => (
                    <tr
                      key={item.id}
                      className={`border-b border-slate-100 transition-colors group cursor-default ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'} hover:bg-blue-50/50`}
                    >
                      {!hiddenColumns.includes('venda') && (
                        <td className="px-2 py-1.5 border-r border-slate-100">
                          <div className="flex flex-col">
                            <span className="text-[11px] font-bold text-slate-700" title={item.id}>PED-{item.id.slice(0, 6).toUpperCase()}</span>
                            <span className="text-[9px] text-slate-400 font-bold uppercase">{item.nfe ? `NF-e ${item.nfe}` : 'Sem Nota'}</span>
                          </div>
                        </td>
                      )}
                      {!hiddenColumns.includes('data') && (
                        <td className="px-2 py-1.5 border-r border-slate-100">
                          <span className="text-[11px] font-medium text-slate-600">{new Date(item.date).toLocaleDateString('pt-BR')}</span>
                        </td>
                      )}
                      {!hiddenColumns.includes('cliente') && (
                        <td className="px-2 py-1.5 border-r border-slate-100">
                          <div className="flex flex-col">
                            <span className="text-[11px] font-bold text-slate-800 truncate block max-w-[220px]">{item.partners?.name || 'Cliente não identificado'}</span>
                            <span className="text-[9px] text-slate-400 font-mono">{item.partners?.document || '-'}</span>
                          </div>
                        </td>
                      )}
                      {!hiddenColumns.includes('produto') && (
                        <td className="px-2 py-1.5 border-r border-slate-100">
                          <span className="text-[11px] font-medium text-slate-600 truncate block max-w-[180px]">
                            {item.sale_items?.[0]?.desc_internal || 'Item Diverso'}
                            {item.sale_items?.length > 1 && <span className="text-[8px] bg-slate-100 px-1 ml-1 rounded-sm text-slate-500">+{item.sale_items.length - 1}</span>}
                          </span>
                        </td>
                      )}
                      {!hiddenColumns.includes('valor') && (
                        <td className="px-2 py-1.5 border-r border-slate-100 text-right">
                          <span className="text-[11px] font-bold text-slate-800">{formatCurrency(item.total_amount)}</span>
                        </td>
                      )}
                      {!hiddenColumns.includes('status') && (
                        <td className="px-2 py-1.5 border-r border-slate-100 text-center">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase border inline-block ${item.status === 'Emitida' ? 'bg-green-50 text-green-700 border-green-100' :
                            item.status === 'Cancelada' ? 'bg-red-50 text-red-700 border-red-100' :
                              'bg-amber-50 text-amber-700 border-amber-100'
                            }`}>
                            {item.status || 'Pendente'}
                          </span>
                        </td>
                      )}
                      {/* Ações */}
                      <td className="px-2 py-1.5 text-center">
                        <div className="flex justify-center items-center gap-0.5">
                          <button
                            onClick={() => { setSelectedSale(item); setShowDanfe(true); }}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-all"
                            title="Visualizar prévia NF-e"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => alert('Edição em breve')}
                            className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-md transition-all"
                            title="Editar Venda"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => { setSelectedSale(item); setShowReceipt(true); }}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-all"
                            title="Recibo"
                          >
                            <Receipt className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={async () => {
                              if (item.status === 'Emitida') {
                                alert('Não é possível excluir uma venda com status "Emitida".');
                                return;
                              }
                              if (window.confirm('Deseja realmente excluir esta venda?\n\nOs produtos serão devolvidos ao estoque.')) {
                                try {
                                  const { data: saleItems, error: itemsFetchError } = await supabase
                                    .from('sale_items')
                                    .select('id, product_id, qty')
                                    .eq('sale_id', item.id);
                                  if (itemsFetchError) throw itemsFetchError;
                                  if (saleItems && saleItems.length > 0) {
                                    for (const si of saleItems) {
                                      if (si.product_id && si.qty > 0) {
                                        const { data: prodData } = await supabase
                                          .from('inventory')
                                          .select('current_stock')
                                          .eq('id', si.product_id)
                                          .single();
                                        if (prodData) {
                                          const newStock = (parseFloat(prodData.current_stock) || 0) + (parseFloat(si.qty) || 0);
                                          await supabase.from('inventory').update({ current_stock: newStock }).eq('id', si.product_id);
                                        }
                                      }
                                    }
                                    const { error: itemsDelError } = await supabase.from('sale_items').delete().eq('sale_id', item.id);
                                    if (itemsDelError) throw itemsDelError;
                                  }
                                  const { error } = await supabase.from('sales').delete().eq('id', item.id);
                                  if (error) throw error;
                                  alert('Venda excluída e estoque restaurado com sucesso!');
                                  fetchSales();
                                } catch (e: any) {
                                  alert('Erro ao excluir: ' + e.message);
                                }
                              }
                            }}
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
                    <td colSpan={7 - hiddenColumns.length} className="px-4 py-12 text-center">
                      <p className="text-slate-400 text-sm mb-2">Nenhuma venda encontrada.</p>
                      <p className="text-[10px] text-slate-300 uppercase font-black tracking-widest leading-loose">
                        Clique em "Nova Venda" para criar.
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-4 py-2 flex items-center justify-between mt-auto">
          <span className="text-[10px] font-bold text-slate-400">
            {sales.length} registro(s)
          </span>
          <span className="text-[10px] text-slate-300">
            Fact ERP Contábil
          </span>
        </div>
      </div>
      {/* Receipt Modal */}
      {showReceipt && selectedSale && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-2xl rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-slate-100 flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
              <div className="flex items-center gap-3">
                <Receipt className="w-5 h-5 text-blue-500" />
                <h3 className="text-lg font-bold text-slate-800">Recibo de Venda</h3>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                >
                  <Printer className="w-3.5 h-3.5" /> Imprimir
                </button>
                <button
                  onClick={() => setShowReceipt(false)}
                  className="p-2 hover:bg-slate-100 rounded-full text-slate-300 hover:text-slate-800 transition-all border border-transparent hover:border-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-10 overflow-y-auto space-y-10 print:p-0">
              {/* Seller Information */}
              <div className="flex justify-between items-start border-b-2 border-slate-900 pb-6">
                <div className="space-y-1">
                  <h4 className="text-xl font-black text-slate-900 uppercase tracking-tighter">FACT ASSESSORIA E CONSULTORIA</h4>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">CNPJ: 30.321.587/0001-22</p>
                  <p className="text-[10px] font-medium text-slate-400">Av. das Américas, 500 - Bloco 02, Sala 301</p>
                  <p className="text-[10px] font-medium text-slate-400">Rio de Janeiro, RJ - CEP: 22640-100</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Recibo Nº</p>
                  <p className="text-2xl font-black text-slate-900">PED-{selectedSale.id.slice(0, 6).toUpperCase()}</p>
                  <p className="text-[10px] font-bold text-slate-400 mt-2">{new Date(selectedSale.date).toLocaleDateString('pt-BR')}</p>
                </div>
              </div>

              {/* Customer Information */}
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
                  <FileCheck className="w-4 h-4 text-slate-400" />
                  <h5 className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Dados do Cliente</h5>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <p className="text-[8px] font-black text-slate-400 uppercase">Nome / Razão Social</p>
                    <p className="text-xs font-bold text-slate-800 uppercase">{selectedSale.partners?.name || 'Cliente não identificado'}</p>
                  </div>
                  <div>
                    <p className="text-[8px] font-black text-slate-400 uppercase">CNPJ / CPF</p>
                    <p className="text-xs font-bold text-slate-800 font-mono tracking-tight">{selectedSale.partners?.document || '-'}</p>
                  </div>
                </div>
              </div>

              {/* Products Information */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Calculator className="w-4 h-4 text-slate-400" />
                  <h5 className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Detalhamento dos Itens</h5>
                </div>
                <div className="border border-slate-200 rounded-2xl overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 text-[8px] font-black text-slate-400 uppercase border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3">Item / Descrição</th>
                        <th className="px-4 py-3 text-center">Qtde</th>
                        <th className="px-4 py-3 text-right">Vl. Unit.</th>
                        <th className="px-4 py-3 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                      {selectedSale.sale_items?.map((item: any, index: number) => (
                        <tr key={index}>
                          <td className="px-4 py-4 font-bold">{item.desc_internal}</td>
                          <td className="px-4 py-4 text-center">{item.qty}</td>
                          <td className="px-4 py-4 text-right font-mono text-slate-500">{formatCurrency(item.unit_price)}</td>
                          <td className="px-4 py-4 text-right font-black text-slate-900">{formatCurrency(item.total)}</td>
                        </tr>
                      ))}
                      {!selectedSale.sale_items?.length && (
                        <tr>
                          <td colSpan={4} className="px-4 py-4 text-center italic text-slate-400">Detalhes dos itens indisponíveis.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Total and Additional Info */}
              <div className="grid grid-cols-12 gap-10 border-t border-slate-100 pt-8">
                <div className="col-span-7 space-y-4">
                  <div className="space-y-1">
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Informações Adicionais</p>
                    <p className="text-[10px] text-slate-600 italic leading-relaxed">
                      {selectedSale.additional_info || "Nenhuma observação informada."}
                    </p>
                  </div>
                </div>
                <div className="col-span-5 bg-slate-900 rounded-3xl p-8 text-white relative overflow-hidden shrink-0 h-fit">
                  <DollarSign className="absolute -bottom-4 -right-4 w-20 h-20 text-slate-800 rotate-12" />
                  <div className="relative z-10 text-right space-y-2">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Pago</p>
                    <p className="text-3xl font-black font-mono tracking-tighter text-blue-400">{formatCurrency(selectedSale.total_amount)}</p>
                  </div>
                </div>
              </div>

              <div className="text-center pt-10">
                <p className="text-[8px] font-bold text-slate-300 uppercase tracking-[0.2em]">Emitido por FACT ERP • {new Date().toLocaleDateString('pt-BR')}</p>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* DANFE Preview Modal */}
      {showDanfe && selectedSale && (() => {
        const comp = companyData || {};
        const partner = selectedSale.partners || {};
        const items = selectedSale.sale_items || [];
        const totalProdutos = items.reduce((acc: number, i: any) => acc + (i.total || 0), 0);
        const frete = selectedSale.freight_value || 0;
        return (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-slate-200 flex flex-col max-h-[95vh]">
              {/* Modal Header */}
              <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-slate-600" />
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">Prévia da DANFE</h3>
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Documento Auxiliar da Nota Fiscal Eletrônica</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleDownloadXml(selectedSale)}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                  >
                    <Download className="w-3.5 h-3.5" /> Baixar XML
                  </button>
                  <button
                    onClick={() => window.print()}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                  >
                    <Printer className="w-3.5 h-3.5" /> Imprimir
                  </button>
                  <button
                    onClick={() => setShowDanfe(false)}
                    className="p-2 hover:bg-slate-200 rounded-full text-slate-400 hover:text-slate-800 transition-all"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* DANFE Content */}
              <div className="overflow-y-auto p-6 print:p-0">
                <div className="border-2 border-slate-900 font-mono text-[9px]">

                  {/* ═══ HEADER - Identificação ═══ */}
                  <div className="grid grid-cols-12 border-b-2 border-slate-900">
                    {/* Emitente */}
                    <div className="col-span-7 border-r-2 border-slate-900 p-3">
                      <p className="text-[11px] font-black text-slate-900 uppercase leading-tight">{comp.name || 'EMITENTE'}</p>
                      {comp.trade_name && <p className="text-[9px] font-bold text-slate-600">{comp.trade_name}</p>}
                      <p className="text-[8px] text-slate-500 mt-1">
                        {comp.street}{comp.number ? `, ${comp.number}` : ''}{comp.complement ? ` - ${comp.complement}` : ''}
                      </p>
                      <p className="text-[8px] text-slate-500">
                        {comp.neighborhood} - {comp.city} / {comp.state} - CEP: {comp.zip_code}
                      </p>
                      <p className="text-[8px] text-slate-500">Fone: {comp.phone || '-'}</p>
                    </div>
                    {/* DANFE Title */}
                    <div className="col-span-2 border-r-2 border-slate-900 p-2 flex flex-col items-center justify-center text-center">
                      <p className="text-[14px] font-black text-slate-900 leading-none">DANFE</p>
                      <p className="text-[6px] text-slate-500 font-bold uppercase mt-0.5 leading-tight">Documento Auxiliar da Nota Fiscal Eletrônica</p>
                      <div className="mt-2 border border-slate-400 px-2 py-0.5">
                        <p className="text-[7px] font-bold text-slate-500">ENTRADA</p>
                        <p className="text-[7px] font-bold text-slate-500">0 - ENTRADA</p>
                        <p className="text-[7px] font-black text-slate-900">1 - SAÍDA</p>
                      </div>
                      <p className="text-[11px] font-black text-slate-900 border border-slate-900 px-3 py-0.5 mt-1">1</p>
                    </div>
                    {/* Número / Série */}
                    <div className="col-span-3 p-2 flex flex-col justify-between">
                      <div>
                        <p className="text-[7px] text-slate-400 font-bold uppercase">Nº</p>
                        <p className="text-[12px] font-black text-slate-900">PED-{selectedSale.id.slice(0, 6).toUpperCase()}</p>
                      </div>
                      <div>
                        <p className="text-[7px] text-slate-400 font-bold uppercase">Série</p>
                        <p className="text-[10px] font-black text-slate-900">001</p>
                      </div>
                      <div>
                        <p className="text-[7px] text-slate-400 font-bold uppercase">Folha</p>
                        <p className="text-[10px] font-bold text-slate-600">1/1</p>
                      </div>
                    </div>
                  </div>

                  {/* ═══ Chave de Acesso / Código de Barras ═══ */}
                  <div className="border-b-2 border-slate-900 p-2 flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-[7px] text-slate-400 font-bold uppercase mb-0.5">Chave de Acesso</p>
                      <p className="text-[9px] font-mono font-bold text-slate-700 tracking-wider">{selectedSale.id.replace(/-/g, '').slice(0, 44).padEnd(44, '0')}</p>
                    </div>
                    <div className="ml-4 bg-slate-100 border border-slate-300 rounded px-3 py-1">
                      <p className="text-[7px] font-bold text-slate-500 text-center">CÓDIGO DE BARRAS</p>
                      <div className="flex gap-[1px] h-8 items-end justify-center mt-1">
                        {Array.from({ length: 40 }).map((_, i) => (
                          <div key={i} className="bg-slate-900" style={{ width: i % 3 === 0 ? '2px' : '1px', height: `${12 + Math.random() * 20}px` }} />
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* ═══ Natureza da Operação / Protocolo ═══ */}
                  <div className="grid grid-cols-12 border-b-2 border-slate-900">
                    <div className="col-span-8 border-r border-slate-400 p-1.5">
                      <p className="text-[7px] text-slate-400 font-bold uppercase">Natureza da Operação</p>
                      <p className="text-[9px] font-bold text-slate-700">VENDA DE MERCADORIA</p>
                    </div>
                    <div className="col-span-4 p-1.5">
                      <p className="text-[7px] text-slate-400 font-bold uppercase">Protocolo Autorização</p>
                      <p className="text-[9px] font-bold text-slate-500 italic">Prévia - Sem protocolo</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-12 border-b-2 border-slate-900">
                    <div className="col-span-4 border-r border-slate-400 p-1.5">
                      <p className="text-[7px] text-slate-400 font-bold uppercase">Inscrição Estadual</p>
                      <p className="text-[9px] font-bold text-slate-700">{comp.state_registration || 'ISENTO'}</p>
                    </div>
                    <div className="col-span-4 border-r border-slate-400 p-1.5">
                      <p className="text-[7px] text-slate-400 font-bold uppercase">CNPJ</p>
                      <p className="text-[9px] font-bold text-slate-700">{comp.cnpj || '-'}</p>
                    </div>
                    <div className="col-span-4 p-1.5">
                      <p className="text-[7px] text-slate-400 font-bold uppercase">Data de Emissão</p>
                      <p className="text-[9px] font-bold text-slate-700">{new Date(selectedSale.date).toLocaleDateString('pt-BR')}</p>
                    </div>
                  </div>

                  {/* ═══ DESTINATÁRIO / REMETENTE ═══ */}
                  <div className="bg-slate-100 px-2 py-1 border-b border-slate-900">
                    <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Destinatário / Remetente</p>
                  </div>
                  <div className="grid grid-cols-12 border-b border-slate-400">
                    <div className="col-span-8 border-r border-slate-400 p-1.5">
                      <p className="text-[7px] text-slate-400 font-bold uppercase">Nome / Razão Social</p>
                      <p className="text-[9px] font-bold text-slate-700">{partner.name || '-'}</p>
                    </div>
                    <div className="col-span-4 p-1.5">
                      <p className="text-[7px] text-slate-400 font-bold uppercase">CNPJ / CPF</p>
                      <p className="text-[9px] font-bold text-slate-700">{partner.document || '-'}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-12 border-b border-slate-400">
                    <div className="col-span-6 border-r border-slate-400 p-1.5">
                      <p className="text-[7px] text-slate-400 font-bold uppercase">Endereço</p>
                      <p className="text-[9px] font-bold text-slate-700">{partner.street}{partner.number ? `, ${partner.number}` : ''}{partner.complement ? ` - ${partner.complement}` : ''}</p>
                    </div>
                    <div className="col-span-3 border-r border-slate-400 p-1.5">
                      <p className="text-[7px] text-slate-400 font-bold uppercase">Bairro</p>
                      <p className="text-[9px] font-bold text-slate-700">{partner.neighborhood || '-'}</p>
                    </div>
                    <div className="col-span-3 p-1.5">
                      <p className="text-[7px] text-slate-400 font-bold uppercase">CEP</p>
                      <p className="text-[9px] font-bold text-slate-700">{partner.zip_code || '-'}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-12 border-b-2 border-slate-900">
                    <div className="col-span-4 border-r border-slate-400 p-1.5">
                      <p className="text-[7px] text-slate-400 font-bold uppercase">Município</p>
                      <p className="text-[9px] font-bold text-slate-700">{partner.city || '-'}</p>
                    </div>
                    <div className="col-span-2 border-r border-slate-400 p-1.5">
                      <p className="text-[7px] text-slate-400 font-bold uppercase">UF</p>
                      <p className="text-[9px] font-bold text-slate-700">{partner.state || '-'}</p>
                    </div>
                    <div className="col-span-3 border-r border-slate-400 p-1.5">
                      <p className="text-[7px] text-slate-400 font-bold uppercase">Telefone</p>
                      <p className="text-[9px] font-bold text-slate-700">{partner.phone || '-'}</p>
                    </div>
                    <div className="col-span-3 p-1.5">
                      <p className="text-[7px] text-slate-400 font-bold uppercase">Data Saída</p>
                      <p className="text-[9px] font-bold text-slate-700">{new Date(selectedSale.date).toLocaleDateString('pt-BR')}</p>
                    </div>
                  </div>

                  {/* ═══ PRODUTOS / SERVIÇOS ═══ */}
                  <div className="bg-slate-100 px-2 py-1 border-b border-slate-900">
                    <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Dados dos Produtos / Serviços</p>
                  </div>
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="text-[7px] font-bold text-slate-500 uppercase border-b border-slate-400">
                        <th className="p-1.5 text-left border-r border-slate-400">Código</th>
                        <th className="p-1.5 text-left border-r border-slate-400">Descrição do Produto / Serviço</th>
                        <th className="p-1.5 text-center border-r border-slate-400">UN</th>
                        <th className="p-1.5 text-right border-r border-slate-400">Qtde</th>
                        <th className="p-1.5 text-right border-r border-slate-400">Vl. Unit.</th>
                        <th className="p-1.5 text-right">Vl. Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item: any, idx: number) => (
                        <tr key={idx} className="border-b border-slate-200 text-[8px]">
                          <td className="p-1.5 border-r border-slate-300 font-mono text-slate-600">{item.code || '-'}</td>
                          <td className="p-1.5 border-r border-slate-300 font-bold text-slate-700">{item.desc_fiscal || item.desc_internal || '-'}</td>
                          <td className="p-1.5 text-center border-r border-slate-300 text-slate-500">UN</td>
                          <td className="p-1.5 text-right border-r border-slate-300 font-mono text-slate-700">{item.qty}</td>
                          <td className="p-1.5 text-right border-r border-slate-300 font-mono text-slate-600">{(item.unit_price || 0).toFixed(2)}</td>
                          <td className="p-1.5 text-right font-mono font-bold text-slate-900">{(item.total || 0).toFixed(2)}</td>
                        </tr>
                      ))}
                      {items.length === 0 && (
                        <tr><td colSpan={6} className="p-3 text-center italic text-slate-400">Nenhum item.</td></tr>
                      )}
                    </tbody>
                  </table>

                  {/* ═══ TOTAIS ═══ */}
                  <div className="bg-slate-100 px-2 py-1 border-t-2 border-b border-slate-900">
                    <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Cálculo do Imposto</p>
                  </div>
                  <div className="grid grid-cols-12 border-b-2 border-slate-900">
                    <div className="col-span-3 border-r border-slate-400 p-1.5">
                      <p className="text-[7px] text-slate-400 font-bold uppercase">Valor Total dos Produtos</p>
                      <p className="text-[10px] font-black text-slate-900 font-mono">{totalProdutos.toFixed(2)}</p>
                    </div>
                    <div className="col-span-3 border-r border-slate-400 p-1.5">
                      <p className="text-[7px] text-slate-400 font-bold uppercase">Valor do Frete</p>
                      <p className="text-[10px] font-bold text-slate-700 font-mono">{frete.toFixed(2)}</p>
                    </div>
                    <div className="col-span-3 border-r border-slate-400 p-1.5">
                      <p className="text-[7px] text-slate-400 font-bold uppercase">Valor do Desconto</p>
                      <p className="text-[10px] font-bold text-slate-700 font-mono">0,00</p>
                    </div>
                    <div className="col-span-3 p-1.5 bg-slate-50">
                      <p className="text-[7px] text-slate-400 font-bold uppercase">Valor Total da Nota</p>
                      <p className="text-[11px] font-black text-slate-900 font-mono">{(selectedSale.total_amount || 0).toFixed(2)}</p>
                    </div>
                  </div>

                  {/* ═══ TRANSPORTADOR ═══ */}
                  <div className="bg-slate-100 px-2 py-1 border-b border-slate-900">
                    <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Transportador / Volumes Transportados</p>
                  </div>
                  <div className="grid grid-cols-12 border-b-2 border-slate-900">
                    <div className="col-span-4 border-r border-slate-400 p-1.5">
                      <p className="text-[7px] text-slate-400 font-bold uppercase">Modalidade do Frete</p>
                      <p className="text-[9px] font-bold text-slate-700">{selectedSale.freight_type || 'Sem Frete'}</p>
                    </div>
                    <div className="col-span-4 border-r border-slate-400 p-1.5">
                      <p className="text-[7px] text-slate-400 font-bold uppercase">Quantidade</p>
                      <p className="text-[9px] font-bold text-slate-700">{items.reduce((a: number, i: any) => a + (i.qty || 0), 0)}</p>
                    </div>
                    <div className="col-span-4 p-1.5">
                      <p className="text-[7px] text-slate-400 font-bold uppercase">Peso Bruto (KG)</p>
                      <p className="text-[9px] font-bold text-slate-500">-</p>
                    </div>
                  </div>

                  {/* ═══ INFORMAÇÕES ADICIONAIS ═══ */}
                  <div className="bg-slate-100 px-2 py-1 border-b border-slate-900">
                    <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Dados Adicionais</p>
                  </div>
                  <div className="p-2 min-h-[40px]">
                    <p className="text-[8px] text-slate-600 leading-relaxed">{selectedSale.additional_info || 'Nenhuma informação adicional.'}</p>
                  </div>

                  {/* ═══ FOOTER ═══ */}
                  <div className="border-t-2 border-slate-900 bg-slate-50 p-2 flex justify-between items-center">
                    <p className="text-[7px] text-slate-400 font-bold">PRÉVIA - SEM VALOR FISCAL</p>
                    <p className="text-[7px] text-slate-400 font-bold">Emitido por FACT ERP • {new Date().toLocaleDateString('pt-BR')}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default Sales;