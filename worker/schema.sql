create table if not exists profiles (
  id text primary key,
  login text not null unique,
  display_name text not null,
  password_hash text not null,
  password_salt text not null,
  created_at text not null default (datetime('now'))
);

create table if not exists tasks (
  id text primary key,
  title text not null,
  description text,
  status text not null check (status in ('backlog', 'assigned', 'done')),
  creator_id text not null references profiles(id) on delete cascade,
  assignee_id text references profiles(id) on delete set null,
  scheduled_for text,
  visible_from text,
  created_at text not null default (datetime('now')),
  updated_at text not null default (datetime('now')),
  completed_at text
);

create table if not exists recurring_tasks (
  id text primary key,
  title text not null,
  description text,
  creator_id text not null references profiles(id) on delete cascade,
  frequency_type text not null,
  interval_value integer,
  weekdays text,
  day_of_month integer,
  month integer,
  next_run_at text not null,
  enabled integer not null default 1,
  created_at text not null default (datetime('now')),
  updated_at text not null default (datetime('now'))
);

create table if not exists push_subscriptions (
  endpoint text primary key,
  user_id text not null references profiles(id) on delete cascade,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at text not null default (datetime('now')),
  updated_at text not null default (datetime('now'))
);

create table if not exists notifications (
  id text primary key,
  user_id text not null references profiles(id) on delete cascade,
  task_id text,
  type text not null,
  created_at text not null default (datetime('now')),
  read_at text
);
