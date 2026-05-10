-- Enums
create type attachment_type as enum ('image', 'file');

-- Trips
create table trips (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete cascade,
  destination text        not null,
  start_date  date        not null,
  end_date    date        not null,
  dest_lat    numeric(9,6),
  dest_lon    numeric(9,6),
  created_at  timestamptz default now()
);

-- Activities (scheduled + explorations)
create table activities (
  id           uuid primary key default gen_random_uuid(),
  trip_id      uuid references trips(id) on delete cascade,
  is_exploration boolean default false,  -- true = customExplorations
  title        text        not null,
  date         date,
  time         time,
  duration     integer,                  -- minutes
  category     text,
  location     text,
  lat          numeric(9,6),
  lon          numeric(9,6),
  notes        text,
  created_at   timestamptz default now()
);

-- Attachments (activity-level)
create table activity_attachments (
  id          uuid primary key default gen_random_uuid(),
  activity_id uuid references activities(id) on delete cascade,
  name        text             not null,
  url         text             not null,  -- Supabase Storage path
  type        attachment_type  not null,
  created_at  timestamptz default now()
);

-- RLS
alter table trips               enable row level security;
alter table activities          enable row level security;
alter table activity_attachments enable row level security;

-- Trips: users only see their own
create policy "owner access" on trips
  for all using (auth.uid() = user_id);

-- Related tables: access through trip ownership
create policy "owner access" on activities
  for all using (
    exists (select 1 from trips where trips.id = activities.trip_id and trips.user_id = auth.uid())
  );

create policy "owner access" on activity_attachments
  for all using (
    exists (
      select 1 from activities
      join trips on trips.id = activities.trip_id
      where activities.id = activity_attachments.activity_id
      and trips.user_id = auth.uid()
    )
  );
