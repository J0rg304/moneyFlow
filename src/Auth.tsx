import React, { useState, type FormEvent } from 'react';
import { authMessage, authRedirect, client, supabase } from './supabase';
export type User = { id: string; name: string; email: string };
type Mode = 'login' | 'register' | 'forgot' | 'resend';
export default function Auth({ onCancel, initialError = '' }: { onCancel: () => void; initialError?: string }) {
  const [mode, setMode] = useState<Mode>('login');
  const [error, setError] = useState(initialError);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const register = mode === 'register';
  function change(next: Mode) { setMode(next); setError(''); setMessage(''); }
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setBusy(true); setError(''); setMessage('');
    const form = new FormData(e.currentTarget);
    const address = email.trim().toLowerCase();
    try {
      const api = client();
      if (mode !== 'login' && Date.now() < cooldown) throw new Error('Espera un minuto antes de solicitar otro correo.');
      if (register) {
        const password = String(form.get('password'));
        if (password !== form.get('confirm')) throw new Error('Las contraseñas no coinciden.');
        if (password.length < 10) throw new Error('Utiliza al menos 10 caracteres.');
        const name = String(form.get('name')).trim();
        if (!name) throw new Error('Introduce tu nombre.');
        const {data,error} = await api.auth.signUp({ email: address, password, options: { data: { name }, emailRedirectTo: authRedirect() } });
        if (error) throw error;
        if (!data.session) { setCooldown(Date.now()+60000); setMessage('Si la dirección puede registrarse, recibirás un correo para confirmar tu cuenta. Revisa también la carpeta de spam. Si ya tienes cuenta, inicia sesión o recupera tu contraseña.'); }
      } else if (mode === 'login') {
        const { error } = await api.auth.signInWithPassword({ email: address, password: String(form.get('password')) });
        if (error) throw error;
      } else {
        const result = mode === 'forgot'
          ? await api.auth.resetPasswordForEmail(address, { redirectTo: authRedirect(true) })
          : await api.auth.resend({ type: 'signup', email: address, options: { emailRedirectTo: authRedirect() } });
        if (result.error) throw result.error;
        setCooldown(Date.now()+60000);
        setMessage('Si hay una cuenta que necesita este enlace, recibirás un correo. Revisa tu bandeja de entrada y spam.');
      }
    } catch(e) { setError(authMessage(e)); } finally { setBusy(false); }
  }
  return <div className="auth-shell"><section className="panel auth-card"><span className="eyebrow">MONEYFLOW · TU ESPACIO PERSONAL</span><h1>{register ? 'Crea tu cuenta' : mode === 'forgot' ? 'Recupera tu acceso' : mode === 'resend' ? 'Confirma tu correo' : 'Bienvenido de nuevo'}</h1><p>{mode === 'login' || register ? 'Accede a tus finanzas desde distintos dispositivos con tu correo y contraseña.' : 'Introduce el correo de tu cuenta para solicitar un nuevo enlace.'}</p><form onSubmit={submit}>
    {register && <label>Nombre<input name="name" required maxLength={60} autoComplete="name" /></label>}
    <label>Correo electrónico<input name="email" type="email" required autoComplete="username" maxLength={150} value={email} onChange={e => setEmail(e.target.value)} /></label>
    {(register || mode === 'login') && <label>Contraseña<input name="password" type="password" required minLength={register ? 10 : undefined} maxLength={200} autoComplete={register ? 'new-password' : 'current-password'} /></label>}
    {register && <label>Repetir contraseña<input name="confirm" type="password" required autoComplete="new-password" /></label>}
    {error && <p role="alert" className="form-error">{error}</p>}{message && <p role="status" className="notice">{message}</p>}
    <button className="primary" disabled={busy || !supabase}>{busy ? 'Procesando…' : register ? 'Crear cuenta' : mode === 'login' ? 'Iniciar sesión' : 'Enviar enlace'}</button>
  </form>{!supabase && <p role="alert">La conexión con Supabase todavía no está configurada.</p>}
  <div className="auth-links">{mode !== 'login' && <button className="text-button" disabled={busy} onClick={() => change('login')}>Ya tengo cuenta</button>}{mode !== 'register' && <button className="text-button" disabled={busy} onClick={() => change('register')}>Registrarme</button>}{mode === 'login' && <><button className="text-button" disabled={busy} onClick={() => change('forgot')}>He olvidado mi contraseña</button><button className="text-button" disabled={busy} onClick={() => change('resend')}>Reenviar confirmación</button></>}</div><button className="secondary" disabled={busy} onClick={onCancel}>Volver al espacio sin cuenta</button><p className="small">Tus cuentas locales anteriores no se convierten automáticamente. Regístrate y traslada tus datos con una copia JSON.</p></section></div>;
}

export function ResetPassword({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  const [busy,setBusy] = useState(false); const [error,setError] = useState('');
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); const form = new FormData(e.currentTarget); setBusy(true); setError('');
    try {
      const password = String(form.get('password'));
      if (password.length < 10 || password !== form.get('confirm')) throw new Error('Usa al menos 10 caracteres y repite la misma contraseña.');
      const {error} = await client().auth.updateUser({password}); if(error) throw error;
      onDone();
    } catch(e) {setError(authMessage(e));} finally {setBusy(false);}
  }
  return <div className="auth-shell"><section className="panel auth-card"><h1>Nueva contraseña</h1><p>Elige una contraseña de al menos 10 caracteres.</p><form onSubmit={save}><label>Nueva contraseña<input name="password" type="password" minLength={10} required autoComplete="new-password" /></label><label>Repetir contraseña<input name="confirm" type="password" required autoComplete="new-password" /></label>{error && <p role="alert" className="form-error">{error}</p>}<button className="primary" disabled={busy}>{busy ? 'Guardando…' : 'Guardar nueva contraseña'}</button></form><button className="secondary" disabled={busy} onClick={onCancel}>Cancelar y cerrar sesión</button></section></div>;
}
