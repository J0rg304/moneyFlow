export type Movement = { id: string; type: 'income' | 'expense'; amountCents: number; category: string; date: string; note: string };
export type Budget = { id: string; month: string; category: string; limitCents: number };
export function monthlyHistory(rows: Movement[], endMonth: string) {
  const [year, month] = endMonth.split('-').map(Number);
  return Array.from({ length: 6 }, (_, index) => {
    const date = new Date(year, month - 6 + index, 1, 12);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const matching = rows.filter(row => row.date.startsWith(`${key}-`));
    return { month: key, ...totals(matching), count: matching.length };
  });
}
export const categories = ['Alimentación', 'Vivienda', 'Transporte', 'Ocio', 'Compras', 'Salud', 'Otros'];
export const incomeCategories = ['Nómina', 'Freelance', 'Otros ingresos'];
export const euros = (value: number) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(value / 100);
export function cents(value: string): number {
  if (!/^\d+([.,]\d{1,2})?$/.test(value.trim())) throw new Error('Introduce un importe positivo con hasta dos decimales.');
  const [whole, fraction = ''] = value.trim().replace(',', '.').split('.');
  const result = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  if (!Number.isSafeInteger(result) || result <= 0) throw new Error('El importe debe ser mayor que cero y válido.');
  return result;
}
export const totals = (rows: Movement[]) => rows.reduce((a, m) => ({ income: a.income + (m.type === 'income' ? m.amountCents : 0), expense: a.expense + (m.type === 'expense' ? m.amountCents : 0) }), { income: 0, expense: 0 });
export function validDate(value: unknown): value is string { return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value; }
export function validateBackup(value: unknown): { version: 1; movements: Movement[]; budgets: Budget[] } {
  const data = value as { version?: number; movements?: Movement[]; budgets?: Budget[] };
  if (!data || data.version !== 1 || !Array.isArray(data.movements) || !Array.isArray(data.budgets)) throw new Error('Copia no compatible con MoneyFlow.');
  const positive = (n: number) => Number.isSafeInteger(n) && n > 0;
  if (data.movements.some(m => !m || typeof m.id !== 'string' || !m.id || !['income', 'expense'].includes(m.type) || !positive(m.amountCents) || !validDate(m.date) || typeof m.note !== 'string' || !(m.type === 'income' ? incomeCategories : categories).includes(m.category))) throw new Error('La copia contiene movimientos inválidos.');
  if (data.budgets.some(b => !b || typeof b.id !== 'string' || b.id !== `${b.month}:${b.category}` || !validDate(`${b.month}-01`) || !categories.includes(b.category) || !positive(b.limitCents))) throw new Error('La copia contiene presupuestos inválidos.');
  if (new Set(data.movements.map(m => m.id)).size !== data.movements.length || new Set(data.budgets.map(b => b.id)).size !== data.budgets.length) throw new Error('La copia contiene registros duplicados.');
  return data as { version: 1; movements: Movement[]; budgets: Budget[] };
}
