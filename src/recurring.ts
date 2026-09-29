import { categories, validDate, validateBackup } from './domain';
import type { MoneyDB } from './db';
export type Recurring = { id: string; name: string; amountCents: number; category: string; interval: 'monthly' | 'yearly'; nextDate: string; anchorDay: number; active: boolean };
export function nextPayment(row: Recurring) {
  const [year, month] = row.nextDate.split('-').map(Number);
  const target = new Date(year, month - 1 + (row.interval === 'monthly' ? 1 : 12), 1, 12);
  const last = new Date(target.getFullYear(), target.getMonth() + 1, 0, 12).getDate();
  return `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, '0')}-${String(Math.min(row.anchorDay, last)).padStart(2, '0')}`;
}
export async function recordPayment(db: MoneyDB, id: string, expectedDate: string) {
  await db.transaction('rw', db.recurring, db.movements, async () => {
    const row = await db.recurring.get(id);
    if (!row || !row.active || row.nextDate !== expectedDate) return;
    const movementId = `recurring:${id}:${row.nextDate}`;
    if (!(await db.movements.get(movementId))) await db.movements.add({ id: movementId, type: 'expense', amountCents: row.amountCents, category: row.category, date: row.nextDate, note: row.name });
    await db.recurring.update(id, { nextDate: nextPayment(row) });
  });
}
export function validateFullBackup(value: unknown) {
  const data = value as {version?: number; recurring?: Recurring[]};
  if (!data || ![1,2].includes(data.version!)) throw new Error('Copia no compatible.');
  const base = validateBackup({ ...data, version: 1 });
  const recurring = data.version === 1 ? [] : data.recurring;
  if (!Array.isArray(recurring) || recurring.some(r => !r || typeof r.id !== 'string' || !r.id || typeof r.name !== 'string' || !r.name.trim() || !Number.isSafeInteger(r.amountCents) || r.amountCents <= 0 || !categories.includes(r.category) || !['monthly','yearly'].includes(r.interval) || !validDate(r.nextDate) || !Number.isInteger(r.anchorDay) || r.anchorDay < 1 || r.anchorDay > 31 || typeof r.active !== 'boolean') || new Set(recurring.map(r => r.id)).size !== recurring.length) throw new Error('Suscripciones inválidas en la copia.');
  return { ...base, version: 2, recurring };
}
