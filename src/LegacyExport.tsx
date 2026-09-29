import React, {useState,type FormEvent} from 'react';
import Dexie, {type EntityTable} from 'dexie';
import {accountDB} from './db';
type LegacyUser={id:string;email:string;salt:string;verifier:string};
export default function LegacyExport() {
  const [busy,setBusy]=useState(false);const [message,setMessage]=useState('');
  async function download(e:FormEvent<HTMLFormElement>) {
    e.preventDefault();const form=new FormData(e.currentTarget);setBusy(true);setMessage('');
    const registry=new Dexie('moneyflow-accounts') as Dexie & {accounts:EntityTable<LegacyUser,'id'>};
    registry.version(1).stores({accounts:'id,&email'});
    try {
      const row=await registry.accounts.where('email').equals(String(form.get('email')).trim().toLowerCase()).first();
      if(!row)throw new Error('No se encuentra esa cuenta local en este navegador.');
      const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(String(form.get('password'))),'PBKDF2',false,['deriveBits']);
      const bits=await crypto.subtle.deriveBits({name:'PBKDF2',salt:new TextEncoder().encode(row.salt),iterations:600000,hash:'SHA-256'},key,256);
      if(Array.from(new Uint8Array(bits),n=>n.toString(16).padStart(2,'0')).join('')!==row.verifier)throw new Error('Contraseña local incorrecta.');
      const db=accountDB(row.id);
      const data=await db.transaction('r',db.movements,db.budgets,db.recurring,async()=>({version:2,movements:await db.movements.toArray(),budgets:await db.budgets.toArray(),recurring:await db.recurring.toArray()}));
      const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));
      const a=document.createElement('a');a.href=url;a.download='moneyflow-cuenta-local.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
      setMessage('Copia descargada. Puedes restaurarla en tu cuenta en línea desde Ajustes.');
    } catch(e) {setMessage(e instanceof Error?e.message:'No se pudo exportar.');} finally {registry.close();setBusy(false);}
  }
  return <section className="panel settings-card account-settings"><h2>Recuperar una cuenta local antigua</h2><p>Si usaste cuentas locales antes de conectar Supabase, descarga aquí sus datos con las credenciales antiguas. La contraseña se comprueba solo en este navegador.</p><details><summary>Exportar datos de una cuenta antigua</summary><form onSubmit={e=>void download(e)}><label>Correo de la cuenta local<input name="email" type="email" required autoComplete="off"/></label><label>Contraseña local antigua<input name="password" type="password" required autoComplete="off"/></label><button className="secondary" disabled={busy}>Descargar datos antiguos</button></form></details>{message&&<p role="status">{message}</p>}</section>;
}
