-- FieldMed: patient-approved care relationships and treating-doctor record integrity.
create table public.care_link_requests (
 id uuid primary key default gen_random_uuid(),
 doctor_id uuid not null references public.care_people(id),
 patient_id uuid not null references public.care_people(id),
 status text not null default 'pending' check (status in ('pending','accepted','declined')),
 created_at timestamptz not null default now(),
 responded_at timestamptz,
 unique (doctor_id, patient_id),
 check (doctor_id <> patient_id)
);
create index care_link_requests_patient_idx on public.care_link_requests(patient_id, status);
alter table public.care_link_requests enable row level security;
revoke all on public.care_link_requests from anon, authenticated;
grant select, update(status) on public.care_link_requests to authenticated;
create policy link_requests_read on public.care_link_requests for select to authenticated
 using (doctor_id = (select auth.uid()) or patient_id = (select auth.uid()));
create policy link_requests_respond on public.care_link_requests for update to authenticated
 using (patient_id = (select auth.uid()) and status = 'pending')
 with check (patient_id = (select auth.uid()) and status in ('accepted','declined'));

create table public.care_audit_events (
 id bigint generated always as identity primary key,
 occurred_at timestamptz not null default now(),
 actor_id uuid,
 patient_id uuid not null,
 appointment_id uuid,
 action text not null,
 old_status text,
 new_status text,
 summary_changed boolean not null default false
);
create index care_audit_events_patient_time_idx on public.care_audit_events(patient_id, occurred_at desc);
alter table public.care_audit_events enable row level security;
revoke all on public.care_audit_events from anon, authenticated;

create function care_private.process_link_response() returns trigger language plpgsql security definer set search_path = '' as $$
begin
 if (new.id,new.doctor_id,new.patient_id,new.created_at) is distinct from
    (old.id,old.doctor_id,old.patient_id,old.created_at) then
  raise exception 'Care request identity is immutable';
 end if;
 if old.status <> 'pending' or new.status not in ('accepted','declined') or
    auth.uid() is distinct from old.patient_id then
  raise exception 'Only the patient may answer a pending care request';
 end if;
 new.responded_at = now();
 return new;
end $$;
revoke all on function care_private.process_link_response() from public;
create trigger process_care_link_response before update on public.care_link_requests
 for each row execute function care_private.process_link_response();

create function care_private.apply_link_response() returns trigger language plpgsql security definer set search_path = '' as $$
begin
 if new.status = 'accepted' then
  insert into public.care_links(doctor_id,patient_id) values(new.doctor_id,new.patient_id)
   on conflict do nothing;
 end if;
 insert into public.care_audit_events(actor_id,patient_id,action)
  values(auth.uid(),new.patient_id,case when new.status='accepted' then 'care_link.accepted' else 'care_link.declined' end);
 return new;
end $$;
revoke all on function care_private.apply_link_response() from public;
create trigger apply_care_link_response after update on public.care_link_requests
 for each row execute function care_private.apply_link_response();

drop policy appointments_update on public.care_appointments;
create policy appointments_update on public.care_appointments for update to authenticated using (
 exists(select 1 from public.care_slots s where s.id=slot_id and s.doctor_id=(select auth.uid()))
 or (created_by=(select auth.uid()) and care_private.can_care_for(patient_id))
) with check (
 exists(select 1 from public.care_slots s where s.id=slot_id and s.doctor_id=(select auth.uid()))
 or (created_by=(select auth.uid()) and care_private.can_care_for(patient_id))
);

create or replace function care_private.validate_appointment() returns trigger language plpgsql security definer set search_path='' as $$
declare slot public.care_slots;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 select * into slot from public.care_slots where id=new.slot_id;
 if TG_OP='UPDATE' then
  if (new.id,new.slot_id,new.patient_id,new.created_by,new.created_at) is distinct from
     (old.id,old.slot_id,old.patient_id,old.created_by,old.created_at) then
   raise exception 'Appointment identity is immutable';
  end if;
  if old.status <> 'scheduled' then raise exception 'Closed appointments cannot be changed'; end if;
  if new.status in ('completed','no_show') and slot.doctor_id is distinct from auth.uid() then
   raise exception 'Only the treating doctor may close a checkup';
  end if;
  if new.status = 'cancelled' and slot.doctor_id is distinct from auth.uid() and
     old.created_by is distinct from auth.uid() then
   raise exception 'Only the treating or booking doctor may cancel';
  end if;
  if new.summary is distinct from old.summary and slot.doctor_id is distinct from auth.uid() then
   raise exception 'Only the treating doctor may write a checkup summary';
  end if;
  if new.status='scheduled' and new.summary<>'' then
   raise exception 'A scheduled visit cannot have a checkup summary';
  end if;
 else
  perform 1 from public.care_people where id=new.patient_id for update;
  if slot.starts_at <= now() then raise exception 'Choose a future appointment'; end if;
  if exists(select 1 from public.care_appointments a join public.care_slots s on s.id=a.slot_id
   where a.patient_id=new.patient_id and a.status<>'cancelled' and
   tstzrange(s.starts_at,s.ends_at,'[)') && tstzrange(slot.starts_at,slot.ends_at,'[)')) then
   raise exception 'Patient already has an appointment at that time';
  end if;
 end if;
 if new.status in ('completed','no_show') and slot.starts_at>now() then
  raise exception 'Future appointments cannot be completed';
 end if;
 if new.status='completed' and length(trim(new.summary))=0 then
  raise exception 'Add a patient-visible checkup summary';
 end if;
 new.updated_at=now();
 return new;
end $$;

create function care_private.audit_appointment() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if TG_OP='INSERT' then
  insert into public.care_audit_events(actor_id,patient_id,appointment_id,action,old_status,new_status,summary_changed)
   values(auth.uid(),new.patient_id,new.id,'appointment.created',null,new.status,false);
 elsif new.status is distinct from old.status or new.summary is distinct from old.summary then
  insert into public.care_audit_events(actor_id,patient_id,appointment_id,action,old_status,new_status,summary_changed)
   values(auth.uid(),new.patient_id,new.id,'appointment.changed',old.status,new.status,
    new.summary is distinct from old.summary);
 end if;
 return new;
end $$;
revoke all on function care_private.audit_appointment() from public;
create trigger audit_care_appointment after insert or update on public.care_appointments
 for each row execute function care_private.audit_appointment();

-- Existing unapproved links become requests; access resumes only after patient approval.
insert into public.care_link_requests(doctor_id,patient_id)
 select doctor_id,patient_id from public.care_links on conflict do nothing;
delete from public.care_links;
