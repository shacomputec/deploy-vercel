"use client";

import { useEffect, useState } from "react";
import { Link2, Sparkles, Wrench } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/admin/page-header";
import { api } from "@/lib/client";

type DevRelease = { version: string; title: string; notes: string[]; date: string };

type Entry = {
  version: string;
  date: string;
  title: string;
  items: string[];
  link?: { href: string; label: string };
};

const ENTRIES: Entry[] = [
  {
    version: "v1.10.5",
    date: "Latest",
    title: "Term dates on report cards · printable exam timetable with term filter",
    items: [
      "REPORT CARDS now show the Term Dates (when the term runs, e.g. 2 Sept 2024 – 13 Dec 2024) next to Vacation and Reopening — on print-outs, the parent portal and the public result checker.",
      "EXAM TIMETABLE upgraded: filter the schedule by term as well as class (terms now show their academic year), and a new “Print schedule” button opens a clean A4 notice-board timetable — day blocks with date pills, class/subject/venue/invigilator columns, and the school letterhead. Perfect for pinning on the notice board or emailing to parents.",
      "Clash protection already guards every paper: a class can't write two papers at once, a venue can't be double-booked, a subject can't repeat on the same day, and invigilators can't be in two halls — now enforced in the printable schedule too.",
    ],
  },
  {
    version: "v1.10.4",
    date: "Previous",
    title: "Academic Year Manager — create years, pick the current one, start the next with one click",
    items: [
      "The Year-End & New Academic Year page now has a full Academic Years manager: see every year 2024/2025 → 2032/2033 with its terms, mark any year as the current one, or delete an empty year.",
      "CREATE YOUR OWN YEARS: type a name like 2033/2034 and the standard Ghana term dates (First Sep–Dec, Second Jan–Apr, Third May–Jul) fill in automatically — adjust any date, tick “Make this the current year now”, and it appears in every picker instantly (timetable, reports, fees, mocks, master sheet…).",
      "ONE-CLICK ROLLOVER: “Start next academic year” makes the next upcoming year current everywhere in a single click — the finished year and its data stay in the database untouched.",
      "Safe by design: a year that is current or that already holds scores/reports/payments cannot be deleted.",
    ],
  },
  {
    version: "v1.10.3",
    date: "Previous",
    title: "Academic years up to 2032/2033 · online login hardening · clash-free timetables across years",
    items: [
      "ACADEMIC YEARS TO 2032/2033: every year picker (Timetable, Reports, Mocks, Assessments, Promotion, Master Sheet and more) now offers the full range 2024/2025 → 2032/2033, each with its own First/Second/Third terms. Fresh installs get them automatically; existing schools got them on this update too.",
      "ONLINE LOGIN — every login path verified: sign in with your username OR your email address on the website, the Windows desktop app and the Android app. The mobile app now explains clearly when the built-in demo address is still set (“This is the built-in demo address… replace it with your school's server address”) so “server could not connect” never leaves you guessing.",
      "TIMETABLE FIX — a class can now keep this year's timetable AND draft next year's: the same day/period slot is unique per academic year instead of per class only, so building a new year's grid no longer collides with the old one.",
    ],
  },
  {
    version: "v1.10.2",
    date: "Previous",
    title: "Fresh installs now come ready-to-use — classes, levels and the school profile are pre-created",
    items: [
      "WHY THE APP LOOKED EMPTY: a new installation previously created only the login accounts — no classes, levels or school profile existed, so the Online Admission form's “Class applying for” was empty, offline mode had nothing cached, and the app looked nothing like the demo site. This update seeds the standard GES/NaCCA structure on first run (and on every server start, without touching existing data):",
      "• 7 levels — Crèche, Nursery, KG, Lower Primary (Basic 1–3), Upper Primary (Basic 4–6), JHS (Basic 7–9), SHS (SHS 1–3)",
      "• 17 classes — every GES class from Crèche to SHS 3, ready for admission applications and report cards",
      "• 86 subjects + 7 NaCCA SHS programmes (General Science, General Arts, Business, Visual Arts, Home Economics, Agricultural Science, Technical) with class-subject links and grading scales",
      "• A school profile (rename it from Settings → School profile — your school's name, motto, logo and colours)",
      "NO demo students, teachers or fees are added — only the structure every school needs.",
      "OFFLINE MODE FIXED: clicking “Continue offline with cached data” on a machine with nothing cached now opens Settings with a clear message and the school-server address field — instead of a blank screen with nothing to do.",
      "Already installed? The update re-runs the seeder on first start and adds the classes automatically — no need to re-create anything.",
    ],
  },
  {
    version: "v1.10.1",
    date: "Latest",
    title: "Desktop login accepts usernames · sidebar shows only what your role can access",
    items: [
      "DESKTOP LOGIN — USERNAME OR EMAIL: the Windows app's login field is now labelled “Username or Email” with a clear hint, because the first-run accounts are usernames — sign in as shacomputec (developer) or admin (super admin), no email needed. Both still work.",
      "ACCOUNTS GUARANTEED ON EVERY INSTALL: the first-run seeder no longer skips when other users already exist. On any fresh install — or a reinstall over an existing database — the developer and super-admin accounts are ensured (created if missing, untouched if the school already changed them). No more “no credentials work” after an update.",
      "ROLE-SCOPED SIDEBAR: the System section (Users, Roles & Permissions, School & Settings, Schools, Backup & Restore, Audit Logs) now appears ONLY for the Super Administrator (and developer) — plain admins, headteachers and staff no longer see settings they can't manage, matching exactly what the login page says each role can access.",
    ],
  },
  {
    version: "v1.10.0",
    date: "Latest",
    title: "Fresh installs now come with working logins — Developer & Super Admin accounts are created automatically",
    items: [
      "FIRST-RUN ACCOUNTS: a fresh Windows install previously had an empty database — no accounts existed, so NO username or password could sign in. First-time setup now creates the full role & permission matrix plus two accounts automatically: the Developer (username shacomputec, password kobina5251) and the school's Super Admin (username admin, password Admin@2026 — change it from Settings after first login). Sign-in accepts the username or the email.",
      "NO DEMO DATA: only the accounts and permission system are created — no demo students, classes or content. The school builds its own profile and records, exactly as before.",
      "Your existing install just needs the new installer — reinstalling over it keeps your database and adds the accounts the first time the server starts.",
    ],
  },
  {
    version: "v1.9.9",
    date: "Latest",
    title: "Desktop app launch FIXED — clicking Launch now opens the app",
    items: [
      "CRASH ON LAUNCH FIXED (Windows): after installing, clicking “Launch” (or the Start-menu / desktop shortcut) could show nothing at all. Root cause: the theme brushes defined in the app's resources are frozen read-only objects by Windows (a WPF behaviour), and the theme engine tried to recolor them in place — the app crashed before the window ever opened. The theme engine now replaces the brushes with fresh instances instead of mutating them, and every view re-resolves colors dynamically, so the app opens reliably and Light / Dark / Gold switching still recolors the whole window instantly.",
      "Verified on a clean machine: the app now opens a visible window (title “GES School MIS — Desktop”) with no crash, and the new installer (Setup.exe) ships the fix.",
    ],
  },
  {
    version: "v1.9.8",
    date: "Latest",
    title: "Developer can publish lesson notes to every school · Android app connects to your server",
    items: [
      "PUBLISH LESSON NOTES TO ALL SCHOOLS (developer): the Developer Console now has a 'Lesson notes' tab where you upload a GES/NaCCA lesson plan — class level, subject, topic, week, duration, objectives, resources, starter, main activity, plenary and homework. The moment you publish, every school's sample library (Teacher Tools → Lesson Notes → 'From samples') gains the note: teachers can browse it by level and subject, copy it into their own class, and download it as a PDF — alongside the 42 built-in samples.",
      "MANAGE YOUR LIBRARY: the same tab lists everything you've published (with per-note PDF download) and lets you delete any note — changes reach all schools instantly because the library is live data, not a fixed file.",
      "ANDROID APP — SERVER CONNECTION FIXED: the phone app now allows plain http:// connections, so it works with any school's server address — the local desktop server on your Wi-Fi (e.g. http://192.168.1.100:3000) or your school's web address — not just https sites. The login screen explains exactly where to find the server address and the address you type is remembered on the phone.",
    ],
  },
  {
    version: "v1.9.7",
    date: "Latest",
    title: "Sample lesson notes as downloadable PDFs — every subject, or all at once",
    items: [
      "PDF PER SAMPLE: every built-in sample lesson note (KG → SHS, all subjects) now has a 'Download PDF' button in Teacher Tools → Lesson Notes → 'From samples'. Each download is a clean A4 GES/NaCCA-format lesson plan — school name, topic band, objectives, resources, starter, main activity, plenary and homework — ready to print or share with teachers.",
      "DOWNLOAD ALL: one click on 'Download all as PDFs' gives you a single ZIP with every sample lesson note (42 PDFs, one per subject and level) — the whole library as a printable folder of files.",
      "The PDFs are generated inside the system itself (the same dependency-free engine as ID cards and receipts) — no extra software, plugin or internet connection needed.",
    ],
  },
  {
    version: "v1.9.6",
    date: "Latest",
    title: "Two new UI themes · theme switcher on the public website · polished page banners",
    items: [
      "NEW THEMES: the UI theme picker (Light · Dark · Gold) now also offers Ocean (fresh blue — matches the developer logo) and Royal (violet & bold). Pick one and the entire system — admin dashboard, login, portals and the public website — re-skins instantly.",
      "THEME SWITCHER ON THE PUBLIC WEBSITE: every visitor can now flip the whole public site's look from the top navigation (desktop and phone). The choice is remembered on their device, so the site stays in their preferred theme on the next visit.",
      "POLISHED PAGE BANNERS: every public subpage (About, Programmes, Admissions, Contact, News, Events, Gallery, History, Result Checker, Pay Fees, Calendar) now opens with the same modern banner — a dark gradient with soft brand glows and a subtle grid, themed to your school colours. Also fixed headings that rendered dark-on-dark on the old banners.",
    ],
  },
  {
    version: "v1.9.5",
    date: "",
    title: "ID cards print & download as PDF — fixed · public website polished",
    items: [
      "FIXED: printing ID cards now works properly. The print layout was hiding every card behind the printer's visibility rules (a class-name mismatch) — cards printed blank. Fixed so the browser print dialog produces full cards, one A4 page per student or staff member.",
      "NEW: one-click real PDF downloads — Admin → ID Cards → 'Download PDF' (students) and 'Download Staff PDF' produce a ready-made PDF file with the card front and back on each A4 page, including the photo, QR code and your saved design. The print-preview page also gets a 'Download PDF' button. The PDF is generated right inside the system (no extra software needed).",
      "Public website: the homepage is more lively now — a quick-access strip (Check Results · Pay Fees · Apply · Talk to Us), animated counting stats, scroll-in reveal animations, a bold 'Enrolment Open' call-to-action banner and polished programme/value cards.",
    ],
  },
  {
    version: "v1.9.4",
    date: "",
    title: "ID Card Builder — design your own identity cards",
    items: [
      "Admin → ID Cards → Card Builder: pick a template (Classic, Emerald, Royal, Sunset, Minimal), set your own header title and subtitle, choose the header and accent colours, and decide exactly which fields appear on the front (photo, name, class, admission number, year, gender) and back (NHIS/Ghana Card number, date of birth, home town, region, phone, nationality, QR code, developer footer).",
      "A live preview updates as you design — the card is shown at credit-card proportions (85.6 × 54 mm).",
      "The saved design is used by every ID card printout: student cards for a whole class and staff cards — no more fixed layout.",
    ],
  },
  {
    version: "v1.9.3",
    date: "",
    title: "Lesson notes with headteacher vetting · remedial classes · clash-free timetables",
    items: [
      "Lesson Notes now follow the full GES workflow: teachers write a structured note (topic, duration, objectives, resources, starter, main activity, plenary, homework), submit it, and the headteacher vets it — approve with a 1–5 star rating and comment, reject with feedback, or return for revision. Teachers see the verdict in-app and the headteacher gets a notification the moment a note is submitted.",
      "27 built-in sample lesson notes, subject by subject (English, Maths, Science, Social Studies, RME, Twi, ICT, Creative Arts, PE and all the SHS core + elective subjects), written in GES/NaCCA lesson-plan format. Pick one, it becomes your editable draft — then submit for vetting.",
      "New Remedial Classes screen: schedule extra lessons for weak learners in the Morning (before school lessons, e.g. 6:30–7:20) or Afternoon (after lessons, e.g. 15:30–16:30). A teacher can only be booked once per slot and clashes with the main timetable are flagged automatically.",
      "The Timetable Builder now assigns a teacher to every lesson, auto-fills the subject teacher, and blocks saving when a teacher is double-booked across classes. A 'Check clashes' report scans all classes for teacher clashes, double-subjects in a day, lessons without teachers and classes with no timetable.",
    ],
  },
  {
    version: "v1.9.2",
    date: "",
    title: "Two pricing tiers: Basic GH₵3,000 · Basic + SHS GH₵5,000",
    items: [
      "The system now sells in two tiers: Basic schools (Crèche · KG · Primary · JHS) for GH₵3,000, and Basic + SHS for GH₵5,000 — the buyer picks their tier on the checkout and the charge matches it exactly.",
      "The Developer Console sales config has separate Basic and Basic + SHS price fields (defaults 3,000 / 5,000) — change them any time, and every surface follows: the public buy page, the license checkout, and the additional-school purchase popup (which also lets the school pick its tier).",
      "Each purchase records the chosen tier, so the Developer Console sales report shows what each school bought.",
    ],
  },
  {
    version: "v1.9.1",
    date: "Latest",
    title: "Pay for several schools in one checkout + Excel import",
    items: [
      "Bulk pay: after importing a list, schools beyond your free limit can now be bought together in a single secure checkout — the popup shows all of them, totals the price (e.g. 3 schools × GH₵500 = GH₵1500), and every school gets its own ACTIVE license key the instant the payment settles.",
      "Excel import: the import tool now accepts .xlsx/.xls files directly (alongside CSV) — download the template, fill it in Excel, save, and upload. Free slots are used first; the rest are reported for purchase.",
      "The public buying page now shows a clear Multi-school pricing card: how many schools are included in the one-time fee and what each extra school costs.",
      "Same integrity as before: nothing is created before payment, the server refuses free schools beyond the limit, and each school in a batch is settled with its own key, receipt and sale record.",
    ],
  },
  {
    version: "v1.9.0",
    date: "Latest",
    title: "Multi-school deals: configurable free slots + bulk import",
    items: [
      "The number of free schools is now a setting: the Developer Console's sales config has an “Included free schools” field (default 3) — change it any time, and the Schools page, the purchase rule and the public buy page all follow instantly.",
      "Bulk import from CSV: Admin → Schools → Import CSV. Download the template, fill one row per school, paste or choose the file — free slots are used first, and any school beyond your free limit is reported for purchase instead of being silently created.",
      "The public buying page now states the multi-school deal clearly: “your purchase includes N school profiles, and every additional school after that is bought separately.”",
      "Everything else stays: the first schools are created instantly with no payment, the 4th-and-beyond flow shows the secure payment popup, and the server still refuses free creation beyond the limit (402).",
    ],
  },
  {
    version: "v1.8.9",
    date: "Latest",
    title: "Multi-school: 3 included, then pay per school",
    items: [
      "Your first 3 school profiles are now included in your purchase — create them instantly from Admin → Schools with no payment.",
      "The moment you add a 4th school (and every school after that), the secure payment popup appears: you save the school's details, pay once via Paystack or Mobile Money, and the new profile is created the instant the payment settles — with its own ACTIVE license key delivered to your email / WhatsApp / SMS.",
      "A live badge on the Schools page shows how many free slots you have left (e.g. “2 of 3 free schools left”), and the form tells you upfront whether this school is free or paid.",
      "Edits, switching and deleting schools stay free — only adding beyond your 3 included profiles is paid, and the server refuses to create one for free (payment required).",
    ],
  },
  {
    version: "v1.8.8",
    date: "Latest",
    title: "Test your gateway keys right in the Developer Console",
    items: [
      "The Developer Console now has a Test my gateway keys panel — one button per gateway (MTN MoMo, AirtelTigo, Telecel, Paystack) that validates your saved key against the provider's own API before you ever take a real payment.",
      "A green result means license purchases will work end-to-end: Mobile Money tests run the real token exchange (sandbox MTN also auto-provisions its API user, so the gateway becomes live-ready), and Paystack verifies the secret key with a balance call.",
      "A red result tells you exactly what's wrong — e.g. “rejected the request (401). Check your subscription key” — so a mis-typed or expired key is caught instantly instead of failing on a buyer's payment.",
      "Developer-only, like everything in the console: schools and admins can't see or call it.",
    ],
  },
  {
    version: "v1.8.7",
    date: "Latest",
    title: "Add another school? Pay first — then it's created",
    items: [
      "Multi-school is now purchase-driven: your first school comes with the system, and every additional school you add from Admin → Schools is bought separately — the moment you click New School, a secure payment popup appears (Paystack or Mobile Money, at the developer's price).",
      "Nothing is created before you pay: the new school profile (name, motto, colours, contacts) is created automatically only after the payment settles, with its own ACTIVE license key that's delivered to your email / WhatsApp / SMS along with a PDF receipt.",
      "The Developer Console records every additional school sale (payment status FULL), so the developer can see who bought what — and lock a school that hasn't paid, without touching the rest.",
      "Editing, switching and deleting existing schools stays free — only adding a new school is paid.",
    ],
  },
  {
    version: "v1.8.6",
    date: "Aug 2026",
    title: "Speak your language + a fully self-contained Windows installer",
    items: [
      "Read the system in YOUR language: English stays the default, and you can now switch the whole interface to Asante Twi, Fante, Ewe, Ga, Dagbani, Hausa, Dagaare or Nzema — from the login screen, the website menu or the admin header. Your choice is remembered on every device you sign in from.",
      "shacomputec AI now answers in the language you picked — the built-in assistant understands questions in English AND in the Ghanaian languages (e.g. “bisa sukuu ka” in Twi) and replies in your chosen language. It works fully offline, so no AI key or plugin is ever needed.",
      "The Windows installer is now truly self-contained: Setup.exe bundles the web server, the Node runtime and the SQLite database. After one install there is nothing else to set up — no Node, no npm, no database server, no plugins. The school's data lives safely on its own computer and the server starts automatically at Windows sign-in.",
      "Trial-first onboarding: there is no demo mode — every installation starts a free trial automatically, and the developer (and only the developer) handles licensing and activation.",
    ],
  },
  {
    version: "v1.8.5",
    date: "Aug 2026",
    title: "A Tours hub on the dashboard + adoption insights",
    items: [
      "The dashboard now has a dedicated Tours card: see your own tour status (completed / dismissed / not seen), replay it instantly, reset it so it appears again, or dismiss it without waiting — no more hunting for the button.",
      "Tour adoption analytics: see how many accounts have finished each first-run tour vs skipped it, with a completion-rate bar per tour — useful when onboarding a new batch of teachers or parents.",
      "Finished tours now count as completed (walked to the end) rather than skipped — the dashboard distinguishes 'done' from 'closed early', so adoption numbers are truthful.",
      "The User Guide's First-run tours chapter gained a real teacher-tour screenshot alongside the admin, student and parent ones.",
    ],
  },
  {
    version: "v1.8.4",
    date: "Aug 2026",
    title: "Tours you control + a richer guide",
    items: [
      "Admins can now switch the first-run tours OFF school-wide from System Settings — handy once staff already know the system. Every tour can still be replayed from its portal header or the sidebar's Start Tour any time.",
      "Tours now remember where you left off across devices: skip the tour on the desktop once and it won't reappear on the phone or the Windows app.",
      "The in-app User Guide gained a dedicated 'First-run tours' chapter with real screenshots of the admin and student tours, plus a refreshed dashboard screenshot.",
    ],
  },
  {
    version: "v1.8.3",
    date: "Aug 2026",
    title: "First-run tours for admins & teachers",
    items: [
      "The first time a Super Admin or Admin opens the dashboard while the school is still being set up, a friendly 5-step tour walks them through exactly what to do: set up the school profile, add staff & teachers, add students, connect online payments, and activate the license — each step shows whether it's already done, with a direct button to the right page.",
      "Teachers get their own short 4-step tour the first time they open the Teacher Portal: check your profile & classes, take attendance, enter marks & homework, and where to get help.",
      "Parents get a 3-step tour in the Parent Portal: their wards, results & report cards, and fees & printing. Students get a 3-step tour in the Student Portal: their results, attendance and receipts.",
      "'Replay tour' buttons on the admin dashboard and every portal (teacher, parent, student) reopen each tour any time — even after it was skipped — so new users can be shown around on demand.",
      "The tours appear once per browser and can be skipped any time — they never interrupt a school that's already up and running.",
    ],
  },
  {
    version: "v1.8.2",
    date: "Aug 2026",
    title: "Login page polish — guided role sign-in",
    items: [
      "The portal sign-in is now a guided flow: pick who you are (Super Admin → Admin → Staff → Headteacher/Teacher/Other Staff, plus Student & Parent), read exactly what that role can access, and sign in with the right credential type automatically — staff use their Staff ID, everyone else uses their email.",
      "Clicking Staff Login no longer shows a leftover access panel from a previously selected role — the panel clears until you choose which staff member you are.",
      "Developer mode stays hidden from the picker and is only reachable with the developer's own username — licensing and activation remain reserved for the Developer alone.",
    ],
  },
  {
    version: "v1.8.1",
    date: "Aug 2026",
    title: "Factory reset in the Developer Console + buyers activate by paying",
    items: [
      "DEVELOPER CONSOLE → FACTORY RESET: a new tab clears EVERYTHING the school has entered in one go and resets the license to a brand-new trial — so you can hand a new buyer a perfectly fresh install for their Super Admin / Admin to set up first-time. It shows live counts first (what will be kept vs deleted) and requires typing RESET to confirm. Your developer data is untouched: accounts & roles, school profile, curriculum, licensing records and the vendor directory all stay.",
      "ADMIN 'ACTIVATE THE LICENSE' NOW GOES TO PAYMENT, NOT THE DEVELOPER CONSOLE: the dashboard checklist step and a new License & Activation card in Settings both open a buyer-only payment page (/admin/activate) — pay online with Paystack or directly by mobile money to the developer's number, and the license key is delivered instantly to the school's contact. The developer console and its keys are never shown there.",
      "The factory reset is developer-only at every level: the API returns 403 for every other role, and a wrong confirm word is rejected with a clean message.",
    ],
  },
  {
    version: "v1.8.0",
    date: "Aug 2026",
    title: "Admissions: specific class, one-click enrollment, offer letters & instant email",
    items: [
      "The online admission form now asks for the EXACT class the child is applying for — e.g. Basic 4, SHS 1A — grouped under each level (Crèche → SHS) for easy browsing, instead of a broad level only.",
      "The chosen class is stored on the application and shown everywhere: the admin applications list, the application detail view and the printable A4 admission form. The level is derived automatically from the class, so a school's records always match.",
      "APPROVING AN APPLICATION NOW ENROLLS THE STUDENT AUTOMATICALLY: one click on 'Approve & Enroll Student' creates the student record (with a fresh admission number), pre-places them in the exact class they applied for, links the parent from the application's contact details, and notifies the office — with the enrolled admission number shown right in the application.",
      "Every approved application gets a printable ADMISSION OFFER LETTER (A4, front only): a formal letter naming the child, their admission number, the class and academic year, the reopening date, the documents to bring on reporting day and an acceptance deadline — with a 'Print / Save PDF' button right in the application view.",
      "THE OFFER LETTER IS EMAILED TO THE PARENT AUTOMATICALLY the moment you approve — a real PDF attachment, sent through the school's own email provider (Resend), with a short WhatsApp/SMS notice to the parent's phone as well. No extra clicks, nothing for the office to copy or paste.",
      "Approval is safe to click twice — it can never create a duplicate student, and the button becomes 'Approved — student enrolled ✓' once it's done.",
      "Schools that haven't created their classes yet keep the simple level-only choice until they do — nothing breaks on a fresh install.",
    ],
  },
  {
    version: "v1.7.1",
    date: "Aug 2026",
    title: "License payment hardening — no more error pages on the buy flow",
    items: [
      "Fixed: starting an online license payment — or buying the system on the public /buy page — when the developer's mobile-money gateway isn't fully live-ready no longer crashes with a server error. You now get clear guidance to arrange direct payment instead.",
      "Buyers can still pay instantly through Paystack when it's configured, and the license checkout keeps your key delivery (SMS / WhatsApp / email) exactly as before.",
    ],
  },
  {
    version: "v1.7.0",
    date: "Aug 2026",
    title: "Class summary sheets, fee-arrears reminders & printable attendance registers",
    items: [
      "Summary Sheet: the Report Cards page prints a one-A4 cover sheet per class + term — every student's position, total %, grade, points and promotion status, plus on-roll, class average, pass count and best score, with signature lines.",
      "Arrears reminders: Fees → Billing & Arrears now sends SMS + WhatsApp (+ email when available) reminders to the parents of every student with an outstanding balance — one personalised message naming the ward and the exact amount owing, via the school's own messaging keys.",
      "Attendance Register: the Attendance page prints a full-term register — one landscape A4 page per 15 school days with a mark cell per student per day, auto-filled P/L/E/A from saved attendance and present/absent totals.",
    ],
  },
  {
    version: "v1.6.0",
    date: "Latest",
    title: "Photo walls, staff ID cards, bulk fee receipts & tunable watermark",
    items: [
      "Class Photo Wall: the ID Cards page now prints every student's photo on A4 pages (12 per page, name + admission number under each) — perfect for class boards and registers.",
      "Staff ID Cards: a new Staff tab prints identity cards for every active staff member — staff ID, rank, grade, main subject and photo on the front; contact, Ghana Card / NTC and a QR code on the back.",
      "Bulk Fee Receipts: the Fees → Billing & Arrears screen now prints one official receipt per student for a class and term — every mandatory fee item, total expected, paid to date and the balance, with signature lines.",
      "Tunable watermark: School Settings → System now controls the report-card watermark — switch it on/off and set the strength (0–10%). The same faintness applies on screen, in bulk print and on parent PDF downloads.",
    ],
  },
  {
    version: "v1.5.0",
    date: "Latest",
    title: "Print everything: bulk report cards, student ID cards & parent PDF downloads",
    items: [
      "Print All (A4 PDF): the Report Cards page now prints every report card for a class + term in one go — each card on its own A4 front page, ready to sign, stamp and distribute.",
      "Student ID Cards: a new ID Cards page generates a printable identity card for every active student in a class — school header, photo, name, class, admission number, academic year on the front; NHIS / Ghana Card number, date of birth, home town, phone and a QR code to the Result Checker on the back. One A4 page per student with a cut-and-laminate guide line.",
      "Parent portal: parents can now open any published report card as a printable one-front A4 PDF straight from their portal — ownership is verified server-side so a parent can only ever print their own ward's report.",
    ],
  },
  {
    version: "v1.4.29",
    date: "Latest",
    title: "Sales cashbook + auto monthly email + reports on desktop & mobile",
    items: [
      "Cashbook: the Sales report now lists every settled license payment — date, reference, school/buyer, method and amount — in the console and on the printable A4 page, so your full transaction record is one tab away.",
      "Auto monthly email: on the first console open of a new month, the previous month's sales summary is emailed to you automatically — no need to open the console to stay on top of revenue.",
      "Desktop app: the sidebar (developer role only) gains a 📊 Sales Report button that opens the printable A4 report in your browser.",
      "Android app: Settings now shows a Developer section (developer role only) with an Open sales report button.",
    ],
  },
  {
    version: "v1.4.28",
    date: "",
    title: "Sales report: printable A4 PDF + monthly revenue goals",
    items: [
      "Sales report now opens as a branded printable A4 page (Print / Save as PDF) with the monthly table, annual tax summary and totals — ready to file or hand to an accountant.",
      "Set a monthly revenue goal in Sales configuration — the report shows a live progress bar (e.g. GHS 1,000 / GHS 2,000 · 50%) with a celebration when you hit it.",
    ],
  },
  {
    version: "v1.4.27",
    date: "Latest",
    title: "Sales report: annual summary + CSV export, and one-tap follow-up reminders",
    items: [
      "Sales report now shows an annual tax summary (revenue per year) and a Download CSV button for monthly records.",
      "Abandoned purchases: 'Send reminder' sends the follow-up directly by SMS + WhatsApp (and email when available) through the developer's own messaging keys — no copying text.",
    ],
  },
  {
    version: "v1.4.26",
    date: "Latest",
    title: "Developer Console: sales report + drafted follow-up messages",
    items: [
      "New Sales report in the Licensing tab — settled license payments by month (sales count, revenue, and a method breakdown), with total revenue at a glance. Developer-only.",
      "Abandoned-purchase rows now open WhatsApp with a pre-drafted follow-up message naming the school, their reference and amount — one tap to chase a sale.",
    ],
  },
  {
    version: "v1.4.25",
    date: "Latest",
    title: "Developer Console: mark schools as paid + abandoned-purchase follow-up",
    items: [
      "Schools tab: one-tap 'Mark as paid' — sets a buyer's payment status to FULL and unlocks that school in the same click.",
      "Schools tab: new 'Abandoned purchases' panel — buyers who started a checkout on /buy but never finished, each with WhatsApp / email / call and 'reopen checkout' buttons so the developer can close the sale.",
    ],
  },
  {
    version: "v1.4.24",
    date: "Latest",
    title: "Buy the system online — instant checkout on the /buy page",
    items: [
      "The public 'Buy this system' page now has a real online checkout — a school types its name, contact and payment method (Paystack card/mobile money or direct MoMo) and pays the license price securely. No sign-in needed.",
      "Payment runs on the developer's own gateway keys — the school's API secrets are never involved, and nothing secret is ever shown to the buyer.",
      "The instant the payment settles, the buyer's unique license key is auto-generated (named after their school), activated for 365 days and delivered by SMS, WhatsApp and email — with a PDF receipt — to the buyer's own contact.",
      "The buyer appears in the Developer Console → Schools directory (payment status UNPAID until the developer marks it) so each sale is tracked and can be locked individually.",
    ],
  },
  {
    version: "v1.4.23",
    date: "Latest",
    title: "'Buy this system' now on the login screen too — on web and Android",
    items: [
      "The public login page now carries the developer's sales card — 'Built for your school — buy the system' — with one-tap See what it offers (/buy), WhatsApp and Call buttons, plus the fixed shacomputec footer (shacomputecgh@gmail.com · +233 530 941 750).",
      "The same card was added to the Android app's login screen (v1.3.1, versionCode 5) — rebuilt and verified inside the APK bundle.",
      "The Windows desktop app's login window now shows the card too — See what it offers (/buy), WhatsApp and Call buttons plus the fixed shacomputec footer, all wired to open in the default browser.",
      "Web + desktop + Android now all surface the same sales path: login screen → /buy → WhatsApp/Call → per-school license key delivered instantly.",
    ],
  },
  {
    version: "v1.4.22",
    date: "Latest",
    title: "Public 'Buy This System' page + Pantheon deploy guide",
    items: [
      "New public page /buy — 'Buy This System' — with the full feature pitch, per-school licensing, and one-tap WhatsApp / call / email buttons to the developer (shacomputec). Linked from the site menu and footer.",
      "Your Paystack live key was verified end-to-end: balance API OK and a real GHS 1 transaction initialized successfully (reference GES-SALES-TEST-…).",
      "New Pantheon step-by-step guide (web-hosting/PANTHEON.md) — how to paste the landing page into your WordPress site and link it to the live MIS.",
    ],
  },
  {
    version: "v1.4.21",
    date: "Latest",
    title: "Buyer's checklist on every device",
    items: [
      "The buyer's onboarding checklist is now reachable from all three platforms — the Windows app's sidebar (Help → Buyer's Checklist) and the Android app's Settings (Getting started) open the same admin-gated printable page as the web dashboard link.",
    ],
  },
  {
    version: "v1.4.20",
    date: "Latest",
    title: "Buyer's onboarding checklist — right in the dashboard",
    items: [
      "The dashboard's “Get your school ready” panel now links straight to the full Buyer's Onboarding & Setup Checklist — the complete path from purchase to a running school: install on web/Windows/Android, first login, school profile, users, students, assessments, configuring your own payment & messaging keys, backups and year-end.",
      "The checklist opens as a clean, printable page (Admin-only, same gate as the User Guide — staff and outsiders get 403).",
    ],
  },
  {
    version: "v1.4.19",
    date: "Latest",
    title: "Light · Dark · Gold now on Windows and Android too",
    items: [
      "The theme switcher is no longer web-only — the Windows desktop app and the Android app both got the same three looks (Light · Dark · Gold).",
      "Windows app: Settings → Appearance has Light / Dark / Gold buttons that re-skin the whole app instantly (window, cards, inputs, tables, sidebar, buttons) and are remembered on that computer. Version bumped to v1.3.1.",
      "Android app: Settings → Appearance has the same Light / Dark / Gold picker, applied instantly across every screen and remembered on the device. Version bumped to v1.3.1 (versionCode 5).",
      "All three platforms (web, Windows, Android) keep their own theme choice — the school's web look is unchanged, and each device remembers its own preference.",
    ],
  },
  {
    version: "v1.4.18",
    date: "Latest",
    title: "Three UI themes: Light · Dark · Gold",
    items: [
      "The whole system now switches between three complete looks — Light (crisp & clean), Dark (full dark surfaces — easier on the eyes, and great for evening work) and Gold (premium warm look with gold accents and cream paper).",
      "Switch from the palette button in the header (Developer Console and the developer's admin shell) — the choice is remembered and applied instantly, across the public site, login and the admin portal, with no flash on reload.",
      "Dark mode re-skins everything — cards, tables, inputs, buttons, modals, the public site and the admin shell — using dark slate surfaces with brighter emerald accents tuned for dark backgrounds.",
      "Gold mode re-skins the accents and surfaces with amber/gold and a deep bronze ink on warm cream backgrounds — an elegant premium look.",
    ],
  },
  {
    version: "v1.4.17",
    date: "Latest",
    title: "License & Activation merged into the Developer Console — zero trace in any portal",
    items: [
      "The License & Activation dashboard is now a tab inside the Developer Console (/dev → License dashboard) — the old /admin/license page is deleted entirely, so it no longer exists anywhere in the admin tree. Typing /admin/license now returns 404 for every account, developer included.",
      "The license banner and its payment modal are gone from every portal — Super Admin, Admin and staff dashboards show no license status bar, no Pay/Activate button, and no link to any license page. License information appears in exactly one place: Developer Mode.",
      "A permanent license-visibility test (.freebuff/license-visibility-test.mjs) now guards the rule on every release: /admin/license 404s for all roles, /dev opens only for the developer, non-developers never receive payment keys from the license API, and the admin shell source contains no license banner, modal or menu item.",
      "The license API still answers every signed-in role with status + buyer-safe payment options (needed for the lock screen and payments), but never exposes Paystack or gateway secrets to anyone below the Developer role — verified by the new test.",
    ],
  },
  {
    version: "v1.4.16",
    date: "Latest",
    title: "License & Activation is now developer-only — hidden from every portal",
    items: [
      "License & Activation no longer appears anywhere in the Super Admin, Admin or staff management system — not in the menu, and not even by typing the address. It is visible ONLY inside Developer Mode (/dev), which only the developer can open.",
      "The developer's dashboard keeps everything: license status, payment history, PDF receipts (downloadable), WhatsApp / Email support buttons, key issuance, auto-generate & activate, revoke and rotate.",
      "When a payment is confirmed the receipt email now carries the PDF attached — to the buyer and the school's own channels.",
      "Login now supports usernames — admins can give any user a friendly username (e.g. headteacher) instead of an email; username OR email both work at sign-in, and usernames are editable.",
      "New Super Administrator demo account (superadmin) for testing the top-level role.",
    ],
  },
  {
    version: "v1.4.14",
    date: "Previous",
    title: "WhatsApp support button + PDF receipts + school receipt copies",
    items: [
      "The License & Activation page now has a “WhatsApp the developer” button — one tap opens a chat with your system developer (shacomputec) with a pre-written message.",
      "Every payment in your history has a PDF button — opens a clean A4 receipt (reference, amount, method, date, status) ready to print or save as PDF from the browser.",
      "Payment receipts are now also copied to the school's own email / WhatsApp channels (using the school's own messaging keys) — so the school office keeps its own record, alongside the copy sent to the buyer.",
    ],
  },
  {
    version: "v1.4.13",
    date: "Latest",
    title: "License dashboard for the school + key on WhatsApp + payment receipts",
    items: [
      "New License & Activation page in the admin portal (System → License & Activation): your status, your own license key (reveal/copy), developer support contact, renew/pay options, and your payment history with receipts — the developer's console stays separate and invisible.",
      "License keys are now delivered over WhatsApp too (with the full message), alongside email and SMS — so buyers get their key the moment payment is confirmed, on whichever channel they prefer.",
      "Every license payment now also emails + WhatsApps a clean receipt (reference, amount, method, date, purpose) separate from the key delivery — a record for the buyer's files.",
    ],
  },
  {
    version: "v1.4.12",
    date: "Latest",
    title: "Guided portal login + developer-only theme panel",
    items: [
      "The Portal Login now asks “Who are you signing in as?” — Super Admin, Admin, or Staff Login (which opens Headteacher / Teacher / Other Staff), plus Student and Parent doors. Each role shows exactly what it can access, and the sign-in form switches automatically: staff use their Staff ID, everyone else their email.",
      "Signing in always lands you in the school management system (admin portal or your role's portal) — never the public website.",
      "The UI-theme switcher is now developer-mode only: it is gone from the public site and login page, and appears only in the Developer Console and the developer's admin shell. Schools keep the default look.",
      "Clearing the system for a fresh academic year stays available to Super Admin, Admin, Headteacher and ICT Admin via Academics → Year End & Rollover — archive first (kept safely), then clear exactly the sections you choose.",
    ],
  },
  {
    version: "v1.4.11",
    date: "Latest",
    title: "License keys mint themselves on payment — instant, school-named, delivered",
    items: [
      "When a school pays for a license, the key is now auto-generated from the school's own code (e.g. GES-SMIS-ABC-365-…), the license activates instantly on payment confirmation, and the key is delivered immediately to the buyer's own email / WhatsApp / SMS.",
      "Settlement is strictly school-scoped: a payment for school X can never activate or deliver another school's key — and if a duplicate key collision ever occurs, settlement no longer crashes (it activates safely instead).",
      "Auto-minted keys are recorded in the issuance history, written to the audit log, and the school appears in the Developer Console → Schools directory automatically.",
      "The Developer Console got a proper dark vendor theme — a slate-950 stage with emerald/blue glow and a faint grid, so the licensing tools are no longer white-on-white.",
    ],
  },
  {
    version: "v1.4.10",
    date: "Latest",
    title: "Role-based sign-in — everyone lands in exactly the right portal",
    items: [
      "The Developer now signs straight into the Developer Console (/dev) — the only place licensing, keys, lock/unlock and activation live, and only the developer role can open it (the console is now sealed server-side too: anyone else is redirected).",
      "Super Admin and Admin land in the admin portal with full system settings; every office-staff role (headteacher, secretary, accountant, nurse, …) keeps its own permitted admin pages.",
      "Teachers sign into the Teacher Portal (classes, marks, staff profile); students and parents get their own portals — and the server now blocks students, parents, guests and PTA executives from typing /admin by hand, sending them back to their portal.",
      "The public Result Checker stays open to everyone — check results by OTP without an account.",
    ],
  },
  {
    version: "v1.4.9",
    date: "Latest",
    title: "Release v1.3.0 — full-system version bump + hosting kit",
    items: [
      "One release line everywhere: the Windows desktop app, the Android app and the web now all ship as v1.3.0 (Android versionCode 4) — updates stay in lockstep across all three platforms.",
      "The developer's logo (shacomputec SMS brand mark) now sits at the top-right of the login screen — a fixed brand mark, not editable by the school, and used consistently in the site header, footer and setup wizard.",
      "Hosting kit synced: the WordPress/Pantheon landing page ships pointing at https://mis.shacomputecgh.com by default (matches the Android app), and the full kit — Vercel + Neon Postgres guide, Hostinger one-shot installer, LAN guide, backups — is included in the release package.",
      "Desktop installer + Portable zip + update manifest rebuilt (v1.3.0, new SHA-256) and the Android APK rebuilt and re-verified.",
      "The shacomputec SMS logo is now the app identity everywhere: browser favicon, PWA icons, Windows app icon and the Android launcher icon (all densities + adaptive foreground on the logo's blue background).",
      "In-app update checker on Android: Settings → Updates shows your current version, checks the server for a newer release, displays the changelog and offers a one-tap APK download (the Windows app already had this in Settings → Updates).",
    ],
  },
  {
    version: "v1.4.8",
    date: "Latest",
    title: "Schools directory — lock one school from your district list",
    items: [
      "New Developer Console → Schools tab: a directory of every school you've sold to, keyed by each school's license code, with its district, region, contact and payment status (Paid in full / Partial / Unpaid).",
      "Lock or unlock ANY single school straight from the list — e.g. when a buyer fails to make full payment. Only that school's license code is blocked; every school that has paid keeps working untouched.",
      "Register a school manually, or it's added automatically the moment you issue or send a license key to it. Mark payment status with one click, and remove schools from the directory anytime (their lock/license are never touched).",
      "Locking from the directory even writes a ready-made message for unpaid schools: \"Your license payment is due — contact your system developer to unlock this school.\"",
    ],
  },
  {
    version: "v1.4.7",
    date: "Latest",
    title: "Android app v1.2.0 — matches desktop & web, connects to the hosted MIS out of the box",
    items: [
      "The Android app is now version 1.2.0 (versionCode 3) — the same release line as the Windows desktop app and the web portal.",
      "The app now connects to the hosted MIS domain (https://mis.shacomputecgh.com) by default, so a shipped APK talks to the live website out of the box — no setup needed. The login screen's server field still overrides it for LAN/testing installs.",
      "Rebuilt and verified end-to-end: the APK carries the native lock screen, and a 100-user concurrency check (100 logins · 300 reads · 50 writes) passed with zero errors — web, desktop and Android all work on one shared live database at the same time.",
    ],
  },
  {
    version: "v1.4.6",
    date: "Latest",
    title: "Desktop & Android now lock themselves too — one switch, all three apps",
    items: [
      "The Windows desktop app and Android app now show their OWN lock screen when the developer locks the school — with the lock message and the developer's contact, plus a Check-again button that re-opens the app the moment the school is unlocked.",
      "How it works: the lock was already enforced server-side on every API call (web + desktop + mobile all hit the same endpoints). The native apps now ALSO poll the same gate the web uses, so they lock instantly and recover instantly — no restart needed.",
      "If the license is blocked (trial expired / suspended), the native apps show the same locked message and contact details.",
    ],
  },
  {
    version: "v1.4.5",
    date: "Latest",
    title: "One lock blocks web + desktop + Android · exam clash fixes · suggestion box",
    items: [
      "LOCKING NOW HITS EVERY PLATFORM AT ONCE: the lock is enforced on the server, in the shared API — so when the developer locks a school, the web, the Windows desktop app and the Android app are all blocked together (their data calls return 403 with the lock message the same second). No more desktop/mobile keeping working while the website is locked.",
      "The lock screens and payment surfaces still work while locked, so the school can pay and unlock itself.",
      "Exam timetable clash detector now catches every conflict: same class double-booked, same venue double-booked, a duplicate paper for a class, and a double-booked invigilator — highlighted in red with a warning list. New clashes are rejected at the API level with a clear message, so desktop and mobile users get the same protection.",
      "New suggestion box 💡 — a floating “Suggestion” button (extra prominent during trial: “Trial — send feedback”) lets every user send feature ideas, bug reports and improvements to the developer. They land in Developer Console → Feedback where you can mark them reviewed / done / declined.",
    ],
  },
  {
    version: "v1.4.4",
    date: "Earlier",
    title: "Lock one school — not everyone · instant key delivery",
    items: [
      "Locking is now PER-SCHOOL: you target one school by its license code (the SCHOOLID embedded in its key, e.g. GES-SMIS-ABC-365-…). Only that school is blocked — schools that have paid keep working, exactly as it should be.",
      "The Developer Console → Terms & Lock tab now has a per-school lock panel with your issued school codes, a locked-schools list, and per-school unlock — the old 'lock everything' global switch is gone.",
      "After a license payment is confirmed, the school's license key (stored in the Developer Console) is delivered INSTANTLY to the buyer's own email and phone via SMS/WhatsApp — no waiting for the developer, no key shown on screen.",
      "The buyer's Activate/Pay screen now collects where to send the key (email + phone) and shows only payment options — Paystack online or direct mobile money. Zero API keys or technical details, ever.",
      "Paystack webhooks are now verified with the developer's keys for license payments (they were being checked against the school's keys, which would reject legitimate license payments).",
      "Activation records the school code on the license, so the lock gate always knows which school it is protecting.",
    ],
  },
  {
    version: "v1.4.3",
    date: "Earlier",
    title: "Activate = pay, nothing else",
    items: [
      "When the school clicks Activate, they now see ONLY two things: Pay online with Paystack, or pay directly by mobile money to the developer's numbers — nothing else.",
      "Zero API keys, zero technical details on the buyer's screen (verified: the license API returns only status + payment options; even the Paystack public key is hidden from non-developers).",
      "License payments can never be faked — license transactions are NEVER simulated, so nobody can activate for free when the developer's gateway isn't configured; they get a clear 'pay directly to the developer' message instead.",
      "Any signed-in user can initiate the license payment (it charges the developer at the fixed license price); anonymous visitors get 401.",
      "The license banner now appears for every user (trial days left / expired) with a Pay / Activate button that opens the payment panel — admins finally see it too.",
    ],
  },
  {
    version: "v1.4.2",
    date: "Earlier",
    title: "Your keys, your transactions — school-owned gateways",
    items: [
      "Big change: the developer's own payment and messaging keys are now completely separate and developer-only. They are used ONLY for license activation — never for your school's money or messages.",
      "After you buy the system, your Super Admin and Admin configure YOUR OWN keys in Admin → Online Payments (MTN, AirtelTigo, Telecel, Paystack) and Admin → Settings → Notifications (email, WhatsApp, SMS) — every fee you collect and every message you send goes through your own accounts.",
      "All channel credentials can be set in-app: Resend (email), Twilio (WhatsApp + SMS), SMSOnlineGH and Hubtel (Ghana SMS) — masked once saved, replace by pasting a new value.",
      "The developer's license-payment keys, MoMo numbers and SMS sender live only in the locked Developer Console (/dev) — admins can't see or touch them (verified: 403 + hidden).",
      "New User Guide chapter: “Configure your payment & messaging APIs (step by step)” — the complete procedure for creating and entering your own Paystack, MTN (sandbox + live), AirtelTigo, Telecel, Resend, Twilio WhatsApp, SMSOnlineGH, Hubtel and Twilio SMS keys, plus testing and going live. Also added to the downloadable manual.",
      "Buyers can always reach the developer directly — the license screen and lock screen show clickable call, email and WhatsApp links to Shacomputec (shacomputecgh@gmail.com · +233 530 941 750) for purchases and support.",
    ],
  },
  {
    version: "v1.4.1",
    date: "Earlier",
    title: "Mobile Money fixed + SMSOnlineGH SMS gateway",
    items: [
      "MTN Mobile Money (live) actually works now — three bugs fixed: API users are no longer auto-provisioned in live mode (MTN only allows that in sandbox), the live target environment is now the correct mtnmomo value, and phone numbers are sent in the international format MTN requires (0244… → 233244…).",
      "Live MoMo credentials are now editable in Admin → Online Payments — paste the API User ID + API Key from the provider portal and live payments start working; sandbox still auto-creates them.",
      "Live-mode readiness check on the Online Payments page tells you exactly what's missing before you go live.",
      "New SMSOnlineGH gateway for real Ghana SMS — OTPs, payment receipts and broadcasts now send through smsonlinegh.com with your own key and sender ID, configurable in Admin → Settings → Notifications. The developer's SMS key stays hidden from admins (masked), and schools can paste their own.",
      "SMS failures now surface the real reason (e.g. sender not registered) with clear next steps instead of a silent drop.",
    ],
  },
  {
    version: "v1.4.0",
    date: "Earlier",
    title: "Developer console sealed away + system enforcement",
    items: [
      "The Developer console is NO LONGER part of the admin portal — no Licensing item, no Developer section, for anyone. It moved to a separate, locked surface at /dev that only the developer account can reach.",
      "The developer can lock the whole system (buyer failed to pay or refused terms) — every non-developer account is blocked with a lock screen until the developer unlocks it.",
      "Publishable Terms & Conditions — when the developer releases a new version, the school must accept it before using the portal; refusal keeps the system locked.",
      "Release composer — the developer publishes software releases that appear instantly in this What's New changelog, no code deploy needed.",
      "License ACTIVATION is now developer-only, everywhere — no key field, no pay-to-activate button, nothing, in any admin or staff screen. The only place a license can be activated is the Developer Console (/dev). Blocked accounts simply see their developer's contact.",
    ],
  },
  {
    version: "v1.3.1",
    date: "Earlier",
    title: "A bolder, more polished look",
    items: [
      "Signature login screen — drifting aurora background, a glass brand panel with the school logo and motto, and quick links so visitors can check results, pay fees or apply without signing in.",
      "Dashboard “today bar” — the current date, academic year and term at a glance, plus a branded live-database strip.",
      "Exam Timetable clash detector — papers that overlap for the same class on the same day are highlighted in red with a warning banner listing the conflict.",
      "Global polish — shimmering loading skeletons, theme-tinted scrollbars, drift animations and smoother focus rings throughout.",
      "Staff Leave management — staff request leave from their portal (Annual, Sick, Maternity, Study…), HR reviews and approves or rejects it, and the whole history is kept on record.",
      "Billing & Arrears — pick a class and see every student's expected fees, what they've paid and what's owing, with a one-click Collect button; class totals included.",
      "Finance snapshot — a live strip shows total collected, expenses, net position and arrears right on the Fees page.",
    ],
  },
  {
    version: "v1.2.1",
    date: "Earlier",
    title: "Modern interface, easier setup",
    items: [
      "Switch between 3 UI themes (Light · Dark · Gold) from the palette button in the header — your choice is remembered.",
      "“Get your school ready” checklist on the dashboard shows exactly what's left before you go live (profile, staff, students, payments, license).",
      "Updated About page with a School Portal section and developer information.",
      "Rebuilt hosting kit: one-command VPS installer, free Vercel + Postgres guide, and a paste-ready WordPress landing page.",
      "First-boot auto-seed — a fresh install loads the full curriculum automatically.",
      "AI report-card comments — one click drafts a warm, personalised comment from the student's actual scores (offline demo mode included).",
      "“Who's online now” panel on the dashboard shows staff using the system right now, on which device.",
      "Edit-conflict protection — if two people edit the same student or score sheet, the second save is blocked with a clear message instead of silently overwriting.",
      "Database tuned for many simultaneous users (WAL mode + busy timeout) and verified with a 100-user stress test — all devices work together on one live database.",
      "In-app notifications — a bell in the header alerts you to new admission applications, payments and published report cards.",
      "Staff self-service — every staff member gets a portal login (Staff ID as username, Staff ID as the default password) to update their own information and photo, which appears on the public “Meet Our Staff” page.",
    ],
  },
  {
    version: "v1.2.0",
    date: "Earlier",
    title: "Reports, analysis & licensing",
    items: [
      "In-app User Guide with real screenshots and a downloadable manual.",
      "Master & Broad Sheet for every level (Crèche → SHS) with aggregates, positions and CSV/Excel export.",
      "Mock Exam Analysis — BECE (Basic 9) and WASSCE (SHS) with 5+ mocks and aggregate scoring.",
      "One-page A4 report cards with a faint watermark, level-aware grading (KG/Primary/JHS/SHS) and 50/50 Class–Exam totals.",
      "Licensing moved to the Developer only — admins never see the console, keys or activation controls.",
    ],
  },
  {
    version: "v1.1.0",
    date: "Earlier",
    title: "School-type engine & payments",
    items: [
      "Choose your school type at setup (Basic / SHS / Both) — the whole interface adapts.",
      "SHS Programmes & Courses with NaCCA curriculum and core-subject marking.",
      "Online payments: MTN MoMo, AirtelTigo, Telecel and Paystack with automatic receipts.",
      "NHIS import/export for early-years students, plus CSV/Excel import for every record type.",
      "Promotions and mass promotion for a whole class at term end.",
    ],
  },
  {
    version: "v1.0.0",
    date: "Launch",
    title: "The complete school system",
    items: [
      "Students, staff, teachers, parents and classes — full records with import/export.",
      "School-Based Assessments (SBA) with five components and weighted totals.",
      "Report cards, result-checker portal with OTP verification, certificates and attendance.",
      "Messaging Center — email, WhatsApp and SMS to parents, staff and students.",
      "Fees, expenses, payroll, library, hostel, transport, sick bay, discipline and more.",
      "Role-based access: Developer, Super Admin, Admin, Headmistress, Teacher and others.",
    ],
  },
];

export default function WhatsNewPage() {
  // Releases published by the developer (via the Developer Console → Releases)
  // are merged in on top of the built-in changelog — newest release first.
  const [devReleases, setDevReleases] = useState<DevRelease[]>([]);
  useEffect(() => {
    api<DevRelease[]>("/api/releases").then(setDevReleases).catch(() => {});
  }, []);

  const merged: (Entry & { dateLabel?: string })[] = [
    ...devReleases
      .filter((r) => !ENTRIES.some((e) => e.version === r.version))
      .map((r) => ({
        version: r.version,
        date: new Date(r.date).toLocaleDateString("en-GB"),
        title: r.title,
        items: r.notes,
      })),
    ...ENTRIES,
  ];

  return (
    <div>
      <PageHeader
        title="What's New"
        subtitle="Every update to the system, in one place — check back after each upgrade."
        action={
          <Link href="/admin/guide" className="btn-outline btn-sm">
            <Wrench className="h-4 w-4" /> User Guide
          </Link>
        }
      />
      <div className="space-y-5">
        {merged.map((e, i) => (
          <div key={e.version} className="card relative overflow-hidden p-6">
            {i === 0 && (
              <span className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-gradient-to-br from-amber-300/30 to-primary/20 blur-2xl" />
            )}
            <div className="flex flex-wrap items-center gap-3">
              <Badge tone={i === 0 ? "green" : "slate"}>{e.version}</Badge>
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">{e.date}</span>
              {i === 0 && (
                <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-amber-700">
                  <Sparkles className="h-3 w-3" /> Newest
                </span>
              )}
            </div>
            <h3 className="mt-3 text-lg font-semibold text-slate-900">{e.title}</h3>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {e.items.map((it) => (
                <li key={it} className="flex items-start gap-2 text-sm leading-relaxed text-slate-600">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  {it}
                </li>
              ))}
            </ul>
            {e.link && (
              <Link href={e.link.href} className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
                <Link2 className="h-4 w-4" /> {e.link.label}
              </Link>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
