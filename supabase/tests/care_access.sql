begin;
-- Transaction-scoped synthetic users; the final rollback removes every fixture.
insert into auth.users(id) values ('00000000-0000-4000-a000-000000000001'),('00000000-0000-4000-a000-000000000002'),('00000000-0000-4000-a000-000000000003'),('00000000-0000-4000-a000-000000000004');
insert into public.care_people(id,display_name,role) values
('00000000-0000-4000-a000-000000000001','Test doctor','doctor'),
('00000000-0000-4000-a000-000000000002','Test specialist','doctor'),
('00000000-0000-4000-a000-000000000003','Test patient','patient'),
('00000000-0000-4000-a000-000000000004','Unrelated patient','patient');
insert into public.care_links values ('00000000-0000-4000-a000-000000000001','00000000-0000-4000-a000-000000000003');
insert into public.care_slots(id,doctor_id,starts_at,ends_at) values
('00000000-0000-4000-b000-000000000001','00000000-0000-4000-a000-000000000002',now()+interval '2 hours',now()+interval '150 minutes'),
('00000000-0000-4000-b000-000000000002','00000000-0000-4000-a000-000000000001',now()+interval '2 hours',now()+interval '150 minutes');
select set_config('request.jwt.claim.sub','00000000-0000-4000-a000-000000000001',true);
set local role authenticated;
insert into public.care_appointments(id,slot_id,patient_id,created_by) values ('00000000-0000-4000-c000-000000000001','00000000-0000-4000-b000-000000000001','00000000-0000-4000-a000-000000000003','00000000-0000-4000-a000-000000000001');
do $$ begin
 if not (select booked from public.care_slots where id='00000000-0000-4000-b000-000000000001') then raise exception 'Slot was not marked booked'; end if;
 begin
  insert into public.care_appointments(slot_id,patient_id,created_by) values ('00000000-0000-4000-b000-000000000002','00000000-0000-4000-a000-000000000003','00000000-0000-4000-a000-000000000001');
  raise exception 'TEST FAILED: overlapping patient booking allowed';
 exception when raise_exception then if sqlerrm not like 'Patient already%' then raise; end if; end;
 begin
  update public.care_appointments set status='completed',summary='Too early' where id='00000000-0000-4000-c000-000000000001';
  raise exception 'TEST FAILED: future completion allowed';
 exception when raise_exception then if sqlerrm not like 'Only the treating doctor%' then raise; end if; end;
end $$;
reset role;
select set_config('request.jwt.claim.sub','00000000-0000-4000-a000-000000000002',true);
set local role authenticated;
do $$ begin
 if not exists(select 1 from public.care_people where id='00000000-0000-4000-a000-000000000003') then raise exception 'Specialist cannot see referred patient name'; end if;
 if (select count(*) from public.care_appointments)<>1 then raise exception 'Specialist cannot see assigned appointment'; end if;
end $$;
reset role;
select care_private.queue_reminders();
select care_private.queue_reminders();
select set_config('request.jwt.claim.sub','00000000-0000-4000-a000-000000000003',true);
set local role authenticated;
do $$ begin
 if (select count(*) from public.care_appointments)<>1 then raise exception 'Patient cannot see own appointment'; end if;
 if (select count(*) from public.care_notifications)<>2 then raise exception 'Expected one booking notification and one deduplicated reminder'; end if;
 begin
  update public.care_people set role='doctor' where id='00000000-0000-4000-a000-000000000003';
  raise exception 'TEST FAILED: role escalation allowed';
 exception when insufficient_privilege then null; end;
 begin
  update public.care_appointments set summary='forged' where id='00000000-0000-4000-c000-000000000001';
  if found then raise exception 'TEST FAILED: patient edited clinical summary'; end if;
 exception when insufficient_privilege then null; end;
end $$;
update public.care_notifications set read_at=now() where kind='scheduled';
reset role;
select set_config('request.jwt.claim.sub','00000000-0000-4000-a000-000000000004',true);
set local role authenticated;
do $$ begin
 if exists(select 1 from public.care_appointments) or exists(select 1 from public.care_notifications) then raise exception 'Unrelated patient can read private data'; end if;
end $$;
reset role;
select set_config('request.jwt.claim.sub','00000000-0000-4000-a000-000000000001',true);
set local role authenticated;
update public.care_appointments set status='cancelled' where id='00000000-0000-4000-c000-000000000001';
do $$ begin
 if (select booked from public.care_slots where id='00000000-0000-4000-b000-000000000001') then raise exception 'Cancelled slot not released'; end if;
end $$;
reset role;
select 'PASS: referral, overlap rejection, future completion rejection, RLS isolation, role protection, notifications, reminder deduplication, cancellation' as result;
rollback;
