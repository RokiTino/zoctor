# Patient invitations

The Zoctor **Patients** tab has two actions. **Request existing patient** creates an approval request for an existing FieldMed Auth account. **Invite new patient** asks the FieldMed `invite-patient` Edge Function to send a Supabase Auth invitation, create the patient profile, and create an approval request. Neither action grants access to patient records. The patient must approve the request in DocConnect; the database then creates the care link. Both functions require a valid doctor session. The service-role key stays in Edge Functions.

Before enabling invitations:

1. Publish the DocConnect web app at an HTTPS URL that patients can open. It must use the same FieldMed Supabase project.
2. Add that exact URL to FieldMed Supabase Auth's redirect allow list.
3. The `invite-patient` Edge Function uses the published DocConnect URL directly. If the patient portal URL changes, update that URL in the function and redeploy it.
4. Configure FieldMed Auth email delivery for the intended patient volume. Supabase's default sender is limited.
5. Deploy `supabase/functions/invite-patient/index.ts` with JWT verification enabled.

After accepting the email link, the patient reaches DocConnect with an authenticated session, uses **Set password** (lock icon) to establish password sign-in, and approves or declines the doctor's care-team request. If an account already exists for an email, use **Request existing patient**; the invitation function will not send another invite.

An invitation email can succeed while a later profile or approval-request write fails. The function reports that partial state so clinic staff can use **Request existing patient** after correcting the database error. A declined request is not silently resent; clinic staff must review it.
