import React, { useState } from 'react';
import App from './App';
import Auth, { type User } from './Auth';
export default function AccountRoot() {
  const [user, setUser] = useState<User | null>(null);
  const [auth, setAuth] = useState(() => { try { return sessionStorage.getItem('moneyflow-account-lock') === '1'; } catch { return false; } });
  function mark(locked: boolean) { try { sessionStorage.setItem('moneyflow-account-lock', locked ? '1' : '0'); } catch { /* In-memory login still works. */ } }
  if (auth) return <Auth onLogin={u => { setUser(u); mark(true); setAuth(false); }} onCancel={() => { setUser(null); mark(false); setAuth(false); }} />;
  return <App key={user?.id ?? 'guest'} user={user} onAccount={() => setAuth(true)} onLogout={() => { setUser(null); mark(true); setAuth(true); }} />;
}
