import Dexie, { type EntityTable } from 'dexie';
import type { Movement, Budget } from './domain';
import type { Recurring } from './recurring';
function database(name: string) {
  const db = new Dexie(name) as Dexie & { movements: EntityTable<Movement, 'id'>; budgets: EntityTable<Budget, 'id'>; recurring: EntityTable<Recurring, 'id'> };
  db.version(1).stores({ movements: 'id,date,category,type', budgets: 'id,month,category' });
  db.version(2).stores({ recurring: 'id,nextDate' });
  return db;
}
export const personalDB = database('moneyflow-personal');
export const demoDB = database('moneyflow-demo');
export type MoneyDB = ReturnType<typeof database>;
const accounts = new Map<string, MoneyDB>();
export function accountDB(id: string) {
  if (!accounts.has(id)) accounts.set(id, database(`moneyflow-account-${id}`));
  return accounts.get(id)!;
}
