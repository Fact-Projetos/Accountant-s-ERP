import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import {
   Settings2, Save, Plus, Edit, Trash2,
   ArrowLeft, Globe, Hash, ArrowRightLeft,
   Loader2, MoreHorizontal, Search, Percent
} from 'lucide-react';

// ─── Interfaces ────────────────────────────────────────────────
interface CfopMapping {
   id: string;
   uf: string;
   cfop_supplier: string;
   cfop_entry: string;
   cfop_exit_internal: string;
   cfop_exit_interstate: string;
   cst_csosn: string;
   cst_pis_cofins: string;
   cst_ipi: string;
   enquadramento_ipi: string;
   aliq_icms: number;
   aliq_pis: number;
   aliq_cofins: number;
   aliq_ipi: number;
}

interface NcmConfig {
   id: string;
   uf: string;
   ncm: string;
   cfop_entry: string;
   cfop_exit_internal: string;
   cfop_exit_interstate: string;
   cst_csosn: string;
   cst_pis_cofins: string;
   cst_ipi: string;
   enquadramento_ipi: string;
   aliq_icms: number;
   aliq_pis: number;
   aliq_cofins: number;
   aliq_ipi: number;
}

interface FiscalMatrixProps {
   companyId: string | null;
}

const UF_LIST = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'];

const FormInput = ({ label, value, onChange, placeholder, icon, mono }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; icon?: React.ReactNode; mono?: boolean }) => (
   <div>
      <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase flex items-center gap-1">
         {icon} {label}
      </label>
      <input
         type="text"
         value={value}
         onChange={e => onChange(e.target.value)}
         placeholder={placeholder}
         className={`w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-200 transition-all ${mono ? 'font-mono' : ''}`}
      />
   </div>
);

const FiscalMatrix: React.FC<FiscalMatrixProps> = ({ companyId }) => {
   // ─── State ──────────────────────────────────────────────────
   const [activeTab, setActiveTab] = useState<'CFOP' | 'NCM'>('CFOP');
   const [viewMode, setViewMode] = useState<'LIST' | 'FORM'>('LIST');
   const [isLoading, setIsLoading] = useState(false);
   const [searchTerm, setSearchTerm] = useState('');

   // CFOP Mapping
   const [cfopMappings, setCfopMappings] = useState<CfopMapping[]>([]);
   const [cfopForm, setCfopForm] = useState<CfopMapping>({ id: '', uf: 'SP', cfop_supplier: '', cfop_entry: '', cfop_exit_internal: '', cfop_exit_interstate: '', cst_csosn: '', cst_pis_cofins: '', cst_ipi: '', enquadramento_ipi: '', aliq_icms: 0, aliq_pis: 0, aliq_cofins: 0, aliq_ipi: 0 });

   // NCM Config
   const [ncmConfigs, setNcmConfigs] = useState<NcmConfig[]>([]);
   const [ncmForm, setNcmForm] = useState<NcmConfig>({ id: '', uf: 'SP', ncm: '', cfop_entry: '', cfop_exit_internal: '', cfop_exit_interstate: '', cst_csosn: '', cst_pis_cofins: '', cst_ipi: '', enquadramento_ipi: '', aliq_icms: 0, aliq_pis: 0, aliq_cofins: 0, aliq_ipi: 0 });

   const [activeMenu, setActiveMenu] = useState<string | null>(null);

   // ─── Fetch Data ─────────────────────────────────────────────
   const fetchCfopMappings = async () => {
      if (!companyId) return;
      setIsLoading(true);
      try {
         const { data, error } = await supabase
            .from('fiscal_cfop_mapping')
            .select('*')
            .eq('company_id', companyId)
            .order('uf', { ascending: true });
         if (error) throw error;
         setCfopMappings(data || []);
      } catch (err) {
         console.error('Error fetching CFOP mappings:', err);
      } finally {
         setIsLoading(false);
      }
   };

   const fetchNcmConfigs = async () => {
      if (!companyId) return;
      setIsLoading(true);
      try {
         const { data, error } = await supabase
            .from('fiscal_ncm_config')
            .select('*')
            .eq('company_id', companyId)
            .order('uf', { ascending: true });
         if (error) throw error;
         setNcmConfigs(data || []);
      } catch (err) {
         console.error('Error fetching NCM configs:', err);
      } finally {
         setIsLoading(false);
      }
   };

   useEffect(() => {
      if (companyId) {
         fetchCfopMappings();
         fetchNcmConfigs();
      }
   }, [companyId]);

   // ─── CFOP Handlers ──────────────────────────────────────────
   const handleNewCfop = () => {
      setCfopForm({ id: '', uf: 'SP', cfop_supplier: '', cfop_entry: '', cfop_exit_internal: '', cfop_exit_interstate: '', cst_csosn: '', cst_pis_cofins: '', cst_ipi: '', enquadramento_ipi: '', aliq_icms: 0, aliq_pis: 0, aliq_cofins: 0, aliq_ipi: 0 });
      setViewMode('FORM');
   };

   const handleEditCfop = (item: CfopMapping) => {
      setCfopForm({ ...item });
      setViewMode('FORM');
      setActiveMenu(null);
   };

   const handleDeleteCfop = async (id: string) => {
      if (!window.confirm('Deseja excluir este mapeamento CFOP?')) return;
      setActiveMenu(null);
      try {
         const { error } = await supabase.from('fiscal_cfop_mapping').delete().eq('id', id);
         if (error) throw error;
         fetchCfopMappings();
      } catch (err: any) {
         alert('Erro ao excluir: ' + err.message);
      }
   };

   const handleSaveCfop = async () => {
      if (!companyId) return;
      if (!cfopForm.uf || !cfopForm.cfop_supplier || !cfopForm.cfop_entry) {
         alert('UF, CFOP Fornecedor e CFOP Entrada são obrigatórios.');
         return;
      }
      setIsLoading(true);
      try {
         const payload = {
            company_id: companyId,
            uf: cfopForm.uf,
            cfop_supplier: cfopForm.cfop_supplier,
            cfop_entry: cfopForm.cfop_entry,
            cfop_exit_internal: cfopForm.cfop_exit_internal,
            cfop_exit_interstate: cfopForm.cfop_exit_interstate,
            cst_csosn: cfopForm.cst_csosn,
            cst_pis_cofins: cfopForm.cst_pis_cofins,
            cst_ipi: cfopForm.cst_ipi,
            enquadramento_ipi: cfopForm.enquadramento_ipi,
            aliq_icms: cfopForm.aliq_icms,
            aliq_pis: cfopForm.aliq_pis,
            aliq_cofins: cfopForm.aliq_cofins,
            aliq_ipi: cfopForm.aliq_ipi,
         };

         if (cfopForm.id) {
            const { error } = await supabase.from('fiscal_cfop_mapping').update(payload).eq('id', cfopForm.id);
            if (error) throw error;
         } else {
            const { error } = await supabase.from('fiscal_cfop_mapping').insert(payload);
            if (error) throw error;
         }
         alert('Mapeamento CFOP salvo com sucesso!');
         setViewMode('LIST');
         fetchCfopMappings();
      } catch (err: any) {
         alert('Erro ao salvar: ' + err.message);
      } finally {
         setIsLoading(false);
      }
   };

   // ─── NCM Handlers ───────────────────────────────────────────
   const handleNewNcm = () => {
      setNcmForm({ id: '', uf: 'SP', ncm: '', cfop_entry: '', cfop_exit_internal: '', cfop_exit_interstate: '', cst_csosn: '', cst_pis_cofins: '', cst_ipi: '', enquadramento_ipi: '', aliq_icms: 0, aliq_pis: 0, aliq_cofins: 0, aliq_ipi: 0 });
      setViewMode('FORM');
   };

   const handleEditNcm = (item: NcmConfig) => {
      setNcmForm({ ...item });
      setViewMode('FORM');
      setActiveMenu(null);
   };

   const handleDeleteNcm = async (id: string) => {
      if (!window.confirm('Deseja excluir esta configuração NCM?')) return;
      setActiveMenu(null);
      try {
         const { error } = await supabase.from('fiscal_ncm_config').delete().eq('id', id);
         if (error) throw error;
         fetchNcmConfigs();
      } catch (err: any) {
         alert('Erro ao excluir: ' + err.message);
      }
   };

   const handleSaveNcm = async () => {
      if (!companyId) return;
      if (!ncmForm.uf || !ncmForm.ncm || !ncmForm.cfop_entry) {
         alert('UF, NCM e CFOP Entrada são obrigatórios.');
         return;
      }
      setIsLoading(true);
      try {
         const payload = {
            company_id: companyId,
            uf: ncmForm.uf,
            ncm: ncmForm.ncm,
            cfop_entry: ncmForm.cfop_entry,
            cfop_exit_internal: ncmForm.cfop_exit_internal,
            cfop_exit_interstate: ncmForm.cfop_exit_interstate,
            cst_csosn: ncmForm.cst_csosn,
            cst_pis_cofins: ncmForm.cst_pis_cofins,
            cst_ipi: ncmForm.cst_ipi,
            enquadramento_ipi: ncmForm.enquadramento_ipi,
            aliq_icms: ncmForm.aliq_icms,
            aliq_pis: ncmForm.aliq_pis,
            aliq_cofins: ncmForm.aliq_cofins,
            aliq_ipi: ncmForm.aliq_ipi,
         };

         if (ncmForm.id) {
            const { error } = await supabase.from('fiscal_ncm_config').update(payload).eq('id', ncmForm.id);
            if (error) throw error;
         } else {
            const { error } = await supabase.from('fiscal_ncm_config').insert(payload);
            if (error) throw error;
         }
         alert('Configuração NCM salva com sucesso!');
         setViewMode('LIST');
         fetchNcmConfigs();
      } catch (err: any) {
         alert('Erro ao salvar: ' + err.message);
      } finally {
         setIsLoading(false);
      }
   };



   // ─── FORM VIEW ──────────────────────────────────────────────
   if (viewMode === 'FORM') {
      const isCfop = activeTab === 'CFOP';
      return (
         <div className="space-y-6 animate-fade-in pb-10">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
               <div className="flex items-center gap-4">
                  <button onClick={() => setViewMode('LIST')} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
                     <ArrowLeft className="w-5 h-5" />
                  </button>
                  <div>
                     <h2 className="text-xl font-serif font-bold text-slate-800">
                        {isCfop
                           ? (cfopForm.id ? 'Editar Mapeamento CFOP' : 'Novo Mapeamento CFOP')
                           : (ncmForm.id ? 'Editar Configuração NCM' : 'Nova Configuração NCM')
                        }
                     </h2>
                     <p className="text-xs text-slate-500 uppercase tracking-widest font-medium">
                        {isCfop ? 'De-Para NF-e' : 'Configuração por NCM'}
                     </p>
                  </div>
               </div>
               <div className="flex gap-2">
                  <button onClick={() => setViewMode('LIST')} className="bg-white border border-slate-200 text-slate-600 px-4 py-2 rounded-xl text-xs font-bold hover:bg-slate-50 transition-colors">
                     Cancelar
                  </button>
                  <button
                     onClick={isCfop ? handleSaveCfop : handleSaveNcm}
                     disabled={isLoading}
                     className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white px-6 py-2 rounded-xl text-xs font-bold shadow-sm transition-all disabled:opacity-50"
                  >
                     {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                     Salvar
                  </button>
               </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
               {isCfop ? (
                  <div className="space-y-5">
                     <div className="grid grid-cols-12 gap-5">
                        <div className="col-span-12 md:col-span-2">
                           <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase flex items-center gap-1">
                              <Globe className="w-3 h-3 text-slate-400" /> UF
                           </label>
                           <select
                              value={cfopForm.uf}
                              onChange={e => setCfopForm(p => ({ ...p, uf: e.target.value }))}
                              className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-slate-400 bg-white font-bold"
                           >
                              {UF_LIST.map(uf => <option key={uf} value={uf}>{uf}</option>)}
                           </select>
                        </div>
                        <div className="col-span-12 md:col-span-2">
                           <FormInput label="CFOP Fornecedor" value={cfopForm.cfop_supplier} onChange={v => setCfopForm(p => ({ ...p, cfop_supplier: v }))} placeholder="Ex: 5102" mono icon={<ArrowRightLeft className="w-3 h-3 text-slate-400" />} />
                        </div>
                        <div className="col-span-12 md:col-span-3">
                           <FormInput label="CFOP Entrada" value={cfopForm.cfop_entry} onChange={v => setCfopForm(p => ({ ...p, cfop_entry: v }))} placeholder="Ex: 1102" mono icon={<ArrowRightLeft className="w-3 h-3 text-green-500" />} />
                        </div>
                        <div className="col-span-12 md:col-span-3">
                           <FormInput label="CFOP Saída Interna" value={cfopForm.cfop_exit_internal} onChange={v => setCfopForm(p => ({ ...p, cfop_exit_internal: v }))} placeholder="Ex: 5102" mono icon={<ArrowRightLeft className="w-3 h-3 text-blue-500" />} />
                        </div>
                        <div className="col-span-12 md:col-span-2">
                           <FormInput label="CFOP Interestadual" value={cfopForm.cfop_exit_interstate} onChange={v => setCfopForm(p => ({ ...p, cfop_exit_interstate: v }))} placeholder="Ex: 6102" mono icon={<ArrowRightLeft className="w-3 h-3 text-orange-500" />} />
                        </div>
                     </div>

                     <div className="border-t border-slate-100 pt-5">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-1.5"><Percent className="w-3 h-3" /> Tributação</p>
                        <div className="grid grid-cols-12 gap-5">
                           <div className="col-span-12 md:col-span-3">
                              <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase">CST / CSOSN</label>
                              <select value={cfopForm.cst_csosn} onChange={e => setCfopForm(p => ({ ...p, cst_csosn: e.target.value }))} className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-slate-400 bg-white">
                                 <option value="">Selecione...</option>
                                 <option value="101">101 - SN com crédito</option>
                                 <option value="102">102 - SN sem crédito</option>
                                 <option value="103">103 - SN isenção de ICMS</option>
                                 <option value="201">201 - SN com crédito e ST</option>
                                 <option value="202">202 - SN sem crédito e com ST</option>
                                 <option value="300">300 - SN imune</option>
                                 <option value="400">400 - SN não tributada</option>
                                 <option value="500">500 - ICMS cobrado por ST</option>
                                 <option value="900">900 - SN outros</option>
                                 <option value="00">00 - Tributada integralmente</option>
                                 <option value="10">10 - Tributada com ST</option>
                                 <option value="20">20 - Com redução de BC</option>
                                 <option value="30">30 - Isenta com ST</option>
                                 <option value="40">40 - Isenta</option>
                                 <option value="41">41 - Não tributada</option>
                                 <option value="50">50 - Suspensão</option>
                                 <option value="51">51 - Diferimento</option>
                                 <option value="60">60 - Cobrado por ST</option>
                                 <option value="70">70 - Redução e ST</option>
                                 <option value="90">90 - Outras</option>
                              </select>
                           </div>
                           <div className="col-span-12 md:col-span-3">
                              <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase">CST PIS / COFINS</label>
                              <select value={cfopForm.cst_pis_cofins} onChange={e => setCfopForm(p => ({ ...p, cst_pis_cofins: e.target.value }))} className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-slate-400 bg-white">
                                 <option value="">Selecione...</option>
                                 <option value="01">01 - Tributável (alíquota básica)</option>
                                 <option value="02">02 - Tributável (alíquota diferenciada)</option>
                                 <option value="04">04 - Não tributável (monofásica)</option>
                                 <option value="05">05 - Tributável (ST)</option>
                                 <option value="06">06 - Alíquota zero</option>
                                 <option value="07">07 - Isenta</option>
                                 <option value="08">08 - Sem incidência</option>
                                 <option value="09">09 - Suspensão</option>
                                 <option value="49">49 - Outras operações de saída</option>
                                 <option value="50">50 - Direito a crédito</option>
                                 <option value="70">70 - Sem direito a crédito</option>
                                 <option value="98">98 - Outras operações de entrada</option>
                                 <option value="99">99 - Outras operações</option>
                              </select>
                           </div>
                           <div className="col-span-12 md:col-span-3">
                              <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase">CST IPI</label>
                              <select value={cfopForm.cst_ipi} onChange={e => setCfopForm(p => ({ ...p, cst_ipi: e.target.value }))} className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-slate-400 bg-white">
                                 <option value="">Selecione...</option>
                                 <option value="00">00 - Entrada com recuperação</option>
                                 <option value="01">01 - Entrada tributada alíquota zero</option>
                                 <option value="02">02 - Entrada isenta</option>
                                 <option value="03">03 - Entrada não tributada</option>
                                 <option value="04">04 - Entrada imune</option>
                                 <option value="05">05 - Entrada com suspensão</option>
                                 <option value="49">49 - Outras entradas</option>
                                 <option value="50">50 - Saída tributada</option>
                                 <option value="51">51 - Saída tributada alíquota zero</option>
                                 <option value="52">52 - Saída isenta</option>
                                 <option value="53">53 - Saída não tributada</option>
                                 <option value="54">54 - Saída imune</option>
                                 <option value="55">55 - Saída com suspensão</option>
                                 <option value="99">99 - Outras saídas</option>
                              </select>
                           </div>
                           <div className="col-span-12 md:col-span-3">
                              <FormInput label="Enquadramento IPI" value={cfopForm.enquadramento_ipi} onChange={v => setCfopForm(p => ({ ...p, enquadramento_ipi: v }))} placeholder="Ex: 999" mono />
                           </div>
                        </div>
                     </div>

                     <div className="border-t border-slate-100 pt-5">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-1.5"><Percent className="w-3 h-3" /> Alíquotas (%)</p>
                        <p className="text-[9px] text-slate-400 mb-4">Defina as alíquotas para cálculo de impostos na saída. Se zero, o imposto não será calculado.</p>
                        <div className="grid grid-cols-12 gap-5">
                           <div className="col-span-12 md:col-span-3">
                              <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase">Alíq. ICMS (%)</label>
                              <input type="number" step="0.01" min="0" value={cfopForm.aliq_icms} onChange={e => setCfopForm(p => ({ ...p, aliq_icms: parseFloat(e.target.value) || 0 }))} className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-200 transition-all font-mono" placeholder="0.00" />
                           </div>
                           <div className="col-span-12 md:col-span-3">
                              <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase">Alíq. PIS (%)</label>
                              <input type="number" step="0.01" min="0" value={cfopForm.aliq_pis} onChange={e => setCfopForm(p => ({ ...p, aliq_pis: parseFloat(e.target.value) || 0 }))} className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-200 transition-all font-mono" placeholder="0.00" />
                           </div>
                           <div className="col-span-12 md:col-span-3">
                              <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase">Alíq. COFINS (%)</label>
                              <input type="number" step="0.01" min="0" value={cfopForm.aliq_cofins} onChange={e => setCfopForm(p => ({ ...p, aliq_cofins: parseFloat(e.target.value) || 0 }))} className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-200 transition-all font-mono" placeholder="0.00" />
                           </div>
                           <div className="col-span-12 md:col-span-3">
                              <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase">Alíq. IPI (%)</label>
                              <input type="number" step="0.01" min="0" value={cfopForm.aliq_ipi} onChange={e => setCfopForm(p => ({ ...p, aliq_ipi: parseFloat(e.target.value) || 0 }))} className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-200 transition-all font-mono" placeholder="0.00" />
                           </div>
                        </div>
                     </div>

                  </div>
               ) : (
                  <div className="space-y-5">
                     <div className="grid grid-cols-12 gap-5">
                        <div className="col-span-12 md:col-span-2">
                           <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase flex items-center gap-1">
                              <Globe className="w-3 h-3 text-slate-400" /> UF
                           </label>
                           <select
                              value={ncmForm.uf}
                              onChange={e => setNcmForm(p => ({ ...p, uf: e.target.value }))}
                              className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-slate-400 bg-white font-bold"
                           >
                              {UF_LIST.map(uf => <option key={uf} value={uf}>{uf}</option>)}
                           </select>
                        </div>
                        <div className="col-span-12 md:col-span-2">
                           <FormInput label="NCM" value={ncmForm.ncm} onChange={v => setNcmForm(p => ({ ...p, ncm: v }))} placeholder="0000.00.00" mono icon={<Hash className="w-3 h-3 text-slate-400" />} />
                        </div>
                        <div className="col-span-12 md:col-span-3">
                           <FormInput label="CFOP Entrada" value={ncmForm.cfop_entry} onChange={v => setNcmForm(p => ({ ...p, cfop_entry: v }))} placeholder="Ex: 1102" mono icon={<ArrowRightLeft className="w-3 h-3 text-green-500" />} />
                        </div>
                        <div className="col-span-12 md:col-span-3">
                           <FormInput label="CFOP Saída Interna" value={ncmForm.cfop_exit_internal} onChange={v => setNcmForm(p => ({ ...p, cfop_exit_internal: v }))} placeholder="Ex: 5102" mono icon={<ArrowRightLeft className="w-3 h-3 text-blue-500" />} />
                        </div>
                        <div className="col-span-12 md:col-span-2">
                           <FormInput label="CFOP Interestadual" value={ncmForm.cfop_exit_interstate} onChange={v => setNcmForm(p => ({ ...p, cfop_exit_interstate: v }))} placeholder="Ex: 6102" mono icon={<ArrowRightLeft className="w-3 h-3 text-orange-500" />} />
                        </div>
                     </div>

                     <div className="border-t border-slate-100 pt-5">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-1.5"><Percent className="w-3 h-3" /> Tributação</p>
                        <div className="grid grid-cols-12 gap-5">
                           <div className="col-span-12 md:col-span-3">
                              <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase">CST / CSOSN</label>
                              <select value={ncmForm.cst_csosn} onChange={e => setNcmForm(p => ({ ...p, cst_csosn: e.target.value }))} className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-slate-400 bg-white">
                                 <option value="">Selecione...</option>
                                 <option value="101">101 - SN com crédito</option>
                                 <option value="102">102 - SN sem crédito</option>
                                 <option value="103">103 - SN isenção de ICMS</option>
                                 <option value="201">201 - SN com crédito e ST</option>
                                 <option value="202">202 - SN sem crédito e com ST</option>
                                 <option value="300">300 - SN imune</option>
                                 <option value="400">400 - SN não tributada</option>
                                 <option value="500">500 - ICMS cobrado por ST</option>
                                 <option value="900">900 - SN outros</option>
                                 <option value="00">00 - Tributada integralmente</option>
                                 <option value="10">10 - Tributada com ST</option>
                                 <option value="20">20 - Com redução de BC</option>
                                 <option value="30">30 - Isenta com ST</option>
                                 <option value="40">40 - Isenta</option>
                                 <option value="41">41 - Não tributada</option>
                                 <option value="50">50 - Suspensão</option>
                                 <option value="51">51 - Diferimento</option>
                                 <option value="60">60 - Cobrado por ST</option>
                                 <option value="70">70 - Redução e ST</option>
                                 <option value="90">90 - Outras</option>
                              </select>
                           </div>
                           <div className="col-span-12 md:col-span-3">
                              <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase">CST PIS / COFINS</label>
                              <select value={ncmForm.cst_pis_cofins} onChange={e => setNcmForm(p => ({ ...p, cst_pis_cofins: e.target.value }))} className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-slate-400 bg-white">
                                 <option value="">Selecione...</option>
                                 <option value="01">01 - Tributável (alíquota básica)</option>
                                 <option value="02">02 - Tributável (alíquota diferenciada)</option>
                                 <option value="04">04 - Não tributável (monofásica)</option>
                                 <option value="05">05 - Tributável (ST)</option>
                                 <option value="06">06 - Alíquota zero</option>
                                 <option value="07">07 - Isenta</option>
                                 <option value="08">08 - Sem incidência</option>
                                 <option value="09">09 - Suspensão</option>
                                 <option value="49">49 - Outras operações de saída</option>
                                 <option value="50">50 - Direito a crédito</option>
                                 <option value="70">70 - Sem direito a crédito</option>
                                 <option value="98">98 - Outras operações de entrada</option>
                                 <option value="99">99 - Outras operações</option>
                              </select>
                           </div>
                           <div className="col-span-12 md:col-span-3">
                              <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase">CST IPI</label>
                              <select value={ncmForm.cst_ipi} onChange={e => setNcmForm(p => ({ ...p, cst_ipi: e.target.value }))} className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-slate-400 bg-white">
                                 <option value="">Selecione...</option>
                                 <option value="00">00 - Entrada com recuperação</option>
                                 <option value="01">01 - Entrada tributada alíquota zero</option>
                                 <option value="02">02 - Entrada isenta</option>
                                 <option value="03">03 - Entrada não tributada</option>
                                 <option value="04">04 - Entrada imune</option>
                                 <option value="05">05 - Entrada com suspensão</option>
                                 <option value="49">49 - Outras entradas</option>
                                 <option value="50">50 - Saída tributada</option>
                                 <option value="51">51 - Saída tributada alíquota zero</option>
                                 <option value="52">52 - Saída isenta</option>
                                 <option value="53">53 - Saída não tributada</option>
                                 <option value="54">54 - Saída imune</option>
                                 <option value="55">55 - Saída com suspensão</option>
                                 <option value="99">99 - Outras saídas</option>
                              </select>
                           </div>
                           <div className="col-span-12 md:col-span-3">
                              <FormInput label="Enquadramento IPI" value={ncmForm.enquadramento_ipi} onChange={v => setNcmForm(p => ({ ...p, enquadramento_ipi: v }))} placeholder="Ex: 999" mono />
                           </div>
                        </div>
                     </div>

                     <div className="border-t border-slate-100 pt-5">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-1.5"><Percent className="w-3 h-3" /> Alíquotas (%)</p>
                        <p className="text-[9px] text-slate-400 mb-4">Defina as alíquotas para cálculo de impostos na saída. Se zero, o imposto não será calculado.</p>
                        <div className="grid grid-cols-12 gap-5">
                           <div className="col-span-12 md:col-span-3">
                              <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase">Alíq. ICMS (%)</label>
                              <input type="number" step="0.01" min="0" value={ncmForm.aliq_icms} onChange={e => setNcmForm(p => ({ ...p, aliq_icms: parseFloat(e.target.value) || 0 }))} className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-200 transition-all font-mono" placeholder="0.00" />
                           </div>
                           <div className="col-span-12 md:col-span-3">
                              <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase">Alíq. PIS (%)</label>
                              <input type="number" step="0.01" min="0" value={ncmForm.aliq_pis} onChange={e => setNcmForm(p => ({ ...p, aliq_pis: parseFloat(e.target.value) || 0 }))} className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-200 transition-all font-mono" placeholder="0.00" />
                           </div>
                           <div className="col-span-12 md:col-span-3">
                              <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase">Alíq. COFINS (%)</label>
                              <input type="number" step="0.01" min="0" value={ncmForm.aliq_cofins} onChange={e => setNcmForm(p => ({ ...p, aliq_cofins: parseFloat(e.target.value) || 0 }))} className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-200 transition-all font-mono" placeholder="0.00" />
                           </div>
                           <div className="col-span-12 md:col-span-3">
                              <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase">Alíq. IPI (%)</label>
                              <input type="number" step="0.01" min="0" value={ncmForm.aliq_ipi} onChange={e => setNcmForm(p => ({ ...p, aliq_ipi: parseFloat(e.target.value) || 0 }))} className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-200 transition-all font-mono" placeholder="0.00" />
                           </div>
                        </div>
                     </div>

                  </div>
               )}
            </div>
         </div>
      );
   }

   // ─── LIST VIEW ──────────────────────────────────────────────
   const filteredCfop = cfopMappings.filter(m =>
      m.uf.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.cfop_supplier.includes(searchTerm) ||
      m.cfop_entry.includes(searchTerm)
   );

   const filteredNcm = ncmConfigs.filter(n =>
      n.uf.toLowerCase().includes(searchTerm.toLowerCase()) ||
      n.ncm.includes(searchTerm) ||
      n.cfop_entry.includes(searchTerm)
   );

   return (
      <div className="flex flex-col gap-4 animate-fade-in h-[calc(100vh-120px)]">
         {/* Header */}
         <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
               <h2 className="text-2xl font-serif font-bold text-slate-800">Matriz Fiscal</h2>
               <p className="text-slate-500 text-sm">Configuração de CFOP por NF-e e por NCM.</p>
            </div>
            <button
               onClick={activeTab === 'CFOP' ? handleNewCfop : handleNewNcm}
               className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white px-5 py-2.5 rounded-xl font-bold shadow-md transition-all active:scale-95 text-xs"
            >
               <Plus className="w-4 h-4" /> Cadastrar Regra
            </button>
         </div>

         {/* DataGrid Container */}
         <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col flex-1 min-h-0">
            {/* Tabs + Search Bar */}
            <div className="bg-gradient-to-r from-slate-100 to-slate-50 border-b border-slate-200 px-4 py-2 flex items-center gap-4 flex-wrap">
               <div className="flex bg-slate-200/60 rounded-lg p-0.5 gap-0.5">
                  <button
                     onClick={() => { setActiveTab('CFOP'); setSearchTerm(''); }}
                     className={`px-4 py-1.5 rounded-md text-[10px] font-black uppercase tracking-wider transition-all ${activeTab === 'CFOP'
                        ? 'bg-white text-slate-800 shadow-sm'
                        : 'text-slate-400 hover:text-slate-600'
                        }`}
                  >
                     <div className="flex items-center gap-1.5">
                        <ArrowRightLeft className="w-3 h-3" />
                        De-Para NF-e
                     </div>
                  </button>
                  <button
                     onClick={() => { setActiveTab('NCM'); setSearchTerm(''); }}
                     className={`px-4 py-1.5 rounded-md text-[10px] font-black uppercase tracking-wider transition-all ${activeTab === 'NCM'
                        ? 'bg-white text-slate-800 shadow-sm'
                        : 'text-slate-400 hover:text-slate-600'
                        }`}
                  >
                     <div className="flex items-center gap-1.5">
                        <Hash className="w-3 h-3" />
                        Config. por NCM
                     </div>
                  </button>
               </div>
               <div className="flex items-center gap-2 flex-1 justify-center">
                  <Search className="w-3.5 h-3.5 text-slate-400" />
                  <input
                     type="text"
                     placeholder={activeTab === 'CFOP' ? 'Pesquisar por UF ou CFOP...' : 'Pesquisar por UF ou NCM...'}
                     className="bg-transparent text-xs text-slate-500 font-medium outline-none w-full max-w-sm text-center placeholder:text-slate-400"
                     value={searchTerm}
                     onChange={e => setSearchTerm(e.target.value)}
                  />
               </div>
            </div>

            <div className="overflow-x-auto flex-1">
               {activeTab === 'CFOP' ? (
                  <table className="w-full border-collapse">
                     <thead>
                        <tr className="bg-slate-50 border-b-2 border-slate-200">
                           {[
                              { key: 'uf', label: 'UF', width: 'w-20' },
                              { key: 'cfop_fornecedor', label: 'CFOP Fornecedor', width: 'min-w-[120px]' },
                              { key: 'cfop_entrada', label: 'CFOP Entrada', width: 'min-w-[120px]' },
                              { key: 'cfop_saida_interna', label: 'CFOP Saída Interna', width: 'min-w-[130px]' },
                              { key: 'cfop_interestadual', label: 'CFOP Interestadual', width: 'min-w-[130px]' },
                           ].map((col) => (
                              <th
                                 key={col.key}
                                 className={`${col.width} text-left px-2 py-2.5 border-r border-slate-200 last:border-r-0 select-none cursor-default`}
                              >
                                 <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">{col.label}</span>
                              </th>
                           ))}
                           <th className="w-28 px-2 py-2.5 text-center">
                              <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Ações</span>
                           </th>
                        </tr>
                     </thead>
                     <tbody>
                        {isLoading && (
                           <tr>
                              <td colSpan={6} className="text-center py-10">
                                 <Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-300" />
                              </td>
                           </tr>
                        )}
                        {!isLoading && filteredCfop.length === 0 && (
                           <tr>
                              <td colSpan={6} className="text-center py-10">
                                 <Settings2 className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                                 <p className="text-sm text-slate-400 font-medium">Nenhum mapeamento CFOP cadastrado.</p>
                                 <p className="text-xs text-slate-300 mt-1">Clique em "Cadastrar Regra" para começar.</p>
                              </td>
                           </tr>
                        )}
                        {filteredCfop.map((item, idx) => (
                           <tr key={item.id} className={`border-b border-slate-100 transition-colors group cursor-default ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'} hover:bg-blue-50/50`}>
                              <td className="px-2 py-1.5 border-r border-slate-100">
                                 <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-bold text-[10px] border border-slate-200">{item.uf}</span>
                              </td>
                              <td className="px-2 py-1.5 border-r border-slate-100 font-mono font-bold text-[11px] text-slate-700">{item.cfop_supplier}</td>
                              <td className="px-2 py-1.5 border-r border-slate-100">
                                 <span className="bg-green-50 text-green-700 px-2 py-0.5 rounded font-mono font-bold text-[11px] border border-green-100">{item.cfop_entry}</span>
                              </td>
                              <td className="px-2 py-1.5 border-r border-slate-100">
                                 <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-mono font-bold text-[11px] border border-blue-100">{item.cfop_exit_internal}</span>
                              </td>
                              <td className="px-2 py-1.5 border-r border-slate-100">
                                 <span className="bg-orange-50 text-orange-700 px-2 py-0.5 rounded font-mono font-bold text-[11px] border border-orange-100">{item.cfop_exit_interstate}</span>
                              </td>
                              <td className="px-2 py-1.5 text-center">
                                 <div className="flex justify-center items-center gap-0.5">
                                    <button
                                       onClick={() => handleEditCfop(item)}
                                       className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-md transition-all"
                                       title="Editar Regra"
                                    >
                                       <Edit className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                       onClick={() => handleDeleteCfop(item.id)}
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
               ) : (
                  <table className="w-full border-collapse">
                     <thead>
                        <tr className="bg-slate-50 border-b-2 border-slate-200">
                           {[
                              { key: 'uf', label: 'UF', width: 'w-20' },
                              { key: 'ncm', label: 'NCM', width: 'min-w-[120px]' },
                              { key: 'cfop_entrada', label: 'CFOP Entrada', width: 'min-w-[120px]' },
                              { key: 'cfop_saida_interna', label: 'CFOP Saída Interna', width: 'min-w-[130px]' },
                              { key: 'cfop_interestadual', label: 'CFOP Interestadual', width: 'min-w-[130px]' },
                           ].map((col) => (
                              <th
                                 key={col.key}
                                 className={`${col.width} text-left px-2 py-2.5 border-r border-slate-200 last:border-r-0 select-none cursor-default`}
                              >
                                 <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">{col.label}</span>
                              </th>
                           ))}
                           <th className="w-28 px-2 py-2.5 text-center">
                              <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Ações</span>
                           </th>
                        </tr>
                     </thead>
                     <tbody>
                        {isLoading && (
                           <tr>
                              <td colSpan={6} className="text-center py-10">
                                 <Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-300" />
                              </td>
                           </tr>
                        )}
                        {!isLoading && filteredNcm.length === 0 && (
                           <tr>
                              <td colSpan={6} className="text-center py-10">
                                 <Settings2 className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                                 <p className="text-sm text-slate-400 font-medium">Nenhuma configuração NCM cadastrada.</p>
                                 <p className="text-xs text-slate-300 mt-1">Clique em "Cadastrar Regra" para começar.</p>
                              </td>
                           </tr>
                        )}
                        {filteredNcm.map((item, idx) => (
                           <tr key={item.id} className={`border-b border-slate-100 transition-colors group cursor-default ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'} hover:bg-blue-50/50`}>
                              <td className="px-2 py-1.5 border-r border-slate-100">
                                 <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-bold text-[10px] border border-slate-200">{item.uf}</span>
                              </td>
                              <td className="px-2 py-1.5 border-r border-slate-100 font-mono font-bold text-[11px] text-slate-700">{item.ncm}</td>
                              <td className="px-2 py-1.5 border-r border-slate-100">
                                 <span className="bg-green-50 text-green-700 px-2 py-0.5 rounded font-mono font-bold text-[11px] border border-green-100">{item.cfop_entry}</span>
                              </td>
                              <td className="px-2 py-1.5 border-r border-slate-100">
                                 <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-mono font-bold text-[11px] border border-blue-100">{item.cfop_exit_internal}</span>
                              </td>
                              <td className="px-2 py-1.5 border-r border-slate-100">
                                 <span className="bg-orange-50 text-orange-700 px-2 py-0.5 rounded font-mono font-bold text-[11px] border border-orange-100">{item.cfop_exit_interstate}</span>
                              </td>
                              <td className="px-2 py-1.5 text-center">
                                 <div className="flex justify-center items-center gap-0.5">
                                    <button
                                       onClick={() => handleEditNcm(item)}
                                       className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-md transition-all"
                                       title="Editar Regra"
                                    >
                                       <Edit className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                       onClick={() => handleDeleteNcm(item.id)}
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
               )}
            </div>

            {/* Spacer */}
            <div className="flex-1" />

            {/* Footer */}
            <div className="bg-slate-50 border-t border-slate-200 px-4 py-2 flex items-center justify-between mt-auto">
               <span className="text-[10px] font-bold text-slate-400">
                  {activeTab === 'CFOP' ? filteredCfop.length : filteredNcm.length} regra(s)
               </span>
               <span className="text-[10px] text-slate-300">
                  Fact ERP Contábil
               </span>
            </div>
         </div>
      </div>
   );
};

export default FiscalMatrix;