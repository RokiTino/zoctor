-- Doctors can find their linked patients and other doctors, but not unrelated patients.
drop policy if exists people_read on public.care_people;
create policy people_read on public.care_people for select to authenticated using (
  id = (select auth.uid()) or role = 'doctor' or care_private.can_care_for(id)
);
