import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { care, loadCare, Person, Slot, Appointment } from "../src/lib/care";

export default function DoctorWorkspace() {
  const { width } = useWindowDimensions();
  const currentUser = useRef<string | null>(null);
  const refreshSequence = useRef(0);
  const [user, setUser] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [people, setPeople] = useState<Person[]>([]);
  const [links, setLinks] = useState<{ doctor_id: string; patient_id: string }[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [tab, setTab] = useState("Appointments");
  const [patient, setPatient] = useState("");
  const [doctor, setDoctor] = useState("");
  const [slot, setSlot] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [summary, setSummary] = useState("");
  const [selected, setSelected] = useState("");
  const [patientName, setPatientName] = useState("");
  const [patientEmail, setPatientEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const name = (id: string) =>
    people.find((p) => p.id === id)?.display_name || "Care team member";
  async function refresh() {
    const account = currentUser.current;
    const sequence = ++refreshSequence.current;
    const data = await loadCare();
    if (account !== currentUser.current || sequence !== refreshSequence.current)
      return;
    setPeople(data.people);
    setLinks(data.links);
    setSlots(data.slots);
    setAppointments(data.appointments);
  }
  async function act(fn: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setMessage("");
    try {
      await fn();
    } catch (e: any) {
      setMessage(e.message || "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    if (!care) return;
    const {
      data: { subscription },
    } = care.auth.onAuthStateChange((_event, session) => {
      currentUser.current = session?.user.id ?? null;
      setUser(currentUser.current);
      if (!session) {
        setPeople([]);
        setLinks([]);
        setSlots([]);
        setAppointments([]);
        setPatient("");
        setDoctor("");
        setSlot("");
        setSelected("");
        setSummary("");
      }
    });
    return () => {
      currentUser.current = null;
      subscription.unsubscribe();
    };
  }, []);
  useEffect(() => {
    if (!user) return;
    let alive = true;
    const reload = () =>
      refresh().catch((e) => {
        if (alive) setMessage(e.message);
      });
    reload();
    const id = setInterval(reload, 30000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [user]);
  const me = people.find((p) => p.id === user);
  const patients = people.filter((p) =>
    p.role === "patient" && links.some((link) => link.doctor_id === user && link.patient_id === p.id),
  );
  const doctors = people.filter((p) => p.role === "doctor");
  const shown = appointments
    .filter(
      (a) =>
        (!patient || a.patient_id === patient) &&
        (tab === "History"
          ? a.status !== "scheduled"
          : a.status === "scheduled"),
    )
    .sort(
      (a, b) =>
        Date.parse(a.care_slots.starts_at) - Date.parse(b.care_slots.starts_at),
    );
  const button = (label: string, onPress: () => void, secondary = false) => (
    <Pressable
      accessibilityRole="button"
      disabled={busy}
      onPress={onPress}
      style={[s.button, secondary && s.secondary, busy && { opacity: 0.5 }]}
    >
      <Text style={[s.buttonText, secondary && { color: "#163d36" }]}>
        {label}
      </Text>
    </Pressable>
  );
  const input = (
    label: string,
    value: string,
    set: (v: string) => void,
    secure = false,
  ) => (
    <View style={{ gap: 6 }}>
      <Text style={s.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        style={s.input}
        value={value}
        onChangeText={set}
        secureTextEntry={secure}
        autoCapitalize="none"
      />
    </View>
  );
  if (!user)
    return (
      <View style={s.login}>
        <View style={s.loginCard}>
          <Text style={s.brand}>zoctor</Text>
          <Text style={s.title}>Your practice, connected.</Text>
          <Text style={s.muted}>
            Sign in to manage appointments and coordinate specialist care with
            DocConnect.
          </Text>
          {!care && (
            <Text style={s.error}>Clinic connection is not configured.</Text>
          )}
          {input("Email", email, setEmail)}
          {input("Password", password, setPassword, true)}
          {button(busy ? "Signing in…" : "Sign in", () =>
            act(async () => {
              if (!care) throw Error("Clinic connection is not configured.");
              const { error } = await care.auth.signInWithPassword({
                email: email.trim(),
                password,
              });
              if (error) throw error;
              setPassword("");
            }),
          )}
          <Text accessibilityLiveRegion="polite" style={s.error}>
            {message}
          </Text>
          <Text style={s.muted}>
            Doctor accounts are issued by your clinic administrator.
          </Text>
        </View>
      </View>
    );
  return (
    <View style={s.root}>
      <View
        style={[
          s.nav,
          width < 800 && {
            width: "100%",
            flexDirection: "row",
            flexWrap: "wrap",
            padding: 14,
          },
        ]}
      >
        <Text style={s.brand}>zoctor</Text>
        <Text style={s.caption}>DOCTOR WORKSPACE</Text>
        {["Appointments", "Patients", "Book specialist", "Availability", "History"].map(
          (t) => (
            <Pressable
              accessibilityRole="button"
              key={t}
              onPress={() => {
                setTab(t);
                setMessage("");
              }}
              style={[s.navItem, tab === t && { backgroundColor: "#dcebe6" }]}
            >
              <Text style={s.navText}>{t}</Text>
            </Pressable>
          ),
        )}
        {button(
          "Sign out",
          () =>
            act(async () => {
              const { error } = await care!.auth.signOut();
              if (error) throw error;
            }),
          true,
        )}
      </View>
      <ScrollView style={s.main} contentContainerStyle={s.content}>
        <Text style={s.caption}>CONNECTED CARE / {tab.toUpperCase()}</Text>
        <Text style={s.title}>
          {tab === "Appointments" ? "A clear view of your care day." : tab}
        </Text>
        <Text style={s.muted}>
          Appointments across your patients’ care team · Times shown in your
          current time zone
        </Text>
        {busy && <ActivityIndicator />}
        <Text accessibilityLiveRegion="polite" style={s.error}>
          {message}
        </Text>
        {me?.role !== "doctor" ? (
          <View style={s.card}>
            <Text style={s.heading}>Doctor access required</Text>
            <Text style={s.muted}>
              Ask your clinic administrator to activate your doctor account.
            </Text>
          </View>
        ) : (
          <>
            <View style={s.stats}>
              {[
                [
                  "Upcoming",
                  appointments.filter((a) => a.status === "scheduled").length,
                ],
                ["My patients", patients.length],
                ["Specialists", doctors.length],
              ].map(([label, value]) => (
                <View key={label} style={s.stat}>
                  <Text style={s.number}>{value}</Text>
                  <Text style={s.muted}>{label}</Text>
                </View>
              ))}
            </View>
            {tab === "Patients" && (
              <View style={s.card}>
                <Text style={s.heading}>Add a patient</Text>
                <Text style={s.muted}>
                  Invite a new patient by email, or request access to someone who already has a FieldMed account. The patient must approve the care relationship in DocConnect before you can view or book their care.
                </Text>
                {input("Patient name", patientName, setPatientName)}
                {input("Patient email", patientEmail, setPatientEmail)}
                {button(busy ? "Sending…" : "Invite new patient", () =>
                  act(async () => {
                    if (!care) throw Error("Clinic connection is not configured.");
                    const { data, error } = await care.functions.invoke("invite-patient", {
                      body: { name: patientName.trim(), email: patientEmail.trim() },
                    });
                    if (error) {
                      const response = (error as any).context as Response | undefined;
                      const detail = response ? await response.json().catch(() => null) : null;
                      throw Error(detail?.message || error.message);
                    }
                    setPatientName("");
                    setPatientEmail("");
                    await refresh();
                    setMessage(data?.message || "Patient invitation sent.");
                  }),
                )}
                {button(busy ? "Requesting…" : "Request existing patient", () =>
                  act(async () => {
                    if (!care) throw Error("Clinic connection is not configured.");
                    const { data, error } = await care.functions.invoke("add-patient", {
                      body: { name: patientName.trim(), email: patientEmail.trim() },
                    });
                    if (error) {
                      const response = (error as any).context as Response | undefined;
                      const detail = response ? await response.json().catch(() => null) : null;
                      throw Error(detail?.message || error.message);
                    }
                    setPatientName("");
                    setPatientEmail("");
                    await refresh();
                    setMessage(data?.message || "Patient approval requested.");
                  }),
                true)}
                <Text style={s.heading}>Your patients</Text>
                {patients.length ? patients.map((p) => (
                  <Text key={p.id}>{p.display_name}</Text>
                )) : <Text style={s.muted}>No patients connected yet.</Text>}
              </View>
            )}
            {(tab === "Appointments" ||
              tab === "History" ||
              tab === "Book specialist") && (
              <View style={s.card}>
                <Text style={s.heading}>Patient</Text>
                <View style={s.wrap}>
                  {tab !== "Book specialist" &&
                    button(
                      "All patients",
                      () => setPatient(""),
                      !patient ? false : true,
                    )}
                  {patients.map((p) => (
                    <Pressable
                      key={p.id}
                      onPress={() => setPatient(p.id)}
                      style={[s.chip, patient === p.id && s.chosen]}
                    >
                      <Text>{p.display_name}</Text>
                    </Pressable>
                  ))}
                </View>
                {!patients.length && (
                  <Text style={s.muted}>
                    No patients assigned yet. Your clinic administrator can
                    connect your care team.
                  </Text>
                )}
              </View>
            )}
            {(tab === "Appointments" || tab === "History") && (
              <View style={s.card}>
                <View style={s.row}>
                  <Text style={s.heading}>
                    {tab === "History"
                      ? "Checkup history"
                      : "Scheduled appointments"}
                  </Text>
                  {button("Refresh", () => act(refresh), true)}
                </View>
                {!shown.length && (
                  <Text style={s.muted}>No appointments to show.</Text>
                )}
                {shown.map((a) => (
                  <View key={a.id} style={s.appointment}>
                    <Text style={s.heading}>{name(a.patient_id)}</Text>
                    <Text>
                      {new Date(a.care_slots.starts_at).toLocaleString()} ·{" "}
                      {name(a.care_slots.doctor_id)}
                    </Text>
                    <Text style={s.status}>
                      {a.status.replace("_", " ").toUpperCase()}
                    </Text>
                    {!!a.summary && <Text>{a.summary}</Text>}
                    {a.status === "scheduled" &&
                      (a.care_slots.doctor_id === user || a.created_by === user) && (
                      <View style={s.wrap}>
                        {a.care_slots.doctor_id === user && button(
                          "Complete checkup",
                          () => {
                            setSelected(a.id);
                            setSummary("");
                          },
                          true,
                        )}
                        {(a.care_slots.doctor_id === user || a.created_by === user) && button(
                          "Cancel appointment",
                          () => {
                            setSelected("cancel:" + a.id);
                          },
                          true,
                        )}
                      </View>
                    )}
                    {selected === "cancel:" + a.id && (
                      <View>
                        <Text>
                          Cancel this appointment? The patient will receive an
                          in-app notification.
                        </Text>
                        {button("Confirm cancellation", () =>
                          act(async () => {
                            const { data, error } = await care!
                              .from("care_appointments")
                              .update({ status: "cancelled" })
                              .eq("id", a.id)
                              .select("id");
                            if (error) throw error;
                            if (!data?.length)
                              throw Error("Appointment could not be updated.");
                            setSelected("");
                            await refresh();
                          }),
                        )}
                        {button(
                          "Keep appointment",
                          () => setSelected(""),
                          true,
                        )}
                      </View>
                    )}
                    {selected === a.id && (
                      <View style={{ gap: 10 }}>
                        {input(
                          "Patient-visible checkup summary",
                          summary,
                          setSummary,
                        )}
                        {button("Save completed checkup", () =>
                          act(async () => {
                            if (!summary.trim())
                              throw Error("Enter a checkup summary.");
                            const { data, error } = await care!
                              .from("care_appointments")
                              .update({
                                status: "completed",
                                summary: summary.trim(),
                              })
                              .eq("id", a.id)
                              .select("id");
                            if (error) throw error;
                            if (!data?.length)
                              throw Error("Appointment could not be updated.");
                            setSelected("");
                            await refresh();
                          }),
                        )}
                      </View>
                    )}
                  </View>
                ))}
              </View>
            )}
            {tab === "Book specialist" && (
              <View style={s.card}>
                <Text style={s.heading}>Choose a doctor</Text>
                <View style={s.wrap}>
                  {doctors.map((d) => (
                    <Pressable
                      key={d.id}
                      onPress={() => {
                        setDoctor(d.id);
                        setSlot("");
                      }}
                      style={[s.chip, doctor === d.id && s.chosen]}
                    >
                      <Text>
                        {d.display_name} · {d.specialty || "General practice"}
                      </Text>
                    </Pressable>
                  ))}
                </View>
                <Text style={s.heading}>Available appointments</Text>
                <View style={s.wrap}>
                  {slots
                    .filter((s) => s.doctor_id === doctor && !s.booked)
                    .map((x) => (
                      <Pressable
                        key={x.id}
                        onPress={() => setSlot(x.id)}
                        style={[s.chip, slot === x.id && s.chosen]}
                      >
                        <Text>{new Date(x.starts_at).toLocaleString()}</Text>
                      </Pressable>
                    ))}
                </View>
                {!slots.some((s) => s.doctor_id === doctor && !s.booked) && (
                  <Text style={s.muted}>
                    No available slots. Select a doctor with published
                    availability.
                  </Text>
                )}
                {button("Book appointment", () =>
                  act(async () => {
                    if (!patient || !slot)
                      throw Error("Choose a patient and an available time.");
                    const { error } = await care!
                      .from("care_appointments")
                      .insert({
                        patient_id: patient,
                        slot_id: slot,
                        created_by: user,
                      });
                    if (error) throw error;
                    setSlot("");
                    await refresh();
                    setMessage(
                      "Appointment booked. The patient has a DocConnect notification.",
                    );
                  }),
                )}
              </View>
            )}
            {tab === "Availability" && (
              <View style={s.card}>
                <Text style={s.heading}>
                  Publish a 30-minute appointment slot
                </Text>
                <Text style={s.muted}>
                  Times use this browser’s time zone. Overlapping slots are
                  rejected.
                </Text>
                {input("Date (YYYY-MM-DD)", date, setDate)}
                {input("Time (HH:mm, 24-hour)", time, setTime)}
                {button("Add availability", () =>
                  act(async () => {
                    if (
                      !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
                      !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)
                    )
                      throw Error("Enter a valid date and time.");
                    const start = new Date(`${date}T${time}:00`);
                    const [year, month, day] = date.split("-").map(Number);
                    if (
                      start.getFullYear() !== year ||
                      start.getMonth() !== month - 1 ||
                      start.getDate() !== day
                    )
                      throw Error("Enter a valid calendar date.");
                    if (!Number.isFinite(+start) || start <= new Date())
                      throw Error("Choose a future date.");
                    const { error } = await care!.from("care_slots").insert({
                      doctor_id: user,
                      starts_at: start.toISOString(),
                      ends_at: new Date(+start + 1800000).toISOString(),
                    });
                    if (error) throw error;
                    await refresh();
                    setMessage("Availability added.");
                  }),
                )}
                {slots
                  .filter((x) => x.doctor_id === user)
                  .map((x) => (
                    <Text key={x.id}>
                      {new Date(x.starts_at).toLocaleString()} ·{" "}
                      {x.booked ? "Booked" : "Available"}
                    </Text>
                  ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}
const s = StyleSheet.create({
  root: {
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    backgroundColor: "#f3f6f4",
  },
  nav: {
    width: 240,
    backgroundColor: "#fff",
    padding: 26,
    gap: 16,
    borderRightWidth: 1,
    borderColor: "#e0e8e4",
  },
  brand: {
    fontSize: 32,
    fontWeight: "800",
    color: "#176653",
    letterSpacing: -1,
  },
  caption: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.5,
    color: "#6d827a",
  },
  navItem: { padding: 14, borderRadius: 12 },
  navText: { fontSize: 14, color: "#21463c", fontWeight: "600" },
  main: { flex: 1 },
  content: {
    padding: 32,
    gap: 18,
    maxWidth: 1200,
    width: "100%",
    alignSelf: "center",
  },
  title: { fontSize: 32, fontWeight: "700", color: "#163d36" },
  muted: { color: "#6c7e76", lineHeight: 22 },
  card: {
    backgroundColor: "#fff",
    padding: 24,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#e0e8e4",
    gap: 16,
  },
  heading: { fontSize: 18, fontWeight: "600", color: "#183d35" },
  stats: { flexDirection: "row", flexWrap: "wrap", gap: 16 },
  stat: {
    flex: 1,
    minWidth: 120,
    padding: 22,
    backgroundColor: "#e2eee8",
    borderRadius: 16,
  },
  number: { fontSize: 30, color: "#164d3e", fontWeight: "700" },
  button: {
    backgroundColor: "#176653",
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 10,
    alignSelf: "flex-start",
  },
  secondary: { backgroundColor: "#edf3ef" },
  buttonText: { color: "#fff", fontWeight: "600" },
  input: {
    borderWidth: 1,
    borderColor: "#c8d8d0",
    borderRadius: 10,
    padding: 13,
    backgroundColor: "#fafcfb",
    fontSize: 16,
  },
  label: { fontWeight: "600", color: "#21463c" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
  },
  wrap: { flexDirection: "row", gap: 10, flexWrap: "wrap" },
  chip: {
    borderWidth: 1,
    borderColor: "#d5e1d9",
    padding: 12,
    borderRadius: 10,
  },
  chosen: { backgroundColor: "#d9eddf", borderColor: "#176653" },
  appointment: {
    borderTopWidth: 1,
    borderColor: "#e5ece8",
    paddingVertical: 20,
    gap: 10,
  },
  status: {
    fontSize: 11,
    fontWeight: "700",
    color: "#176653",
    letterSpacing: 1,
  },
  error: { color: "#a33b2c", lineHeight: 22 },
  login: {
    flex: 1,
    backgroundColor: "#f3f6f4",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  loginCard: {
    width: "100%",
    maxWidth: 480,
    gap: 20,
    backgroundColor: "#fff",
    padding: 32,
    borderRadius: 24,
  },
});
