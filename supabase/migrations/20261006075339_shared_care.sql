-- FieldMed only: shared Zoctor/DocConnect backend. Never apply to GymRatAi.
create schema if not exists care_private;
revoke all on schema care_private from public;
create extension if not exists btree_gist with schema extensions;
create table public.care_people (
 id uuid primary key references auth.users(id) on delete cascade,
 display_name text not null check (length(trim(display_name)) between 1 and 120),
 role text not null check (role in ('doctor','patient')),
 specialty text
);
create table public.care_links (
 doctor_id uuid not null references public.care_people(id),
 patient_id uuid not null references public.care_people(id),
 primary key (doctor_id, patient_id), check (doctor_id <> patient_id)
);
create index care_links_patient_idx on public.care_links(patient_id);
create function care_private.is_doctor() returns boolean language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.care_people where id = (select auth.uid()) and role = 'doctor');
$$;
create function care_private.can_care_for(patient uuid) returns boolean language sql stable security definer set search_path = '' as $$
 select auth.uid() is not null and exists(select 1 from public.care_links l join public.care_people p on p.id=l.doctor_id where l.doctor_id = (select auth.uid()) and l.patient_id=patient and p.role='doctor');
$$;
revoke all on function care_private.is_doctor(), care_private.can_care_for(uuid) from public;
grant usage on schema care_private to authenticated;
grant execute on function care_private.is_doctor(), care_private.can_care_for(uuid) to authenticated;
create table public.care_slots (
 id uuid primary key default gen_random_uuid(),
 doctor_id uuid not null references public.care_people(id),
 starts_at timestamptz not null,
 ends_at timestamptz not null,
 check (ends_at > starts_at and ends_at <= starts_at + interval '8 hours'),
 exclude using gist (doctor_id with =, tstzrange(starts_at, ends_at, '[)') with &&)
);
create index care_slots_starts_idx on public.care_slots(starts_at);
create table public.care_appointments (
 id uuid primary key default gen_random_uuid(),
 slot_id uuid not null references public.care_slots(id),
 patient_id uuid not null references public.care_people(id),
 created_by uuid not null references auth.users(id),
 status text not null default 'scheduled' check (status in ('scheduled','completed','cancelled','no_show')),
 summary text not null default '' check (length(summary) <= 5000),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create unique index care_appointments_slot_unique on public.care_appointments(slot_id) where status <> 'cancelled';
create index care_appointments_patient_idx on public.care_appointments(patient_id);
create index care_appointments_creator_idx on public.care_appointments(created_by);
create table public.care_notifications (
 id uuid primary key default gen_random_uuid(),
 patient_id uuid not null references public.care_people(id),
 appointment_id uuid not null references public.care_appointments(id) on delete cascade,
 kind text not null,
 message text not null,
 created_at timestamptz not null default now(),
 read_at timestamptz,
 unique (appointment_id,kind)
);
create index care_notifications_patient_idx on public.care_notifications(patient_id,created_at desc);
alter table public.care_people enable row level security;
alter table public.care_links enable row level security;
alter table public.care_slots enable row level security;
alter table public.care_appointments enable row level security;
alter table public.care_notifications enable row level security;
-- Membership and care relationships are provisioned by the clinic administrator, never self-assigned.
create policy people_read on public.care_people for select to authenticated using (id=(select auth.uid()) or role='doctor' or care_private.can_care_for(id));
create policy links_read on public.care_links for select to authenticated using (doctor_id=(select auth.uid()) or patient_id=(select auth.uid()));
create policy slots_read on public.care_slots for select to authenticated using (true);
create policy slots_insert on public.care_slots for insert to authenticated with check (doctor_id=(select auth.uid()) and care_private.is_doctor() and starts_at > now());
create policy appointments_read on public.care_appointments for select to authenticated using (
 patient_id=(select auth.uid()) or care_private.can_care_for(patient_id) or exists(select 1 from public.care_slots s where s.id=slot_id and s.doctor_id=(select auth.uid()))
);
create policy appointments_insert on public.care_appointments for insert to authenticated with check (
 created_by=(select auth.uid()) and care_private.can_care_for(patient_id) and status='scheduled' and summary=''
 and exists(select 1 from public.care_slots s join public.care_people d on d.id=s.doctor_id where s.id=slot_id and s.starts_at>now() and d.role='doctor')
 and exists(select 1 from public.care_people p where p.id=patient_id and p.role='patient')
);
create policy appointments_update on public.care_appointments for update to authenticated using (
 care_private.can_care_for(patient_id) or exists(select 1 from public.care_slots s where s.id=slot_id and s.doctor_id=(select auth.uid()))
) with check (
 care_private.can_care_for(patient_id) or exists(select 1 from public.care_slots s where s.id=slot_id and s.doctor_id=(select auth.uid()))
);
create policy notifications_read on public.care_notifications for select to authenticated using (patient_id=(select auth.uid()));
create policy notifications_update on public.care_notifications for update to authenticated using (patient_id=(select auth.uid())) with check (patient_id=(select auth.uid()));
grant select on public.care_people,public.care_links,public.care_slots,public.care_appointments,public.care_notifications to authenticated;
grant insert on public.care_slots,public.care_appointments to authenticated;
grant update(status,summary) on public.care_appointments to authenticated;
grant update(read_at) on public.care_notifications to authenticated;
-- Serialize patient bookings so different specialists cannot double-book the same patient.
create function care_private.validate_appointment() returns trigger language plpgsql security definer set search_path='' as $$
declare slot public.care_slots;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 if TG_OP='UPDATE' then
  if (new.id,new.slot_id,new.patient_id,new.created_by,new.created_at) is distinct from (old.id,old.slot_id,old.patient_id,old.created_by,old.created_at) then raise exception 'Appointment identity is immutable'; end if;
  if old.status <> 'scheduled' then raise exception 'Closed appointments cannot be changed'; end if;
 end if;
 select * into slot from public.care_slots where id=new.slot_id;
 if TG_OP='INSERT' then
  perform 1 from public.care_people where id=new.patient_id for update;
  if slot.starts_at <= now() then raise exception 'Choose a future appointment'; end if;
  if exists(select 1 from public.care_appointments a join public.care_slots s on s.id=a.slot_id where a.patient_id=new.patient_id and a.status<>'cancelled' and tstzrange(s.starts_at,s.ends_at,'[)') && tstzrange(slot.starts_at,slot.ends_at,'[)')) then raise exception 'Patient already has an appointment at that time'; end if;
 elsif new.status in ('completed','no_show') and slot.starts_at>now() then raise exception 'Future appointments cannot be completed';
 end if;
 if new.status='completed' and length(trim(new.summary))=0 then raise exception 'Add a patient-visible checkup summary'; end if;
 new.updated_at=now();
 return new;
end $$;
revoke all on function care_private.validate_appointment() from public;
create trigger validate_care_appointment before insert or update on public.care_appointments for each row execute function care_private.validate_appointment();
create function care_private.notify_appointment() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if TG_OP='INSERT' or new.status is distinct from old.status then
  insert into public.care_notifications(patient_id,appointment_id,kind,message) values(new.patient_id,new.id,new.status,'Your appointment is ' || replace(new.status,'_',' ') || '. Open appointments for details.') on conflict do nothing;
  if new.status<>'scheduled' then delete from public.care_notifications where appointment_id=new.id and kind='reminder'; end if;
 end if;
 return new;
end $$;
revoke all on function care_private.notify_appointment() from public;
create trigger notify_care_appointment after insert or update on public.care_appointments for each row execute function care_private.notify_appointment();
create function care_private.queue_reminders() returns void language sql security definer set search_path='' as $$
 insert into public.care_notifications(patient_id,appointment_id,kind,message)
 select a.patient_id,a.id,'reminder','Appointment reminder: your appointment is within 24 hours.' from public.care_appointments a join public.care_slots s on s.id=a.slot_id
 where a.status='scheduled' and s.starts_at>now() and s.starts_at<=now()+interval '24 hours'
 on conflict (appointment_id,kind) do nothing;
$$;
revoke all on function care_private.queue_reminders() from public;
-- Supabase default privileges may grant more than this API needs.
revoke all on public.care_people,public.care_links,public.care_slots,public.care_appointments,public.care_notifications from anon, authenticated;
grant select on public.care_people,public.care_links,public.care_slots,public.care_appointments,public.care_notifications to authenticated;
grant insert on public.care_slots,public.care_appointments to authenticated;
grant update(status,summary) on public.care_appointments to authenticated;
grant update(read_at) on public.care_notifications to authenticated;
alter table public.care_slots add column booked boolean not null default false;
revoke insert on public.care_slots from authenticated;
grant insert(doctor_id,starts_at,ends_at) on public.care_slots to authenticated;
create function care_private.mark_slot_booked() returns trigger language plpgsql security definer set search_path='' as $$
begin
 update public.care_slots set booked=(new.status<>'cancelled') where id=new.slot_id;
 return new;
end $$;
revoke all on function care_private.mark_slot_booked() from public;
create trigger mark_care_slot_booked after insert or update on public.care_appointments for each row execute function care_private.mark_slot_booked();
