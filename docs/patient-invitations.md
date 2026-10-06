# Patient invitations

The Zoctor **Patients** tab has two actions. **Add existing patient** connects an existing FieldMed Auth account. **Invite new patient** asks the FieldMed `invite-patient` Edge Function to send a Supabase Auth invitation, create the patient profile, and link the patient to the signed-in doctor. Both functions require a valid doctor session. The service-role key stays in Edge Functions.

Before enabling invitations:

1. Publish the DocConnect web app at an HTTPS URL that patients can open. It must use the same FieldMed Supabase project.
2. Add that exact URL to FieldMed Supabase Auth's redirect allow list.
3. Set `DOCONNECT_INVITE_REDIRECT_URL` for the `invite-patient` Edge Function to that URL. The function refuses to send invitations until it is set to an HTTPS URL.
4. Configure FieldMed Auth email delivery for the intended patient volume. Supabase's default sender is limited.
5. Deploy `supabase/functions/invite-patient/index.ts` with JWT verification enabled.

After accepting the email link, the patient reaches DocConnect with an authenticated session and uses **Set password** (lock icon) to establish password sign-in. If an account already exists for an email, use **Add existing patient**; the invitation function will not send another invite.

An invitation email can succeed while a later profile or care-link write fails. The function reports that partial state so clinic staff can use **Add existing patient** to finish the link after correcting the database error.
