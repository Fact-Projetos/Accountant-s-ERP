import React, { useState, useEffect } from 'react';
import { supabase } from './services/supabase';
import Login from './components/Login';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import Clients from './components/Clients';
import Movements from './components/Movements';
import NfsLinks from './components/NfsLinks';
import TaxAssessment from './components/TaxAssessment';
import MyCompany from './components/client/MyCompany';
import Sales from './components/client/Sales';
import Inventory from './components/client/Inventory';
import Services from './components/client/Services';
import Partners from './components/client/Partners';
import ImportNfe from './components/client/ImportNfe';
import NfeActions from './components/client/NfeActions';
import FiscalMatrix from './components/client/FiscalMatrix';
import Financial from './components/client/Financial';
import AccountantFinancial from './components/AccountantFinancial';

import { ViewState } from './types';
import ErrorBoundary from './components/ErrorBoundary';

const App: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState<'Contador' | 'Cliente'>('Contador');
  const [currentView, setCurrentView] = useState<ViewState>(ViewState.HOME);
  const [impersonatedCompanyId, setImpersonatedCompanyId] = useState<number | null>(null);
  const [profileCompanyId, setProfileCompanyId] = useState<number | null>(null);
  const [visibleViews, setVisibleViews] = useState<ViewState[] | null>(null);

  // Global Cache to prevent "flickering" between tabs
  const [globalClients, setGlobalClients] = useState<any[]>([]);
  const [globalCityLinks, setGlobalCityLinks] = useState<any[]>([]);
  const [globalTaxAssessments, setGlobalTaxAssessments] = useState<any[]>([]);
  const [globalMovementsFilters, setGlobalMovementsFilters] = useState({
    client: '',
    month: '',
    year: String(new Date().getFullYear()),
    city: ''
  });

  useEffect(() => {
    console.log('[Fact ERP] Initializing session...');
    // Check active sessions and sets the user
    const checkSession = async () => {
      // 1. Check custom client session (from companies table)
      const savedSession = localStorage.getItem('fact_client_session');
      if (savedSession) {
        const { role, companyId } = JSON.parse(savedSession);
        setUserRole(role);
        setProfileCompanyId(companyId);
        setIsLoggedIn(true);
        setCurrentView(ViewState.MY_COMPANY);
        return;
      }

      // 2. Check standard Supabase session
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setIsLoggedIn(true);
        let profile: any = null;
        try {
          const { data } = await supabase
            .from('profiles')
            .select('role, company_id, visible_views')
            .eq('id', session.user.id)
            .maybeSingle();
          profile = data;
        } catch (err) {
          // If visible_views column doesn't exist, try without it
          try {
            const { data } = await supabase
              .from('profiles')
              .select('role, company_id')
              .eq('id', session.user.id)
              .maybeSingle();
            profile = data;
          } catch (e) { /* profiles table may not exist */ }
        }

        const role = profile?.role as 'Contador' | 'Cliente' || session.user.user_metadata?.role || 'Contador';
        setUserRole(role);
        setProfileCompanyId(profile?.company_id || null);
        if (profile?.visible_views) {
          setVisibleViews(profile.visible_views as ViewState[]);
        }
        setCurrentView(role === 'Contador' ? ViewState.HOME : ViewState.MY_COMPANY);
      }
    };
    checkSession();

    // Listen for changes on auth state (logged in, signed out, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session) {
        setIsLoggedIn(true);

        let profile: any = null;
        try {
          const { data } = await supabase
            .from('profiles')
            .select('role, company_id, visible_views')
            .eq('id', session.user.id)
            .maybeSingle();
          profile = data;
        } catch (err) {
          try {
            const { data } = await supabase
              .from('profiles')
              .select('role, company_id')
              .eq('id', session.user.id)
              .maybeSingle();
            profile = data;
          } catch (e) { /* ignore */ }
        }

        const role = (profile?.role as 'Contador' | 'Cliente') || (session.user.user_metadata?.role as 'Contador' | 'Cliente') || 'Contador';
        setUserRole(role);
        setProfileCompanyId(profile?.company_id || null);
        if (profile?.visible_views) {
          setVisibleViews(profile.visible_views as ViewState[]);
        } else {
          setVisibleViews(null);
        }
        console.log(`Auth Change: ${session.user.email} | Role: ${role} | Company: ${profile?.company_id} | Views: ${profile?.visible_views || 'all'}`);
      } else {
        setIsLoggedIn(false);
        setUserRole('Contador');
        setProfileCompanyId(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // ─── Real-time Synchronization Layer ──────────────────────────
  useEffect(() => {
    if (!isLoggedIn || userRole !== 'Contador') return;

    console.log('[Fact ERP] Initializing Real-time listeners...');

    const channel = supabase
      .channel('db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'companies' }, () => {
        console.log('[Real-time] Companies changed, triggering update...');
        window.dispatchEvent(new CustomEvent('fact-db-change', { detail: { table: 'companies' } }));
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tax_assessments' }, () => {
        console.log('[Real-time] Tax Assessments changed...');
        window.dispatchEvent(new CustomEvent('fact-db-change', { detail: { table: 'tax_assessments' } }));
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'movements' }, () => {
        console.log('[Real-time] Movements changed...');
        window.dispatchEvent(new CustomEvent('fact-db-change', { detail: { table: 'movements' } }));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isLoggedIn, userRole]);

  const activeCompanyId = impersonatedCompanyId || profileCompanyId;

  useEffect(() => {
    const fetchPermissions = async () => {
      if (userRole === 'Cliente' && activeCompanyId) {
        try {
          const { data, error } = await supabase
            .from('companies')
            .select('visible_views')
            .eq('id', activeCompanyId)
            .single() as any;

          if (data && !error) {
            console.log('Applying client view permissions:', data.visible_views);
            setVisibleViews(data.visible_views as ViewState[]);
          }
        } catch (err) {
          console.error('Error fetching permissions:', err);
        }
      }
      // For Contador: visibleViews is already loaded from profile in checkSession/onAuthStateChange
      // Don't reset to null here for Contador users
    };
    fetchPermissions();
  }, [userRole, activeCompanyId]);

  const handleLogin = (success: boolean, role: 'Contador' | 'Cliente', companyId?: number) => {
    if (success) {
      setUserRole(role);
      setIsLoggedIn(true);
      setImpersonatedCompanyId(null);
      if (companyId) setProfileCompanyId(companyId);

      // Set default view based on role
      setCurrentView(role === 'Contador' ? ViewState.HOME : ViewState.MY_COMPANY);
    }
  };

  const handleExitImpersonation = () => {
    setUserRole('Contador');
    setImpersonatedCompanyId(null);
    setCurrentView(ViewState.CLIENTS);
  };

  const handleLogout = async () => {
    console.log("Logout triggered - non-blocking mode");
    try {
      if (!window.confirm("Deseja realmente sair do sistema?")) return;

      // Clear persistence immediately to stop "auto-login"
      localStorage.clear();
      sessionStorage.clear();

      // Try to notify Supabase but don't wait for it
      supabase.auth.signOut().catch(() => { });

      console.log("Local session cleared. Force reloading...");
      window.location.href = '/';
    } catch (err) {
      console.error("Logout caught error:", err);
      window.location.href = '/';
    }
  };

  const handleImpersonate = (companyId: number) => {
    setImpersonatedCompanyId(companyId);
    setUserRole('Cliente');
    setCurrentView(ViewState.MY_COMPANY);
  };

  if (!isLoggedIn) {
    return <Login onLogin={handleLogin} />;
  }

  const renderView = () => {
    console.log('[DEBUG] App renderView, currentView:', currentView, 'isLoggedIn:', isLoggedIn);
    switch (currentView) {
      // Accountant Views
      case ViewState.HOME:
        return <Dashboard />;
      case ViewState.CLIENTS:
        return <Clients
          onImpersonate={handleImpersonate}
          initialData={globalClients}
          onDataUpdate={setGlobalClients}
          hideFinancialFields={visibleViews !== null && !visibleViews.includes(ViewState.ACC_FINANCIAL)}
        />;
      case ViewState.MOVEMENTS:
        return <Movements
          initialClients={globalClients}
          onClientsUpdate={setGlobalClients}
          initialCityLinks={globalCityLinks}
          onCityLinksUpdate={setGlobalCityLinks}
          filters={globalMovementsFilters}
          onFiltersChange={setGlobalMovementsFilters}
        />;
      case ViewState.TAX_ASSESSMENT:
        return <TaxAssessment
          initialCompanies={globalClients}
          onCompaniesUpdate={setGlobalClients}
          initialRows={globalTaxAssessments}
          onRowsUpdate={setGlobalTaxAssessments}
        />;
      case ViewState.LINKS_NFSE:
        return <NfsLinks
          initialData={globalCityLinks}
          onDataUpdate={setGlobalCityLinks}
        />;
      case ViewState.ACC_FINANCIAL:
        return <AccountantFinancial />;

      // Client Views
      case ViewState.MY_COMPANY:
        return <MyCompany companyId={activeCompanyId} />;
      case ViewState.SALES:
        return <Sales companyId={activeCompanyId} />;
      case ViewState.SERVICES:
        return <Services companyId={activeCompanyId} />;
      case ViewState.INVENTORY:
        return <Inventory companyId={activeCompanyId} />;
      case ViewState.PARTNERS:
        return <Partners companyId={activeCompanyId} />;
      case ViewState.IMPORT_NFE:
        return <ImportNfe companyId={activeCompanyId} />;
      case ViewState.NFE_ACTIONS:
        return <NfeActions companyId={activeCompanyId} />;
      case ViewState.FISCAL_MATRIX:
        return <FiscalMatrix companyId={activeCompanyId} />;
      case ViewState.FINANCIAL:
        return <Financial companyId={activeCompanyId} />;

      default:
        return userRole === 'Contador' ? <Dashboard /> : <MyCompany companyId={activeCompanyId} />;
    }
  };

  return (
    <Layout
      currentView={currentView}
      onNavigate={setCurrentView}
      onLogout={handleLogout}
      userRole={userRole}
      visibleViews={visibleViews || undefined}
      isImpersonating={!!impersonatedCompanyId}
      onExitImpersonation={handleExitImpersonation}
    >
      <ErrorBoundary>
        {renderView()}
      </ErrorBoundary>
    </Layout>
  );
};

export default App;