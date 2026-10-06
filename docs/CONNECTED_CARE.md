# Zoctor + DocConnect

Zoctor is the doctor web workspace. DocConnect is the patient Flutter app. Both use **FieldMed** (`xiivqhjbbpupkjytlndg`); neither uses GymRatAI's backend or account data.

## Implemented

Doctors publish 30-minute availability, book their linked patients with specialists, see their patients' appointments across doctors, cancel visits, and complete checkups with a patient-visible summary. PostgreSQL rejects overlapping doctor slots, duplicate bookings, and patient time conflicts. Completed/cancelled appointments are closed records; rescheduling currently means cancel and book another slot.

DocConnect signs patients in and shows their appointments, checkup history, and in-app notification inbox. Both clients refresh every 30 seconds, with manual refresh. A pg_cron job checks every five minutes and inserts one reminder per scheduled appointment within 24 hours. Cancellation removes pending reminder records. This is an in-app inbox, not APNs/FCM, SMS or email delivery. External clinic calendars are not integrated.

## Cloud configuration

Set EXPO_PUBLIC_CARE_SUPABASE_URL and EXPO_PUBLIC_CARE_SUPABASE_KEY to FieldMed's URL and publishable key in the cloud build. Never use a service-role key. Run `npm ci`, `npx tsc --noEmit`, and `npx expo export --platform web`. Host the resulting `dist` directory over HTTPS on the selected cloud provider.

Schema migrations are in `supabase/migrations` and have been applied to FieldMed. Apply future changes only to FieldMed. `supabase/tests/care_access.sql` runs synthetic authorization/booking checks in a transaction that rolls back all fixtures.

## Clinic account provisioning

Create/invite real accounts through Supabase Auth. Using an administrator-only database connection, insert each auth user ID into `care_people` with display_name and role (`doctor` or `patient`); set specialty for doctors. Insert `care_links(doctor_id,patient_id)` only after the clinic authorizes that care relationship. The apps cannot self-assign roles or care relationships. Do not place production personal data in source control.

No real clinic accounts have been provisioned. No production frontend domain has been selected or published. Runtime checks with actual doctor/patient sessions remain required before use with real patient information.

## Access model

Patients can read only their own appointments and notifications; they can only change notification read timestamps. Doctors can manage appointments for linked patients and appointments assigned to them. Specialists can see patient names for their booked appointments. A linked doctor can see the patient's care history across specialists. This assumes clinic-authorized care-team access; consent/onboarding and audit retention policy need product decisions before a real clinic rollout.

The security advisor reports the five tables as discoverable in the authenticated GraphQL schema. This is intentional authenticated API access; RLS restricts rows. See https://supabase.com/docs/guides/database/database-linter?lint=0027_pg_graphql_authenticated_table_exposed.
