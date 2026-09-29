-- MoneyFlow: ejecutar UNA VEZ en un proyecto Supabase nuevo, desde SQL Editor.
-- No borra tablas existentes. Todo se crea dentro de una transacción.
-- Las cuentas y contraseñas las gestiona Supabase Auth, no estas tablas.
begin;

create table public.movements (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  id text not null default gen_random_uuid()::text check (length(id) between 1 and 250),
  type text not null check (type in ('income', 'expense')),
  amount_cents bigint not null check (amount_cents between 1 and 9007199254740991),
  category text not null,
  date date not null check (date between date '1900-01-01' and date '9998-12-31'),
  note text not null default '' check (length(note) <= 2000),
  created_at timestamptz not null default now(),
  primary key (user_id, id),
  constraint movement_category check (
    (type = 'income' and category in ('Nómina', 'Freelance', 'Otros ingresos')) or
    (type = 'expense' and category in ('Alimentación', 'Vivienda', 'Transporte', 'Ocio', 'Compras', 'Salud', 'Otros'))
  )
);

create table public.budgets (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  id text not null default gen_random_uuid()::text check (length(id) between 1 and 250),
  month text not null check (month ~ '^[0-9]{4}-(0[1-9]|1[0-2])$' and month between '1900-01' and '9998-12'),
  category text not null check (category in ('Alimentación', 'Vivienda', 'Transporte', 'Ocio', 'Compras', 'Salud', 'Otros')),
  limit_cents bigint not null check (limit_cents between 1 and 9007199254740991),
  created_at timestamptz not null default now(),
  primary key (user_id, id),
  unique (user_id, month, category)
);

create table public.recurring (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  id text not null default gen_random_uuid()::text check (length(id) between 1 and 150),
  name text not null check (length(btrim(name)) between 1 and 100),
  amount_cents bigint not null check (amount_cents between 1 and 9007199254740991),
  category text not null check (category in ('Alimentación', 'Vivienda', 'Transporte', 'Ocio', 'Compras', 'Salud', 'Otros')),
  interval text not null check (interval in ('monthly', 'yearly')),
  next_date date not null check (next_date between date '1900-01-01' and date '9998-12-31'),
  anchor_day smallint not null check (anchor_day between 1 and 31),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (user_id, id)
);

create index movements_user_date_idx on public.movements (user_id, date desc);
create index recurring_user_date_idx on public.recurring (user_id, next_date);

-- Sin sesión: sin acceso. Con sesión: solo filas del propio usuario.
-- WITH CHECK evita insertar o transferir filas a otra cuenta.
alter table public.movements enable row level security;
alter table public.budgets enable row level security;
alter table public.recurring enable row level security;

create policy movements_owner on public.movements for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy budgets_owner on public.budgets for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy recurring_owner on public.recurring for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

revoke all on table public.movements, public.budgets, public.recurring from public, anon, authenticated;
grant usage on schema public to authenticated;
grant select, insert, update, delete on table public.movements, public.budgets, public.recurring to authenticated;

-- Confirma un pago y avanza su fecha ATÓMICAMENTE.
-- Invoker mantiene las políticas RLS del usuario conectado.
-- expected_date evita avanzar dos veces al repetir una misma petición.
create function public.record_recurring_payment(p_id text, p_expected_date date)
returns text
language plpgsql
security invoker
set search_path = ''
as $$
declare
  payment public.recurring%rowtype;
  movement_id text;
  target_month date;
  following_date date;
  last_day integer;
begin
  if auth.uid() is null then
    raise exception 'Debes iniciar sesión' using errcode = '42501';
  end if;
  if p_expected_date is null then
    raise exception 'Falta la fecha del vencimiento' using errcode = '22023';
  end if;

  select * into payment from public.recurring
    where user_id = auth.uid() and id = p_id for update;
  if not found then
    raise exception 'Suscripción no disponible' using errcode = '42501';
  end if;
  if payment.next_date <> p_expected_date then
    return null; -- Petición repetida o formulario desactualizado.
  end if;
  if not payment.active then
    raise exception 'La suscripción está pausada' using errcode = '22023';
  end if;
  if payment.next_date > (current_timestamp at time zone 'Europe/Madrid')::date then
    raise exception 'El pago todavía no ha vencido' using errcode = '22023';
  end if;

  movement_id := 'recurring:' || payment.id || ':' || to_char(payment.next_date, 'YYYY-MM-DD');
  insert into public.movements (user_id, id, type, amount_cents, category, date, note)
    values (auth.uid(), movement_id, 'expense', payment.amount_cents, payment.category, payment.next_date, payment.name)
    on conflict (user_id, id) do nothing;

  target_month := (date_trunc('month', payment.next_date::timestamp) +
    case when payment.interval = 'monthly' then interval '1 month' else interval '1 year' end)::date;
  last_day := extract(day from (target_month + interval '1 month - 1 day'))::integer;
  following_date := target_month + (least(payment.anchor_day::integer, last_day) - 1);
  update public.recurring set next_date = following_date
    where user_id = auth.uid() and id = payment.id;
  return movement_id;
end;
$$;

revoke all on function public.record_recurring_payment(text, date) from public, anon, authenticated;
grant execute on function public.record_recurring_payment(text, date) to authenticated;
commit;
