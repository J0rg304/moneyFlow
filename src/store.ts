import { useEffect, useMemo, useState } from 'react';
import { liveQuery } from 'dexie';
import { client } from './supabase';
import type { Budget, Movement } from './domain';
import { recordPayment, validateFullBackup, type Recurring } from './recurring';
import type { MoneyDB } from './db';
export type Snapshot = { version: 2; movements: Movement[]; budgets: Budget[]; recurring: Recurring[] };
type Row = Record<string, unknown>;
type Table<T> = { put: (row: T) => Promise<void>; delete: (id: string) => Promise<void>; update: (id: string, patch: Partial<T>) => Promise<void> };
export type Store = {
  movements: Table<Movement>; budgets: Table<Budget>; recurring: Table<Recurring>;
  snapshot: () => Promise<Snapshot>; restore: (snapshot: Snapshot) => Promise<void>;
  pay: (id: string, date: string) => Promise<void>;
  subscribe: (listener: () => void) => () => void;
};
const encodeMovement = (r: Partial<Movement>) => ({ id:r.id,type:r.type,amount_cents:r.amountCents,category:r.category,date:r.date,note:r.note });
const encodeBudget = (r: Partial<Budget>) => ({id:r.id,month:r.month,category:r.category,limit_cents:r.limitCents});
const encodeRecurring = (r: Partial<Recurring>) => ({id:r.id,name:r.name,amount_cents:r.amountCents,category:r.category,interval:r.interval,next_date:r.nextDate,anchor_day:r.anchorDay,active:r.active});
export const decodeMovement = (r: Row): Movement => ({id:String(r.id),type:r.type as Movement['type'],amountCents:Number(r.amount_cents),category:String(r.category),date:String(r.date),note:String(r.note)});
export const decodeBudget = (r: Row): Budget => ({id:`${r.month}:${r.category}`,month:String(r.month),category:String(r.category),limitCents:Number(r.limit_cents)});
export const decodeRecurring = (r: Row): Recurring => ({id:String(r.id),name:String(r.name),amountCents:Number(r.amount_cents),category:String(r.category),interval:r.interval as Recurring['interval'],nextDate:String(r.next_date),anchorDay:Number(r.anchor_day),active:Boolean(r.active)});
function check(error: {message:string;code?:string} | null) {
  if (!error) return;
  if (error.code === 'PGRST202') throw new Error('Falta actualizar las funciones de la base de datos. Ejecuta el SQL 03_cloud_functions.sql en Supabase.');
  if (error.code === '42501') throw new Error('No tienes permiso para acceder a estos datos. Revisa tu sesión.');
  throw new Error(error.message);
}
function makeStore(local: MoneyDB, userId?: string): Store {
  const listeners = new Set<() => void>();
  const notify = () => listeners.forEach(fn => fn());
  async function mutate(work: () => Promise<unknown>) { await work(); notify(); }
  function remoteTable<T extends {id:string}>(name: string, encode: (r: Partial<T>) => object): Table<T> {
    const keyQuery = (id: string) => {
      if (name !== 'budgets') return {id};
      return {month:id.slice(0,7),category:id.slice(8)};
    };
    return {
      put: row => mutate(async () => { const {error} = await client().from(name).upsert({...encode(row),user_id:userId}, {onConflict:name === 'budgets' ? 'user_id,month,category' : 'user_id,id'}); check(error); }),
      delete: id => mutate(async () => { const {error} = await client().from(name).delete().eq('user_id',userId!).match(keyQuery(id));check(error); }),
      update: (id,patch) => mutate(async () => {
        const encoded = Object.fromEntries(Object.entries(encode(patch)).filter(([,v]) => v !== undefined));
        const {error} = await client().from(name).update(encoded).eq('user_id',userId!).match(keyQuery(id));check(error);
      }),
    };
  }
  // These structural adapters keep the same forms for local/demo and cloud data.
  function localTable<T extends {id:string}>(table: { put: (row: T) => Promise<unknown>; delete: (id:string) => Promise<unknown>; update: (id:string,patch: Partial<T>) => Promise<unknown> }): Table<T> {
    return {put:row=>mutate(()=>table.put(row)),delete:id=>mutate(()=>table.delete(id)),update:(id,patch)=>mutate(()=>table.update(id,patch))};
  }
  const snapshot = async (): Promise<Snapshot> => {
    if (!userId) return local.transaction('r',local.movements,local.budgets,local.recurring,async()=>({version:2,movements:await local.movements.toArray(),budgets:await local.budgets.toArray(),recurring:await local.recurring.toArray()}));
    // Single database snapshot: no silent truncation at the REST row limit.
    const {data,error} = await client().rpc('export_moneyflow');
    if (error?.code !== 'PGRST202') {check(error);return validateFullBackup(data) as Snapshot;}
    // Compatibility with projects where only 01_schema.sql has been applied.
    async function all(name:string): Promise<Row[]> {
      const rows: Row[] = [];
      for (let offset=0;;offset+=500) {
        const result=await client().from(name).select('*').eq('user_id',userId!).order('id').range(offset,offset+499);
        check(result.error);rows.push(...(result.data ?? []));
        if (!result.data || result.data.length<500) return rows;
      }
    }
    const [movements,budgets,recurring]=await Promise.all([all('movements'),all('budgets'),all('recurring')]);
    return {version:2,movements:movements.map(decodeMovement),budgets:budgets.map(decodeBudget),recurring:recurring.map(decodeRecurring)};
  };
  return {
    movements: userId ? remoteTable('movements',encodeMovement) : localTable<Movement>(local.movements),
    budgets: userId ? remoteTable('budgets',encodeBudget) : localTable<Budget>(local.budgets),
    recurring: userId ? remoteTable('recurring',encodeRecurring) : localTable<Recurring>(local.recurring),
    snapshot,
    restore: data => mutate(async () => {
      if (userId) {const {error} = await client().rpc('restore_moneyflow',{p_backup:data});check(error);return;}
      await local.transaction('rw',local.movements,local.budgets,local.recurring,async()=>{await local.movements.clear();await local.budgets.clear();await local.recurring.clear();await local.movements.bulkAdd(data.movements);await local.budgets.bulkAdd(data.budgets);await local.recurring.bulkAdd(data.recurring);});
    }),
    pay: (id,date) => mutate(async () => {
      if (userId) {const {error} = await client().rpc('record_recurring_payment',{p_id:id,p_expected_date:date});check(error);}
      else await recordPayment(local,id,date);
    }),
    subscribe: listener => {
      listeners.add(listener);
      const subscription = !userId ? liveQuery(()=>local.transaction('r',local.movements,local.budgets,local.recurring,async()=>{await local.movements.toArray();await local.budgets.toArray();await local.recurring.toArray();})).subscribe({next:listener,error:listener}) : null;
      return () => {listeners.delete(listener);subscription?.unsubscribe();};
    },
  };
}
export function useStore(local: MoneyDB, userId?: string) {
  const store = useMemo(()=>makeStore(local,userId),[local,userId]);
  const [state,setState] = useState<{store:Store;data?:Snapshot;error?:string}>({store});
  const [revision,setRevision] = useState(0);
  useEffect(()=>{
    let active = true; let generation = 0;
    async function load() {
      const current = ++generation;
      try { const data = await store.snapshot(); if(active && current === generation)setState({store,data}); }
      catch(e) { if(active && current === generation)setState({store,error:e instanceof Error ? e.message : 'No se pudieron cargar los datos.'}); }
    }
    void load();const unsubscribe=store.subscribe(()=>void load());
    const focus = () => void load(); window.addEventListener('focus',focus);window.addEventListener('online',focus);
    return ()=>{active=false;unsubscribe();window.removeEventListener('focus',focus);window.removeEventListener('online',focus);};
  },[store,revision]);
  return {db:store,data:state.store === store ? state.data : undefined,dataError:state.store === store ? state.error : undefined,reload:()=>setRevision(r=>r+1)};
}
