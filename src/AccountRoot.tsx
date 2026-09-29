import React, { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import App from './App';
import Auth, { ResetPassword } from './Auth';
import { authMessage, supabase } from './supabase';
import { useTheme } from './theme';
const callbackParams = new URLSearchParams(window.location.hash.slice(1));
const callbackError = callbackParams.get('error_description') ? 'El enlace ha caducado o no es válido. Solicita uno nuevo.' : '';
function recoverySaved() { try { return sessionStorage.getItem('moneyflow-recovery') === '1'; } catch { return false; } }
export default function AccountRoot() {
  useTheme();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(!!supabase);
  const [auth, setAuth] = useState(!!callbackError || new URLSearchParams(location.search).get('auth') === 'recovery');
  const [recovery, setRecovery] = useState(recoverySaved);
  const [error,setError] = useState(callbackError);
  const [notice,setNotice] = useState('');
  const [loggingOut,setLoggingOut] = useState(false);
  function markRecovery(value: boolean) { setRecovery(value); try { sessionStorage.setItem('moneyflow-recovery', value ? '1' : '0'); } catch { /* Session state still works. */ } }
  useEffect(() => {
    if (!supabase) return;
    let alive = true; let receivedEvent = false;
    const {data: {subscription}} = supabase.auth.onAuthStateChange((event, next) => {
      if (!alive) return;
      receivedEvent = true; setSession(next); setLoading(false);
      if (event === 'PASSWORD_RECOVERY') markRecovery(true);
      if (next && event !== 'PASSWORD_RECOVERY') setAuth(false);
      if (event === 'SIGNED_OUT') { markRecovery(false); setAuth(true); }
    });
    void supabase.auth.getSession().then(({data,error}) => {
      if (!alive) return;
      if (error) {setError(authMessage(error));setAuth(true);}
      if (!receivedEvent) setSession(data.session);
      setLoading(false);
    }).catch(e => {if(alive) {setError(authMessage(e));setLoading(false);setAuth(true);}});
    return () => { alive = false; subscription.unsubscribe(); };
  }, []);
  async function logout() {
    setLoggingOut(true); setError('');
    try {
      if (supabase) { const {error} = await supabase.auth.signOut({scope:'local'}); if(error) throw error; }
      setSession(null); markRecovery(false); setAuth(true); setNotice('');
      history.replaceState(null,'',location.pathname);
    } catch(e) {setError(authMessage(e));} finally {setLoggingOut(false);}
  }
  if (loading) return <div className="auth-shell" role="status">Comprobando tu sesión…</div>;
  if (recovery && session) return <><ResetPassword onDone={() => {markRecovery(false);history.replaceState(null,'',location.pathname);setNotice('Contraseña actualizada correctamente.');}} onCancel={() => void logout()} />{error && <p className="notice" role="alert">{error}</p>}</>;
  if (auth && !session) return <Auth initialError={error} onCancel={() => {setAuth(false);setError('');history.replaceState(null,'',location.pathname);}} />;
  const user = session ? {id:session.user.id,name:String(session.user.user_metadata.name || session.user.email?.split('@')[0] || 'Tu cuenta'),email:session.user.email ?? ''} : null;
  return <>{error && <div className="notice" role="alert">{error}</div>}{notice && <div className="notice" role="status">{notice}<button className="text-button" onClick={() => setNotice('')}>Cerrar</button></div>}{loggingOut ? <div className="auth-shell">Cerrando sesión…</div> : <App key={user?.id ?? 'guest'} user={user} onAccount={() => {setAuth(true);setError('');}} onLogout={() => void logout()} />}</>;
}
