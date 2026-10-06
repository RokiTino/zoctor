drop policy people_read on public.care_people;
create policy people_read on public.care_people for select to authenticated using (
 id=(select auth.uid()) or role='doctor' or care_private.can_care_for(id)
 or exists(select 1 from public.care_appointments a join public.care_slots s on s.id=a.slot_id where a.patient_id=care_people.id and s.doctor_id=(select auth.uid()))
);
