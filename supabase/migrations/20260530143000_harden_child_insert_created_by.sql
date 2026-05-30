-- F-02 review fix: require created_by = auth.uid() on child INSERT policies

drop policy if exists "change_inputs_insert_own" on public.change_inputs;

create policy "change_inputs_insert_own"
on public.change_inputs
for insert
to authenticated
with check (
  created_by = (select auth.uid())
  and exists (
    select 1
    from public.projects p
    where p.id = change_inputs.project_id
      and p.owner_id = (select auth.uid())
  )
);

drop policy if exists "generation_runs_insert_own" on public.generation_runs;

create policy "generation_runs_insert_own"
on public.generation_runs
for insert
to authenticated
with check (
  created_by = (select auth.uid())
  and exists (
    select 1
    from public.projects p
    where p.id = generation_runs.project_id
      and p.owner_id = (select auth.uid())
  )
);
