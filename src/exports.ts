import type { Movement } from './domain';
import { totals } from './domain';
export function movementCSV(rows: Movement[]) {
  const cell = (value: string) => `"${(/^[\s]*[=+@-]/.test(value) || /^[\t\r\n]/.test(value) ? "'" : '') + value.replaceAll('"', '""')}"`;
  return '\uFEFF' + [['Fecha','Tipo','Categoría','Concepto','Importe EUR'], ...rows.map(m => [m.date, m.type === 'income' ? 'Ingreso' : 'Gasto', m.category, m.note, (m.amountCents / 100).toFixed(2).replace('.', ',')])].map(row => row.map(cell).join(';')).join('\r\n');
}
export function exportCSV(rows: Movement[], month: string) {
  const url = URL.createObjectURL(new Blob([movementCSV(rows)], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a'); a.href = url; a.download = `moneyflow-${month}.csv`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export async function exportPDF(rows: Movement[], month: string) {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
  const pdf = new jsPDF();
  const total = totals(rows);
  const money = (n: number) => `${(n / 100).toFixed(2)} EUR`;
  pdf.setFontSize(20); pdf.text('MoneyFlow', 14, 20);
  pdf.setFontSize(11); pdf.text(`Movimientos filtrados · ${month}`, 14, 30);
  pdf.text(`Ingresos: ${money(total.income)}  |  Gastos: ${money(total.expense)}`, 14, 39);
  pdf.text(`Balance: ${money(total.income - total.expense)}  |  ${rows.length} movimientos`, 14, 47);
  autoTable(pdf, { startY: 55, head: [['Fecha','Tipo','Categoría','Concepto','EUR']], body: rows.map(m => [m.date, m.type === 'income' ? 'Ingreso' : 'Gasto', m.category, m.note, (m.amountCents / 100).toFixed(2)]), styles: { fontSize: 9, overflow: 'linebreak' }, headStyles: { fillColor: [40,107,84] }, margin: { bottom: 20 }, didDrawPage: () => { pdf.setFontSize(9); pdf.text(`MoneyFlow · Página ${pdf.getNumberOfPages()}`, 14, 287); } });
  pdf.save(`moneyflow-${month}.pdf`);
}
