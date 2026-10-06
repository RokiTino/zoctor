-- A narrow private lookup avoids a care_people -> appointments -> care_people
-- policy cycle while revealing only whether the caller has this referral.
create function care_private.has_referral(patient uuid) returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(
  select 1 from public.care_appointments a join public.care_slots s on s.id=a.slot_id
  where a.patient_id=patient and s.doctor_id=(select auth.uid())
 );
$$;
revoke all on function care_private.has_referral(uuid) from public;
grant execute on function care_private.has_referral(uuid) to authenticated;
drop policy people_read on public.care_people;
create policy people_read on public.care_people for select to authenticated using (
 id=(select auth.uid()) or role='doctor' or care_private.can_care_for(id) or care_private.has_referral(id)
);
