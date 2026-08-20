# GES School MIS — Complete User Guide

> The step-by-step manual for every section of the system. Open the in-app version
> at **Admin → User Guide** (side bar → Help). Built by **Shacomputec**
> (call **+233 530 941 750** · email **shacomputecgh@gmail.com**).

The system runs on three devices that share **one database**: the website (browser),
the Windows desktop app, and the Android app. Log in with the same account everywhere.

---

## 1 · Getting started & accounts

1. Open the system in your browser (your school address or `http://localhost:3000`), the
   desktop app, or the mobile app.
2. Go to `/login` (the **Portal Login**). The page asks **"Who are you signing in as?"** —
   pick **Super Admin**, **Admin**, or **Staff Login** (which opens **Headteacher / Teacher /
   Other Staff**), plus **Student** and **Parent** doors.
3. The panel shows exactly what the chosen role can access, and the sign-in form switches
   automatically — staff use their **Staff ID** (assigned by the admin), everyone else uses
   their **email**.
4. Enter your credentials and **Sign In** — you land in the **school management system** (the
   admin portal or your role's portal), never on the public website.
5. **First time ever (fresh install)?** Visit `/setup` once to create the **Developer**
   account. That account belongs to the software vendor (Shacomputec) and controls
   licensing — it is not for daily school work.
6. The Developer then creates the school's **Administrator**: Admin → Users → Add User →
   role **Administrator**.
7. Change your password anytime: **School & Settings → Change my password**.

**Note:** the login is for the school management system only — the public website (news,
admissions, result checker) needs no sign-in. The UI-theme switcher is **developer-mode
only** (Developer Console / developer's admin shell); schools keep the default look.

The system offers **three UI looks — Light · Dark · Gold** (palette button in the header).
The Windows desktop app (Settings → Appearance) and Android app (Settings → Appearance) have
the same three themes; each device remembers its own choice.

**Roles (ranked):** Developer (1000) > Super Administrator (900) > Administrator (875) >
Proprietor > Headteacher > ICT Admin > Accountant > teachers > students/parents. Admins run
the portal and assign roles; only the Developer issues license keys and creates
Developer/Super Administrator accounts. **The Licensing console is visible only to the
Developer.**

![Portal login](login.png)

---

## 2 · Dashboard

1. After signing in you land on the **Dashboard**.
2. Top cards: Active Students, Teachers, Support Staff, Fees Collected, Attendance Rate,
   Published Reports, Pending Admissions, Male : Female split.
3. **Recent Activity** lists the latest actions and who did them.
4. **Admin Portal** panel gives one-click shortcuts (Add Student, Enter Scores, Year End &
   Rollover, Report Cards, Record Payment, Messaging Center, User Guide).
5. The dark sidebar reaches every section, grouped: People, Academics, Finance, Results &
   Admissions, Operations, Communications, Website, System, Help, and (developer only) Developer.

![Dashboard](dashboard.png)

### First-run tours (Super Admin / Admin / Teacher / Parent)

The system guides new users around the first time they sign in — no manuals needed:

- **Super Admin / Admin** — while the school is still being set up, a 5-step tour walks through
  school profile → staff & teachers → students → online payments → activate the license. Each
  step shows whether it's already done and jumps to the right page. The **Replay tour** button on
  the dashboard checklist reopens it any time.
- **Teacher** — the Teacher Portal shows a 4-step tour on first visit: check your profile &
  classes, take attendance, enter marks & homework, and where to get help. Use **Replay tour**
  in the portal header to see it again.
- **Parent** — the Parent Portal shows a 3-step tour on first visit: your wards, results &
  report cards, and fees & printing. Use **Replay tour** in the page header to see it again.
- **Student** — the Student Portal shows a 3-step tour on first visit: your results & report
  cards, your attendance, and your receipts. Use **Replay tour** in the page header to see it again.

Tours appear once per browser and can always be skipped — they never interrupt a school that's
already up and running.

---

## 3 · Students

1. Sidebar → **Students**.
2. **Add Student** → fill the form: full name, gender, date of birth, class, admission
   number (auto-suggested), phone, religion, hometown, district, region, and any required
   documents (birth certificate, NHIS/weighing card, passport photo).
3. Click **Add Student** — the student appears in the list.
4. Search or filter by name / admission number / class.
5. Edit: pencil icon → change fields → **Save Changes**.
6. **Export CSV** downloads the whole list (handy for GES returns).
7. Key icon on a row creates the student's **portal login** (email + password).
8. Delete only with care — archive first via Year End & Rollover if you may need the records.

![Students](students.png)

---

## 4 · Parents

1. **Parents** → add (full name, phone, relationship, email) or edit.
2. Link a parent to their child/children — this powers the Parent Portal and parent messaging.
3. Key icon → give the parent a portal login to track their ward's results and fees.

![Parents](parents.png)

---

## 5 · Teachers (with confidential documents)

1. **Teachers → Add Teacher**.
2. Fill the confidential profile: full name, DOB, Staff ID, sex, rank, grade type, salary
   grade, class, main subject, other subjects, SSF No, NTC/RED No, Ghana Card No, professional
   and academic qualifications, hometown/district/region, religion, marital status, emergency
   contact, periods per week, dates of first appointment / last promotion / posting.
3. Upload qualification **PDFs** (highest professional qualification, NTC/RED, area of
   specialisation, university certificate, promotion letter…) — each is stored **encrypted**.
4. Documents are decrypted only on download by someone with permission.
5. Key icon → create the teacher's portal login (Teacher Tools, attendance, scores).

![Teachers](teachers.png)

---

## 6 · Staff

1. **Staff → Add Staff Member** (staff ID, name, department, designation, gender, salary grade).
2. Staff with a salary grade are picked up automatically by payroll runs.

![Staff](staff.png)

---

## 7 · Classes & Subjects

1. **Classes & Subjects** → create a class (name + level: KG, Primary, JHS, SHS).
2. Assign the class's **subjects** from the curriculum.
3. Optionally assign a **class teacher** (used by attendance and portals).

![Classes](classes.png)

---

## 8 · Attendance

1. **Attendance** → pick class + date.
2. Mark each student **PRESENT / LATE / ABSENT / EXCUSED**.
3. Save — the term attendance rate appears on the Dashboard.

![Attendance](attendance.png)

---

## 9 · Assessments & the SBA sheet

1. **Assessments → SBA Sheet** → pick class + term → **Load**.
2. Enter the five SBA components (out of 100) per student per subject:
   **Class Work, Project Work, Class Test, Practicals, Homework**.
3. The sheet auto-computes each subject's **SBA Total** (weighted; default 20% each → the
   average) and an **Aggregate** column (sum of the student's subject totals).
4. Senior staff can edit the **weights** (e.g. Class Test 30%, Homework 10%) — totals recompute.
5. **Save**. The SBA total becomes the report card's **Class Exercise (50%)** half.
6. **Import CSV / Excel** loads a filled template back; **Export CSV / Export Excel / Blank
   Template** download the sheet for offline entry.
7. Classic entry: create an assessment (SBA or End-of-Term Exam, max 100) → enter each
   student's score.

**Formula:** Class Exercise (SBA, 50%) + End-of-Term Exam (50%). The split is configurable in
School & Settings → System → JHS/SHS weighting. **Grades:** Basic 7–9 use numeric grades 1–9;
SHS uses letter grades A+…F (already on each level's grading scale).

![Assessments](assessments.png)

---

## 10 · Report Cards

1. **Report Cards** → pick class + term → **Generate Report Cards** (computes every student's
   totals, grades, total %, position, promotion).
2. Preview (eye icon) or open the dedicated A4 print page.
3. **Publish** when ready — published reports appear in the Student/Parent Portals and Result Checker.
4. **Print / Save PDF (A4)** → the browser's print dialog with "Save as PDF" produces a true
   **single-page A4, front-only** PDF.
5. **Export Mark Sheet** → CSV or Excel: one row per student with every subject's Class %,
   Exam %, Total, Grade, plus overall total, grade, position and promotion.
6. Re-generate after editing scores.

![Reports](reports.png)

---

## 11 · Master & Broad Sheet (class analysis)

1. **Master & Broad Sheet** (sidebar → Academics) → pick class + term → **Load**.
2. **Master Sheet** tab: every student × every subject with Class (SBA), Exam, Total and Grade — ranked by overall % with promotion status.
3. **Broad Sheet** tab: per-subject class average, highest, lowest, pass count/rate and grade distribution, plus the overall class summary.
4. **Export CSV / Excel** (one workbook with both sheets) or **Print**.

**Note:** computed live from the current SBA + exam marks — subjects without scores never drag a student down.

![Master & Broad Sheet](master-sheet.png)

---

## 12 · Promotion (mass promotion)

1. **Promotion** → pick class, term, academic year.
2. Rule: promote everyone, or **onlyPromoted** (those who passed).
3. Run — every student moves to the next class; a Promotion record is kept for history.

![Promotion](promotions.png)

---

## 13 · Year End & Rollover — clear the system for a fresh year

**Who can do this:** Super Administrator, Administrator, Headteacher and ICT Administrator
(everyone except the Developer-console features). This is how you prepare the system for a
new academic year — nothing is ever lost.

1. **Year End & Rollover** → tick sections to archive (assessments, attendance, report cards,
   enrollments, fees, expenses, OTP requests) or the whole system.
2. Give the archive a title → **Archive** — rows are copied into a `DataArchive` row; nothing is deleted.
3. When ready, use that archive to **Clear for the new year** — live records are removed, the
   archive is kept and downloadable anytime.
4. Download archives (JSON) for off-site reference. Each archive can be used to clear only once.
5. Suggested order for a new academic year: **mass-promote** the classes → **archive** the
   academic sections → **clear** them → create the new year & term in **School & Settings**.

![Year End](year-end.png)

---

## 14 · License & Activation (developer only)

License management is **strictly developer-only** — it is never shown in the Super Admin,
Admin or staff portals. The **License & Activation** dashboard and the licensing console live
**only in the Developer Console (/dev)**, which no other account can open. This protects the
vendor's business: buyers and school staff only ever see the payment prompt, never the
licensing tools, keys of other schools, or any API credentials.

1. **Developer Console → License dashboard** shows the developer the **status** (Licensed /
   Trial / Expired / Suspended), this installation's **license key**, the **payment history**
   with reference, amount, method, status and date — each row has **PDF** (downloads the
   receipt as a PDF file, generated server-side and stored on the payment) and **Print** (A4
   print view). The dashboard was merged into the console; there is no `/admin/license` page
   anywhere in the system.
2. **WhatsApp the developer** and **Email the developer** buttons give one-tap support from
   the developer's dashboard.
3. The developer can **issue** keys, **auto-generate & activate** a key instantly (for
   cash / direct mobile-money purchases), **send** keys, **revoke** keys and **rotate** the
   signing secret — all gated to the developer role server-side.
4. When a payment is confirmed, the key is delivered **instantly** to the buyer's email,
   WhatsApp and SMS, and a separate payment **receipt** is emailed with the **PDF attached**
   — to both the buyer and the school's own email/WhatsApp channels.

![License](license.png)

---

## 15 · Timetable

1. **Timetable** → pick class + academic year → add periods (day, period, subject, teacher,
   start/end) → **Save**.

![Timetable](timetable.png)

---

## 16 · Teacher Tools

1. **Teacher Tools** → add **Homework** (class, subject, title, due date) and **Lesson Notes**
   (class, subject, topic, week). Published homework shows in student/parent portals.

![Teacher Tools](teacher-tools.png)

---

## 17 · Certificates

1. **Certificates** → pick student + term/year → preview (pulls report data) → **Print / Save
   PDF** (same guaranteed A4 print path as report cards).

![Certificates](certificates.png)

---

## 18 · Fees & Payments

1. **Fees & Payments** → set up **fee items** (name, level, amount, mandatory) per academic year.
2. **Record Payment**: student → tick items (or enter amount) → method (CASH / MOMO / BANK / CARD) → Save.
3. A receipt number is generated automatically; the list shows total collected and the
   Dashboard's "Fees Collected" comes from here.

![Fees](fees.png)

---

## 19 · Online Payments (Paystack + MTN + AirtelTigo + Telecel)

1. **Online Payments** → add Paystack public + secret keys.
2. Add the **MTN MoMo Collection** subscription key and the business phone.
3. Optionally add AirtelTigo and Telecel merchant keys.
4. Keep **Test mode ON** while trying — payments confirm automatically, no real money moves.
5. Flip **test mode OFF** when verified — the go-live banner turns green.
6. Parents pay at your website → **Pay Fees Online** → admission number → amount → card or MoMo;
   the receipt is issued automatically and the fee balance updates.
7. For instant settlement add the Paystack webhook: Settings → Webhooks →
   `https://<your-domain>/api/payments/webhook/paystack`.

**Notes:** MTN subscription keys are per-product and per-environment — use the **Collection**
product's primary key and register the business phone under it. In test mode without keys,
payments are simulated but still produce receipts. One-command sync from `.env`:
`node scripts/sync-payments.mjs`.

![Online Payments](payments.png)

---

## 20 · Expenses

1. **Expenses** → add title, amount, category, date. The running total is shown; the Dashboard
   subtracts expenses from collected fees.

![Expenses](expenses.png)

---

## 21 · Payroll & HR

1. **Payroll & HR → Salary Scales**: add grades (G01…) with basic, allowance, tax rate.
2. Every teacher/staff record references a salary grade.
3. **Process a run**: pick an unused month → gross/SSF/tax/deductions/net are computed.
4. View payslips → mark the run **PAID**. Paid runs cannot be deleted.

![Payroll](payroll.png)

---

## 22 · Mock Exam Analysis (BECE / WASSCE)

1. **Mock Analysis** (sidebar → Results & Admissions) — the class list shows **only Basic 9 and SHS classes**.
2. Pick class + term → **Setup** tab → number of mocks (min 5) → **Create / extend mocks** — Mock 1…N for every subject (core subjects first).
3. **Enter scores** tab: pick a mock, type each student's score (0–100) per subject, **Save** — repeat for every mock.
4. **Analysis** tab: **predicted grades** — each student's average per subject, its BECE (1–9) or WASSCE (A+–F) grade, and the trend (improving/declining) across the series; the subject table shows class average per mock, trend, pass rate and predicted-grade distribution.
5. **Export Excel/CSV** for the full breakdown, or **Print**.

**Note:** a red predicted grade (9 / F) means the student needs intervention before the real exam. The series can be extended later (e.g. add Mock 6).

![Mock Analysis](mocks.png)

---

## 23 · Result Checker (OTP)

1. **Result Checker** shows settings and the access log.
2. Configure OTP: School & Settings → System → OTP lifetime (default 300 s) and max attempts (default 5).
3. Publish a term's reports so they are checkable.
4. Students/parents: website → **Result Checker** → admission/index number + registered phone →
   6-digit OTP by SMS → enter it → view and download the report card PDF.

**Note:** in development the SMS provider is "console" (OTPs go to the server log); in
production use Hubtel or Twilio (School & Settings → Notifications).

![Result Checker](results.png)

---

## 24 · Online Admissions

1. **Applications** → review each online application (student, parent, address, previous
   school, documents: birth certificate, passport photo, weighing card, previous report).
2. Open an application to view/download its documents; set status (approved / declined / pending).
3. **Print / Save PDF (A4)** produces a print-perfect admission form.
4. Admitted students are added to **Students** manually (or via CSV).

![Admissions](admissions.png)

---

## 25 · Messaging Center

1. **Messaging Center** → audience (everyone / class / staff / parents / students) → message →
   channels (Email, WhatsApp, SMS) → **Send**.
2. Delivery is logged in the message history.
3. Test channels first: School & Settings → Notifications → **Send a live test notification**.

**Note:** without provider keys the channels run in "console" mode (logged, not delivered) —
nothing breaks. Receipts, OTPs and license keys use the same notify hub.

![Messaging](messaging.png)

---

## 26 · Website Content

1. **Content** → News (title, slug, excerpt, body, author, publish), Events (date, location),
   Gallery (images), Announcements (HIGH/NORMAL banners), Videos & Downloads (YouTube links,
   prospectus PDFs). Everything appears on the public website.

![Content](content.png)

---

## 27 · Users & logins

1. **Users → Add User**: name, email, password, role → Save (works on web, desktop and mobile).
2. Edit: change role, status (ACTIVE/SUSPENDED/DISABLED) or password.
3. Only the **Developer** can create Developer or Super Administrator accounts.
4. A user can only manage accounts at or below their own role level.
5. Student/parent/teacher logins can also be created from their record page (key icon).

![Users](users.png)

---

## 28 · Roles & Permissions

1. **Roles & Permissions** → click a role → tick modules and actions (create/read/update/
   delete/publish/manage) or Select/Clear all → **Save** (applies within ~30 s).
2. System roles (Developer, Super Administrator, Student, Parent, Guest) are protected from
   deletion; the Developer role is only editable by the Developer.

**Note:** admins never see the "Developer" role or the "licensing" module — developer-only.

![Roles](roles.png)

---

## 29 · School & Settings

1. **School & Theme**: name, short name, motto, story (vision/mission/history/welcome),
   **login-screen logo** (your school's own), primary + accent colours (restyle the whole
   site), contact & location, social media.
2. The **Developer / Support contact** is fixed by the vendor — shown on the license screen.
3. **Notifications**: email mode (console/resend), WhatsApp mode (off/twilio), SMS mode
   (console/hubtel/twilio) + live channel tester.
4. **System**: OTP lifetime & max attempts, JHS/SHS SBA weighting, SMS mode, AI mode.
5. **Licensing tab is developer-only** (trial days, activation fee, MoMo numbers).
6. **Change my password** — applies across web, desktop and mobile.

![Settings](settings.png)

---

## 30 · Configure your payment & messaging APIs (step by step)

Every transaction and message runs on **your school's own credentials** — the accounts you create.
The developer's keys are separate and used only for license activation; admins can never see or
use them. This chapter is the complete procedure for every provider.

**Where keys go:**
- Payments (Paystack / MTN / AirtelTigo / Telecel) → **Admin → Online Payments**.
- Messaging (email / WhatsApp / SMS) → **Admin → School & Settings → Notifications**.
- Keys are masked once saved (e.g. `sk_live••••abcd`) — masked = stored, not empty. Paste a
  fresh value only to replace your key. **Test mode is ON by default** — nothing real moves
  until you switch it off.

### Paystack (cards, bank & mobile money)
1. Create an account at **dashboard.paystack.com** → Settings → API Keys & Webhooks.
2. Copy the **Public key** (`pk_live_…`) and **Secret key** (`sk_live_…`).
3. Admin → Online Payments → enable **Paystack** → paste both keys → Save.
4. Add the webhook: Paystack → Settings → Webhooks → `https://<your-domain>/api/payments/webhook/paystack`
   — this settles payments instantly and issues receipts automatically.

### MTN Mobile Money
1. Register at **momodeveloper.mtn.com**, subscribe to the **Collection** product.
2. Copy the product's **primary subscription key** (32 characters).
3. Admin → Online Payments → enable **MTN** → Environment **Sandbox** → paste the subscription key
   → set the **business number** that receives payouts → Save. Sandbox creates the API User + API
   Key automatically on the first payment.
4. **Go live**: in the MTN portal create your production **API User** and generate its **API Key**
   (the portal does this — the live API does not allow the app to create users). Admin → Online
   Payments → MTN → Environment **Live** → paste the **API User ID** and **API Key** (both fields
   are editable) → Save → turn Test mode OFF. Without those two live values, live payments stop
   with a clear message.

### AirtelTigo Money
1. Apply for the **Airtel Africa merchant API** (openapi.mo.airtel.africa) and get your merchant
   credentials.
2. Admin → Online Payments → enable **AirtelTigo** → Sandbox/Live → paste the subscription key,
   API User/Key and business number → Save. Test mode simulates payments until your keys are in.

### Telecel Cash
1. Apply for the **Telecel (ex-Vodafone) Cash merchant API** for your business number.
2. Admin → Online Payments → enable **Telecel** → paste the subscription key, API User/Key and
   business number → Save. Same test/live flow.

### Email — Resend
1. Create an account at **resend.com** → API Keys → create a key (`re_…`).
2. **Verify your sending domain** (add the DNS records they provide) so mail reaches any inbox.
3. Admin → School & Settings → Notifications → Email mode `resend` → paste the key → set the
   **From** address (e.g. `School <mail@yourschool.com>`) → Save.
4. Confirm with “Send a live test notification”.

### WhatsApp — Twilio
1. Create an account at **twilio.com** → WhatsApp → add your WhatsApp Business sender
   (sandbox `+14155238886` for trials, or provision a business number).
2. Copy the **Account SID** and **Auth Token**.
3. Admin → School & Settings → Notifications → WhatsApp mode `twilio` → paste SID, Auth Token and
   the sender (`whatsapp:+14155238886`) → Save.
4. Trial accounts: verify each recipient number once (Twilio → Verified Caller IDs).

### SMS — SMSOnlineGH (Ghana)
1. Create an account at **smsonlinegh.com** → SMS Messaging → Sender Names → **register your sender
   ID** (max 11 chars). Messages are **rejected until the sender is registered**.
2. Copy your **API key** (API configuration).
3. Admin → School & Settings → Notifications → SMS mode `smsonlinegh` → paste the key + sender → Save.
4. Send the live test — an `ok` result means delivery is confirmed.

### SMS — Hubtel (Ghana)
1. Create a **Hubtel** merchant account → Messaging → Manage → copy the API key.
2. Admin → School & Settings → Notifications → SMS mode `hubtel` → paste the key → Save
   (sender defaults to `GESSMIS` unless you set `HUBTEL_SENDER_ID`).
3. Live test to confirm.

### SMS — Twilio
1. In Twilio, buy/claim an SMS-capable number; copy **SID** + **Auth Token**.
2. Admin → School & Settings → Notifications → SMS mode `twilio` → paste SID, Auth Token and the
   sender number → Save.
3. Trial accounts only message verified recipients.

### Test before going live
1. **Settings → Notifications → “Send a live test notification”** — per-channel verdict
   (Email / WhatsApp / SMS) with the exact failure reason if something is wrong.
2. **Online Payments with Test mode ON** — use the public **Pay Fees Online** page: the payment is
   simulated and a receipt is still issued, so you can walk the whole flow safely.

### Go live
1. Admin → Online Payments → switch **Test mode OFF** once every gateway is green in the go-live
   banner.
2. First real test: pay a small real amount (e.g. GH₵1) from your own phone; confirm the receipt
   and that the money lands in **your** business account.
3. Keep secret keys private — never share them; masked values mean they are stored.

**Ownership rule:** the credentials that ship with the software belong to the **developer** and are
used **only** when someone buys/activates the license (their own Paystack/MTN/SMSOnlineGH keys,
MoMo numbers and contact for email/WhatsApp/SMS/calls). Admins cannot see, edit or use them —
verified server-side. When someone wants to buy the software, the license screen shows the
developer's contact (email, phone, WhatsApp) so they can reach the developer directly.

**Buying the software (buyer's view):** the Activate/Pay screen shows ONLY the payment options —
Pay online with Paystack, or pay directly by mobile money to the developer's numbers — plus the
buyer's own email/phone where the license key should be delivered. No API keys or technical
details are ever shown. The moment payment is confirmed, the license key is delivered INSTANTLY
to that email/phone by SMS/WhatsApp/email.

> 📋 **New school?** Follow the **Buyer's Onboarding & Setup Checklist**
> (`docs/BUYER-ONBOARDING.md` in the release package, or ask your developer to send
> it) — the step-by-step path from purchase to a fully running school: install,
> first login, school profile, users, students, assessments, your own payment &
> messaging keys, backups and year-end.

**Locking is per-school (developer's view):** the Developer Console → Terms & Lock tab targets
ONE school by its license code (the SCHOOLID embedded in its key, e.g. `ABC` in
`GES-SMIS-ABC-365-…`). Only that school is blocked — schools that have paid keep working.
A Locked schools list shows every locked code with one-click unlock.

---

## 31 · Multiple schools

1. **Schools** → create another school (name, short name, region, theme colour).
2. Switch the **active** school — the website and admin follow it; content and fees are scoped
   per school. The main school is protected from deletion.

![Schools](schools.png)

---

## 32 · Backup & Restore

1. **Backup & Restore → Download database** — full SQLite export (everything).
2. Store it safely (Drive, USB, network share).
3. **Restore**: upload a previous backup and confirm.
4. Back up before every Year End & Rollover.

![Backup](backup.png)

---

## 33 · Audit Logs

1. **Audit Logs** — the full trail: who did what, when (CREATE/UPDATE/DELETE/LOGIN/ISSUE_KEY…).
   Use it to investigate changes or for accountability.

![Audit](audit.png)

---

## 34 · Developer console — Licensing *(developer only)*

<!-- DEV-CONSOLE:START -->
> This chapter is shown **only** to the Developer account (Shacomputec). Sign in with the
> Developer account and open **Admin → User Guide** to read the full developer console
> instructions — admins never see this chapter.
<!-- DEV-CONSOLE:END -->

---

## 35 · Hosting online (optional)

1. Copy the `web-hosting/` folder to your server (VPS, Railway, Fly).
2. `docker compose up -d` — the app runs on SQLite (volume-backed) with your `.env`.
3. Point a domain at it (Caddy handles HTTPS). Full guide: `web-hosting/HOSTING.md`
   (including a PostgreSQL switch for serverless).

---

## 36 · Troubleshooting

1. **Can't sign in?** Confirm the account is ACTIVE (Users page); reset the password from Users → edit.
2. **OTP never arrives?** Dev = console log; production = check channel keys in Settings →
   Notifications and use "Send a live test".
3. **MTN MoMo rejects payments?** Use the Collection product's primary key with the business
   phone registered under it (see Online Payments notes).
4. **Report card spills?** It can't — the A4 print page clips at one page by design; use
   "Print / Save PDF (A4)".
5. **Stale pages after an update?** Hard-refresh (Ctrl+F5); the production service worker
   self-heals on version bump.
6. **Port in use?** `npx next dev -p 3100`.
7. **Anything else:** contact your system developer — **Shacomputec** ·
   **+233 530 941 750** · **shacomputecgh@gmail.com**.

---

*GES School MIS · Built by Shacomputec — "Hard Works Never Fail" · Screenshots captured live from the system.*
