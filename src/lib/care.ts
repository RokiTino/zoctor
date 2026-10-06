import { createClient } from "@supabase/supabase-js";
const url = process.env.EXPO_PUBLIC_CARE_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_CARE_SUPABASE_KEY;
export const care =
  url && key
    ? createClient(url, key, {
        auth: { persistSession: false, detectSessionInUrl: false },
      })
    : null;
export type Person = {
  id: string;
  display_name: string;
  role: string;
  specialty: string | null;
};
export type Slot = {
  id: string;
  doctor_id: string;
  starts_at: string;
  ends_at: string;
  booked: boolean;
};
export type Appointment = {
  id: string;
  patient_id: string;
  slot_id: string;
  status: string;
  summary: string;
  care_slots: Slot;
};
export async function loadCare() {
  if (!care) throw new Error("The clinic connection has not been configured.");
  const results = await Promise.all([
    care.from("care_people").select("*").order("display_name"),
    care.from("care_links").select("doctor_id,patient_id"),
    care
      .from("care_slots")
      .select("*")
      .gte("starts_at", new Date().toISOString())
      .order("starts_at"),
    care
      .from("care_appointments")
      .select("*,care_slots(*)")
      .order("created_at", { ascending: false }),
  ]);
  for (const r of results) if (r.error) throw r.error;
  return {
    people: results[0].data as Person[],
    links: results[1].data as { doctor_id: string; patient_id: string }[],
    slots: results[2].data as Slot[],
    appointments: results[3].data as Appointment[],
  };
}
