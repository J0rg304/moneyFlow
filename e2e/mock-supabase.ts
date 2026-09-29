import type { Page } from '@playwright/test';
import { randomUUID } from 'node:crypto';
export const userA={id:'11111111-1111-4111-8111-111111111111',aud:'authenticated',role:'authenticated',email:'ana@example.test',email_confirmed_at:'2026-01-01T00:00:00Z',user_metadata:{name:'Ana'},app_metadata:{provider:'email'},created_at:'2026-01-01T00:00:00Z'};
export const userB={...userA,id:'22222222-2222-4222-8222-222222222222',email:'bea@example.test',user_metadata:{name:'Bea'}};
export const token = (id=userA.id) => `${Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url')}.${Buffer.from(JSON.stringify({sub:id,aud:'authenticated',role:'authenticated',exp:4102444800})).toString('base64url')}.testsignature`;
export async function mockSupabase(page:Page) {
  const users=[structuredClone(userA),structuredClone(userB)];
  const passwords=new Map(users.map(u=>[u.id,'ValidPassword123']));
  const calls:{path:string;body:Record<string,unknown>}[]=[];
  const store=new Map<string,Record<string,unknown>[]>();
  let failing=false;
  await page.route('https://*.supabase.co/**',async route=>{
    const request=route.request();const url=new URL(request.url());
    const body=request.postData() ? request.postDataJSON() : {};
    calls.push({path:url.pathname,body});
    const auth=request.headers().authorization ?? '';
    const user=users.find(u=>auth===`Bearer ${token(u.id)}`);
    const reply=(json:unknown,status=200)=>route.fulfill({status,json,headers:{'Access-Control-Allow-Origin':'*','X-Supabase-Api-Version':'2024-01-01'}});
    if(url.pathname.endsWith('/signup')) {
      const existing=users.find(u=>u.email===body.email);
      if(existing)return reply({user:existing,session:null});
      const created={...structuredClone(userA),id:randomUUID(),email:String(body.email),email_confirmed_at:'',user_metadata:{name:String(body.data?.name ?? 'Pruebas')}};
      users.push(created);passwords.set(created.id,String(body.password));
      return reply({user:created,session:null});
    }
    if(url.pathname.endsWith('/token')) {
      const found=users.find(u=>u.email===body.email) ?? (url.searchParams.get('grant_type')==='refresh_token'?user:undefined);
      if(!found || (body.password && body.password!==passwords.get(found.id)))return reply({code:'invalid_credentials',msg:'Invalid login credentials'},400);
      if(!found.email_confirmed_at)return reply({code:'email_not_confirmed',msg:'Email not confirmed'},400);
      return reply({access_token:token(found.id),refresh_token:'refresh-test',expires_in:3600,expires_at:4102444800,token_type:'bearer',user:found});
    }
    if(url.pathname.endsWith('/user')) {
      if(!user)return reply({code:'bad_jwt',msg:'Invalid token'},401);
      if(request.method()==='PUT') {
        if(body.data)user.user_metadata={...user.user_metadata,...body.data};
        if(body.password)passwords.set(user.id,body.password);
        return reply(user);
      }
      return reply(user);
    }
    if(url.pathname.endsWith('/logout'))return route.fulfill({status:204});
    if(url.pathname.endsWith('/recover') || url.pathname.endsWith('/resend'))return reply({});
    if(url.pathname.includes('/rest/v1/')) {
      if(!user)return reply({message:'Authentication required',code:'42501'},401);
      if(failing)return reply({code:'XX000',message:'Conexión de prueba interrumpida'},503);
      const rows=store.get(user.id)??[];
      if(url.pathname.endsWith('/export_moneyflow'))return reply({version:2,movements:rows.map(r=>({id:r.id,type:r.type,amountCents:r.amount_cents,category:r.category,date:r.date,note:r.note})),budgets:[],recurring:[]});
      if(url.pathname.endsWith('/movements') && request.method()==='POST') {
        if(body.user_id!==user.id)return reply({message:'Forbidden',code:'42501'},403);
        const index=rows.findIndex(r=>r.id===body.id);if(index>=0)rows[index]=body;else rows.push(body);store.set(user.id,rows);return reply(null,201);
      }
      if(url.pathname.endsWith('/movements') && request.method()==='DELETE') {
        if(url.searchParams.get('user_id')!==`eq.${user.id}`)return reply({message:'Forbidden',code:'42501'},403);
        store.set(user.id,rows.filter(r=>`eq.${r.id}`!==url.searchParams.get('id')));
        return route.fulfill({status:204});
      }
    }
    return reply({message:`Unexpected mocked endpoint ${url.pathname}`},500);
  });
  return {calls,store,users,confirmAccount:(email:string)=>{
    const user=users.find(u=>u.email===email);if(!user)throw new Error('Test account not found');
    user.email_confirmed_at=new Date().toISOString();return user;
  },failReads:(value:boolean)=>{failing=value;}};
}
