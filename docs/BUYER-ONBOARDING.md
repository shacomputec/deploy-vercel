# 🏫 GES School MIS — Buyer's Onboarding & Setup Checklist

> For schools that have **purchased** GES School MIS from the developer
> (**shacomputec** · +233 530 941 750 · shacomputecgh@gmail.com). This is the
> step-by-step path from "I just bought the system" to "the whole school is
> running on it". The system runs on **one shared database** across the
> **website (online)**, the **Windows desktop app** and the **Android app** —
> everyone works on the same live data at the same time.

---

## 0 · What happens at purchase (what you should already have)

| Item | Where it comes from |
|---|---|
| **License activation** | After purchase you activate from the admin portal: the dashboard's **"Activate the license"** checklist step — or **School & Settings → License & Activation → Pay / Activate** — opens the **payment page** (Paystack online, or direct mobile money to the developer's numbers). The moment payment is confirmed your **license key** is delivered **instantly** to your email / WhatsApp / SMS, and the developer **activates your school**. Only the developer can activate — you never see keys or payment tools, and the developer console is never shown in the admin portal. |
| **Installers** | The developer sends you the links: the **Windows installer** (`GES-School-MIS-Setup.exe`), the **Android APK** (`GES-School-MIS-1.3.1.apk`), and your **school website link**. |
| **Your accounts** | The developer creates your **Super Administrator / Administrator** accounts (or gives you the first-run `/setup` wizard). Staff/teacher/student accounts are created by you from the admin portal. |

**If your payment is incomplete** the developer locks **only your school** — every
other school keeps working. You'll see a lock screen with the developer's contact
until payment is completed.

---

## 1 · Install & open the system (2 minutes)

1. **Website:** open your school link in any browser (Chrome recommended).
2. **Windows:** run `GES-School-MIS-Setup.exe` → Next → Finish. It installs as a
   normal desktop app and connects to the same online server.
3. **Android:** install `GES-School-MIS-1.3.1.apk` (allow "install unknown apps");
   it connects to the same server out of the box. The server field in
   Settings → Server address can point to your LAN server instead if you host it
   yourself (see `web-hosting/LAN.md`).

> All three connect to the **same database** — a score saved on the phone appears
> on the desktop and website instantly.

## 2 · First login (who signs in as whom)

1. Open **/login** — the Portal Login asks **"Who are you signing in as?"**:
   - **Super Admin / Admin** → the school management system (full access)
   - **Staff Login** → Headteacher / Teacher / Other Staff (Staff ID + password)
   - **Student / Parent** → their own portals
2. Sign in with the credentials the developer or admin gave you. You can also sign
   in with a **username** (e.g. `headteacher`) instead of an email — admins assign
   usernames in Admin → Users.

> The login is for the **management system**. The public website (news, admissions,
> result checker, pay fees online) needs no login.

## 2.5 · Activate the license (2 minutes — if your trial is still running)

1. Open the dashboard — the **"Activate the license"** step in the **Get your
   school ready** checklist (or **School & Settings → License & Activation →
   Pay / Activate**).
2. Choose **Pay online with Paystack** or **direct mobile money** to the
   developer's number, and enter where the key should be delivered.
3. The moment payment is confirmed the **trial countdown disappears** and your
   license key arrives by SMS / WhatsApp / email. This screen only handles
   payment — no API keys or technical details are ever shown.

## 3 · Set up your school profile (10 minutes)

1. **Admin → School & Settings → School & Theme**: school name, short name, motto,
   story, **your school logo** (used on login and the site), primary + accent
   colours (restyles the whole site), contact, location, social media.
2. Choose your **school type** (Basic / SHS / Both) — the whole interface adapts
   (Crèche→JHS for basic; SHS programmes & NaCCA courses for senior high).
3. **Admin → School & Settings → System**: set the academic year, terms, OTP
   lifetime, SBA weighting (50/50 Class–Exam by default).
4. **Appearance:** pick **Light · Dark · Gold** from the palette button in the
   header — each device remembers its own choice.

## 4 · Create users & staff (15 minutes)

1. **Admin → Users → Add User**: name, email, username (optional), password, role.
   You can change any username/password anytime.
2. **Admin → Teachers / Staff**: add teachers (with their confidential profile and
   qualification PDFs — stored encrypted) and support staff.
3. Give every teacher/staff member a **portal login** (key icon on their record) —
   they sign in with their **Staff ID** and update their own information and photo
   on the public "Meet Our Staff" page.
4. **Admin → Roles & Permissions**: fine-tune what each role can see and do.

## 5 · Enrol students & set up academics (20 minutes)

1. **Admin → Students**: add students (birth certificate, NHIS for KG→Basic 9,
   Ghana Card for SHS, passport photo) or **import CSV** — export the template,
   fill it in Excel/CSV, import it back.
2. **Admin → Classes & Subjects**: create classes and assign subjects from the
   GES/NaCCA curriculum (already loaded — no data entry needed).
3. **Admin → Assessments → SBA Sheet**: enter the five SBA components (Class Work,
   Project Work, Class Test, Practicals, Homework) — the sheet computes the SBA
   total, aggregate and the 50% Class Exercise.
4. **Admin → Report Cards**: generate, preview, **publish** — then parents and
   students see results; the public **Result Checker** works by OTP (admission
   number + registered phone).
5. **Master & Broad Sheet** gives the class-wide analysis; **Mock Analysis**
   (Basic 9 / SHS) tracks BECE/WASSCE mocks with predicted grades.

## 6 · Configure YOUR OWN payment & messaging keys (30 minutes — do once)

Your school's money and messages run on **your own accounts**, never the
developer's. The developer's keys are used only for license activation and are
never visible to you.

| Purpose | Where | What you need |
|---|---|---|
| Online fee payments | **Admin → Online Payments** | Paystack (public+secret key), MTN MoMo (Collection subscription key + business number), AirtelTigo, Telecel merchant keys |
| Email (receipts, OTPs) | **School & Settings → Notifications** | Resend API key + verified sending domain |
| WhatsApp | **School & Settings → Notifications** | Twilio WhatsApp SID, token, sender |
| SMS (Ghana) | **School & Settings → Notifications** | SMSOnlineGH key + registered sender ID, or Hubtel key |

**Step-by-step procedures for every provider** are in the in-app **User Guide →
Chapter 30 — Configure your payment & messaging APIs**. Start with **Test mode
ON** (payments simulate, receipts still print), then flip to live after a real
GH₵1 test from your own phone.

## 7 · Day-to-day operations

- **Fees & Payments** — fee items per year, record payments (cash/MoMo/bank/card),
  automatic receipts; parents can also **pay online** from the public site.
- **Messaging Center** — email / WhatsApp / SMS to classes, staff, parents, students.
- **Attendance, Timetable, Exam Timetable, Teacher Tools, Certificates** — as in the
  User Guide (Admin → User Guide covers every section).
- **Payroll & HR, Expenses, Library, Hostel, Transport, Sick Bay, Discipline,
  Clubs, Inventory** — all included.

## 8 · Backups & the new academic year

1. **Admin → Backup & Restore → Download database** — keep a copy off-site.
2. At year end: **Admin → Year End & Rollover** — mass-promote the classes →
   **archive** the academic sections (kept safely, downloadable) → **clear** for
   the new year → create the new year/term in School & Settings.
3. Only **your admins** can clear the system; the **Developer mode** stays sealed
   to the developer.

## 9 · Support

- In-app: the **What's New** page, the **User Guide** (with screenshots and the
  downloadable manual), and the **suggestion box** (send feature ideas or bug
  reports straight to the developer).
- Direct: **shacomputec** · **+233 530 941 750** · **shacomputecgh@gmail.com**.

---

*GES School MIS · Built by Shacomputec — "Hard Works Never Fail".*
