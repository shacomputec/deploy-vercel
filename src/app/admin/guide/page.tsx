"use client";

import { useEffect, useState } from "react";
import {
  BookOpenText, Users, GraduationCap, BookOpen, Stethoscope, School as SchoolIcon,
  CalendarCheck, ClipboardCheck, FileText, TrendingUp, CalendarRange, BookMarked,
  Award as CertificateIcon, Wallet, CreditCard, Receipt, Banknote, KeyRound,
  Inbox, MessageSquare, Newspaper, UserCog, ShieldCheck, Settings, Building2,
  DatabaseBackup, ScrollText, LifeBuoy, HelpCircle, MonitorSmartphone, LayoutDashboard,
  Library, BedDouble, Bus, HeartPulse, Scale, Trophy, Package, Rocket, Wrench,
  LayoutGrid, Sparkles, AlarmClock, IdCard as IdCardIcon,
} from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { api } from "@/lib/client";

// ────────────────────────────────────────────────────────────────────────────
// The complete step-by-step manual. Every section maps to an admin page, lists
// the exact steps, and embeds a real screenshot of that page (public/guide/).
// ────────────────────────────────────────────────────────────────────────────
type Section = {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  intro: string;
  steps: string[];
  notes?: string[];
  img?: { src: string; alt: string; caption: string };
  imgs?: { src: string; alt: string; caption: string }[];
  devOnly?: boolean;
};

const SECTIONS: Section[] = [
  {
    id: "start",
    title: "1 · Getting started & accounts",
    icon: MonitorSmartphone,
    intro:
      "The system runs on three devices that share ONE database: the website (browser), the Windows desktop app, and the Android app. Log in with the same account everywhere.",
    steps: [
      "Open the system in your browser at your school address (e.g. http://localhost:3000 or your domain), the desktop app, or the mobile app.",
      "Click “Staff & Admin” on the login page (or go straight to /login).",
      "Enter your USERNAME or email — the field accepts both (e.g. the first-run accounts below sign in with their username, no @ needed) — plus your password, then click Sign In.",
      "FIRST RUN (fresh Windows install): the installer automatically creates the two first-run accounts the moment the local server starts — the Developer (username shacomputec / password kobina5251) and the school's Super Admin (username admin / password Admin@2026). No /setup step is needed on the desktop install.",
      "The Developer then creates the school's Administrator account: Admin → Users → Add User → choose role “Administrator”. The school changes its own passwords after first login (School & Settings → Change my password).",
      "Change your own password anytime: School & Settings → Change my password.",
    ],
    notes: [
      "All devices share ONE live database — the web, the Windows desktop app and the Android app work side by side at the same time. Many people can work simultaneously: teachers enter scores on their phones while the office records payments on the desktop and parents check results on the website.",
      "Roles are ranked: Developer (1000) > Super Administrator (900) > Administrator (875) > Proprietor > Headteacher > ICT Admin > Accountant > teachers > students/parents.",
      "Admins manage the whole portal and can assign roles. Only the Developer can issue license keys and create Developer/Super Administrator accounts.",
      "The sidebar is role-scoped: the System section (Users, Roles & Permissions, School & Settings, Schools, Backup & Restore, Audit Logs) appears ONLY for the Super Administrator (and the developer) — ordinary administrators, headteachers and staff see exactly the pages their role can use.",
      "The Developer console (/dev) is visible ONLY to the Developer — it is not part of the admin portal at all, and admins never see it. If the vendor locks the system (non-payment, refused terms) every non-developer account is blocked with a lock screen until the developer unlocks it.",
    ],
    img: { src: "/guide/login.png", alt: "Portal login screen", caption: "The portal login — staff & admin sign in here." },
  },
  {
    id: "dashboard",
    title: "2 · Dashboard",
    icon: LayoutDashboard,
    intro: "The dashboard is your daily home: live stats, quick actions, and a record of everything that happens in the system.",
    steps: [
      "After signing in you land on the Dashboard.",
      "Top cards show Active Students, Teachers, Support Staff, Fees Collected, Attendance Rate, Published Reports, Pending Admissions and the Male : Female split.",
      "“Recent Activity” lists the latest actions (logins, edits, payments) and who did them.",
      "The “Admin Portal” panel gives one-click shortcuts: Add Student, Enter Scores, Year End & Rollover, Report Cards, Record Payment, Messaging Center.",
      "Use the sidebar (left, dark) to reach every section — it is grouped: People, Academics, Finance, Results & Admissions, Operations, Communications, Website, System, and (developer only) Developer.",
    ],
    img: { src: "/guide/dashboard.png", alt: "Admin dashboard", caption: "The dashboard — everything at a glance." },
  },
  {
    id: "tours",
    title: "First-run tours",
    icon: Sparkles,
    intro: "New users are guided around the system the first time they sign in — a short, friendly tour shows each role exactly what it can do. Tours appear once per browser and can be replayed any time.",
    steps: [
      "Super Admin / Admin: while the school is still being set up, a 5-step tour covers school profile → staff & teachers → students → online payments → activate the license, jumping straight to each page.",
      "Teacher: the Teacher Portal shows a 4-step tour on first visit (profile & classes, attendance, marks & homework, help).",
      "Parent: the Parent Portal shows a 3-step tour (wards, results & report cards, fees & printing). Student: a 3-step tour (results, attendance, receipts).",
      "Replay any time: the dashboard checklist's “Replay tour” button, each portal's header button, or the sidebar's “Start Tour” link re-open the relevant tour on demand.",
      "Tours can always be skipped, and a dismissed tour stays dismissed across devices — the flag follows the account, not the browser.",
    ],
    imgs: [
      { src: "/guide/admin-tour.png", alt: "Admin first-run tour", caption: "The admin first-run tour — 5 steps to get the school live." },
      { src: "/guide/teacher-tour.png", alt: "Teacher first-run tour", caption: "The teacher tour — attendance, marks and homework." },
      { src: "/guide/student-tour.png", alt: "Student first-run tour", caption: "The student tour — results, attendance and receipts." },
      { src: "/guide/parent-tour.png", alt: "Parent first-run tour", caption: "The parent tour — wards, report cards and fees." },
    ],
  },
  {
    id: "students",
    title: "3 · Students",
    icon: Users,
    intro: "Every learner in the school lives here, with their class, contacts, family links and portal login.",
    steps: [
      "Go to Students (sidebar → People → Students).",
      "Click “Add Student” and fill the form: full name, gender, date of birth, class, admission number (auto-suggested), phone, religion, hometown, district, region and any required documents (birth certificate, NHIS/weighing card, passport photo from the online admission).",
      "Click Add Student — the student appears in the list with their class.",
      "Search or filter by name/admission number/class.",
      "Edit a student: click the pencil icon, change the fields, Save Changes.",
      "Export the whole list to a spreadsheet: click “Export CSV” (useful for GES returns).",
      "Create the student's portal login: click the key icon on their row → sets email + password for the Student Portal.",
      "Delete only with care — deleting a student removes their records (archive first via Year End & Rollover for anything you may need later).",
    ],
    notes: [
      "Students use their own portal (Student Portal) to view results and attendance.",
      "Parents are linked through the Parents page — one parent can be linked to several children.",
    ],
    img: { src: "/guide/students.png", alt: "Students list", caption: "Students page — add, search, export, create logins." },
  },
  {
    id: "parents",
    title: "4 · Parents",
    icon: GraduationCap,
    intro: "Parent/guardian records, linked to their children for fees, results and messaging.",
    steps: [
      "Go to Parents.",
      "Add a parent (full name, phone, relationship, email) or edit an existing one.",
      "Link a parent to their child/children so the Parent Portal and parent messaging work.",
      "Give the parent a portal login (key icon) so they can track their ward's results and fees.",
    ],
    img: { src: "/guide/parents.png", alt: "Parents page", caption: "Parents page." },
  },
  {
    id: "teachers",
    title: "5 · Teachers",
    icon: BookOpen,
    intro: "Teacher records with GES details, subject assignments and CONFIDENTIAL documents (encrypted PDFs).",
    steps: [
      "Go to Teachers → Add Teacher.",
      "Fill the confidential profile: full name, date of birth, Staff ID, sex, rank, grade type, salary grade, class, main subject, other subjects, SSF No, NTC/RED No, Ghana Card No, professional/academic qualifications, hometown/district/region, religion, marital status, emergency contact, periods per week, date of first appointment, last promotion, date posted to present station.",
      "Upload qualification documents (PDF): highest professional qualification, NTC/RED, area of specialisation, university certificate, year-completed certificate, last promotion letter — each saved ENCRYPTED.",
      "Download a document: the file is decrypted on download only for someone with permission.",
      "Create the teacher's portal login (key icon) so they can use Teacher Tools and mark attendance.",
    ],
    notes: [
      "Teacher documents are stored encrypted at rest — the server never stores them as plain files.",
      "A teacher account with role “Form Teacher” / “Subject Teacher” / “Teacher” gets limited portal access (mark attendance, enter scores, homework).",
    ],
    img: { src: "/guide/teachers.png", alt: "Teachers page", caption: "Teachers — with confidential PDF documents." },
  },
  {
    id: "staff",
    title: "6 · Staff",
    icon: Stethoscope,
    intro: "Non-teaching staff: accountant, secretary, nurse, ICT, stores, etc.",
    steps: [
      "Go to Staff → Add Staff Member.",
      "Enter staff ID, full name, department, designation, gender and salary grade.",
      "Staff appear in payroll runs automatically once a salary grade is set.",
    ],
    img: { src: "/guide/staff.png", alt: "Staff page", caption: "Support staff records." },
  },
  {
    id: "classes",
    title: "7 · Classes & Subjects",
    icon: SchoolIcon,
    intro: "Set up the school structure: levels (KG, Primary, JHS, SHS), classes and the subjects each class studies.",
    steps: [
      "Go to Classes & Subjects.",
      "Create a class: name (e.g. “Basic 7”, “SHS 1”) and level.",
      "Assign subjects to the class from the curriculum (each subject belongs to a level).",
      "Assign a class teacher (optional) — used by attendance and the portal.",
      "Change a class's name or level only when necessary — students are attached by class.",
    ],
    img: { src: "/guide/classes.png", alt: "Classes and subjects", caption: "Classes & Subjects." },
  },
  {
    id: "attendance",
    title: "8 · Attendance",
    icon: CalendarCheck,
    intro: "Mark daily attendance per class — the dashboard attendance rate is computed from these records.",
    steps: [
      "Go to Attendance.",
      "Pick the class and the date.",
      "Mark each student PRESENT / LATE / ABSENT / EXCUSED.",
      "Save — the record is stored for that class and date.",
      "The term attendance rate appears on the Dashboard.",
    ],
    img: { src: "/guide/attendance.png", alt: "Attendance page", caption: "Daily attendance marking." },
  },
  {
    id: "assessments",
    title: "9 · Assessments & the SBA sheet",
    icon: ClipboardCheck,
    intro:
      "Two entry points: the SBA Sheet (the modern way — component marks that auto-compute) and classic scores per assessment.",
    steps: [
      "Go to Assessments → “SBA Sheet”.",
      "Pick the class and term, then click Load.",
      "For each student and subject enter the five SBA components out of 100: Class Work, Project Work, Class Test, Practicals, Homework.",
      "The sheet computes each subject's SBA Total (weighted, default 20% per component → the average) and an Aggregate column (sum of the student's subject totals).",
      "Senior staff can edit the weights (e.g. Class Test 30%, Homework 10%) — the totals recompute instantly.",
      "Save when done. The SBA total (0–100) becomes the “Class Exercise (50%)” half of the report card.",
      "Import/Export: “Import CSV / Excel” loads a filled template back; “Export CSV”, “Export Excel” and “Blank Template” download the sheet for offline entry (great for teachers without internet).",
      "For classic entry: create an assessment (SBA or End-of-Term Exam, max 100) for a class+subject+term, then enter each student's score.",
    ],
    notes: [
      "Report card formula: SBA (Class Exercise) counts 50% and the End-of-Term Exam counts 50%. Both are averages out of 100.",
      "The JHS/SHS weighting split (default 50/50) is configurable in School & Settings → System → “JHS weighting: SBA %” / “SHS weighting: SBA %”.",
      "Grades: JHS (Basic 7–9) uses numeric grades 1–9; SHS uses letter grades A+ … F — already configured on each level's grading scale.",
    ],
    img: { src: "/guide/assessments.png", alt: "Assessments page", caption: "Assessments — SBA Sheet entry." },
  },
  {
    id: "reports",
    title: "10 · Report Cards",
    icon: FileText,
    intro: "Generate, preview, publish and print the official one-page A4 report card, and export the whole mark sheet.",
    steps: [
      "Go to Report Cards.",
      "Pick the class and term, then click “Generate Report Cards” — the system computes every student's subject totals, grades, total %, position and promotion status.",
      "Preview a student's card (eye icon) or open it on the dedicated print page.",
      "Publish reports when you are ready — published reports become visible in the Student/Parent Portals and the Result Checker.",
      "Print a report card: “Print / Save PDF (A4)” opens the bare A4 page — the browser's print dialog with “Save as PDF” produces a true single-page A4, front-only PDF.",
      "Export the full mark sheet: “Export Mark Sheet” → CSV or Excel — one row per student with every subject's Class %, Exam %, Total, Grade, plus overall total, grade, position and promotion.",
      "Re-generate after editing scores — the cards are recomputed from the latest marks.",
      "Open a card's Comments and click “AI comment” — the system drafts a warm, personalised remark from the student's actual scores (works offline with the built-in Kaya AI writer; connect your own AI key for smarter drafts).",
    ],
    notes: [
      "The report card fits exactly one A4 page (front only) — nothing spills to a back page.",
      "Grading follows the GES scale already set per level: Basic 7–9 → grades 1–9; SHS → A+ to F.",
      "The “remark” shown is driven by the grade table you configured (or the default GES scale).",
    ],
    img: { src: "/guide/reports.png", alt: "Report cards page", caption: "Report Cards — generate, publish, print A4." },
  },
  {
    id: "master-sheet",
    title: "11 · Master & Broad Sheet (class analysis)",
    icon: LayoutGrid,
    intro:
      "The class-based analysis of SBA + report data: the MASTER SHEET (every student × every subject with Class (SBA), Exam, Total and Grade, ranked) and the BROAD SHEET (per-subject statistics). Computed live — no need to regenerate report cards first.",
    steps: [
      "Go to Master & Broad Sheet (sidebar → Academics).",
      "Pick the class and term, then Load.",
      "Master Sheet tab: one row per student — each subject shows Class (SBA), Exam, Total and Grade; students are ranked by overall % with their promotion status.",
      "Broad Sheet tab: per-subject class average, highest, lowest, pass count/rate and the grade distribution, plus the overall class summary (class average, highest, lowest, promoted/conditional/repeat).",
      "Export CSV or Excel (one workbook with both sheets) for the headteacher's records or GES returns.",
      "Print for a paper copy.",
    ],
    notes: [
      "The sheet always reflects the current SBA component sheet + exam marks.",
      "Ranking and totals average only the subjects that have scores — subjects not yet assessed never drag a student down.",
    ],
    img: { src: "/guide/master-sheet.png", alt: "Master & Broad Sheet", caption: "Master sheet (students × subjects) with per-subject analysis." },
  },
  {
    id: "promotions",
    title: "12 · Promotion (mass promotion)",
    icon: TrendingUp,
    intro: "Promote a whole class to the next class in one action — admins, the headmistress and teachers with permission can run it.",
    steps: [
      "Go to Promotion.",
      "Choose the class, term and academic year.",
      "Choose the rule: promote everyone, or only students who passed (onlyPromoted).",
      "Run the promotion — each student is moved to the next class with a Promotion record kept for history.",
      "Review the promotion history per class.",
    ],
    img: { src: "/guide/promotions.png", alt: "Promotion page", caption: "Mass promotion for an entire class." },
  },
  {
    id: "year-end",
    title: "13 · Year End & Rollover",
    icon: CalendarRange,
    intro: "Prepare for the new academic year safely: archive everything first, then clear the old year — nothing is ever deleted without a saved archive.",
    steps: [
      "Go to Year End & Rollover.",
      "Tick the sections to archive (assessments, attendance, report cards, enrollments, fees, expenses, OTP requests) — or archive the whole system.",
      "Give the archive a title (e.g. “Academic year 2025/2026 rollover”) and click “Archive”. The rows are copied into a DataArchive row — nothing is deleted.",
      "When you are ready, use that archive to “Clear for the new year” — the live records are removed but the archive is kept and downloadable anytime.",
      "Download an archive (JSON) to keep off-site, and keep the archive list as your reference history.",
    ],
    notes: [
      "Clearing is only allowed from an existing archive, is atomic (one transaction) and each archive can be used once.",
      "Admins can clear one section (e.g. only OTP requests) without touching the rest.",
    ],
    img: { src: "/guide/year-end.png", alt: "Year end and rollover", caption: "Archive then clear for the new year." },
  },
  {
    id: "timetable",
    title: "14 · Timetable",
    icon: CalendarRange,
    intro: "Weekly class timetable grid with automatic clash detection.",
    steps: [
      "Go to Timetable.",
      "Pick the class and academic year.",
      "Fill the grid: choose a subject for each day and period — the subject's teacher is auto-filled from the class's subject assignment (Classes & Subjects), and you can change the teacher per cell.",
      "Save — the grid renders the class's weekly programme. Saving is blocked if a teacher is double-booked in two classes at the same day and period, and you'll see warnings for duplicate subjects in a day or idle gaps between lessons.",
      "Click “Check clashes” for a whole-school report: teacher clashes, duplicate subjects, lessons without a teacher, and classes with no timetable at all.",
    ],
    img: { src: "/guide/timetable.png", alt: "Timetable page", caption: "Weekly timetable grid." },
  },
  {
    id: "remedial",
    title: "15 · Remedial Classes",
    icon: AlarmClock,
    intro: "Extra lessons for weak learners — Morning (before school lessons begin) and Afternoon (after lessons end).",
    steps: [
      "Go to Remedial Classes (sidebar → Academics).",
      "Click “Add session”: pick the class, subject, session (Morning 6:30–7:20 or Afternoon 15:30–16:30), day and times.",
      "Leave the teacher on “Auto” to use the subject teacher, or pick a specific teacher.",
      "Add a focus note (e.g. “weak areas in fractions; revision before mock exams”).",
      "Saving is blocked if the teacher already runs another remedial session at that slot, and you'll be warned if the time overlaps their main timetable.",
    ],
    notes: ["Morning sessions happen before regular lessons; afternoon sessions happen after regular lessons end."],
  },
  {
    id: "exam-timetable",
    title: "16 · Exam Timetable",
    icon: CalendarRange,
    intro: "Plan the examination period: every paper with its date, time, venue and invigilator, grouped by day per class.",
    steps: [
      "Go to Exam Timetable (sidebar → Academics).",
      "Click “Schedule Exam”: pick the class, subject, date, start & end times, term (optional), venue and invigilator.",
      "Papers are grouped by day — the timetable reads like a real examination schedule.",
      "Filter by class to see one class's papers, or leave it at “All classes” for the whole school view.",
      "Teachers see the same timetable from their portal (Teacher Tools → Exam Timetable), so everyone knows the dates.",
      "Remove a paper anytime with the trash icon.",
    ],
    notes: ["Exam papers stay on the timetable until removed — use it alongside the weekly Timetable (chapter 14) which is for regular lessons."],
  },
  {
    id: "teacher-tools",
    title: "17 · Teacher Tools",
    icon: BookMarked,
    intro: "Homework and the full lesson-note workflow — write, submit, and have the headteacher vet it.",
    steps: [
      "Go to Teacher Tools — three tabs: Homework, Lesson Notes, Headteacher Vetting.",
      "Homework: class, subject, title, description, due date. Students and parents can see published homework in their portals.",
      "Lesson Notes: write a structured note — topic, week, duration, objectives, teaching & learning resources, starter (previous knowledge), main activity, plenary/assessment and homework.",
      "“From samples”: browse 42 built-in GES/NaCCA sample lesson plans subject by subject (English, Maths, Science, Social Studies, RME, Twi, ICT, Creative Arts, PE, French, Career Technology, Citizenship Education, and SHS core + electives) — click “Use” to make it your own draft, or download any sample as a ready PDF (the paper icon) and print it. “Download all as PDFs” saves the whole library as a ZIP of all PDF files. The vendor (developer) also publishes fresh sample notes from the Developer Console → Lesson notes tab, and they appear here automatically, filtered by class level and subject just like the built-in ones.",
      "When ready, “Submit for vetting” — the headteacher is notified and the note moves to the vetting queue.",
      "Headteacher Vetting: open the note, read the full plan, give a 1–5 star rating and comment, then Approve, Reject (teacher edits and resubmits — editing a rejected note resets it to draft), or Return for revision.",
      "Approved notes are locked (kept for records); the teacher sees the rating and review comment in-app.",
    ],
    img: { src: "/guide/teacher-tools.png", alt: "Teacher tools", caption: "Homework, lesson notes & vetting." },
  },
  {
    id: "certificates",
    title: "18 · Certificates",
    icon: CertificateIcon,
    intro: "Generate certificates for students and print them on A4.",
    steps: [
      "Go to Certificates.",
      "Pick a student and the term/year.",
      "Preview the certificate — it pulls the student's report data (position, total, class).",
      "Print / Save PDF — same guaranteed A4 print path as report cards.",
    ],
    img: { src: "/guide/certificates.png", alt: "Certificates page", caption: "Certificates." },
  },
  {
    id: "id-cards",
    title: "19 · ID Cards & Photo Wall",
    icon: IdCardIcon,
    intro: "Design your own identity cards and print them for a whole class or for staff.",
    steps: [
      "Go to ID Cards (sidebar → Academics) — three tabs: Students, Staff, Card Builder.",
      "Card Builder: pick a template (Classic, Emerald, Royal, Sunset, Minimal), set the header title/subtitle, choose header & accent colours, and tick which fields appear on the front (photo, name, class, admission number, year, gender) and back (NHIS/Ghana Card, DOB, home town, region, phone, nationality, QR code, developer footer).",
      "The live preview updates as you design, then click Save card design.",
      "Students tab: choose a class → Print ID Cards (one A4 page per student — card front above the cut line, back below) or Class Photo Wall (12 photos per page).",
      "Staff tab: Print Staff ID Cards — one A4 page per active staff member using the same design.",
    ],
    notes: ["Cut each card out, fold and laminate — the cards print at the standard 85.6 × 54 mm credit-card size."],
  },
  {
    id: "fees",
    title: "20 · Fees & Payments",
    icon: Wallet,
    intro: "Fee items per level, the Billing tab with per-student arrears, cash/MoMo receipting, and the full payment history.",
    steps: [
      "Go to Fees & Payments.",
      "Set up fee items: name (Tuition, PTA Levy, Exam Fee…), level, amount, mandatory — per academic year.",
      "Billing & Arrears tab: pick a class — every student appears with their Expected amount (their level's mandatory fees), Paid total, and Balance. Students in arrears are highlighted amber.",
      "Click “Collect” next to any student owing — the Record Payment form opens with that student pre-selected, ready for the amount.",
      "“Record Payment”: pick the student, amount, method (CASH / MOMO / BANK / CARD / PAYSTACK), Save — a receipt number is generated automatically (e.g. RCP-1036).",
      "The finance strip at the top shows collected, expenses, net position and arrears at a glance.",
      "The Dashboard's “Fees Collected” and the student's fee balance come from the same records.",
    ],
    img: { src: "/guide/fees.png", alt: "Fees and payments", caption: "Fee items, billing & arrears, and receipting." },
  },
  {
    id: "online-payments",
    title: "21 · Online Payments (Paystack + MTN + AirtelTigo + Telecel)",
    icon: CreditCard,
    intro:
      "Parents pay fees from the website (/pay) with cards or mobile money — receipts are issued automatically. Configure the gateways here once.",
    steps: [
      "Go to Online Payments.",
      "Add the Paystack public + secret keys (from dashboard.paystack.com).",
      "Add the MTN MoMo Collection subscription key and the business phone (the number that receives payouts).",
      "Optionally add AirtelTigo and Telecel merchant keys when you have them.",
      "Keep “Test mode” ON while trying the flow — payments confirm automatically and no real money moves.",
      "Flip test mode OFF when everything is verified. The go-live banner turns green: “Go-live ready — MTN, Paystack will collect real payments”.",
      "Tell parents: visit your website → Pay Fees Online → enter the student's admission number → amount → pay with card or MoMo. The system sends the receipt and updates the student's fee balance.",
      "For instant settlement, add your webhook in Paystack: Settings → Webhooks → https://<your-domain>/api/payments/webhook/paystack.",
    ],
    notes: [
      "MTN subscription keys are per-product and per-environment: use the Collection product's primary key, and make sure the business phone is registered under that subscription.",
      "In test mode without keys, payments are simulated and still produce receipts — perfect for trying the full flow.",
      "These keys are YOUR school's own — create your own merchant accounts. (The developer's own keys are filled by the developer's sync script and live only in the Developer Console, used solely for license payments.)",
    ],
    img: { src: "/guide/payments.png", alt: "Online payments gateways", caption: "Payment gateways + test/live switch." },
  },
  {
    id: "expenses",
    title: "22 · Expenses",
    icon: Receipt,
    intro: "Record what the school spends, by category.",
    steps: [
      "Go to Expenses.",
      "Add expense: title, amount, category (Teaching & Learning, Utilities…), date.",
      "The list shows the running total; the Dashboard subtracts expenses from collected fees.",
    ],
    img: { src: "/guide/expenses.png", alt: "Expenses page", caption: "Expenses." },
  },
  {
    id: "payroll",
    title: "23 · Payroll & HR",
    icon: Banknote,
    intro: "Salary scales, monthly runs and payslips for teachers and staff.",
    steps: [
      "Go to Payroll & HR → Salary Scales: add grades (G01…) with basic pay, allowance and tax rate.",
      "Every teacher/staff record references a salary grade (set on their record).",
      "Process a run: pick an unused month → the system computes each employee's gross, SSF, tax, deductions and net.",
      "Open the run to view payslips; mark the run PAID when disbursed.",
      "Paid runs cannot be deleted (safety guard).",
    ],
    img: { src: "/guide/payroll.png", alt: "Payroll page", caption: "Payroll runs and salary scales." },
  },
  {
    id: "leaves",
    title: "24 · Staff Leave",
    icon: CalendarRange,
    intro: "Staff request leave from their own portal; HR (payroll permission) reviews and decides. The whole history is kept.",
    steps: [
      "Go to Staff Leave (sidebar → Finance).",
      "The top cards show pending, approved and total approved days at a glance.",
      "Staff members request leave from their Staff Portal → My Leave → Request Leave (type, dates, reason).",
      "Their requests appear here as Pending — click the green check to approve or the red cross to reject (optionally with a note).",
      "You can also click “Request Leave” yourself and pick any staff member to request on their behalf.",
      "Filter by status (All / Pending / Approved / Rejected) and delete a record if it was entered by mistake.",
    ],
    notes: ["Staff see only their own requests in their portal; only people with payroll update permission (admins/HR) see and decide every request."],
  },
  {
    id: "mocks",
    title: "25 · Mock Exam Analysis (BECE / WASSCE)",
    icon: Sparkles,
    intro:
      "Prepare Basic 9 (BECE) and SHS (WASSCE) candidates with a series of at least 5 mocks per subject. The analysis predicts each student's grade on the real exam and shows the class trend across the series.",
    steps: [
      "Go to Mock Analysis (sidebar → Results & Admissions). The class list shows only Basic 9 and SHS classes.",
      "Pick the class and term → Setup tab → choose the number of mocks (min 5, up to 12) → Create / extend mocks. Mock 1…Mock N are created for every subject (core subjects — English, Maths, Integrated Science, Social Studies — come first).",
      "Enter scores tab: pick a mock number, type each student's score (0–100) per subject, Save. Repeat for mocks 2, 3, 4, 5….",
      "Analysis tab: predicted grades per student — each subject shows the student's average across all mocks, its grade (BECE 1–9 / WASSCE A+–F) and the trend (arrow = improving).",
      "The bottom table shows each subject's class average per mock, the trend across the series, pass rate and the predicted-grade distribution.",
      "Export Excel/CSV for the full student × subject × mock breakdown, or Print.",
    ],
    notes: [
      "The predicted grade is the grade the student's average across all mocks would earn on the real exam — a red grade (9 / F) means the student needs intervention before the exam.",
      "You can extend the series later (e.g. add Mock 6 after Mock 5) from the Setup tab.",
    ],
    img: { src: "/guide/mocks.png", alt: "Mock analysis", caption: "Mock series with predicted grades and class trends." },
  },
  {
    id: "results",
    title: "26 · Result Checker",
    icon: KeyRound,
    intro: "Secure public result checking: a 6-digit OTP is sent by SMS to the registered phone, valid for 5 minutes, every check is logged.",
    steps: [
      "Go to Result Checker (admin) to see the settings and access log.",
      "Configure OTP: School & Settings → System → “OTP lifetime (seconds)” (default 300) and “Max OTP attempts” (default 5).",
      "Publish a term's reports (Report Cards → Publish) so they are checkable.",
      "Students/parents visit your website → Result Checker → enter admission/index number + registered phone → receive the 6-digit OTP by SMS → enter it → view and download the report card PDF.",
    ],
    notes: [
      "In development the SMS provider is “console” — OTPs are printed to the server log. In production use Hubtel or Twilio (School & Settings → Notifications).",
    ],
    img: { src: "/guide/results.png", alt: "Result checker admin", caption: "Result Checker settings & log." },
  },
  {
    id: "admissions",
    title: "27 · Online Admissions",
    icon: Inbox,
    intro: "Applications submitted through your website's Online Admission form land here with their uploaded documents.",
    steps: [
      "Go to Applications.",
      "Review each application (student details, parent, address, previous school, documents: birth certificate, passport photo, weighing card, previous report).",
      "Open an application to view/download its documents.",
      "Set the status (approved / declined / pending).",
      "“Print / Save PDF (A4)” produces a print-perfect admission form for your files.",
      "Admitted students are added to Students manually (or batch via Students → Add Student / CSV).",
    ],
    img: { src: "/guide/admissions.png", alt: "Admissions applications", caption: "Online applications with documents." },
  },
  {
    id: "messaging",
    title: "28 · Messaging Center",
    icon: MessageSquare,
    intro: "Send one message to staff, parents, students or everyone — by email, WhatsApp and SMS at the same time.",
    steps: [
      "Go to Messaging Center.",
      "Choose the audience: everyone, a class, staff, parents or students.",
      "Type the message (keep SMS short — SMS providers have length limits).",
      "Pick the channels: Email, WhatsApp, SMS (tick the ones you want).",
      "Send — delivery is logged in the message history.",
      "Test the channels first: School & Settings → Notifications → “Send a live test notification” (needs working provider keys).",
    ],
    notes: [
      "Without provider keys, channels run in “console” mode (messages are logged, not delivered) — nothing breaks.",
      "Receipts, OTPs and license keys use the same notify hub.",
    ],
    img: { src: "/guide/messaging.png", alt: "Messaging center", caption: "Bulk email / WhatsApp / SMS." },
  },
  {
    id: "content",
    title: "29 · Website Content",
    icon: Newspaper,
    intro: "Everything the public website shows: news, events, gallery, announcements, videos and downloads.",
    steps: [
      "Go to Content.",
      "News: title, slug, excerpt, body, author → publish → appears on the homepage/news page.",
      "Events: title, date, location, description → appears on the calendar.",
      "Gallery: upload images with captions.",
      "Announcements: priority (HIGH/NORMAL) banner messages.",
      "Videos & Downloads: embed YouTube links / attach prospectus PDFs.",
    ],
    img: { src: "/guide/content.png", alt: "Website content", caption: "News, events, gallery, downloads." },
  },
  {
    id: "users",
    title: "30 · Users & logins",
    icon: UserCog,
    intro: "Create accounts for staff, teachers, parents and students, and assign their roles.",
    steps: [
      "Go to Users.",
      "“Add User”: full name, email, password, role — Save. The account can sign in on web, desktop and mobile.",
      "Edit a user: change their role, status (ACTIVE/SUSPENDED/DISABLED) or password.",
      "Only the Developer can create Developer or Super Administrator accounts.",
      "A user can only manage accounts at or below their own role level.",
      "Student/parent/teacher logins can also be created from their record page (key icon) — the email/phone then drives the portal.",
    ],
    notes: [
      "The Developer account is untouchable by anyone except the Developer itself.",
      "Role assignment is the Admin's job — teachers and students cannot change roles.",
    ],
    img: { src: "/guide/users.png", alt: "Users page", caption: "Create and manage accounts." },
  },
  {
    id: "roles",
    title: "31 · Roles & Permissions",
    icon: ShieldCheck,
    intro: "The permission matrix: exactly what each role can do in every module.",
    steps: [
      "Go to Roles & Permissions.",
      "Click a role (e.g. Administrator) to open its permission grid.",
      "Tick modules and actions (create/read/update/delete/publish/manage) or use “Select all” / “Clear all”.",
      "Save — changes apply within ~30 seconds (permission cache refreshes).",
      "System roles (Developer, Super Administrator, Student, Parent, Guest) are protected from deletion; the Developer role can only be edited by the Developer.",
    ],
    notes: [
      "Admins see no “Developer” role and no “licensing” module — those are developer-only.",
      "Licensing grants are stripped from any non-developer edit automatically.",
    ],
    img: { src: "/guide/roles.png", alt: "Roles and permissions", caption: "The permission matrix." },
  },
  {
    id: "settings",
    title: "32 · School & Settings",
    icon: Settings,
    intro: "The school's identity, theme, notification channels, system knobs and your password — all without touching code.",
    steps: [
      "School & Theme: school name, short name, motto, story (vision/mission/history/welcome), login-screen logo (your school's own), primary + accent colours (restyles the whole site), contact & location, social media.",
      "The Developer / Support contact block is FIXED by the vendor (Shacomputec) — shown on the license screen, it cannot be edited.",
      "Notifications: email mode (console/resend), WhatsApp mode (off/twilio), SMS mode (console/hubtel/twilio) + the live channel tester.",
      "System: OTP lifetime & max attempts, JHS/SHS SBA weighting (Class Exercise vs Exam), SMS mode, AI mode.",
      "The Developer console is NOT in this portal — it lives at a separate developer-only surface (/dev) where the vendor manages licensing, terms and releases.",
      "Change my password — rotate your own credentials anytime; it applies across web, desktop and mobile.",
    ],
    img: { src: "/guide/settings.png", alt: "School and settings", caption: "School profile, notifications & system knobs." },
  },
  {
    id: "configure-apis",
    title: "33 · Configure your payment & messaging APIs (step by step)",
    icon: CreditCard,
    intro:
      "Every transaction and message in the system runs on YOUR OWN credentials — the payments (Paystack, MTN, AirtelTigo, Telecel) and messaging (email, WhatsApp, SMS) accounts you create for your school. The developer's keys are separate and used only for license activation. This chapter is the complete step-by-step procedure for creating and entering every provider key.",
    steps: [
      "WHERE EVERYTHING GOES — Payment keys: Admin → Online Payments. Messaging keys (email/WhatsApp/SMS): Admin → School & Settings → Notifications. Both pages mask keys once saved (paste a new value to replace yours). Test mode is ON by default so nothing real moves until you switch it off.",
      "OWNERSHIP RULE — The credentials that came with the software (Paystack, MTN, SMSOnlineGH, MoMo numbers) belong to the DEVELOPER and are used ONLY when someone buys/activates the license. You cannot see or use them; they are not for your school's fees or messages. Everything below is your own.",
      "PAYSTACK (cards, bank & MoMo online) — ① Create an account at dashboard.paystack.com → Settings → API Keys & Webhooks. ② Copy the Public key (pk_live_…) and Secret key (sk_live_…). ③ Admin → Online Payments → enable Paystack → paste both keys → Save. ④ Add your webhook: Paystack → Settings → Webhooks → URL https://<your-domain>/api/payments/webhook/paystack — this settles payments instantly.",
      "MTN MOBILE MONEY — ① Register at momodeveloper.mtn.com and subscribe to the Collection product. ② Copy the product's PRIMARY subscription key (32 characters). ③ Admin → Online Payments → enable MTN → Environment: Sandbox first → paste the subscription key → set the business number that receives payouts → Save. Sandbox creates the API User + API Key automatically on the first payment.",
      "MTN MOBILE MONEY (GO LIVE) — ① In the MTN MoMo portal, create your production API User (portal, not the app) and generate its API Key; also request your production callback URL registration. ② Admin → Online Payments → MTN → Environment: Live → paste the API User ID and API Key (the fields are editable now) → Save. ③ Turn Test mode OFF. Without the live API User/Key, live payments stop with a clear message — that is expected.",
      "AIRTELTIGO MONEY — ① Apply for the Airtel Africa merchant API (openapi.mo.airtel.africa) and obtain your sandbox/live merchant credentials. ② Admin → Online Payments → enable AirtelTigo → choose Sandbox/Live → paste the subscription key, API User/Key and business number → Save. ③ Test mode ON simulates payments until your keys are in.",
      "TELECEL CASH — ① Apply for the Telecel (ex-Vodafone) Cash merchant API for your business number. ② Admin → Online Payments → enable Telecel → paste the subscription key, API User/Key and business number → Save. ③ Same test/live flow as the others.",
      "RESEND (EMAIL) — ① Create an account at resend.com → API Keys → create a key (re_…). ② Verify your sending domain (add the DNS records they give you) so mail reaches any inbox. ③ Admin → School & Settings → Notifications → Email mode: resend → paste the API key → set the From address (e.g. School <mail@yourschool.com>) → Save. ④ Use “Send a live test notification” to confirm delivery.",
      "TWILIO WHATSAPP — ① Create an account at twilio.com → WhatsApp → add your WhatsApp Business sender (sandbox number +14155238886 for trials, or provision a business number). ② Copy Account SID and Auth Token. ③ Admin → School & Settings → Notifications → WhatsApp mode: twilio → paste SID, Auth Token and the sender (e.g. whatsapp:+14155238886) → Save. ④ Verify each recipient number once in Twilio (Verified Caller IDs) for trial accounts.",
      "SMSONLINEGH (GHANA SMS) — ① Create an account at smsonlinegh.com → SMS Messaging → Sender Names → register your sender ID (max 11 characters, e.g. YOURSCH) — messages are REJECTED until the sender is registered. ② API configuration → copy your API key. ③ Admin → School & Settings → Notifications → SMS mode: smsonlinegh → paste the key + sender ID → Save. ④ Send the live test — a reply of “ok” means delivery is confirmed.",
      "HUBTEL (GHANA SMS) — ① Create a Hubtel merchant account → Messaging → Manage → copy the API key. ② Admin → School & Settings → Notifications → SMS mode: hubtel → paste the Hubtel key → Save (sender defaults to GESSMIS unless you set HUBTEL_SENDER_ID). ③ Live test to confirm.",
      "TWILIO SMS — ① In Twilio, buy/claim an SMS-capable number and copy SID + Auth Token. ② Admin → School & Settings → Notifications → SMS mode: twilio → paste SID, Auth Token and the sender number → Save. ③ Trial accounts only message verified recipients.",
      "TEST EVERYTHING BEFORE GOING LIVE — ① Admin → School & Settings → Notifications → “Send a live test notification”: put a phone and email, hit send — you get a per-channel verdict (Email / WhatsApp / SMS with green check or the exact failure reason). ② Admin → Online Payments with Test mode ON: go to your website → Pay Fees Online → admission number → amount → pay — the payment is simulated and a receipt is still issued.",
      "GO LIVE — ① Admin → Online Payments: switch Test mode OFF once every gateway shows green in the go-live banner. ② First REAL test: pay a small real amount (e.g. GH₵1) from your own phone and confirm the receipt + money lands in your business account. ③ Keep keys private: never share secret keys; masked values mean they are stored, not empty.",
    ],
    notes: [
      "Your keys are YOURS: the developer's Paystack/MTN/SMS keys cannot be seen, edited or used by any admin — verified server-side, not just hidden in the UI.",
      "Masked keys (e.g. sk_live••••abcd) are stored keys — leave them as-is when saving other fields; paste a fresh value only to replace them.",
      "When someone wants to BUY the software, the license screen shows the developer's contact (email, phone) with WhatsApp — that is the developer's own channel for sales and support, separate from your school's channels.",
      "Wrong environment keys are the #1 cause of failed live payments: a sandbox key with Environment = Live (or vice-versa) always fails. Match both.",
    ],
  },
  {
    id: "schools",
    title: "34 · Multiple schools",
    icon: Building2,
    intro: "Run several schools from one installation — each school's data is fully separated.",
    steps: [
      "Go to Schools — your first schools (the included free count, set by the developer) are created instantly with no payment.",
      "Create another school (name, short name, region, theme colour). Beyond your free slots, a secure payment popup appears and the new profile is created only when the payment settles — with its own license key delivered to you.",
      "Import many schools at once: Schools → Import CSV / Excel — download the template, fill one row per school, upload. Free slots are used first; the rest are reported and can be paid for together in one checkout.",
      "Switch the ACTIVE school — the website and admin follow the active school.",
      "Content (news, fees…) is scoped per school.",
      "The main school is protected from deletion.",
    ],
    img: { src: "/guide/schools.png", alt: "Schools page", caption: "Multi-school switching." },
  },
  {
    id: "backup",
    title: "35 · Backup & Restore",
    icon: DatabaseBackup,
    intro: "Your whole database in one file — download it regularly and keep it safe.",
    steps: [
      "Go to Backup & Restore.",
      "“Download database” — exports the full SQLite database (users, students, results, content, everything).",
      "Store it somewhere safe: Google Drive, a USB stick, or a network share.",
      "Restore: upload a previous backup file and confirm — the system reloads that snapshot.",
      "Automate peace of mind: schedule a backup before every Year End & Rollover.",
    ],
    img: { src: "/guide/backup.png", alt: "Backup and restore", caption: "Download / restore the database." },
  },
  {
    id: "audit",
    title: "36 · Audit Logs",
    icon: ScrollText,
    intro: "Who did what and when — the system's memory.",
    steps: [
      "Go to Audit Logs.",
      "Browse actions (CREATE/UPDATE/DELETE/LOGIN/ISSUE_KEY…), the entity, and who performed them.",
      "Use it to investigate changes or for accountability.",
    ],
    img: { src: "/guide/audit.png", alt: "Audit logs", caption: "Full activity trail." },
  },
  // NOTE: the Developer console chapter is NOT listed here — it is served
  // server-side (GET /api/guide/dev-console, developer-only) and injected only
  // for the Developer role, so its content never ships in this client bundle.
  {
    id: "hosting",
    title: "38 · Hosting online (optional)",
    icon: Rocket,
    intro: "Go live on the internet so the school is reachable anywhere — a Docker Compose stack is included.",
    steps: [
      "Copy the web-hosting/ folder to your server (VPS, Railway, Fly).",
      "docker compose up -d — the app runs on SQLite (volume-backed) with your .env.",
      "Point a domain at it (Caddy handles HTTPS automatically in the compose file).",
      "Full guide: web-hosting/HOSTING.md (including a PostgreSQL switch for serverless).",
    ],
  },
  {
    id: "troubleshooting",
    title: "39 · Troubleshooting",
    icon: Wrench,
    intro: "Quick fixes for the common issues.",
    steps: [
      "Can't sign in? Confirm the account is ACTIVE (Users page) and use the right role's portal; reset the password from Users → edit.",
      "OTP never arrives? In development the SMS provider logs to the server console; in production check the channel keys under School & Settings → Notifications and use “Send a live test”.",
      "MTN MoMo rejects payments? The subscription key is probably for the wrong product/environment — use the Collection product's primary key (see Online Payments notes).",
      "Report card spills past one page? It can't — the A4 print page clips at one page by design. Use “Print / Save PDF (A4)”.",
      "Stale pages after an update? Hard-refresh (Ctrl+F5); the production service worker caches bundles and self-heals on version bump.",
      "Port already in use when starting the server? Pass a different port: npx next dev -p 3100.",
      "Anything else: contact your system developer — Shacomputec · +233530941750 · shacomputecgh@gmail.com.",
    ],
  },
  {
    id: "whats-new",
    title: "40 · What's New",
    icon: Sparkles,
    intro: "The changelog — every update to the system in one place.",
    steps: [
      "Go to What's New (sidebar → Help → What's New).",
      "Each version's card lists what changed — the newest is marked “Newest”.",
      "After an upgrade, the dashboard shows a dismissible “What's new in this update” banner linking here; dismiss it and it stays hidden on that browser.",
      "Check this page after every update to learn about new features.",
    ],
    img: { src: "/guide/whats-new.png", alt: "What's New page", caption: "The changelog — see what changed in each version." },
  },
];

// The guide is for administrators and the Developer. Levels: Developer 1000,
// Super Administrator 900, Administrator 875, Proprietor 850, Headteacher 800.
const GUIDE_MIN_LEVEL = 800;

// Icons are React components and cannot cross the wire — map fetched chapter ids
// back to their icon client-side.
const DEV_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  developer: KeyRound,
};

export default function GuidePage() {
  const [role, setRole] = useState<string | null>(null);
  const [roleLevel, setRoleLevel] = useState<number | null>(null);
  // The Developer-console chapter is fetched from a developer-only server route
  // (GET /api/guide/dev-console) so its content never ships in this bundle.
  const [devSection, setDevSection] = useState<Section | null>(null);

  useEffect(() => {
    api<{ role: string; roleLevel: number }>("/api/auth/me")
      .then((me) => {
        setRole(me.role);
        setRoleLevel(me.roleLevel);
      })
      .catch(() => {
        // Fail closed — if the role cannot be confirmed, show the gate panel.
        setRole("");
        setRoleLevel(0);
      });
  }, []);

  const isDev = role === "developer";
  useEffect(() => {
    if (!isDev) return;
    api<Omit<Section, "icon">>("/api/guide/dev-console")
      .then((s) =>
        setDevSection({ ...s, icon: DEV_ICONS[s.id] ?? BookOpenText, devOnly: true })
      )
      .catch(() => {});
  }, [isDev]);

  // Only administrators and the Developer may read the guide.
  if (role !== null && roleLevel !== null && roleLevel < GUIDE_MIN_LEVEL) {
    return (
      <div>
        <PageHeader title="User Guide" subtitle="Step-by-step manual for administrators" />
        <div className="card mx-auto max-w-xl p-10 text-center">
          <ShieldCheck className="mx-auto h-10 w-10 text-slate-300" />
          <h2 className="mt-4 text-lg font-bold text-ink">Guide for administrators</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">
            The User Guide explains the school administration sections. It is available to
            administrators and the Developer (Shacomputec). Ask your administrator if you
            need help using the system.
          </p>
        </div>
      </div>
    );
  }

  // Wait for the role check before showing content — nothing flashes to the
  // wrong audience while the account is being confirmed.
  if (role === null || roleLevel === null) {
    return (
      <div className="card p-10 text-center text-sm text-slate-400">Loading guide…</div>
    );
  }

  // The Developer-console chapter is injected before "Hosting online" (chapter 33).
  const sections = devSection
    ? [...SECTIONS.slice(0, 31), devSection, ...SECTIONS.slice(31)]
    : SECTIONS;
  return (
    <div>
      <PageHeader
        title="User Guide — Step-by-Step Manual"
        subtitle="Every section of the system, explained with exact steps. Open a chapter from the list."
        action={
          <a href="/api/guide/manual" download="USER-GUIDE.md" className="btn-outline btn-sm" title="Download the manual (Markdown — opens in any text editor). The developer console chapter is included only for the Developer account.">
            <BookOpenText className="h-4 w-4" /> Download manual
          </a>
        }
      />

      {/* Help card */}
      <div className="mb-8 flex items-start gap-3 rounded-2xl border border-sky-200 bg-sky-50 px-5 py-4">
        <LifeBuoy className="mt-0.5 h-5 w-5 shrink-0 text-sky-600" />
        <div className="text-sm text-sky-900">
          <p className="font-bold">Need a human?</p>
          <p className="mt-0.5 text-sky-800">
            Your system developer is <strong>Shacomputec</strong> — call{" "}
            <a href="tel:+233530941750" className="font-semibold underline">+233 530 941 750</a> or email{" "}
            <a href="mailto:shacomputecgh@gmail.com" className="font-semibold underline">shacomputecgh@gmail.com</a>. The developer
            contact is fixed and shown on the license screen.
          </p>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
        {/* Table of contents */}
        <aside className="no-print top-20 hidden h-fit rounded-2xl border border-slate-200 bg-white p-4 lg:sticky lg:block">
          <p className="px-1 pb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">Chapters</p>
          <nav className="space-y-0.5">
            {sections.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-[13px] font-medium transition hover:bg-slate-50 hover:text-primary ${s.devOnly ? "text-violet-600" : "text-slate-600"}`}
              >
                <s.icon className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{s.title.replace(/^\d+ · /, "")}</span>
                {s.devOnly && <span className="ml-auto rounded bg-violet-100 px-1.5 py-0.5 text-[9px] font-bold text-violet-700">DEV</span>}
              </a>
            ))}
          </nav>
        </aside>

        {/* Content */}
        <div className="min-w-0 space-y-8">
          {sections.map((s) => (
            <section key={s.id} id={s.id} className="card scroll-mt-24 p-6 sm:p-8">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
                  <s.icon className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <h2 className="text-lg font-bold text-ink">{s.title}</h2>
                  {s.devOnly && (
                    <p className="text-[11px] font-bold uppercase tracking-wider text-violet-600">Developer only — not visible to admins</p>
                  )}
                </div>
              </div>

              <p className="mt-4 text-sm leading-relaxed text-slate-600">{s.intro}</p>

              <ol className="mt-5 space-y-2.5">
                {s.steps.map((step, i) => (
                  <li key={i} className="flex gap-3 text-sm leading-relaxed text-slate-700">
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-500">
                      {i + 1}
                    </span>
                    <span className="min-w-0">{step}</span>
                  </li>
                ))}
              </ol>

              {s.notes && s.notes.length > 0 && (
                <div className="mt-5 space-y-2">
                  {s.notes.map((n, i) => (
                    <p key={i} className="flex items-start gap-2 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800 ring-1 ring-amber-100">
                      <HelpCircle className="mt-0.5 h-4 w-4 shrink-0" /> <span>{n}</span>
                    </p>
                  ))}
                </div>
              )}

              {s.img && (
                <figure className="mt-6">
                  <img
                    src={s.img.src}
                    alt={s.img.alt}
                    loading="lazy"
                    className="w-full rounded-xl border border-slate-200 shadow-sm"
                  />
                  <figcaption className="mt-2 text-xs text-slate-400">{s.img.caption}</figcaption>
                </figure>
              )}
              {s.imgs?.map((im, i) => (
                <figure key={i} className="mt-6">
                  <img
                    src={im.src}
                    alt={im.alt}
                    loading="lazy"
                    className="w-full rounded-xl border border-slate-200 shadow-sm"
                  />
                  <figcaption className="mt-2 text-xs text-slate-400">{im.caption}</figcaption>
                </figure>
              ))}
            </section>
          ))}

          <p className="pb-4 text-center text-xs text-slate-400">
            GES School MIS · Built by Shacomputec — {new Date().getFullYear()} · Screenshots captured live from the system.
          </p>
        </div>
      </div>
    </div>
  );
}
