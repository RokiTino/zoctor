# FieldMed healthcare security baseline

Zoctor and DocConnect share FieldMed. GymRatAI uses a different Supabase project and must remain separate. **These apps are not certified or declared HIPAA compliant. Do not enter real patient health information until the organizational and technical release gates below are verified.** North Macedonia is the first patient jurisdiction; HIPAA is an additional readiness target, not a substitute for North Macedonian law.

## Controls implemented in the prototype

- Row-level security restricts patient appointments and notifications. Doctors must have a server-assigned doctor profile. Patient-to-doctor care links now require a patient-approved `care_link_requests` row; service-role Edge Functions can only create requests, not links. The approval trigger creates the link.
- The database permits a treating doctor to complete a checkup and write its summary. The booking doctor may cancel a visit they booked. Client UI hides actions the clinician cannot perform.
- `care_audit_events` records appointment creation/status/summary changes and patient care-link decisions with actor and timestamp. App clients cannot edit or read this table. It does **not** yet capture each record read; database administrators can still alter it. Build a protected, exportable, monitored access-audit pipeline before clinical release.
- Doctor Edge Functions verify the user JWT and doctor role; service-role keys are never shipped to browser or Flutter code. The Zoctor preview is private. Invitations fail closed when no HTTPS DocConnect redirect is configured.
- Synthetic SQL tests exercise consent, row isolation, appointment integrity and audit writes inside a rolled-back transaction.

## North Macedonia release gates

Have North Macedonian healthcare/privacy counsel confirm controller and processor roles, lawful basis, patient notices and rights, professional confidentiality, retention, breach notification, and transfer/processing arrangements for FieldMed in Supabase `eu-west-1` (Ireland). Sign and retain the relevant vendor processing agreements. Document who may access which patient records, why, and how access is removed. This section is an engineering checklist, not legal advice.

## Additional HIPAA readiness gates

If the organization will handle US-regulated ePHI, determine covered-entity/business-associate status with counsel and implement the HIPAA Privacy, Security and Breach Notification Rules. Supabase states that an organization must have a **signed BAA** and the **HIPAA add-on** enabled before its projects handle PHI; configure FieldMed as a **High Compliance** project. Its documented project requirements include point-in-time recovery, SSL enforcement and network restrictions. See [Supabase HIPAA Projects](https://supabase.com/docs/guides/platform/hipaa-projects) and [HIPAA Compliance and Supabase](https://supabase.com/docs/guides/security/hipaa-compliance). Obtain BAAs from every vendor that will receive ePHI; verify each app/hosting/email/monitoring path before sending patient data through it. A BAA and high-compliance project do not make the application compliant by themselves.

| Control area | Release evidence required |
| --- | --- |
| Risk analysis and governance | Signed asset/data-flow inventory, risk assessment, named security/privacy owners, workforce training and sanctions process. |
| Identity and access | Unique clinician accounts, MFA, minimum necessary roles, patient-approved care links, periodic access review, rapid revocation, tested cross-account RLS and authorization. |
| Audit controls | Protected logs for record reads, exports, changes, authentication, administrative access, and failed access; retention, alerting and regular review. Current `care_audit_events` covers only a subset. |
| Data safeguards | TLS, encryption at rest and key management verified with providers; secrets in managed stores, PHI redaction from logs/URLs/notifications, retention and secure deletion. |
| Resilience | Backups and point-in-time recovery, documented recovery objectives, regular restore drills, incident response and breach notification playbook. |
| Assurance | Dependency/secret scanning, OWASP ASVS and MASVS verification, independent penetration test, remediation evidence and change-control records. |

## Current blockers to clinical use

- Supabase Security Advisor reports leaked-password protection disabled. Turn it on in FieldMed Auth and verify. Five GraphQL schema visibility warnings are about table discovery for authenticated clients; their rows remain subject to RLS, but review whether GraphQL should be disabled or reduced.
- Clinician MFA and lifecycle controls are not yet enforced. The shared test password disclosed in chat must be rotated.
- Record-read audit, approved backup/restore targets, retention/deletion, incident-response processes, legal agreements and a public patient-accessible DocConnect site are not verified.
- New and existing patients cannot approve care-team requests until the updated DocConnect app is delivered to them. One preexisting test link was converted to a pending request by the security migration.

Before launch, run the SQL fixtures in `supabase/tests/`, retest both apps with distinct doctor/patient accounts and a real invitation, then review Supabase Security Advisor again. Keep test data synthetic until the release gates are closed.
