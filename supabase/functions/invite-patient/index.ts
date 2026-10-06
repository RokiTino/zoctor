import { createClient } from "npm:@supabase/supabase-js@2.116.0";

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

function reply(status: number, message: string) {
  return new Response(JSON.stringify({ message }), { status, headers });
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response(null, { headers });
  if (request.method !== "POST") return reply(405, "Method not allowed.");
  const token = request.headers.get("Authorization")?.replace(/^Bearer /i, "");
  if (!token) return reply(401, "Sign in to continue.");

  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  // This is the published patient login origin. Keep it fixed so a missing
  // Edge Function secret cannot silently disable invitations.
  const redirect = "https://docconnect-patient-preview.tinoroki.chatgpt.site/";
  if (!url || !anonKey || !serviceKey) return reply(500, "Clinic connection is unavailable.");

  const auth = createClient(url, anonKey);
  const admin = createClient(url, serviceKey);
  const { data: identity, error: authError } = await auth.auth.getUser(token);
  if (authError || !identity.user) return reply(401, "Sign in again to continue.");
  const { data: doctor, error: doctorError } = await admin
    .from("care_people")
    .select("role")
    .eq("id", identity.user.id)
    .maybeSingle();
  if (doctorError) return reply(500, "Could not check doctor access.");
  if (doctor?.role !== "doctor") return reply(403, "Doctor access required.");

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return reply(400, "Enter the patient's name and email.");
  }
  if (!body || typeof body !== "object") return reply(400, "Enter the patient's name and email.");
  const fields = body as Record<string, unknown>;
  const email = typeof fields.email === "string" ? fields.email.trim().toLowerCase() : "";
  const name = typeof fields.name === "string" ? fields.name.trim() : "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 || name.length < 1 || name.length > 120)
    return reply(400, "Enter a valid email and a patient name up to 120 characters.");

  // Refuse an existing Auth account. The separate Add patient action handles those accounts.
  for (let page = 1; page <= 100; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) return reply(500, "Could not check existing accounts.");
    if (data.users.some((user) => user.email?.toLowerCase() === email))
      return reply(409, "This account already exists. Use Add existing patient instead.");
    if (data.users.length < 1000) break;
  }

  const { data: invitation, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: redirect,
  });
  if (inviteError || !invitation.user)
    return reply(502, "The invitation email could not be sent. Try again later.");

  const { error: profileError } = await admin.from("care_people").insert({
    id: invitation.user.id,
    display_name: name,
    role: "patient",
  });
  if (profileError && profileError.code !== "23505")
    return reply(500, "Invitation sent, but the patient profile could not be created. Contact the clinic administrator.");
  const { error: linkError } = await admin.from("care_link_requests").upsert({
    doctor_id: identity.user.id,
    patient_id: invitation.user.id,
  }, { onConflict: "doctor_id,patient_id", ignoreDuplicates: true });
  if (linkError)
    return reply(500, "Invitation sent, but the approval request could not be created. Contact the clinic administrator.");

  return reply(200, "Invitation sent. The patient must accept the care request in DocConnect.");
});
