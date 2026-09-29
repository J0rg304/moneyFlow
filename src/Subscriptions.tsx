import React, { useState, type FormEvent } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { categories, cents, euros, validDate } from './domain';
import { recordPayment, type Recurring } from './recurring';
import type { MoneyDB } from './db';

export default function Subscriptions({ db, today }: { db: MoneyDB; today: string }) {
  const rows = useLiveQuery(() => db.recurring.orderBy('nextDate').toArray(), [db]);
  const [editing, setEditing] = useState<Recurring | null | undefined>(undefined);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function action(fn: () => Promise<unknown>) {
    setBusy(true); setError('');
    try { await fn(); } catch(e) { setError(e instanceof Error ? e.message : 'No se pudo guardar.'); } finally { setBusy(false); }
  }
  function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); const form = new FormData(e.currentTarget);
    void action(async () => {
      const nextDate = String(form.get('nextDate')); const name = String(form.get('name')).trim();
      if (!validDate(nextDate) || !name) throw new Error('Revisa el nombre y la fecha.');
      const interval = String(form.get('interval')) as Recurring['interval'];
      await db.recurring.put({ id: editing?.id ?? crypto.randomUUID(), name, amountCents: cents(String(form.get('amount'))), category: String(form.get('category')), interval, nextDate, anchorDay: editing && nextDate === editing.nextDate ? editing.anchorDay : Number(nextDate.slice(8)), active: editing?.active ?? true });
      setEditing(undefined);
    });
  }
  const active = (rows ?? []).filter(r => r.active);
  return <section className="panel subscriptions"><div className="panel-heading"><div><h2>Suscripciones y pagos recurrentes</h2><p>Gimnasio, plataformas, seguros… Confirma cada pago para añadirlo a tus gastos.</p></div><button className="primary" onClick={() => { setEditing(null); setError(''); }}>Añadir suscripción</button></div><div className="subscription-summary"><strong>{euros(Math.round(active.reduce((sum,r) => sum + r.amountCents / (r.interval === 'yearly' ? 12 : 1), 0)))} / mes</strong><span>Coste equivalente de {active.length} servicios activos · Las previsiones no son gastos registrados.</span></div>
    {error && <p className="form-error" role="alert">{error}</p>}
    {editing !== undefined && <form className="subscription-form" onSubmit={save} key={editing?.id ?? 'new'}><h2>{editing ? 'Editar suscripción' : 'Nueva suscripción'}</h2><label>Servicio<input name="name" required maxLength={100} defaultValue={editing?.name} placeholder="Spotify, gimnasio, seguro…" /></label><label>Importe (€)<input name="amount" inputMode="decimal" required defaultValue={editing ? (editing.amountCents / 100).toFixed(2) : ''} /></label><label>Periodicidad<select name="interval" defaultValue={editing?.interval ?? 'monthly'}><option value="monthly">Mensual</option><option value="yearly">Anual</option></select></label><label>Categoría<select name="category" defaultValue={editing?.category ?? 'Ocio'}>{categories.map(c => <option key={c}>{c}</option>)}</select></label><label>Próximo pago<input name="nextDate" type="date" required defaultValue={editing?.nextDate ?? today} /></label><div className="export-actions"><button className="primary" disabled={busy}>Guardar suscripción</button><button type="button" className="secondary" disabled={busy} onClick={() => setEditing(undefined)}>Cancelar</button></div></form>}
    {rows?.length ? <div className="subscription-list">{rows.map(r => <article className="subscription-row" key={r.id}><div><h3>{r.name}</h3><p>{r.category} · {r.interval === 'monthly' ? 'Mensual' : 'Anual'} · {r.active ? `Próximo pago: ${r.nextDate}` : 'Pausada'}</p>{r.active && r.nextDate <= today && <span className="tag">Pendiente de confirmar</span>}</div><strong>{euros(r.amountCents)}</strong><div className="export-actions"><button className="primary" disabled={busy || !r.active || r.nextDate > today} onClick={() => void action(() => recordPayment(db, r.id, r.nextDate))}>Registrar pago</button><button className="secondary" disabled={busy} onClick={() => { setEditing(r); setError(''); }}>Editar</button><button className="secondary" disabled={busy} onClick={() => void action(() => db.recurring.update(r.id, { active: !r.active }))}>{r.active ? 'Pausar' : 'Reanudar'}</button><button className="text-button" disabled={busy} onClick={() => { if (confirm('¿Eliminar esta suscripción? Los gastos ya registrados se conservarán.')) void action(() => db.recurring.delete(r.id)); }}>Eliminar</button></div></article>)}</div> : <div className="empty"><strong>Tus pagos periódicos, en un solo lugar</strong><p>Añade tu primer servicio para ver cuándo vence.</p></div>}
    <p className="subscription-help">Registrar pago crea un gasto en la fecha indicada y avanza al siguiente vencimiento. Solo se pueden confirmar pagos de hoy o anteriores. Los pagos pausados conservan su fecha para que puedas editarla antes de reanudarlos. No se realizan cobros ni se cancelan servicios externos.</p>
  </section>;
}
