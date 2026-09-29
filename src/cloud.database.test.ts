import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { beforeAll, afterAll, it, expect } from 'vitest';
const db = new PGlite();
const a='11111111-1111-4111-8111-111111111111';
const b='22222222-2222-4222-8222-222222222222';
beforeAll(async()=>{
  await db.exec(`create role anon; create role authenticated; create schema auth;
    create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as 'select nullif(current_setting(''request.jwt.claim.sub'', true), '''')::uuid';
    grant usage on schema auth to authenticated;
    insert into auth.users values ('${a}'),('${b}');`);
  await db.exec(readFileSync(new URL('../supabase/01_schema.sql',import.meta.url),'utf8'));
  await db.exec(readFileSync(new URL('../supabase/03_cloud_functions.sql',import.meta.url),'utf8'));
},30000);
afterAll(()=>db.close());
async function asUser(id:string) { await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]);await db.exec('set role authenticated'); }
it('isolates all three tables and rejects writes to another account',async()=>{
  await asUser(a);
  await db.exec("insert into public.movements(id,type,amount_cents,category,date,note) values('m','expense',100,'Ocio','2026-01-01','A'); insert into public.budgets(id,month,category,limit_cents) values('2026-01:Ocio','2026-01','Ocio',200); insert into public.recurring(id,name,amount_cents,category,interval,next_date,anchor_day) values('r','Gimnasio',100,'Salud','monthly','2026-01-31',31);");
  await asUser(b);
  for(const table of ['movements','budgets','recurring']) {
    expect((await db.query(`select * from public.${table}`)).rows).toHaveLength(0);
    expect((await db.query(`delete from public.${table} where user_id=$1 returning *`,[a])).rows).toHaveLength(0);
    expect((await db.query(`update public.${table} set user_id=$1 where user_id=$2 returning *`,[b,a])).rows).toHaveLength(0);
  }
  await expect(db.query("insert into public.movements(user_id,id,type,amount_cents,category,date) values($1,'bad','expense',1,'Ocio','2026-01-01')",[a])).rejects.toThrow(/row-level security/);
  await expect(db.query("insert into public.budgets(user_id,id,month,category,limit_cents) values($1,'bad','2026-01','Ocio',1)",[a])).rejects.toThrow(/row-level security/);
  await expect(db.query("insert into public.recurring(user_id,id,name,amount_cents,category,interval,next_date,anchor_day) values($1,'bad','X',1,'Ocio','monthly','2026-01-01',1)",[a])).rejects.toThrow(/row-level security/);
  await expect(db.query("select public.record_recurring_payment('r','2026-01-31')")).rejects.toThrow(/no disponible/);
  await asUser(a);
  await expect(db.query('update public.movements set user_id=$1',[b])).rejects.toThrow(/row-level security/);
});
it('records a recurring payment once and preserves its anchor day',async()=>{
  await asUser(a);
  await db.query("select public.record_recurring_payment('r','2026-01-31')");
  await db.query("select public.record_recurring_payment('r','2026-01-31')");
  expect((await db.query("select * from public.movements where id like 'recurring:%'")).rows).toHaveLength(1);
  const next=await db.query<{next:string}>("select next_date::text as next from public.recurring where id='r'");expect(next.rows[0].next).toBe('2026-02-28');
  await db.query("select public.record_recurring_payment('r','2026-02-28')");
  expect((await db.query<{next:string}>("select next_date::text as next from public.recurring where id='r'")).rows[0].next).toBe('2026-03-31');
});
it('exports and restores atomically; invalid imports leave prior data intact',async()=>{
  await asUser(a);
  const backup=(await db.query<{backup:{movements:unknown[]}}>('select public.export_moneyflow() as backup')).rows[0].backup;
  await db.query('select public.restore_moneyflow($1::jsonb)',[JSON.stringify(backup)]);
  const invalid={...backup,movements:[{id:'bad',type:'expense',amountCents:0,category:'Ocio',date:'2026-01-01',note:''}]};
  await expect(db.query('select public.restore_moneyflow($1::jsonb)',[JSON.stringify(invalid)])).rejects.toThrow();
  expect((await db.query<{backup:unknown}>('select public.export_moneyflow() as backup')).rows[0].backup).toEqual(backup);
  await asUser(b);
  expect((await db.query<{backup:{movements:unknown[]}}>('select public.export_moneyflow() as backup')).rows[0].backup.movements).toEqual([]);
});
it('rejects anonymous reads and function calls',async()=>{
  await db.exec('reset role; set role anon;');
  await expect(db.query('select * from public.movements')).rejects.toThrow(/permission denied/);
  await expect(db.query('select public.export_moneyflow()')).rejects.toThrow(/permission denied/);
  await expect(db.query("select public.restore_moneyflow('{}')")).rejects.toThrow(/permission denied/);
  await db.exec('reset role');
});
