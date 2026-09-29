import React, { useState, type FormEvent } from 'react';
import type { User } from './Auth';
import { authMessage, authRedirect, client } from './supabase';
export default function AccountSettings({user}:{user:User}) {
  const [busy,setBusy]=useState(false); const [message,setMessage]=useState('');const [error,setError]=useState('');
  async function submit(e:FormEvent<HTMLFormElement>,kind:'name'|'email'|'password') {
    e.preventDefault();const element=e.currentTarget; const form=new FormData(element);setBusy(true);setMessage('');setError('');
    try {
      const api=client();
      if(kind === 'name') {
        const name=String(form.get('name')).trim();if(!name)throw new Error('Introduce tu nombre.');
        const {error}=await api.auth.updateUser({data:{name}});if(error)throw error;setMessage('Nombre actualizado.');
      } else {
        const {error:loginError}=await api.auth.signInWithPassword({email:user.email,password:String(form.get('current'))});if(loginError)throw loginError;
        if(kind==='email') {
          const email=String(form.get('email')).trim().toLowerCase();
          if(email===user.email)throw new Error('Introduce un correo diferente.');
          const {error}=await api.auth.updateUser({email},{emailRedirectTo:authRedirect()});if(error)throw error;
          setMessage('Solicitud enviada. Revisa el correo actual y el nuevo para confirmar el cambio.');
        } else {
          const password=String(form.get('password'));
          if(password.length<10 || password!==form.get('confirm'))throw new Error('Usa al menos 10 caracteres y repite la misma contraseña.');
          const {error}=await api.auth.updateUser({password});if(error)throw error;setMessage('Contraseña actualizada.');
        }
        element.reset();
      }
    } catch(e) {setError(authMessage(e));} finally {setBusy(false);}
  }
  return <section className="panel settings-card account-settings"><h2>Perfil y acceso</h2><p>Cuenta: {user.email}</p>{message&&<p className="notice" role="status">{message}</p>}{error&&<p className="form-error" role="alert">{error}</p>}
    <form onSubmit={e=>void submit(e,'name')}><label>Nombre visible<input name="name" required maxLength={60} defaultValue={user.name}/></label><button className="secondary" disabled={busy}>Guardar nombre</button></form>
    <details><summary>Cambiar correo</summary><form onSubmit={e=>void submit(e,'email')}><label>Nuevo correo<input name="email" type="email" required autoComplete="email"/></label><label>Contraseña actual<input name="current" type="password" required autoComplete="current-password"/></label><button className="secondary" disabled={busy}>Solicitar cambio de correo</button></form></details>
    <details><summary>Cambiar contraseña</summary><form onSubmit={e=>void submit(e,'password')}><label>Contraseña actual<input name="current" type="password" required autoComplete="current-password"/></label><label>Nueva contraseña<input name="password" type="password" required minLength={10} autoComplete="new-password"/></label><label>Repetir contraseña<input name="confirm" type="password" required autoComplete="new-password"/></label><button className="secondary" disabled={busy}>Cambiar contraseña</button></form></details>
  </section>;
}
