import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-09-28T12:00:00'));
  await page.goto('/');
});

for (const scenario of [
  { month: 'agosto de 2026', step: 'Mes anterior', date: '2026-08-01', type: 'Gasto' },
  { month: 'octubre de 2026', step: 'Mes siguiente', date: '2026-10-01', type: 'Ingreso' },
]) {
  test(`creates and retains a movement in ${scenario.month}`, async ({ page }) => {
    await page.getByRole('button', { name: scenario.step, exact: true }).click();
    await page.getByRole('button', { name: 'Nuevo movimiento', exact: true }).click();
    await expect(page.getByLabel('Fecha', { exact: true })).toHaveValue(scenario.date);
    await page.getByRole('button', { name: scenario.type, exact: true }).click();
    await page.getByLabel('Importe (€)').fill('25,50');
    await page.getByLabel('Concepto').fill('Movimiento de prueba');
    await page.getByRole('button', { name: 'Guardar', exact: true }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.locator('.month-picker')).toContainText(scenario.month);
    await expect(page.getByText('Movimiento de prueba', { exact: true })).toBeVisible();
    await page.reload();
    await expect(page.getByText('Movimiento de prueba', { exact: true })).toHaveCount(0);
    await page.getByRole('button', { name: scenario.step, exact: true }).click();
    await expect(page.getByText('Movimiento de prueba', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Editar Movimiento de prueba', exact: true }).click();
    await expect(page.getByLabel('Fecha', { exact: true })).toHaveValue(scenario.date);
  });
}

test('uses today in the current month and respects an explicitly chosen date', async ({ page }) => {
  await page.getByRole('button', { name: 'Nuevo movimiento', exact: true }).click();
  await expect(page.getByLabel('Fecha', { exact: true })).toHaveValue('2026-09-28');
  await page.getByLabel('Fecha', { exact: true }).fill('2026-02-15');
  await page.getByLabel('Importe (€)').fill('10');
  await page.getByLabel('Concepto').fill('Gasto de febrero');
  await page.getByRole('button', { name: 'Guardar', exact: true }).click();
  await expect(page.locator('.month-picker')).toContainText('febrero de 2026');
  await expect(page.getByText('Gasto de febrero', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Editar Gasto de febrero', exact: true }).click();
  await expect(page.getByLabel('Fecha', { exact: true })).toHaveValue('2026-02-15');
});
