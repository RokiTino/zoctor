-- The treating specialist needs the referred patient's display name even
-- when the patient has not linked that specialist as a general care doctor.
drop policy people_read on public.care_people;
create policy people_read on public.care_people for select to authenticated using (
 id=(select auth.uid()) or role='doctor' or care_private.can_care_for(id) or care_private.has_referral(id)
);
