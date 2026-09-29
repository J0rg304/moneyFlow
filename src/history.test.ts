import { expect, it } from 'vitest';
import { monthlyHistory, type Movement } from './domain';

it('includes six ordered months across a year boundary and excludes other dates', () => {
  const row = (date: string, type: Movement['type'], amountCents: number): Movement => ({ id: date, date, type, amountCents, category: 'Otros', note: '' });
  const history = monthlyHistory([
    row('2025-12-31', 'expense', 1000),
    row('2026-01-01', 'income', 20000),
    row('2026-01-31', 'expense', 2500),
    row('2026-02-01', 'expense', 9999),
    row('2025-07-31', 'expense', 9999),
  ], '2026-01');
  expect(history.map(m => m.month)).toEqual(['2025-08', '2025-09', '2025-10', '2025-11', '2025-12', '2026-01']);
  expect(history[0]).toEqual({ month: '2025-08', income: 0, expense: 0, count: 0 });
  expect(history[4].expense).toBe(1000);
  expect(history[5]).toEqual({ month: '2026-01', income: 20000, expense: 2500, count: 2 });
});

it('distinguishes absent data from a recorded month without expenses', () => {
  const history = monthlyHistory([{ id: '1', date: '2026-09-01', type: 'income', amountCents: 100, category: 'Nómina', note: '' }], '2026-09');
  expect(history[4].count).toBe(0);
  expect(history[5].count).toBe(1);
  expect(history[5].expense).toBe(0);
});
