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

  // The service key stays in this function. Never expose it to the web client.
  let patientId: string | undefined;
  for (let page = 1; page <= 100; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) return reply(500, "Could not find the patient account.");
    patientId = data.users.find((user) => user.email?.toLowerCase() === email)?.id;
    if (patientId || data.users.length < 1000) break;
  }
  if (!patientId) return reply(404, "No FieldMed account uses this email. Create the patient's Supabase login first.");
  if (patientId === identity.user.id) return reply(400, "A doctor account cannot be added as a patient.");

  const { data: existing, error: existingError } = await admin
    .from("care_people")
    .select("role")
    .eq("id", patientId)
    .maybeSingle();
  if (existingError) return reply(500, "Could not check the patient profile.");
  if (existing && existing.role !== "patient") return reply(409, "This account belongs to a doctor.");
  if (!existing) {
    const { error } = await admin.from("care_people").insert({ id: patientId, display_name: name, role: "patient" });
    if (error && error.code !== "23505") return reply(500, "Could not activate the patient profile.");
  }

  const { data: linked, error: linkedError } = await admin.from("care_links")
    .select("doctor_id")
    .eq("doctor_id", identity.user.id)
    .eq("patient_id", patientId)
    .maybeSingle();
  if (linkedError) return reply(500, "Could not check the care relationship.");
  if (linked) return reply(200, "This patient is already connected to your practice.");
  const { data: previous, error: previousError } = await admin.from("care_link_requests")
    .select("status")
    .eq("doctor_id", identity.user.id)
    .eq("patient_id", patientId)
    .maybeSingle();
  if (previousError) return reply(500, "Could not check the connection request.");
  if (previous?.status === "declined")
    return reply(409, "The patient declined this request. Ask the clinic administrator for next steps.");
  if (previous?.status === "pending")
    return reply(200, "The patient still needs to approve the request in DocConnect.");
  if (previous?.status === "accepted")
    return reply(409, "A previous care link was removed. Ask the clinic administrator to review access.");
  const { error: requestError } = await admin.from("care_link_requests").upsert(
    { doctor_id: identity.user.id, patient_id: patientId },
    { onConflict: "doctor_id,patient_id", ignoreDuplicates: true },
  );
  if (requestError) return reply(500, "Patient profile exists, but could not request a connection.");
  return reply(200, "Connection requested. The patient must approve it in DocConnect.");
});
