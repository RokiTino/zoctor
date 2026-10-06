begin;
-- Synthetic accounts and all changes are rolled back at the end.
insert into auth.users(id) values
 ('00000000-0000-4000-a000-000000000011'),
 ('00000000-0000-4000-a000-000000000012'),
 ('00000000-0000-4000-a000-000000000013'),
 ('00000000-0000-4000-a000-000000000014');
insert into public.care_people(id,display_name,role) values
 ('00000000-0000-4000-a000-000000000011','Referring doctor','doctor'),
 ('00000000-0000-4000-a000-000000000012','Treating specialist','doctor'),
 ('00000000-0000-4000-a000-000000000013','Patient','patient'),
 ('00000000-0000-4000-a000-000000000014','Unrelated patient','patient');
insert into public.care_link_requests(id,doctor_id,patient_id) values
 ('00000000-0000-4000-d000-000000000011','00000000-0000-4000-a000-000000000011','00000000-0000-4000-a000-000000000013');

select set_config('request.jwt.claim.sub','00000000-0000-4000-a000-000000000011',true);
set local role authenticated;
do $$ begin
 if exists(select 1 from public.care_people where id='00000000-0000-4000-a000-000000000013') then
  raise exception 'Doctor saw a patient before approval';
 end if;
 update public.care_link_requests set status='accepted' where id='00000000-0000-4000-d000-000000000011';
 if found then raise exception 'Doctor approved a patient request'; end if;
end $$;
reset role;

select set_config('request.jwt.claim.sub','00000000-0000-4000-a000-000000000013',true);
set local role authenticated;
update public.care_link_requests set status='accepted' where id='00000000-0000-4000-d000-000000000011';
reset role;
do $$ begin
 if not exists(select 1 from public.care_links where doctor_id='00000000-0000-4000-a000-000000000011' and patient_id='00000000-0000-4000-a000-000000000013') then
  raise exception 'Patient approval did not create care link';
 end if;
 if not exists(select 1 from public.care_audit_events where patient_id='00000000-0000-4000-a000-000000000013' and action='care_link.accepted') then
  raise exception 'Approval was not audited';
 end if;
end $$;

insert into public.care_slots(id,doctor_id,starts_at,ends_at) values
 ('00000000-0000-4000-b000-000000000011','00000000-0000-4000-a000-000000000012',now()+interval '2 hours',now()+interval '150 minutes');
select set_config('request.jwt.claim.sub','00000000-0000-4000-a000-000000000011',true);
set local role authenticated;
insert into public.care_appointments(id,slot_id,patient_id,created_by) values
 ('00000000-0000-4000-c000-000000000011','00000000-0000-4000-b000-000000000011','00000000-0000-4000-a000-000000000013','00000000-0000-4000-a000-000000000011');
do $$ begin
 begin
  update public.care_appointments set status='completed',summary='forged' where id='00000000-0000-4000-c000-000000000011';
  raise exception 'Referring doctor changed specialist checkup';
 exception when raise_exception then
  if sqlerrm not like 'Only the treating doctor%' then raise; end if;
 end;
end $$;
reset role;

select set_config('request.jwt.claim.sub','00000000-0000-4000-a000-000000000012',true);
set local role authenticated;
do $$ begin
 begin
  update public.care_appointments set status='completed',summary='Too early' where id='00000000-0000-4000-c000-000000000011';
  raise exception 'Future checkup was completed';
 exception when raise_exception then
  if sqlerrm not like 'Future appointments%' then raise; end if;
 end;
end $$;
reset role;

-- Move this synthetic visit to the past, then allow only the treating specialist to close it.
update public.care_slots set starts_at=now()-interval '2 hours',ends_at=now()-interval '90 minutes'
 where id='00000000-0000-4000-b000-000000000011';
select set_config('request.jwt.claim.sub','00000000-0000-4000-a000-000000000012',true);
set local role authenticated;
do $$ begin
 if not exists(select 1 from public.care_people where id='00000000-0000-4000-a000-000000000013') then
  raise exception 'Treating specialist cannot see referred patient';
 end if;
end $$;
update public.care_appointments set status='completed',summary='Synthetic checkup completed'
 where id='00000000-0000-4000-c000-000000000011';
reset role;
do $$ begin
 if (select count(*) from public.care_audit_events where appointment_id='00000000-0000-4000-c000-000000000011')<>2 then
  raise exception 'Appointment create/complete audit missing';
 end if;
end $$;

select set_config('request.jwt.claim.sub','00000000-0000-4000-a000-000000000014',true);
set local role authenticated;
do $$ begin
 if exists(select 1 from public.care_appointments) then raise exception 'Unrelated patient saw clinical record'; end if;
end $$;
reset role;
select 'PASS: consent, clinical integrity, audit, referred specialist view and isolation' as result;
rollback;
