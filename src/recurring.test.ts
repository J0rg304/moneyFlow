import { expect, it } from 'vitest';
import { nextPayment, validateFullBackup, type Recurring } from './recurring';
import { movementCSV } from './exports';
const row: Recurring = { id:'1', name:'Seguro', amountCents:1200, category:'Otros', interval:'monthly', nextDate:'2026-01-31', anchorDay:31, active:true };
it('keeps the original day across short months', () => {
  expect(nextPayment(row)).toBe('2026-02-28');
  expect(nextPayment({...row,nextDate:'2026-02-28'})).toBe('2026-03-31');
  expect(nextPayment({...row,nextDate:'2026-12-31'})).toBe('2027-01-31');
});
it('handles yearly leap-day subscriptions', () => {
  expect(nextPayment({...row,interval:'yearly',nextDate:'2024-02-29',anchorDay:29})).toBe('2025-02-28');
  expect(nextPayment({...row,interval:'yearly',nextDate:'2027-02-28',anchorDay:29})).toBe('2028-02-29');
});
it('imports legacy backups and validates new recurring data', () => {
  expect(validateFullBackup({version:1,movements:[],budgets:[]}).recurring).toEqual([]);
  expect(validateFullBackup({version:2,movements:[],budgets:[],recurring:[row]}).recurring).toEqual([row]);
  for (const invalid of [{...row,amountCents:-1},{...row,nextDate:'2026-02-30'},{...row,interval:'daily'},{...row,anchorDay:32}]) expect(() => validateFullBackup({version:2,movements:[],budgets:[],recurring:[invalid]})).toThrow();
});
it('exports accented CSV fields, quotes, newlines and neutralizes spreadsheet formulas', () => {
  const csv = movementCSV([{id:'1',date:'2026-09-01',type:'expense',amountCents:1234,category:'Alimentación',note:'=SUM(1;2)\n"prueba"'}]);
  expect(csv.startsWith('\uFEFF')).toBe(true);
  expect(csv).toContain('"12,34"');
  expect(csv).toContain('"\'=SUM(1;2)\n""prueba"""');
});
