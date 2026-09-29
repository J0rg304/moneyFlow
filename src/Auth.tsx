import React, { useState, type FormEvent } from 'react';
import Dexie, { type EntityTable } from 'dexie';
type Account = { id: string; email: string; name: string; salt: string; verifier: string };
export type User = Pick<Account, 'id' | 'name' | 'email'>;
const registry = new Dexie('moneyflow-accounts') as Dexie & { accounts: EntityTable<Account,'id'> };
registry.version(1).stores({ accounts: 'id,&email' });
async function derive(password: string, salt: string) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: new TextEncoder().encode(salt), iterations: 600000, hash: 'SHA-256' }, key, 256);
  return Array.from(new Uint8Array(bits), n => n.toString(16).padStart(2, '0')).join('');
}
export default function Auth({ onLogin, onCancel }: { onLogin: (user: User) => void; onCancel: () => void }) {
  const [register, setRegister] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setBusy(true); setError('');
    const form = new FormData(e.currentTarget);
    const email = String(form.get('email')).trim().toLowerCase();
    const password = String(form.get('password'));
    try {
      if (register) {
        if (password !== form.get('confirm')) throw new Error('Las contraseñas no coinciden.');
        if (password.length < 10) throw new Error('Utiliza al menos 10 caracteres.');
        const name = String(form.get('name')).trim();
        if (!name) throw new Error('Introduce tu nombre.');
        if (await registry.accounts.where('email').equals(email).first()) throw new Error('Ya existe una cuenta local con ese correo.');
        const salt = crypto.randomUUID();
        const account = { id: crypto.randomUUID(), email, name, salt, verifier: await derive(password, salt) };
        await registry.accounts.add(account);
        onLogin({ id: account.id, name, email });
      } else {
        const account = await registry.accounts.where('email').equals(email).first();
        if (!account || await derive(password, account.salt) !== account.verifier) throw new Error('Correo o contraseña incorrectos.');
        onLogin({ id: account.id, name: account.name, email: account.email });
      }
    } catch(e) { setError(e instanceof Error ? e.message : 'No se pudo acceder.'); } finally { setBusy(false); }
  }
  return <div className="auth-shell"><section className="panel auth-card"><span className="eyebrow">MONEYFLOW · CUENTA LOCAL GRATUITA</span><h1>{register ? 'Crea tu espacio' : 'Bienvenido de nuevo'}</h1><p>Tu cuenta existe solo en este navegador. Sin servidor ni sincronización. El correo es tu identificador; no enviamos mensajes.</p><form onSubmit={submit}>
    {register && <label>Nombre<input name="name" required maxLength={60} autoComplete="name" /></label>}
    <label>Correo electrónico<input name="email" type="email" required autoComplete="username" maxLength={150} /></label>
    <label>Contraseña<input name="password" type="password" required minLength={register ? 10 : undefined} maxLength={200} autoComplete={register ? 'new-password' : 'current-password'} /></label>
    {register && <label>Repetir contraseña<input name="confirm" type="password" required autoComplete="new-password" /></label>}
    {error && <p role="alert" className="form-error">{error}</p>}
    <button className="primary" disabled={busy}>{busy ? 'Procesando…' : register ? 'Crear cuenta' : 'Iniciar sesión'}</button>
  </form><button className="text-button" disabled={busy} onClick={() => { setRegister(!register); setError(''); }}>{register ? 'Ya tengo cuenta' : 'Registrarme'}</button><button className="secondary" disabled={busy} onClick={onCancel}>Volver al espacio sin cuenta</button><p className="small">Cada cuenta empieza vacía. Para llevar tus datos anteriores, exporta una copia JSON desde el espacio sin cuenta e impórtala después. Los datos no están cifrados; este acceso no protege frente a quien controle el navegador. No hay recuperación de contraseña por correo.</p></section></div>;
}
