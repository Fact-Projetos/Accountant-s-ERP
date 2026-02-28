import React, { useEffect, useState } from 'react';
import {
  Building2, MapPin, Phone, Mail, FileText, Shield, Calendar,
  Hash, Loader2, AlertTriangle, CheckCircle2
} from 'lucide-react';
import { supabase } from '../../services/supabase';

interface MyCompanyProps {
  companyId?: string | null;
}

const InfoRow = ({ icon: Icon, label, value, highlight, warning }: {
  icon: any; label: string; value: string; highlight?: boolean; warning?: boolean;
}) => (
  <div className="flex items-start gap-3 py-2.5 border-b border-slate-100 last:border-0">
    <div className={`p-1.5 rounded-lg shrink-0 ${warning ? 'bg-red-50 text-red-400' : highlight ? 'bg-blue-50 text-blue-500' : 'bg-slate-50 text-slate-400'}`}>
      <Icon className="w-3.5 h-3.5" />
    </div>
    <div className="flex-1 min-w-0">
      <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">{label}</span>
      <span className={`text-[12px] font-bold block truncate ${warning ? 'text-red-600' : highlight ? 'text-blue-700' : 'text-slate-800'}`}>
        {value || '—'}
      </span>
    </div>
  </div>
);

const MyCompany: React.FC<MyCompanyProps> = ({ companyId }) => {
  const [company, setCompany] = useState<any>(null);
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
        if (data) setCompany(data);
      } catch (error) {
        console.error('Error fetching company:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchCompanyData();
  }, [companyId]);

  const formatDate = (d: string | null | undefined) => {
    if (!d) return '—';
    const date = new Date(d + 'T00:00:00');
    return date.toLocaleDateString('pt-BR');
  };

  const isCertExpiringSoon = () => {
    if (!company?.certificate_expiry) return false;
    const expiry = new Date(company.certificate_expiry);
    const diff = (expiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    return diff <= 30;
  };

  const isCertExpired = () => {
    if (!company?.certificate_expiry) return false;
    return new Date(company.certificate_expiry) < new Date();
  };

  const getCertStatus = () => {
    if (!company?.certificate_expiry) return { label: 'Não Informado', color: 'bg-slate-100 text-slate-500 border-slate-200' };
    if (isCertExpired()) return { label: 'Vencido', color: 'bg-red-100 text-red-700 border-red-200' };
    if (isCertExpiringSoon()) return { label: 'Vencendo em breve', color: 'bg-amber-100 text-amber-700 border-amber-200' };
    return { label: 'Ativo', color: 'bg-green-100 text-green-700 border-green-200' };
  };

  const address = company
    ? [company.street, company.number, company.complement, company.neighborhood, company.city, company.state, company.zip_code]
      .filter(Boolean).join(', ')
    : '—';

  const certStatus = getCertStatus();

  return (
    <div className="space-y-5 animate-fade-in max-w-[1200px] mx-auto">
      <div>
        <h2 className="text-2xl font-serif font-bold text-slate-800">Minha Empresa</h2>
        <p className="text-slate-500 text-sm">Dados cadastrais e informações da sua empresa.</p>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-slate-300" />
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Carregando...</span>
          </div>
        </div>
      )}

      {!isLoading && company && (
        <>
          {/* Header Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-bl from-blue-50/50 to-transparent rounded-bl-full" />
            <div className="flex items-start gap-5 relative">
              <div className="w-16 h-16 bg-gradient-to-br from-slate-700 to-slate-900 rounded-xl flex items-center justify-center shadow-lg">
                <Building2 className="w-8 h-8 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-black text-slate-800 leading-tight">{company.name}</h3>
                {company.trade_name && (
                  <p className="text-sm text-slate-500 font-medium mt-0.5">{company.trade_name}</p>
                )}
                <div className="flex flex-wrap gap-2 mt-3">
                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-md border ${company.status === 'Ativo' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                    {company.status || 'Ativo'}
                  </span>
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-md border bg-blue-50 text-blue-600 border-blue-200">
                    {company.tax_regime || 'Não informado'}
                  </span>
                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-md border ${certStatus.color} flex items-center gap-1`}>
                    {isCertExpired() ? <AlertTriangle className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
                    Certificado: {certStatus.label}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Dados da Empresa */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="bg-slate-800 px-4 py-2">
                <span className="text-[9px] font-black text-white uppercase tracking-widest">Dados da Empresa</span>
              </div>
              <div className="p-4 space-y-0">
                <InfoRow icon={FileText} label="Razão Social" value={company.name} />
                <InfoRow icon={Hash} label="CNPJ" value={company.cnpj} highlight />
                <InfoRow icon={Hash} label="Inscrição Estadual" value={company.state_registration} />
                <InfoRow icon={Hash} label="Inscrição Municipal" value={company.municipal_registration} />
                <InfoRow icon={Hash} label="NIRE" value={company.nire} />
              </div>
            </div>

            {/* Endereço e Contato */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="bg-slate-800 px-4 py-2">
                <span className="text-[9px] font-black text-white uppercase tracking-widest">Endereço e Contato</span>
              </div>
              <div className="p-4 space-y-0">
                <InfoRow icon={MapPin} label="Endereço Completo" value={address} />
                <InfoRow icon={Phone} label="Telefone" value={company.phone} />
                <InfoRow icon={Mail} label="Email" value={company.email} />
                <InfoRow icon={Calendar} label="Cliente Desde" value={formatDate(company.client_date)} />
              </div>
            </div>

            {/* Certificado e NF-e */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="bg-slate-800 px-4 py-2">
                <span className="text-[9px] font-black text-white uppercase tracking-widest">Certificado Digital &amp; NF-e</span>
              </div>
              <div className="p-4 space-y-0">
                <InfoRow
                  icon={Shield}
                  label="Data Emissão Certificado"
                  value={formatDate(company.certificate_date)}
                />
                <InfoRow
                  icon={Calendar}
                  label="Vencimento Certificado"
                  value={formatDate(company.certificate_expiry)}
                  warning={isCertExpired() || isCertExpiringSoon()}
                />
                <InfoRow
                  icon={FileText}
                  label="Nº Última Nota Emitida"
                  value={company.last_nfe}
                  highlight
                />
              </div>

              {/* Alert if cert expiring */}
              {(isCertExpired() || isCertExpiringSoon()) && (
                <div className={`mx-4 mb-4 p-3 rounded-lg border ${isCertExpired() ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'}`}>
                  <div className="flex items-center gap-2">
                    <AlertTriangle className={`w-4 h-4 shrink-0 ${isCertExpired() ? 'text-red-500' : 'text-amber-500'}`} />
                    <div>
                      <span className={`text-[10px] font-black uppercase tracking-wider ${isCertExpired() ? 'text-red-600' : 'text-amber-600'}`}>
                        {isCertExpired() ? 'Certificado Vencido!' : 'Certificado Vencendo!'}
                      </span>
                      <p className={`text-[10px] ${isCertExpired() ? 'text-red-500' : 'text-amber-500'}`}>
                        {isCertExpired()
                          ? 'Seu certificado digital está vencido. Entre em contato com seu contador.'
                          : 'Seu certificado vence em menos de 30 dias. Providencie a renovação.'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default MyCompany;