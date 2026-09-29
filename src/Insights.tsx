import React from 'react';
import { euros, monthlyHistory, type Movement } from './domain';

export default function Insights({ movements, month }: { movements: Movement[]; month: string }) {
  const history = monthlyHistory(movements, month);
  const current = history[5];
  const previous = history[4];
  const max = Math.max(1, ...history.flatMap(m => [m.income, m.expense]));
  const difference = current.expense - previous.expense;
  const label = (value: string) => new Intl.DateTimeFormat('es-ES', { month: 'short' }).format(new Date(`${value}-01T12:00:00`));
  return <section className="panel insights-panel">
    <div className="panel-heading"><div><h2>Tu dinero, con perspectiva</h2><p>Seis meses hasta el mes seleccionado · Totales registrados</p></div><div className="history-key"><span><i />Ingresos</span><span><i />Gastos</span></div></div>
    <div className="insights-content">
      <div className="history-chart" role="img" aria-label="Evolución de ingresos y gastos. Importes exactos en el desplegable siguiente.">
        {history.map(m => <div className="history-column" key={m.month}><div className="history-bars"><span title={`Ingresos: ${euros(m.income)}`} style={{ height: `${m.income / max * 100}%` }} /><span title={`Gastos: ${euros(m.expense)}`} style={{ height: `${m.expense / max * 100}%` }} /></div><span className={m.month === month ? 'current-month' : ''}>{label(m.month)}</span></div>)}
      </div>
      <div className="insight-summary"><span className="eyebrow">FRENTE AL MES ANTERIOR</span>
        {previous.count && current.count ? <><strong>{difference === 0 ? 'El mismo gasto' : `${euros(Math.abs(difference))} ${difference > 0 ? 'más' : 'menos'}`}</strong><p>en gastos registrados{previous.expense > 0 ? ` (${Math.round(Math.abs(difference) / previous.expense * 100)}% ${difference > 0 ? 'más' : difference < 0 ? 'menos' : 'de cambio'})` : ''}.</p></> : <><strong>Aún falta perspectiva</strong><p>Registra movimientos en ambos meses para comparar sus gastos.</p></>}
        <small>Si un mes está incompleto, la comparación también lo estará. Solo se incluyen los datos que has registrado.</small>
      </div>
    </div>
    <details className="history-details"><summary>Ver importes por mes</summary><div className="table-scroll"><table><thead><tr><th>Mes</th><th>Ingresos</th><th>Gastos</th><th>Ahorro</th></tr></thead><tbody>{history.map(m => <tr key={m.month}><td>{m.month}{!m.count && ' · Sin registros'}</td><td>{euros(m.income)}</td><td>{euros(m.expense)}</td><td>{euros(m.income - m.expense)}</td></tr>)}</tbody></table></div></details>
  </section>;
}
