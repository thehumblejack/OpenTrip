-- Create explorations table
create table explorations (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid references trips(id) on delete cascade not null,
  title text not null,
  location text,
  lat double precision,
  lon double precision,
  category text,
  notes text,
  created_at timestamp with time zone default now()
);

-- Enable RLS
alter table explorations enable row level security;

-- Policies
create policy "Users can view explorations of their trips"
  on explorations for select
  using (
    exists (
      select 1 from trips
      where trips.id = explorations.trip_id
      and trips.user_id = auth.uid()
    )
  );

create policy "Users can insert explorations into their trips"
  on explorations for insert
  with check (
    exists (
      select 1 from trips
      where trips.id = explorations.trip_id
      and trips.user_id = auth.uid()
    )
  );

create policy "Users can update their own explorations"
  on explorations for update
  using (
    exists (
      select 1 from trips
      where trips.id = explorations.trip_id
      and trips.user_id = auth.uid()
    )
  );

create policy "Users can delete their own explorations"
  on explorations for delete
  using (
    exists (
      select 1 from trips
      where trips.id = explorations.trip_id
      and trips.user_id = auth.uid()
    )
  );
