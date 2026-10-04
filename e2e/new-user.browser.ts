import {test,expect,type Page} from '@playwright/test';
import {mockSupabase,token,userA} from './mock-supabase';

const testUser={name:'Usuario de pruebas MoneyFlow',email:'pruebas.moneyflow@example.test',password:'SoloPruebasLocal2026!'};
async function register(page:Page) {
  await page.getByRole('button',{name:'Iniciar sesión',exact:true}).click();
  await page.getByRole('button',{name:'Registrarme',exact:true}).click();
  await page.getByLabel('Nombre',{exact:true}).fill(testUser.name);
  await page.getByLabel('Correo electrónico').fill(testUser.email);
  await page.getByLabel('Contraseña',{exact:true}).fill(testUser.password);
  await page.getByLabel('Repetir contraseña').fill(testUser.password);
  await page.getByRole('button',{name:'Crear cuenta',exact:true}).click();
  await expect(page.getByRole('status')).toContainText('confirmar tu cuenta');
}
async function fillLogin(page:Page,email:string,password:string) {
  await page.getByLabel('Correo electrónico').fill(email);
  await page.getByLabel('Contraseña',{exact:true}).fill(password);
  await page.getByRole('button',{name:'Iniciar sesión',exact:true}).click();
}

test('new account requires confirmation, keeps edits after reload and cannot see another account',async({page},testInfo)=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  const mock=await mockSupabase(page);await page.goto('/');await register(page);
  expect(mock.users.filter(u=>u.email===testUser.email)).toHaveLength(1);
  await page.getByRole('button',{name:'Ya tengo cuenta',exact:true}).click();
  await fillLogin(page,testUser.email,testUser.password);
  await expect(page.getByRole('alert')).toContainText('Confirma tu correo');
  const newUser=mock.confirmAccount(testUser.email);
  // Simulates the server-side confirmation and verifies that login is then allowed.
  await fillLogin(page,testUser.email,testUser.password);
  await expect(page.getByRole('button',{name:'Cerrar sesión',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Nuevo movimiento',exact:true}).click();
  await page.getByLabel('Importe (€)').fill('42,50');await page.getByLabel('Concepto').fill('Compra usuario nuevo');
  await page.getByRole('button',{name:'Guardar',exact:true}).click();
  await expect(page.getByText('Compra usuario nuevo',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Editar Compra usuario nuevo',exact:true}).click();
  await page.getByLabel('Importe (€)').fill('45,75');await page.getByRole('button',{name:'Guardar',exact:true}).click();
  await expect.poll(()=>mock.store.get(newUser.id)?.[0]?.amount_cents).toBe(4575);
  await page.reload();await expect(page.getByText('Compra usuario nuevo',{exact:true})).toBeVisible();
  await testInfo.attach('Cuenta nueva con gasto guardado',{body:await page.screenshot({fullPage:true}),contentType:'image/png'});
  await page.getByRole('button',{name:'Cerrar sesión',exact:true}).click();
  await fillLogin(page,userA.email,'ValidPassword123');
  await expect(page.getByRole('button',{name:'Cerrar sesión',exact:true})).toBeVisible();
  await expect(page.getByText('Compra usuario nuevo',{exact:true})).toHaveCount(0);
  await page.getByRole('button',{name:'Cerrar sesión',exact:true}).click();
  await fillLogin(page,testUser.email,testUser.password);
  await expect(page.getByText('Compra usuario nuevo',{exact:true})).toBeVisible();
  page.once('dialog',d=>d.accept());await page.getByRole('button',{name:'Eliminar Compra usuario nuevo',exact:true}).click();
  await expect(page.getByText('Compra usuario nuevo',{exact:true})).toHaveCount(0);
  expect(mock.store.get(newUser.id)).toHaveLength(0);expect(errors).toEqual([]);
});

test('mismatched registration passwords do not create an account',async({page})=>{
  const mock=await mockSupabase(page);await page.goto('/');
  await page.getByRole('button',{name:'Iniciar sesión',exact:true}).click();await page.getByRole('button',{name:'Registrarme',exact:true}).click();
  await page.getByLabel('Nombre',{exact:true}).fill(testUser.name);await page.getByLabel('Correo electrónico').fill(testUser.email);
  await page.getByLabel('Contraseña',{exact:true}).fill(testUser.password);await page.getByLabel('Repetir contraseña').fill('OtraClaveDistinta2026!');
  await page.getByRole('button',{name:'Crear cuenta',exact:true}).click();await expect(page.getByRole('alert')).toContainText('no coinciden');
  expect(mock.calls.filter(c=>c.path.endsWith('/signup'))).toHaveLength(0);
  expect(mock.users.some(u=>u.email===testUser.email)).toBe(false);
});

test('recovered account accepts only the new password',async({page})=>{
  const mock=await mockSupabase(page);await page.goto('/');await register(page);
  const user=mock.confirmAccount(testUser.email);
  await page.goto(`/?auth=recovery#access_token=${token(user.id)}&refresh_token=refresh-test&expires_in=3600&token_type=bearer&type=recovery`);
  await expect(page.getByRole('heading',{name:'Nueva contraseña',exact:true})).toBeVisible();
  await page.getByLabel('Nueva contraseña',{exact:true}).fill('NuevaClaveSoloPruebas2026!');await page.getByLabel('Repetir contraseña').fill('NuevaClaveSoloPruebas2026!');
  await page.getByRole('button',{name:'Guardar nueva contraseña',exact:true}).click();
  await expect(page.getByRole('status')).toContainText('Contraseña actualizada correctamente.');
  await page.getByRole('button',{name:'Cerrar sesión',exact:true}).click();
  await fillLogin(page,testUser.email,testUser.password);await expect(page.getByRole('alert')).toContainText('incorrectos');
  await fillLogin(page,testUser.email,'NuevaClaveSoloPruebas2026!');await expect(page.getByRole('button',{name:'Cerrar sesión',exact:true})).toBeVisible();
});

test('failed save never reports success and keeps the entered form',async({page})=>{
  const mock=await mockSupabase(page);await page.goto('/');await register(page);
  mock.confirmAccount(testUser.email);await page.getByRole('button',{name:'Ya tengo cuenta',exact:true}).click();await fillLogin(page,testUser.email,testUser.password);
  await expect(page.getByRole('button',{name:'Cerrar sesión',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Nuevo movimiento',exact:true}).click();await page.getByLabel('Importe (€)').fill('27');await page.getByLabel('Concepto').fill('No perder formulario');
  mock.failReads(true);await page.getByRole('button',{name:'Guardar',exact:true}).click();
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText('interrumpida');
  await expect(page.getByLabel('Concepto')).toHaveValue('No perder formulario');
  expect(mock.store.size).toBe(0);
  mock.failReads(false);await page.getByRole('button',{name:'Guardar',exact:true}).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);await expect(page.getByText('No perder formulario',{exact:true})).toBeVisible();
});
