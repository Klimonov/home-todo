create extension if not exists "pgcrypto";

create type public.task_status as enum ('backlog', 'assigned', 'done');
create type public.frequency_type as enum (
  'daily',
  'weekdays',
  'every_n_days',
  'every_n_weeks',
  'every_n_months',
  'monthly',
  'yearly'
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  login text not null unique,
  display_name text not null,
  created_at timestamptz not null default now()
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(trim(title)) > 0),
  description text,
  status public.task_status not null default 'backlog',
  creator_id uuid not null references public.profiles(id) on delete cascade,
  assignee_id uuid references public.profiles(id) on delete set null,
  scheduled_for date,
  visible_from date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

create table public.recurring_tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(trim(title)) > 0),
  description text,
  creator_id uuid not null references public.profiles(id) on delete cascade,
  frequency_type public.frequency_type not null,
  interval_value integer check (interval_value is null or interval_value > 0),
  weekdays integer[] check (weekdays is null or weekdays <@ array[0,1,2,3,4,5,6]),
  day_of_month integer check (day_of_month is null or day_of_month between 1 and 31),
  month integer check (month is null or month between 1 and 12),
  next_run_at date not null,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  task_id uuid references public.tasks(id) on delete cascade,
  type text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index tasks_status_idx on public.tasks(status);
create index tasks_assignee_idx on public.tasks(assignee_id);
create index tasks_visible_from_idx on public.tasks(visible_from);
create index recurring_tasks_next_run_idx on public.recurring_tasks(next_run_at) where enabled = true;
create index push_subscriptions_user_idx on public.push_subscriptions(user_id);

alter table public.profiles enable row level security;
alter table public.tasks enable row level security;
alter table public.recurring_tasks enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.notifications enable row level security;

create policy "authenticated users can read profiles"
  on public.profiles for select
  to authenticated
  using (true);

create policy "users can update own profile"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "authenticated users can read tasks"
  on public.tasks for select
  to authenticated
  using (true);

create policy "authenticated users can create own tasks"
  on public.tasks for insert
  to authenticated
  with check (creator_id = auth.uid());

create policy "authenticated users can update tasks"
  on public.tasks for update
  to authenticated
  using (true)
  with check (
    creator_id = auth.uid()
    or assignee_id = auth.uid()
    or status = 'backlog'
  );

create policy "authenticated users can delete done tasks"
  on public.tasks for delete
  to authenticated
  using (status = 'done' or creator_id = auth.uid() or assignee_id = auth.uid());

create policy "authenticated users can read recurring tasks"
  on public.recurring_tasks for select
  to authenticated
  using (true);

create policy "authenticated users can create recurring tasks"
  on public.recurring_tasks for insert
  to authenticated
  with check (creator_id = auth.uid());

create policy "authenticated users can update recurring tasks"
  on public.recurring_tasks for update
  to authenticated
  using (true)
  with check (true);

create policy "authenticated users can delete recurring tasks"
  on public.recurring_tasks for delete
  to authenticated
  using (true);

create policy "users can manage own push subscriptions"
  on public.push_subscriptions for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "users can read own notifications"
  on public.notifications for select
  to authenticated
  using (user_id = auth.uid());

create policy "users can update own notifications"
  on public.notifications for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger tasks_set_updated_at
  before update on public.tasks
  for each row execute function public.set_updated_at();

create trigger recurring_tasks_set_updated_at
  before update on public.recurring_tasks
  for each row execute function public.set_updated_at();

create trigger push_subscriptions_set_updated_at
  before update on public.push_subscriptions
  for each row execute function public.set_updated_at();
