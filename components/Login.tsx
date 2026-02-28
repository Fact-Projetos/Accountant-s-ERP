import React, { useState } from 'react';
import { ShieldCheck, ArrowRight, AlertCircle, Briefcase, Building2, Loader2 } from 'lucide-react';
import { supabase } from '../services/supabase';

interface LoginProps {
  onLogin: (success: boolean, role: 'Contador' | 'Cliente', companyId?: string) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [loginType, setLoginType] = useState<'contador' | 'cliente'>('contador');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const cleanUsername = username.trim();
      const cleanPassword = password.trim();

      if (!isSignUp && loginType === 'cliente') {
        const { data, error: fetchError } = await supabase
          .rpc('check_client_login', {
            p_login: cleanUsername,
            p_password: cleanPassword
          })
          .maybeSingle() as { data: { id: string } | null, error: any };

        if (fetchError) {
          console.error('Client login fetch error:', fetchError);
          throw new Error('Erro na comunicação com o servidor.');
        }

        if (!data) {
          throw new Error('Usuário ou senha da empresa incorretos.');
        }

        localStorage.setItem('fact_client_session', JSON.stringify({
          role: 'Cliente',
          companyId: data.id,
          username: cleanUsername
        }));

        onLogin(true, 'Cliente', data.id);
        return;
      }

      const email = cleanUsername.includes('@') ? cleanUsername : `${cleanUsername}@fact.com.br`;

      if (isSignUp) {
        const { data, error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              role: loginType === 'contador' ? 'Contador' : 'Cliente',
            }
          }
        });
        if (authError) throw authError;
        alert('Conta criada com sucesso! Verifique seu e-mail se necessário.');
        setIsSignUp(false);
      } else {
        const { data, error: authError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (authError) throw authError;

        if (data.user) {
          const role = data.user.user_metadata?.role || (loginType === 'contador' ? 'Contador' : 'Cliente');
          onLogin(true, role as 'Contador' | 'Cliente');
        }
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message || 'Erro ao realizar login. Verifique suas credenciais.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
        {/* Header with Premium Decoration */}
        <div className="bg-slate-900 p-8 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-slate-400 via-slate-200 to-slate-400"></div>
          <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-slate-400 opacity-10 rounded-full blur-2xl"></div>
          <div className="absolute -top-10 -left-10 w-32 h-32 bg-slate-400 opacity-10 rounded-full blur-2xl"></div>

          <div className="relative z-10 flex flex-col items-center">
            <div className="bg-white/10 p-3 rounded-xl mb-4 backdrop-blur-sm border border-white/10">
              <ShieldCheck className="w-8 h-8 text-slate-200" />
            </div>
            <h1 className="text-3xl font-serif font-bold text-white mb-1">Fact</h1>
            <p className="text-slate-400 text-[10px] font-bold tracking-widest uppercase">ERP Contábil</p>
          </div>
        </div>

        {/* Form */}
        <div className="p-8">

          {/* Login Type Toggle */}
          <div className="flex p-1 bg-slate-100 rounded-xl mb-6 border border-slate-200">
            <button
              type="button"
              onClick={() => { setLoginType('contador'); setError(''); setUsername(''); setPassword(''); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold rounded-lg transition-all duration-200 ${loginType === 'contador'
                ? 'bg-white text-slate-800 shadow-sm ring-1 ring-slate-200'
                : 'text-slate-500 hover:text-slate-700'
                }`}
            >
              <Briefcase className="w-4 h-4" />
              Sou Contador
            </button>
            <button
              type="button"
              onClick={() => { setLoginType('cliente'); setError(''); setUsername(''); setPassword(''); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold rounded-lg transition-all duration-200 ${loginType === 'cliente'
                ? 'bg-white text-slate-800 shadow-sm ring-1 ring-slate-200'
                : 'text-slate-500 hover:text-slate-700'
                }`}
            >
              <Building2 className="w-4 h-4" />
              Sou Cliente
            </button>
          </div>

          <h2 className="text-xl font-semibold text-slate-800 mb-6 text-center">
            {isSignUp ? 'Criar Nova Conta' : (loginType === 'contador' ? 'Acesso do Contador' : 'Acesso do Cliente')}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Usuário
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-slate-400 outline-none transition-all text-slate-800 font-medium"
                placeholder={loginType === 'contador' ? "Usuário do escritório" : "Usuário da empresa"}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Senha</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-slate-400 outline-none transition-all text-slate-800"
                placeholder="••••••"
              />
            </div>

            {isSignUp && (
              <p className="text-[10px] text-slate-400 font-medium">
                Sua conta será criada como <span className="text-slate-700 font-bold">{loginType === 'contador' ? 'Contador' : 'Cliente'}</span>.
              </p>
            )}

            {error && (
              <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-lg">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-slate-800 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg hover:bg-slate-900 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed active:scale-[0.98]"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  {isSignUp ? 'Criando conta...' : 'Entrando...'}
                </>
              ) : (
                <>
                  {isSignUp ? 'Criar Conta' : 'Entrar no Sistema'}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center space-y-3">
            <button
              type="button"
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-xs font-bold uppercase tracking-widest text-slate-500 hover:text-slate-800 transition-colors block w-full"
            >
              {isSignUp ? 'Já tem uma conta? Entre aqui' : 'Não tem uma conta? Cadastre-se'}
            </button>
            {!isSignUp && (
              <a href="#" className="text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-slate-800 transition-colors">Esqueceu sua senha?</a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;