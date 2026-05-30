-- F-02 Phase 2: change_inputs, generation_runs, generated_outputs with project-scoped RLS

create table public.change_inputs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  source_type text not null default 'manual',
  title text,
  raw_content text not null,
  created_by uuid not null references auth.users (id),
  created_at timestamptz not null default now()
);

create index change_inputs_project_id_idx on public.change_inputs (project_id);

create table public.generation_runs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  change_input_id uuid references public.change_inputs (id) on delete set null,
  created_by uuid not null references auth.users (id),
  output_type text,
  tone text,
  status text,
  prompt_snapshot text,
  created_at timestamptz not null default now()
);

create index generation_runs_project_id_idx on public.generation_runs (project_id);
create index generation_runs_change_input_id_idx on public.generation_runs (change_input_id);

create table public.generated_outputs (
  id uuid primary key default gen_random_uuid(),
  generation_run_id uuid references public.generation_runs (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  title text,
  content text not null,
  edited_content text,
  status text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index generated_outputs_project_id_idx on public.generated_outputs (project_id);
create index generated_outputs_generation_run_id_idx on public.generated_outputs (generation_run_id);

create trigger generated_outputs_set_updated_at
before update on public.generated_outputs
for each row
execute function public.set_updated_at();

alter table public.change_inputs enable row level security;
alter table public.generation_runs enable row level security;
alter table public.generated_outputs enable row level security;

create policy "change_inputs_select_own"
on public.change_inputs
for select
to authenticated
using (
  exists (
    select 1
    from public.projects p
    where p.id = change_inputs.project_id
      and p.owner_id = (select auth.uid())
  )
);

create policy "change_inputs_insert_own"
on public.change_inputs
for insert
to authenticated
with check (
  exists (
    select 1
    from public.projects p
    where p.id = change_inputs.project_id
      and p.owner_id = (select auth.uid())
  )
);

create policy "change_inputs_update_own"
on public.change_inputs
for update
to authenticated
using (
  exists (
    select 1
    from public.projects p
    where p.id = change_inputs.project_id
      and p.owner_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.projects p
    where p.id = change_inputs.project_id
      and p.owner_id = (select auth.uid())
  )
);

create policy "change_inputs_delete_own"
on public.change_inputs
for delete
to authenticated
using (
  exists (
    select 1
    from public.projects p
    where p.id = change_inputs.project_id
      and p.owner_id = (select auth.uid())
  )
);

create policy "generation_runs_select_own"
on public.generation_runs
for select
to authenticated
using (
  exists (
    select 1
    from public.projects p
    where p.id = generation_runs.project_id
      and p.owner_id = (select auth.uid())
  )
);

create policy "generation_runs_insert_own"
on public.generation_runs
for insert
to authenticated
with check (
  exists (
    select 1
    from public.projects p
    where p.id = generation_runs.project_id
      and p.owner_id = (select auth.uid())
  )
);

create policy "generation_runs_update_own"
on public.generation_runs
for update
to authenticated
using (
  exists (
    select 1
    from public.projects p
    where p.id = generation_runs.project_id
      and p.owner_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.projects p
    where p.id = generation_runs.project_id
      and p.owner_id = (select auth.uid())
  )
);

create policy "generation_runs_delete_own"
on public.generation_runs
for delete
to authenticated
using (
  exists (
    select 1
    from public.projects p
    where p.id = generation_runs.project_id
      and p.owner_id = (select auth.uid())
  )
);

create policy "generated_outputs_select_own"
on public.generated_outputs
for select
to authenticated
using (
  exists (
    select 1
    from public.projects p
    where p.id = generated_outputs.project_id
      and p.owner_id = (select auth.uid())
  )
);

create policy "generated_outputs_insert_own"
on public.generated_outputs
for insert
to authenticated
with check (
  exists (
    select 1
    from public.projects p
    where p.id = generated_outputs.project_id
      and p.owner_id = (select auth.uid())
  )
);

create policy "generated_outputs_update_own"
on public.generated_outputs
for update
to authenticated
using (
  exists (
    select 1
    from public.projects p
    where p.id = generated_outputs.project_id
      and p.owner_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.projects p
    where p.id = generated_outputs.project_id
      and p.owner_id = (select auth.uid())
  )
);

create policy "generated_outputs_delete_own"
on public.generated_outputs
for delete
to authenticated
using (
  exists (
    select 1
    from public.projects p
    where p.id = generated_outputs.project_id
      and p.owner_id = (select auth.uid())
  )
);

grant select, insert, update, delete on table public.change_inputs to authenticated;
grant select, insert, update, delete on table public.generation_runs to authenticated;
grant select, insert, update, delete on table public.generated_outputs to authenticated;
