import { describe, it, expect } from 'vitest';
import { cents, totals, validateBackup, validDate } from './domain';
describe('money', () => {
  it('parses decimal amounts exactly', () => {expect(cents('12,50')).toBe(1250);expect(cents('0.01')).toBe(1);expect(cents('10')).toBe(1000);});
  it('rejects invalid and excessive precision amounts', () => {for(const value of ['-2','0','1.234','NaN','Infinity','1e3','9007199254740992']) expect(() => cents(value)).toThrow();});
  it('separates income from expenses', () => {expect(totals([{id:'1',type:'income',amountCents:10000,category:'Nómina',date:'2026-01-01',note:''},{id:'2',type:'expense',amountCents:1234,category:'Ocio',date:'2026-01-02',note:''}])).toEqual({income:10000,expense:1234});});
});
describe('backups', () => {
  const row = {id:'1',type:'expense',amountCents:1250,category:'Ocio',date:'2026-01-01',note:'Cine'};
  it('accepts a valid backup', () => {expect(validateBackup({version:1,movements:[row],budgets:[]})).toEqual({version:1,movements:[row],budgets:[]});});
  it('rejects duplicate movements', () => {expect(() => validateBackup({version:1,movements:[row,row],budgets:[]})).toThrow();});
  it('rejects malformed or incompatible files', () => {for(const value of [null,{}, {version:2,movements:[],budgets:[]},{version:1,movements:[{...row,amountCents:-20}],budgets:[]},{version:1,movements:[{...row,date:'2026-02-30'}],budgets:[]}]) expect(() => validateBackup(value)).toThrow();});
  it('rejects invalid budget identifiers', () => {expect(() => validateBackup({version:1,movements:[],budgets:[{id:'wrong',month:'2026-01',category:'Ocio',limitCents:100}]})).toThrow();});
  it('validates leap days', () => {expect(validDate('2024-02-29')).toBe(true);expect(validDate('2026-02-29')).toBe(false);});
});
