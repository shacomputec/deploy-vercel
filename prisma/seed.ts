/* eslint-disable no-console */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// Deterministic pseudo-random generator so demo scores are realistic but stable
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(20240817);
const between = (min: number, max: number) => Math.round(min + rand() * (max - min));

const BCRYPT_ROUNDS = Number(process.env.BCRYPT_ROUNDS || 10);
const hash = (pw: string) => bcrypt.hashSync(pw, BCRYPT_ROUNDS);

// No credentials are committed to the repository. The Developer account is
// created by the /setup wizard (or from SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD
// env vars for unattended installs). Demo portal accounts get random passwords
// generated at seed time and printed once — nothing is hardcoded.
const randomPassword = (tag: string) => `${tag}${Math.random().toString(36).slice(2, 8)}${Math.floor(100 + Math.random() * 900)}`;
const demoPasswords = { teacher: randomPassword("Teach"), parent: randomPassword("Parent"), student: randomPassword("Stud") };
const seedAdminEmail = process.env.SEED_ADMIN_EMAIL?.trim() ?? "";
const seedAdminPassword = process.env.SEED_ADMIN_PASSWORD ?? "";
// Friendly sign-in name for the Developer account (defaults to the brand).
// Sign-in accepts username OR email — e.g. username "shacomputec".
const seedDevUsername = process.env.SEED_DEV_USERNAME?.trim() || "shacomputec";

// Live gateway + developer contact — read from env (never committed).
// Set these in .env to pre-fill Admin → Online Payments and the license
// expiry screen after a fresh seed; leave empty to configure from the UI.
const seedPaystackPublicKey = process.env.SEED_PAYSTACK_PUBLIC_KEY ?? "";
const seedPaystackSecretKey = process.env.SEED_PAYSTACK_SECRET_KEY ?? "";
const seedMomoBusinessPhone = process.env.SEED_MOMO_BUSINESS_PHONE ?? "";
const seedLicensePrice = process.env.SEED_LICENSE_PRICE ?? "500";
const seedLicenseMomoPhones = process.env.SEED_LICENSE_MOMO_PHONES ?? seedMomoBusinessPhone;
// Fixed developer / support contact — the system developer's identity is locked
// (not editable from the admin panel). Env overrides exist for fresh installs.
const seedDevName = process.env.SEED_DEV_NAME ?? "shacomputec";
const seedDevPhone = process.env.SEED_DEV_PHONE ?? "+233530941750";
const seedDevEmail = process.env.SEED_DEV_EMAIL ?? "shacomputecgh@gmail.com";

// ────────────────────────────────────────────────────────────────────────────
// RBAC definition
// ────────────────────────────────────────────────────────────────────────────
const ALL_MODULES = [
  "dashboard", "students", "parents", "teachers", "staff", "classes", "subjects",
  "attendance", "assessments", "reports", "promotions", "fees", "expenses",
  "results", "admissions", "content", "users", "roles", "settings", "audit",
  "school", "homework", "lessons", "messaging", "ai", "timetable", "library",
  "hostel", "transport", "clinic", "discipline", "clubs", "backup", "licensing",
  "payroll", "inventory", "yearEnd", "remedial",
] as const;
const ACTIONS = ["create", "read", "update", "delete", "publish", "manage"] as const;

type GrantMap = Record<string, Record<string, string[] | "*">>;

// role -> module -> actions ("*" = all)
// NOTE: `licensing` is strictly developer-only — issuing/revoking/rotating keys
// is the software vendor's job (the routes also enforce role.name === "developer").
const ALL_MODULES_MINUS_LICENSING = ALL_MODULES.filter((m) => m !== "licensing");
const GRANTS: GrantMap = {
  developer: Object.fromEntries(ALL_MODULES.map((m) => [m, "*"])),
  super_admin: Object.fromEntries(ALL_MODULES_MINUS_LICENSING.map((m) => [m, "*"])),
  admin: {
    dashboard: "*", students: "*", parents: "*", teachers: "*", staff: "*",
    classes: "*", subjects: "*", attendance: "*", assessments: "*", reports: "*",
    promotions: "*", fees: "*", expenses: "*", results: "*", admissions: "*",
    content: "*", school: "*", settings: "*", homework: "*", lessons: "*",
    messaging: "*", ai: "*", payroll: "*", inventory: "*", timetable: "*",
    library: "*", hostel: "*", transport: "*", clinic: "*", discipline: "*",
    clubs: "*", backup: "*", remedial: "*",
    yearEnd: "*", // admin may archive & clear for the new academic year
    // Admins manage day-to-day staff/user accounts (never developer/super-admin).
    // They may also create/assign roles and permissions — but never touch
    // developer/super-admin/system roles or licensing (the API enforces that).
    users: ["read", "create", "update"], roles: ["read", "update", "delete"], audit: ["read"],
  },
  proprietor: {
    dashboard: "*", students: "*", parents: "*", teachers: "*", staff: "*",
    classes: "*", subjects: "*", attendance: "*", assessments: "*", reports: "*",
    promotions: "*", fees: "*", expenses: "*", results: "*", admissions: "*",
    content: "*", school: "*", settings: "*", homework: "*", lessons: "*",
    messaging: "*", ai: "*", payroll: "*", inventory: "*", remedial: "*",
    users: ["read"], roles: ["read"], audit: ["read"],
  },
  headteacher: {
    dashboard: "*", students: "*", parents: "*", teachers: "*", staff: "*",
    classes: "*", subjects: "*", attendance: "*", assessments: "*", reports: "*",
    promotions: "*", fees: ["read", "update"], expenses: ["read", "create"],
    results: "*", admissions: "*", content: "*", homework: "*", lessons: "*",
    messaging: "*", ai: "*", payroll: ["read"], inventory: ["read", "create", "update"],
    remedial: "*", yearEnd: "*", // headteacher may archive & clear for the new academic year
    users: ["read"], roles: ["read"], audit: ["read"],
  },
  assistant_headteacher: {
    dashboard: "*", students: "*", parents: "*", teachers: "*", staff: "*",
    classes: "*", subjects: "*", attendance: "*", assessments: "*", reports: "*",
    promotions: "*", fees: ["read"], expenses: ["read"], results: "*",
    admissions: "*", homework: "*", lessons: "*", remedial: "*",
    messaging: "*", payroll: ["read"],
  },
  accountant: {
    dashboard: "*", students: ["read"], parents: ["read"], fees: "*",
    expenses: "*", payroll: "*", reports: ["read"], results: ["read"], audit: ["read"],
  },
  secretary: {
    dashboard: "*", students: ["read", "create"], parents: ["read", "create"],
    admissions: "*", content: "*", messaging: "*", school: ["read", "update"],
  },
  admissions_officer: {
    dashboard: "*", admissions: "*", students: ["create", "read", "update"],
    parents: ["create", "read", "update"], classes: ["read"], subjects: ["read"],
  },
  examination_officer: {
    dashboard: "*", assessments: "*", reports: "*", results: "*",
    students: ["read"], classes: ["read"], subjects: ["read"], promotions: "*",
  },
  form_teacher: {
    dashboard: "*", students: ["read"], attendance: ["create", "read", "update"],
    assessments: ["read"], reports: ["read"], homework: "*", messaging: ["create"],
    remedial: ["read", "create", "update"],
    promotions: ["create", "read"], // form teachers run year-end mass promotion
  },
  subject_teacher: {
    dashboard: "*", students: ["read"], assessments: ["create", "read", "update"],
    reports: ["read"], homework: "*", lessons: "*", remedial: ["read", "create", "update"],
    messaging: ["create"],
  },
  teacher: {
    dashboard: "*", students: ["read"], attendance: ["create", "read"],
    assessments: ["create", "read"], homework: "*", lessons: "*",
    remedial: ["read", "create", "update"],
    promotions: ["create", "read"], // teachers may mass-promote a whole class
  },
  librarian: { dashboard: "*", students: ["read"], content: ["read"], library: "*" },
  store_keeper: { dashboard: "*", expenses: ["read"], inventory: "*" },
  house_master: {
    dashboard: "*", students: ["read"], attendance: ["read"], reports: ["read"],
    hostel: "*", discipline: ["read", "update"],
  },
  nurse: { dashboard: "*", students: ["read"], clinic: "*" },
  guidance_counsellor: {
    dashboard: "*", students: ["read"], reports: ["read"], discipline: ["read", "update"],
  },
  ict_admin: {
    dashboard: "*", students: "*", parents: "*", teachers: "*", staff: "*",
    classes: "*", subjects: "*", attendance: "*", assessments: "*", reports: "*",
    fees: ["read"], expenses: ["read"], results: ["read"], admissions: "*",
    content: "*", school: "*", settings: "*", ai: "*", users: ["read"],
    yearEnd: "*",
    roles: ["read"], audit: "*", homework: "*", lessons: "*", messaging: "*",
    timetable: "*", remedial: "*", library: "*", hostel: "*", transport: "*", clinic: "*",
    discipline: "*", clubs: "*", inventory: "*",
  },
  pta_executive: { dashboard: "*", fees: ["read"], reports: ["read"] },
  student: { dashboard: "*", results: ["read"] },
  parent: { dashboard: "*", results: ["read"], fees: ["read"] },
  guest: { dashboard: ["read"] },
};

const ROLES: { name: string; displayName: string; level: number }[] = [
  { name: "developer", displayName: "Developer", level: 1000 },
  { name: "super_admin", displayName: "Super Administrator", level: 900 },
  { name: "admin", displayName: "Administrator", level: 875 },
  { name: "proprietor", displayName: "Proprietor", level: 850 },
  { name: "headteacher", displayName: "Headteacher / Headmaster", level: 800 },
  { name: "assistant_headteacher", displayName: "Assistant Headteacher", level: 750 },
  { name: "ict_admin", displayName: "ICT Administrator", level: 700 },
  { name: "accountant", displayName: "Accountant", level: 650 },
  { name: "secretary", displayName: "Secretary", level: 600 },
  { name: "admissions_officer", displayName: "Admissions Officer", level: 580 },
  { name: "examination_officer", displayName: "Examination Officer", level: 560 },
  { name: "form_teacher", displayName: "Form Teacher", level: 540 },
  { name: "subject_teacher", displayName: "Subject Teacher", level: 520 },
  { name: "teacher", displayName: "Teacher", level: 500 },
  { name: "librarian", displayName: "Librarian", level: 480 },
  { name: "store_keeper", displayName: "Store Keeper", level: 460 },
  { name: "house_master", displayName: "House Master / Mistress", level: 440 },
  { name: "nurse", displayName: "Nurse", level: 420 },
  { name: "guidance_counsellor", displayName: "Guidance & Counselling Officer", level: 400 },
  { name: "pta_executive", displayName: "PTA Executive", level: 300 },
  { name: "student", displayName: "Student", level: 200 },
  { name: "parent", displayName: "Parent", level: 180 },
  { name: "guest", displayName: "Guest", level: 100 },
];

// ────────────────────────────────────────────────────────────────────────────
// GES curriculum data
// ────────────────────────────────────────────────────────────────────────────
const LEVELS = [
  { code: "CRECHE", name: "Crèche", sortOrder: 1, curriculumKey: "SBC", assessment: "EE" },
  { code: "NURSERY", name: "Nursery", sortOrder: 2, curriculumKey: "SBC", assessment: "EE" },
  { code: "KG", name: "Kindergarten (KG 1–2)", sortOrder: 3, curriculumKey: "SBC", assessment: "EE" },
  { code: "LOWER", name: "Lower Primary (Basic 1–3)", sortOrder: 4, curriculumKey: "SBC", assessment: "EE" },
  { code: "UPPER", name: "Upper Primary (Basic 4–6)", sortOrder: 5, curriculumKey: "SBC", assessment: "EE" },
  { code: "JHS", name: "Junior High School (Basic 7–9)", sortOrder: 6, curriculumKey: "CCP", assessment: "BECE" },
  { code: "SHS", name: "Senior High School (SHS 1–3)", sortOrder: 7, curriculumKey: "SHS", assessment: "WASSCE" },
];

const CLASSES: { name: string; levelCode: string }[] = [
  { name: "Creche", levelCode: "CRECHE" },
  { name: "Nursery 1", levelCode: "NURSERY" },
  { name: "Nursery 2", levelCode: "NURSERY" },
  { name: "KG 1", levelCode: "KG" },
  { name: "KG 2", levelCode: "KG" },
  { name: "Basic 1", levelCode: "LOWER" },
  { name: "Basic 2", levelCode: "LOWER" },
  { name: "Basic 3", levelCode: "LOWER" },
  { name: "Basic 4", levelCode: "UPPER" },
  { name: "Basic 5", levelCode: "UPPER" },
  { name: "Basic 6", levelCode: "UPPER" },
  { name: "Basic 7", levelCode: "JHS" },
  { name: "Basic 8", levelCode: "JHS" },
  { name: "Basic 9", levelCode: "JHS" },
  { name: "SHS 1", levelCode: "SHS" },
  { name: "SHS 2", levelCode: "SHS" },
  { name: "SHS 3", levelCode: "SHS" },
];

const SUBJECTS: Record<string, string[]> = {
  // Crèche & Nursery run the same early-years curriculum as KG.
  CRECHE: [
    "Language & Literacy", "Numeracy", "Our World Our People",
    "Creative Arts", "Physical Development & Movement Activities",
  ],
  NURSERY: [
    "Language & Literacy", "Numeracy", "Our World Our People",
    "Creative Arts", "Physical Development & Movement Activities",
  ],
  KG: [
    "Language & Literacy", "Numeracy", "Our World Our People",
    "Creative Arts", "Physical Development & Movement Activities",
  ],
  LOWER: [
    "English Language", "Ghanaian Language", "Mathematics", "Science", "History",
    "Our World Our People", "Religious & Moral Education", "Creative Arts",
    "Physical Education", "Computing", "French",
  ],
  UPPER: [
    "English Language", "Ghanaian Language", "Mathematics", "Science", "History",
    "Religious & Moral Education", "Creative Arts", "Physical Education",
    "Computing", "French",
  ],
  JHS: [
    "English Language", "Mathematics", "Integrated Science", "Social Studies",
    "Religious & Moral Education", "Computing (ICT)", "Career Technology",
    "Creative Arts & Design", "Ghanaian Language", "French",
    "Physical & Health Education",
  ],
  SHS: [
    // Core
    "English Language", "Core Mathematics", "Integrated Science", "Social Studies",
    // Science electives
    "Biology", "Chemistry", "Physics", "Elective Mathematics", "Additional Mathematics",
    // Business
    "Financial Accounting", "Cost Accounting", "Business Management", "Economics",
    // Humanities
    "Government", "Geography", "History", "Literature in English",
    // General
    "Computing", "General Agriculture", "Agricultural Science",
    // Vocational / technical
    "Food & Nutrition", "Textiles", "Fashion & Designing", "Engineering",
    "Robotics", "Electronics", "Tourism", "Hospitality",
    // Languages
    "French", "Spanish", "Arabic", "Akan (Ghanaian Language)", "Ewe (Ghanaian Language)",
    // Creative arts
    "Visual Arts", "General Knowledge in Art", "Music", "Drama & Theatre", "Dance",
    "Physical Education (Elective)",
  ],
};

// Grading scales (percent boundaries) — configurable in admin
const GRADING = {
  EE: [
    { min: 80, max: 100, grade: "EE", remark: "Excellent" },
    { min: 65, max: 79, grade: "ME", remark: "Very Good" },
    { min: 50, max: 64, grade: "AE", remark: "Average" },
    { min: 0, max: 49, grade: "NS", remark: "Needs Support" },
  ],
  BECE: [
    { min: 90, max: 100, grade: "1", remark: "Highest", points: 1 },
    { min: 80, max: 89, grade: "2", remark: "Higher", points: 2 },
    { min: 70, max: 79, grade: "3", remark: "High", points: 3 },
    { min: 60, max: 69, grade: "4", remark: "High Average", points: 4 },
    { min: 55, max: 59, grade: "5", remark: "Average", points: 5 },
    { min: 50, max: 54, grade: "6", remark: "Low Average", points: 6 },
    { min: 40, max: 49, grade: "7", remark: "Low", points: 7 },
    { min: 35, max: 39, grade: "8", remark: "Lower", points: 8 },
    { min: 0, max: 34, grade: "9", remark: "Low", points: 9 },
  ],
  WASSCE: [
    { min: 90, max: 100, grade: "A+", remark: "Highest", points: 1 },
    { min: 80, max: 89, grade: "A", remark: "Higher", points: 2 },
    { min: 70, max: 79, grade: "B+", remark: "High", points: 3 },
    { min: 60, max: 69, grade: "B", remark: "High Average", points: 4 },
    { min: 55, max: 59, grade: "C+", remark: "Average", points: 5 },
    { min: 50, max: 54, grade: "C", remark: "Low Average", points: 6 },
    { min: 40, max: 49, grade: "D+", remark: "Low", points: 7 },
    { min: 35, max: 39, grade: "E", remark: "Lower", points: 8 },
    { min: 0, max: 34, grade: "F", remark: "Low", points: 9 },
  ],
};

// ────────────────────────────────────────────────────────────────────────────
async function main() {
  console.log("🌱 Seeding GES School MIS…");

  // ---- clean slate ----------------------------------------------------------
  const tables = [
    "payrollEntry", "payrollRun", "salaryScale",
    "clubMember", "club", "disciplineCase", "clinicVisit", "transportRider",
    "transportRoute", "hostelAllocation", "hostelRoom", "libraryLoan", "libraryBook",
    "messageLog", "license", "rolePermission", "permission", "auditLog",
    "otpRequest", "resultAccessLog",
    "feePayment", "feeItem", "expense", "assessmentRecord", "assessment",
    "attendanceRecord", "reportCard", "promotion", "enrollment", "timetableEntry",
    "homework", "lessonNote", "classSubject", "programmeSubject", "programme",
    "subject", "studentParent", "parent",
    "admissionApplication", "contactMessage", "newsItem", "eventItem",
    "announcement", "galleryImage", "videoItem", "downloadFile", "gradingScale",
    "paymentGatewayTx", "stockMovement", "inventoryItem", "supplier",
    "class", "term", "academicYear", "level", "teacher", "staff", "user", "role",
    "school", "setting", "student",
  ] as const;
  for (const t of tables) {
    // @ts-expect-error dynamic table name
    await prisma[t].deleteMany({});
  }
  console.log("  ✓ cleared existing data");

  // ---- RBAC -----------------------------------------------------------------
  const roles: Record<string, string> = {};
  for (const r of ROLES) {
    const created = await prisma.role.create({ data: r });
    roles[r.name] = created.id;
  }

  const permissionIds: Record<string, string> = {};
  for (const m of ALL_MODULES) {
    for (const a of ACTIONS) {
      const p = await prisma.permission.create({
        data: { module: m, action: a, label: `${m}:${a}` },
      });
      permissionIds[`${m}:${a}`] = p.id;
    }
  }

  let granted = 0;
  for (const [roleName, modules] of Object.entries(GRANTS)) {
    const roleId = roles[roleName];
    if (!roleId) continue;
    for (const [module, actions] of Object.entries(modules)) {
      const actionList = actions === "*" ? ACTIONS : actions;
      for (const a of actionList) {
        const pid = permissionIds[`${module}:${a}`];
        if (pid) {
          await prisma.rolePermission.create({
            data: { roleId, permissionId: pid },
          });
          granted++;
        }
      }
    }
  }

  // Default: every staff role (level >= 400) can at least READ every module
  // (never the developer-only `licensing` module).
  const staffRoles = ROLES.filter((r) => r.level >= 400).map((r) => r.name);
  for (const roleName of staffRoles) {
    const roleId = roles[roleName];
    if (!roleId) continue;
    const existing = await prisma.rolePermission.findMany({
      where: { roleId, permission: { action: "read" } },
      select: { permission: { select: { module: true } } },
    });
    const has = new Set(existing.map((e) => e.permission.module));
    for (const m of ALL_MODULES_MINUS_LICENSING) {
      if (has.has(m)) continue;
      const pid = permissionIds[`${m}:read`];
      if (pid) {
        await prisma.rolePermission.create({ data: { roleId, permissionId: pid } });
        granted++;
      }
    }
  }
  console.log(`  ✓ ${ROLES.length} roles, ${granted} role-permission grants`);

  // ---- bootstrap developer account -------------------------------------------
  // No hardcoded credentials: the first Developer account is created via the
  // /setup wizard, or here when SEED_ADMIN_EMAIL + SEED_ADMIN_PASSWORD are set.
  if (seedAdminEmail && seedAdminPassword) {
    if (seedAdminPassword.length < 8) throw new Error("SEED_ADMIN_PASSWORD must be at least 8 characters");
    await prisma.user.create({
      data: {
        email: seedAdminEmail.toLowerCase(),
        username: seedDevUsername,
        passwordHash: hash(seedAdminPassword),
        fullName: process.env.SEED_ADMIN_NAME?.trim() || "System Developer",
        roleId: roles.developer,
        status: "ACTIVE",
      },
    });
    console.log("  ✓ developer account created from SEED_ADMIN_* env vars");
  } else {
    console.log("  ℹ no SEED_ADMIN_EMAIL/PASSWORD set — create the Developer account via /setup");
  }

  // ---- demo portal users (random passwords, printed once) --------------------
  const teacherUser = await prisma.user.create({
    data: {
      email: "teacher@demo.school",
      passwordHash: hash(demoPasswords.teacher),
      fullName: "Mr. Kwame Asante",
      roleId: roles.teacher,
      status: "ACTIVE",
    },
  });
  const parentUser = await prisma.user.create({
    data: {
      email: "parent@demo.school",
      passwordHash: hash(demoPasswords.parent),
      fullName: "Efua Owusu",
      roleId: roles.parent,
      status: "ACTIVE",
    },
  });
  const studentUser = await prisma.user.create({
    data: {
      email: "student@demo.school",
      passwordHash: hash(demoPasswords.student),
      fullName: "Ama Serwaa",
      roleId: roles.student,
      status: "ACTIVE",
    },
  });
  console.log("  ✓ demo portal users created (random passwords, printed below)");

  // ---- school ---------------------------------------------------------------
  await prisma.school.create({
    data: {
      id: "main",
      name: "Shacomputec International School",
      shortName: "SIS",
      motto: "Knowledge • Integrity • Excellence",
      vision:
        "To be a centre of academic excellence that produces confident, disciplined and globally competitive citizens rooted in Ghanaian values.",
      mission:
        "To provide quality, child-centred education aligned with the Ghana Education Service curriculum, nurturing every learner's God-given potential.",
      history:
        "Founded in 2010, Shacomputec International School has grown from a small crèche of 12 children into a full basic and senior high school serving over 800 learners in the Ashanti Region. We are fully registered with the Ghana Education Service and accredited by NaCCA.",
      welcomeMessage:
        "Welcome to our school! Here, every child matters. We blend academic rigour with strong moral and cultural values, preparing our learners for BECE, WASSCE and life beyond the classroom.",
      // School-editable logo: drives the login screen + report cards. Defaults
      // to the brand login-screen mark; the developer's fixed brand (navbar/
      // sidebar/footer icons) never changes.
      logo: "/login-screen.jpg",
      primaryColor: "#047857",
      accentColor: "#d97706",
      phone: "+233 24 000 0000",
      email: "info@shacomputec.school",
      address: "P. O. Box 1234, Kumasi",
      district: "Kumasi Metropolitan",
      region: "Ashanti Region, Ghana",
      locationName: "Bantama, Kumasi",
      mapLat: "6.6921",
      mapLng: "-1.6236",
      facebook: "https://facebook.com",
      twitter: "https://twitter.com",
      instagram: "https://instagram.com",
      whatsapp: "+233 24 000 0000",
      youtube: "https://youtube.com",
      developerName: seedDevName,
      developerPhone: seedDevPhone,
      developerEmail: seedDevEmail, // filled in by the school owner via Admin → School profile
    },
  });
  console.log("  ✓ school profile");

  // ---- levels, classes, subjects, grading -----------------------------------
  const levelIds: Record<string, string> = {};
  for (const l of LEVELS) {
    const created = await prisma.level.create({ data: l });
    levelIds[l.code] = created.id;
    // grading scales
    const scale = GRADING[l.assessment as keyof typeof GRADING];
    for (const g of scale) {
      await prisma.gradingScale.create({
        data: { ...g, levelId: created.id },
      });
    }
  }

  const classIds: Record<string, string> = {};
  for (const c of CLASSES) {
    const created = await prisma.class.create({
      data: { name: c.name, levelId: levelIds[c.levelCode] },
    });
    classIds[c.name] = created.id;
  }

  const subjectIds: Record<string, Record<string, string>> = {};
  for (const [levelCode, names] of Object.entries(SUBJECTS)) {
    subjectIds[levelCode] = {};
    for (const name of names) {
      const s = await prisma.subject.create({
        data: { name, levelId: levelIds[levelCode] },
      });
      subjectIds[levelCode][name] = s.id;
    }
  }

  // Class-subject links. SHS classes follow the GES NaCCA curriculum with the
  // four core subjects (English Language, Core Mathematics, Integrated Science,
  // Social Studies) plus the electives of the program the class runs:
  // SHS 1 → General Science · SHS 2 → General Arts · SHS 3 → Business.
  const linkClassSubjects = async (className: string, subjectNames: string[]) => {
    const levelCode = CLASSES.find((c) => c.name === className)?.levelCode!;
    for (const name of subjectNames) {
      const subjectId = subjectIds[levelCode]?.[name];
      if (subjectId) {
        await prisma.classSubject.create({
          data: { classId: classIds[className], subjectId },
        });
      }
    }
  };
  const SHS_CORE = SUBJECTS.SHS.slice(0, 4); // English, Core Maths, Int. Science, Social Studies
  // Every class gets its level's subjects so the master/broad sheets, mark
  // sheets and report cards work for ALL levels — Crèche → SHS. SHS classes
  // are handled below by their GES programme (4 core + programme electives),
  // so they are skipped here to avoid linking all 39 SHS subjects.
  const levelSubjectsOf = (levelCode: string) => SUBJECTS[levelCode as keyof typeof SUBJECTS] ?? [];
  for (const c of CLASSES) {
    if (c.levelCode === "SHS") continue;
    await linkClassSubjects(c.name, levelSubjectsOf(c.levelCode));
  }

  // GES SHS programmes (NaCCA) — each with the 4 core subjects + programme
  // electives. Classes attach to a programme; the programme's subjects become
  // the class curriculum (see /admin/programmes to manage these).
  const SHS_PROGRAMMES: { name: string; code: string; subjects: string[]; className?: string }[] = [
    { name: "General Science", code: "SCI", subjects: [...SHS_CORE, "Biology", "Chemistry", "Physics", "Elective Mathematics", "Additional Mathematics"], className: "SHS 1" },
    { name: "General Arts", code: "ART", subjects: [...SHS_CORE, "Government", "Geography", "History", "Literature in English", "Economics", "French"], className: "SHS 2" },
    { name: "Business", code: "BUS", subjects: [...SHS_CORE, "Financial Accounting", "Cost Accounting", "Business Management", "Economics", "Elective Mathematics"], className: "SHS 3" },
    { name: "Visual Arts", code: "VA", subjects: [...SHS_CORE, "Visual Arts", "General Knowledge in Art", "Textiles", "Fashion & Designing", "French"] },
    { name: "Home Economics", code: "HE", subjects: [...SHS_CORE, "Food & Nutrition", "Textiles", "Fashion & Designing", "Economics"] },
    { name: "Agricultural Science", code: "AGR", subjects: [...SHS_CORE, "General Agriculture", "Agricultural Science", "Biology", "Chemistry", "Elective Mathematics"] },
    { name: "Technical", code: "TEC", subjects: [...SHS_CORE, "Engineering", "Robotics", "Electronics", "Computing", "Additional Mathematics"] },
  ];
  const programmeIds: Record<string, string> = {};
  for (const prog of SHS_PROGRAMMES) {
    const created = await prisma.programme.create({
      data: {
        name: prog.name,
        code: prog.code,
        levelId: levelIds.SHS,
        subjects: {
          create: prog.subjects
            .map((name) => ({ subjectId: subjectIds.SHS[name], isCore: SHS_CORE.includes(name) }))
            .filter((x) => x.subjectId),
        },
      },
    });
    programmeIds[prog.name] = created.id;
    if (prog.className) {
      await prisma.class.update({
        where: { id: classIds[prog.className] },
        data: { programmeId: created.id },
      });
      await linkClassSubjects(prog.className, prog.subjects);
    }
  }
  console.log("  ✓ levels, classes, subjects, grading scales & SHS programmes");

  // ---- academic year & terms -------------------------------------------------
  const year = await prisma.academicYear.create({
    data: {
      name: "2024/2025",
      startDate: new Date("2024-09-02"),
      endDate: new Date("2025-07-25"),
      isCurrent: true,
    },
  });
  const term1 = await prisma.term.create({
    data: {
      name: "First Term",
      academicYearId: year.id,
      startDate: new Date("2024-09-02"),
      endDate: new Date("2024-12-13"),
      vacationDate: new Date("2024-12-13"),
      reopeningDate: new Date("2025-01-06"),
      isCurrent: true,
    },
  });
  await prisma.term.create({
    data: {
      name: "Second Term",
      academicYearId: year.id,
      startDate: new Date("2025-01-06"),
      endDate: new Date("2025-04-11"),
      vacationDate: new Date("2025-04-11"),
      reopeningDate: new Date("2025-05-05"),
      isCurrent: false,
    },
  });
  await prisma.term.create({
    data: {
      name: "Third Term",
      academicYearId: year.id,
      startDate: new Date("2025-05-05"),
      endDate: new Date("2025-07-25"),
      vacationDate: new Date("2025-07-25"),
      reopeningDate: new Date("2025-09-01"),
      isCurrent: false,
    },
  });
  console.log("  ✓ academic year 2024/2025 + terms");

  // Later academic years — the year pickers offer the full range through
  // 2032/2033 so schools can set up ahead of the current session.
  for (let y = 2025; y <= 2032; y++) {
    const name = `${y}/${y + 1}`;
    if (await prisma.academicYear.findUnique({ where: { name } })) continue;
    const ay = await prisma.academicYear.create({
      data: {
        name,
        startDate: new Date(Date.UTC(y, 8, 1)),
        endDate: new Date(Date.UTC(y + 1, 6, 25)),
        isCurrent: false,
      },
    });
    const termDefs = [
      { name: "First Term", start: new Date(Date.UTC(y, 8, 1)), end: new Date(Date.UTC(y, 11, 13)) },
      { name: "Second Term", start: new Date(Date.UTC(y + 1, 0, 6)), end: new Date(Date.UTC(y + 1, 3, 11)) },
      { name: "Third Term", start: new Date(Date.UTC(y + 1, 4, 5)), end: new Date(Date.UTC(y + 1, 6, 25)) },
    ];
    for (const t of termDefs) {
      await prisma.term.create({
        data: {
          name: t.name,
          academicYearId: ay.id,
          startDate: t.start,
          endDate: t.end,
          vacationDate: t.end,
          reopeningDate: t.start,
        },
      });
    }
  }
  console.log("  ✓ academic years 2025/2026 – 2032/2033 + terms");

  // ---- teachers & staff -------------------------------------------------------
  const teachers: Record<string, string> = {};
  const teacherRows: any[] = [
    { staffId: "T-0001", fullName: "Mr. Kwame Asante", gender: "MALE", mainSubject: "Mathematics", salaryGrade: "G01", highestProfQual: "B.Ed (Mathematics)", ssfNumber: "SSF-8842-011", ntcReg: "NTC-2201", teachingPeriodsPerWeek: 24 },
    { staffId: "T-0002", fullName: "Mrs. Akosua Frimpong", gender: "FEMALE", mainSubject: "English Language", salaryGrade: "G02", highestProfQual: "M.Ed (English)", ssfNumber: "SSF-7721-044", ntcReg: "NTC-1187", teachingPeriodsPerWeek: 22 },
    { staffId: "T-0003", fullName: "Mr. Yaw Boateng", gender: "MALE", mainSubject: "Integrated Science", salaryGrade: "G03", highestProfQual: "B.Sc + PGDE", ssfNumber: "SSF-9910-033", ntcReg: "NTC-3302", teachingPeriodsPerWeek: 25 },
    { staffId: "T-0004", fullName: "Ms. Abena Osei", gender: "FEMALE", mainSubject: "Creative Arts", salaryGrade: "G04", highestProfQual: "B.A (Art Education)", ntcReg: "NTC-4456", teachingPeriodsPerWeek: 20 },
    { staffId: "T-0005", fullName: "Mr. Kofi Owusu", gender: "MALE", mainSubject: "Computing", salaryGrade: "G05", highestProfQual: "B.Sc (Computer Science)", ntcReg: "NTC-5577", teachingPeriodsPerWeek: 18 },
    { staffId: "T-0006", fullName: "Mrs. Efua Mensah", gender: "FEMALE", mainSubject: "Financial Accounting", salaryGrade: "G06", highestProfQual: "ACCA + PGDE", ntcReg: "NTC-6612", teachingPeriodsPerWeek: 20 },
  ];
  for (const t of teacherRows) {
    const teacher = await prisma.teacher.create({
      data: {
        ...t,
        email: t.staffId === "T-0001" ? "teacher@demo.school" : `${t.staffId.toLowerCase()}@demo.school`,
        phone: `024${between(1000000, 9999999)}`,
        status: "ACTIVE",
        userId: t.staffId === "T-0001" ? teacherUser.id : undefined,
      },
    });
    teachers[t.staffId] = teacher.id;
  }

  const staffRows = [
    { staffId: "S-001", fullName: "Mr. Daniel Antwi", department: "Accounts", designation: "Accountant", gender: "MALE", salaryGrade: "G07" },
    { staffId: "S-002", fullName: "Nurse Gifty Addo", department: "Clinic", designation: "School Nurse", gender: "FEMALE", salaryGrade: "G07" },
    { staffId: "S-003", fullName: "Mrs. Grace Tetteh", department: "Administration", designation: "Secretary", gender: "FEMALE", salaryGrade: "G08" },
    { staffId: "S-004", fullName: "Mr. Emmanuel Kwarteng", department: "ICT", designation: "ICT Administrator", gender: "MALE", salaryGrade: "G07" },
  ];
  for (const s of staffRows) {
    await prisma.staff.create({ data: { ...s, status: "ACTIVE" } });
  }

  // assign class teachers
  await prisma.class.update({ where: { id: classIds["Basic 7"] }, data: { classTeacherId: teachers["T-0001"] } });
  await prisma.class.update({ where: { id: classIds["Basic 4"] }, data: { classTeacherId: teachers["T-0002"] } });
  await prisma.class.update({ where: { id: classIds["KG 2"] }, data: { classTeacherId: teachers["T-0004"] } });
  await prisma.class.update({ where: { id: classIds["SHS 1"] }, data: { classTeacherId: teachers["T-0006"] } });
  console.log("  ✓ teachers & staff");

  // ---- payroll & HR -----------------------------------------------------------
  const SALARY_SCALES = [
    { grade: "G01", title: "Senior Superintendent I", basic: 1850, allowance: 300, taxRate: 8 },
    { grade: "G02", title: "Senior Superintendent II", basic: 1650, allowance: 280, taxRate: 7 },
    { grade: "G03", title: "Superintendent I", basic: 1480, allowance: 260, taxRate: 6 },
    { grade: "G04", title: "Superintendent II", basic: 1320, allowance: 240, taxRate: 6 },
    { grade: "G05", title: "Principal Superintendent", basic: 1180, allowance: 220, taxRate: 5 },
    { grade: "G06", title: "Assistant Superintendent I", basic: 1020, allowance: 200, taxRate: 5 },
    { grade: "G07", title: "Assistant Superintendent II", basic: 900, allowance: 180, taxRate: 5 },
    { grade: "G08", title: "Senior Staff", basic: 780, allowance: 160, taxRate: 4 },
    { grade: "G09", title: "Junior Staff", basic: 660, allowance: 140, taxRate: 4 },
    { grade: "G10", title: "Support Staff", basic: 550, allowance: 120, taxRate: 3 },
  ];
  for (const s of SALARY_SCALES) {
    await prisma.salaryScale.create({ data: s });
  }

  // Demo payroll run (October 2024) computed from the active employees.
  const activeTeachers = await prisma.teacher.findMany({ where: { status: "ACTIVE" } });
  const activeStaff = await prisma.staff.findMany({ where: { status: "ACTIVE" } });
  const scalesByGrade = new Map(SALARY_SCALES.map((s) => [s.grade, s]));
  const payees = [
    ...activeTeachers.map((t) => ({ name: t.fullName, sid: t.staffId, grade: t.salaryGrade ?? "G07", type: "TEACHER" as const })),
    ...activeStaff.map((s) => ({ name: s.fullName, sid: s.staffId, grade: s.salaryGrade ?? "G08", type: "STAFF" as const })),
  ];
  const payEntries = payees.map((p) => {
    const scale = scalesByGrade.get(p.grade) ?? scalesByGrade.get("G07")!;
    const basic = scale.basic;
    const allowance = scale.allowance;
    const gross = Math.round((basic + allowance) * 100) / 100;
    const ssf = Math.round(gross * 0.055 * 100) / 100; // employee SSF contribution ≈ 5.5%
    const tax = Math.round(gross * (scale.taxRate / 100) * 100) / 100;
    const deductions = Math.round((ssf + tax) * 100) / 100;
    return {
      employeeType: p.type,
      employeeName: p.name,
      staffId: p.sid,
      basic,
      allowance,
      gross,
      ssf,
      tax,
      deductions,
      net: Math.round((gross - deductions) * 100) / 100,
    };
  });
  const run = await prisma.payrollRun.create({
    data: {
      month: "2024-10",
      label: "October 2024",
      status: "PROCESSED",
      totalGross: payEntries.reduce((a, e) => a + e.gross, 0),
      totalDeductions: payEntries.reduce((a, e) => a + e.deductions, 0),
      totalNet: payEntries.reduce((a, e) => a + e.net, 0),
      entriesCount: payEntries.length,
      processedAt: new Date("2024-10-31"),
      entries: { create: payEntries },
    },
  });
  void run;
  console.log(`  ✓ ${SALARY_SCALES.length} salary scales + payroll run (${payEntries.length} employees)`);

  // ---- students & parents ------------------------------------------------------
  const studentSeed: {
    name: string; gender: string; cls: string; dob: string; phone: string; parent: string;
    parentPhone: string; parentRel: string; religion?: string;
  }[] = [
    { name: "Ama Serwaa", gender: "FEMALE", cls: "Basic 7", dob: "2011-04-12", phone: "0244112233", parent: "Efua Owusu", parentPhone: "0244001122", parentRel: "MOTHER", religion: "Christian" },
    { name: "Kwame Mensah", gender: "MALE", cls: "Basic 7", dob: "2011-08-30", phone: "0551234567", parent: "Kofi Mensah", parentPhone: "0551234568", parentRel: "FATHER", religion: "Christian" },
    { name: "Akosua Frimpong", gender: "FEMALE", cls: "Basic 7", dob: "2011-01-22", phone: "0269988776", parent: "Ama Frimpong", parentPhone: "0269988775", parentRel: "MOTHER" },
    { name: "Yaw Boateng", gender: "MALE", cls: "Basic 7", dob: "2012-06-15", phone: "0205566778", parent: "Kweku Boateng", parentPhone: "0205566779", parentRel: "FATHER" },
    { name: "Adwoa Sarpong", gender: "FEMALE", cls: "Basic 4", dob: "2014-03-09", phone: "0278877665", parent: "Yaa Sarpong", parentPhone: "0278877666", parentRel: "MOTHER" },
    { name: "Kofi Appiah", gender: "MALE", cls: "Basic 4", dob: "2014-11-18", phone: "0592233445", parent: "Kwabena Appiah", parentPhone: "0592233446", parentRel: "FATHER" },
    { name: "Esi Nyarko", gender: "FEMALE", cls: "Basic 4", dob: "2014-07-02", phone: "0247788990", parent: "Akua Nyarko", parentPhone: "0247788991", parentRel: "MOTHER" },
    { name: "Kwesi Owusu", gender: "MALE", cls: "KG 2", dob: "2019-02-25", phone: "0556677889", parent: "Adwoa Owusu", parentPhone: "0556677890", parentRel: "MOTHER" },
    { name: "Nana Ama Gyamfi", gender: "FEMALE", cls: "KG 2", dob: "2019-09-14", phone: "0261122334", parent: "Nana Gyamfi", parentPhone: "0261122335", parentRel: "FATHER" },
    { name: "Fiifi Annan", gender: "MALE", cls: "SHS 1", dob: "2008-05-07", phone: "0509988776", parent: "Maame Annan", parentPhone: "0509988777", parentRel: "MOTHER" },
    { name: "Selina Bonsu", gender: "FEMALE", cls: "SHS 1", dob: "2008-12-01", phone: "0245566778", parent: "Kofi Bonsu", parentPhone: "0245566779", parentRel: "FATHER" },
    { name: "Eric Darko", gender: "MALE", cls: "SHS 1", dob: "2008-03-19", phone: "0274455667", parent: "Abena Darko", parentPhone: "0274455668", parentRel: "MOTHER" },
  ];

  const studentIds: Record<string, string> = {};
  const parentIds: Record<string, string> = {};
  const admissionCounter = { n: 0 };
  const nextAdmission = () => `GES-2024-${String(++admissionCounter.n).padStart(4, "0")}`;

  for (const s of studentSeed) {
    let parentId = parentIds[s.parentPhone];
    if (!parentId) {
      const p = await prisma.parent.create({
        data: {
          fullName: s.parent, phone: s.parentPhone, relationship: s.parentRel,
          userId: s.parentPhone === "0244001122" ? parentUser.id : undefined,
        },
      });
      parentId = p.id;
      parentIds[s.parentPhone] = p.id;
    }
    const isDemoStudent = s.name === "Ama Serwaa";
    const student = await prisma.student.create({
      data: {
        admissionNo: nextAdmission(),
        fullName: s.name,
        gender: s.gender,
        dateOfBirth: new Date(s.dob),
        classId: classIds[s.cls],
        phone: s.phone,
        religion: s.religion,
        hometown: "Kumasi",
        district: "Kumasi Metropolitan",
        region: "Ashanti Region",
        userId: isDemoStudent ? studentUser.id : undefined,
      },
    });
    studentIds[s.name] = student.id;
    await prisma.studentParent.create({
      data: { studentId: student.id, parentId, isPrimary: true },
    });
    await prisma.enrollment.create({
      data: {
        studentId: student.id,
        classId: classIds[s.cls],
        academicYearId: year.id,
        status: "ACTIVE",
      },
    });
  }
  console.log("  ✓ students, parents & enrollments");

  // ---- assessments (SBA + EXAM) & records --------------------------------------
  const classesWithScores = [
    { cls: "Basic 7", subjects: SUBJECTS.JHS.slice(0, 8), students: ["Ama Serwaa", "Kwame Mensah", "Akosua Frimpong", "Yaw Boateng"], base: 72, spread: 16, isJhs: true },
    { cls: "Basic 4", subjects: SUBJECTS.UPPER.slice(0, 6), students: ["Adwoa Sarpong", "Kofi Appiah", "Esi Nyarko"], base: 78, spread: 14, isJhs: false },
    { cls: "SHS 1", subjects: ["English Language", "Core Mathematics", "Integrated Science", "Social Studies", "Biology", "Financial Accounting", "Economics", "French"], students: ["Fiifi Annan", "Selina Bonsu", "Eric Darko"], base: 70, spread: 18, isJhs: false },
    { cls: "KG 2", subjects: SUBJECTS.KG, students: ["Kwesi Owusu", "Nana Ama Gyamfi"], base: 82, spread: 10, isJhs: false },
  ];

  for (const { cls, subjects, students, base, spread, isJhs } of classesWithScores) {
    const classId = classIds[cls];
    const subjNames = subjects.map((n) => subjectIds[CLASSES.find((c) => c.name === cls)?.levelCode!][n]);
    for (const subjectId of subjNames) {
      const sba1 = await prisma.assessment.create({
        data: {
          title: `${cls} SBA 1`, type: "SBA", classId, subjectId, termId: term1.id,
          academicYearId: year.id, maxScore: 100, published: true,
        },
      });
      const sba2 = await prisma.assessment.create({
        data: {
          title: `${cls} SBA 2`, type: "SBA", classId, subjectId, termId: term1.id,
          academicYearId: year.id, maxScore: 100, published: true,
        },
      });
      const exam = await prisma.assessment.create({
        data: {
          title: `${cls} End-of-Term Exam`, type: "EXAM", classId, subjectId,
          termId: term1.id, academicYearId: year.id, maxScore: 100, published: true,
        },
      });
      for (const sName of students) {
        const s1 = between(Math.max(40, base - spread), Math.min(99, base + spread));
        const s2 = between(Math.max(40, base - spread), Math.min(99, base + spread));
        const examScore = between(Math.max(35, base - spread - 8), Math.min(99, base + spread - 4));
        for (const [assessmentId, score] of [[sba1.id, s1], [sba2.id, s2], [exam.id, examScore]] as const) {
          await prisma.assessmentRecord.create({
            data: { assessmentId, studentId: studentIds[sName], score },
          });
        }
      }
    }
  }
  console.log("  ✓ assessments & scores");

  // ---- attendance (Basic 7 sample) --------------------------------------------
  const b7Students = ["Ama Serwaa", "Kwame Mensah", "Akosua Frimpong", "Yaw Boateng"];
  let day = new Date("2024-09-02");
  let marked = 0;
  while (day <= new Date("2024-10-04") && marked < 400) {
    if (day.getDay() !== 0 && day.getDay() !== 6) {
      for (const name of b7Students) {
        const roll = rand();
        const status = roll < 0.86 ? "PRESENT" : roll < 0.92 ? "LATE" : roll < 0.97 ? "ABSENT" : "EXCUSED";
        await prisma.attendanceRecord.create({
          data: { date: day, classId: classIds["Basic 7"], studentId: studentIds[name], status },
        });
        marked++;
      }
    }
    day = new Date(day.getTime() + 86400000);
  }
  console.log(`  ✓ ${marked} attendance records`);

  // ---- fees & payments ----------------------------------------------------------
  const feeDefs = [
    { name: "Tuition (Term)", level: "JHS", amount: 150 },
    { name: "PTA Levy", level: "JHS", amount: 20 },
    { name: "Examination Fee", level: "JHS", amount: 30 },
    { name: "Tuition (Term)", level: "UPPER", amount: 120 },
    { name: "PTA Levy", level: "UPPER", amount: 20 },
    { name: "Tuition (Term)", level: "KG", amount: 100 },
    { name: "Tuition (Term)", level: "SHS", amount: 300 },
    { name: "Boarding Fee (Term)", level: "SHS", amount: 450 },
  ];
  for (const f of feeDefs) {
    await prisma.feeItem.create({
      data: {
        name: f.name, levelId: levelIds[f.level], amount: f.amount,
        mandatory: true, academicYearId: year.id,
      },
    });
  }
  let receiptN = 1000;
  for (const name of ["Ama Serwaa", "Kwame Mensah", "Akosua Frimpong", "Yaw Boateng"]) {
    await prisma.feePayment.create({
      data: {
        receiptNo: `RCP-${receiptN++}`,
        studentId: studentIds[name],
        amount: 200,
        method: "MOMO",
        date: new Date("2024-09-05"),
        academicYearId: year.id,
        termId: term1.id,
        note: "Term fee (Tuition + PTA + Exam)",
      },
    });
  }
  await prisma.expense.create({
    data: { title: "Science lab consumables", amount: 850, category: "Teaching & Learning", date: new Date("2024-10-02") },
  });
  await prisma.expense.create({
    data: { title: "Internet & utility bills", amount: 420, category: "Utilities", date: new Date("2024-10-10") },
  });
  console.log("  ✓ fees, payments & expenses");

  // ---- website content -----------------------------------------------------------
  const newsSeed = [
    { slug: "inter-house-sports", title: "2024 Inter-House Sports Festival a Resounding Success", excerpt: "Green House takes the trophy at our annual sports festival held at the Kumasi Sports Stadium.", body: "The entire school community gathered for a colourful day of athletics, football and fun. Congratulations to Green House for emerging champions!", author: "Mr. Kwame Asante", publishedAt: new Date("2024-10-18") },
    { slug: "bece-candidates-complete-mock", title: "BECE 2025 Candidates Complete Mock Examinations", excerpt: "Our Basic 9 candidates sat for the school's mock BECE with outstanding discipline.", body: "All 45 candidates successfully completed the mock examinations under strict supervision. Results will guide targeted revision ahead of the national exams.", author: "Examination Office", publishedAt: new Date("2024-11-05") },
    { slug: "stem-week-launch", title: "School Launches First STEM Week", excerpt: "Robotics, coding and science fairs take centre stage as we launch STEM Week 2024.", body: "Thanks to our ICT department, students explored robotics, 3D printing and coding — inspiring the next generation of Ghanaian innovators.", author: "ICT Department", publishedAt: new Date("2024-11-20") },
  ];
  for (const n of newsSeed) {
    await prisma.newsItem.create({ data: { ...n, published: true } });
  }

  const eventSeed = [
    { title: "First Term Open Day", description: "Parents are invited to review their wards' progress and meet form teachers.", location: "School Assembly Hall", startDate: new Date("2024-12-06") },
    { title: "Christmas Carols & Prize-Giving Day", description: "A grand end-of-term celebration with carols, awards and cultural performances.", location: "School Campus", startDate: new Date("2024-12-12") },
    { title: "Second Term Resumes", description: "Boarding students report by 5:00 PM. Classes begin the following day.", location: "School Campus", startDate: new Date("2025-01-06") },
  ];
  for (const e of eventSeed) {
    await prisma.eventItem.create({ data: { ...e, published: true } });
  }

  await prisma.announcement.createMany({
    data: [
      { title: "First Term Examinations begin Monday, 9th December 2024", body: "All students must report by 7:30 AM with their examination materials.", priority: "HIGH", published: true },
      { title: "Fees payment deadline", body: "Kindly settle all outstanding term fees before the examinations.", priority: "NORMAL", published: true },
    ],
  });

  const gallery = [
    { title: "School Building", url: "https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=1200&q=80", caption: "Our main administration block" },
    { title: "Science Lab", url: "https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=1200&q=80", caption: "Modern science laboratory" },
    { title: "Library", url: "https://images.unsplash.com/photo-1521587760476-6c12a4b040da?w=1200&q=80", caption: "Reading corner, school library" },
    { title: "Sports", url: "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=1200&q=80", caption: "Inter-house athletics" },
    { title: "Classroom", url: "https://images.unsplash.com/photo-1509062522246-3755977927d7?w=1200&q=80", caption: "Smart classroom, ICT centre" },
  ];
  for (const g of gallery) {
    await prisma.galleryImage.create({ data: g });
  }

  await prisma.videoItem.create({
    data: { schoolId: "main", title: "Welcome to Shacomputec International School", url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", published: true },
  });
  await prisma.downloadFile.createMany({
    data: [
      { schoolId: "main", title: "Admissions Prospectus 2025/2026", url: "#", category: "Admissions" },
      { schoolId: "main", title: "School Fees Schedule", url: "#", category: "Finance" },
    ],
  });
  console.log("  ✓ website content");

  // ---- settings ---------------------------------------------------------------
  // ---- operations demo records -------------------------------------------------
  await prisma.libraryBook.createMany({
    data: [
      { title: "The Concise Oxford Dictionary", author: "Oxford", category: "Reference", quantity: 5, available: 4, shelf: "A1" },
      { title: "Essential Mathematics for JHS", author: "A. K. Essuman", category: "Mathematics", quantity: 12, available: 11, shelf: "B2" },
      { title: "Integrated Science for Basic Schools", author: "GES", category: "Science", quantity: 10, available: 9, shelf: "C1" },
    ],
  });
  await prisma.libraryLoan.create({
    data: { bookId: (await prisma.libraryBook.findFirst())!.id, studentId: studentIds["Ama Serwaa"], dueAt: new Date("2024-11-01") },
  });
  await prisma.hostelRoom.createMany({
    data: [
      { name: "Boys Hostel A1", roomType: "BOYS", floor: "1", capacity: 6, occupants: 4 },
      { name: "Girls Hostel B2", roomType: "GIRLS", floor: "2", capacity: 6, occupants: 3 },
    ],
  });
  const room = await prisma.hostelRoom.findFirst();
  await prisma.hostelAllocation.create({
    data: { studentId: studentIds["Fiifi Annan"], roomId: room!.id, bedNo: "A1-03", academicYear: "2024/2025" },
  });
  await prisma.transportRoute.createMany({
    data: [
      { name: "Bantama Route", driver: "Mr. K. Adjei", vehicle: "GT 4567-20", capacity: 25, departureTime: "6:30 AM", days: "Mon–Fri" },
      { name: "Suame Route", driver: "Mr. S. Nyarko", vehicle: "GT 8932-19", capacity: 25, departureTime: "6:45 AM", days: "Mon–Fri" },
    ],
  });
  const route = await prisma.transportRoute.findFirst();
  await prisma.transportRider.create({
    data: { studentId: studentIds["Kwame Mensah"], routeId: route!.id, pickupPoint: "Tafo Junction" },
  });
  await prisma.clinicVisit.create({
    data: { studentId: studentIds["Akosua Frimpong"], complaint: "Headache and mild fever", temperature: "38.1", diagnosis: "Malaria (suspected)", treatment: "Paracetamol, advised rest & fluids", referred: true, status: "REFERRED" },
  });
  await prisma.disciplineCase.create({
    data: { studentId: studentIds["Yaw Boateng"], category: "LATENESS", description: "Consistent late arrival to school over two weeks.", action: "Counseling session with form teacher and parents notified.", status: "RESOLVED" },
  });
  await prisma.club.createMany({
    data: [
      { name: "Science & Robotics Club", patron: "Mr. Kofi Owusu", meetingDay: "Wednesdays" },
      { name: "Debate & Literary Society", patron: "Mrs. Akosua Frimpong", meetingDay: "Thursdays" },
      { name: "Young Farmers Club", patron: "Mr. Yaw Boateng", meetingDay: "Fridays" },
    ],
  });
  const club = await prisma.club.findFirst();
  await prisma.clubMember.create({
    data: { clubId: club!.id, studentId: studentIds["Ama Serwaa"], role: "EXECUTIVE" },
  });
  await prisma.messageLog.create({
    data: { audience: "CLASS", classId: classIds["Basic 7"], recipientCount: 4, message: "Reminder: First Term examinations begin Monday. Bring your materials.", provider: "console", sentBy: "System" },
  });

  // ---- inventory demo records --------------------------------------------------
  const suppliers = [
    { name: "Benjee Stationery Ltd", contact: "Mr. Ben Adjei", phone: "0244556677", category: "STATIONERY", address: "Kumasi Central Market" },
    { name: "Alliance Scientific Supplies", contact: "Mrs. Doris Mensah", phone: "0267788990", category: "LAB", address: "Accra, Spintex Road" },
    { name: "Kumasi Sports Emporium", contact: "Mr. Kwame Darko", phone: "0201122334", category: "SPORTS", address: "Adum, Kumasi" },
  ];
  const supplierIds: Record<string, string> = {};
  for (const s of suppliers) {
    const created = await prisma.supplier.create({ data: s });
    supplierIds[s.name] = created.id;
  }

  const invItems = [
    { name: "A4 Exercise Books (80pg)", sku: "ST-0001", category: "STATIONERY", unit: "pieces", quantity: 420, reorderLevel: 100, unitCost: 8.5, location: "Store Room A", supplierId: supplierIds["Benjee Stationery Ltd"] },
    { name: "Examination Answer Booklets", sku: "ST-0002", category: "STATIONERY", unit: "pieces", quantity: 60, reorderLevel: 200, unitCost: 12, location: "Store Room A", supplierId: supplierIds["Benjee Stationery Ltd"] },
    { name: "Boxes of Chalk (white)", sku: "ST-0003", category: "STATIONERY", unit: "boxes", quantity: 24, reorderLevel: 10, unitCost: 15, location: "Store Room A", supplierId: supplierIds["Benjee Stationery Ltd"] },
    { name: "Laboratory Beakers (250ml)", sku: "LAB-0101", category: "LAB", unit: "pieces", quantity: 36, reorderLevel: 20, unitCost: 22, location: "Science Store", supplierId: supplierIds["Alliance Scientific Supplies"] },
    { name: "Bunsen Burners", sku: "LAB-0102", category: "LAB", unit: "pieces", quantity: 12, reorderLevel: 10, unitCost: 95, location: "Science Store", supplierId: supplierIds["Alliance Scientific Supplies"] },
    { name: "Football (size 5)", sku: "SP-0201", category: "SPORTS", unit: "pieces", quantity: 8, reorderLevel: 6, unitCost: 120, location: "Sports Room", supplierId: supplierIds["Kumasi Sports Emporium"] },
    { name: "High Jump Kits", sku: "SP-0202", category: "SPORTS", unit: "sets", quantity: 2, reorderLevel: 4, unitCost: 350, location: "Sports Room", supplierId: supplierIds["Kumasi Sports Emporium"] },
  ];
  const invIds: Record<string, string> = {};
  for (const i of invItems) {
    const created = await prisma.inventoryItem.create({
      data: {
        ...i,
        status: i.quantity <= i.reorderLevel ? (i.quantity === 0 ? "OUT" : "LOW") : "ACTIVE",
      },
    });
    invIds[i.name] = created.id;
  }
  await prisma.stockMovement.createMany({
    data: [
      { itemId: invIds["A4 Exercise Books (80pg)"], type: "IN", quantity: 500, unitCost: 8.5, note: "Opening stock — term 1 purchase" },
      { itemId: invIds["A4 Exercise Books (80pg)"], type: "OUT", quantity: 80, note: "Issue to Basic 7" },
      { itemId: invIds["Laboratory Beakers (250ml)"], type: "IN", quantity: 40, unitCost: 22, note: "Order #PO-102" },
      { itemId: invIds["High Jump Kits"], type: "IN", quantity: 2, unitCost: 350, note: "Sports festival preparation" },
    ],
  });
  console.log(`  ✓ ${suppliers.length} suppliers, ${invItems.length} inventory items + movements`);

  // ---- licensing (30-day trial; activation is developer-issued, entered by
  // the school via the license banner/modal prompt — never a Settings tab) -----
  await prisma.license.create({
    data: {
      licenseKey: "GES-SMIS-MAIN-TRIAL2024",
      status: "TRIAL",
      trialStartedAt: new Date(),
      trialEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      lastSeenAt: new Date(),
      notes: "Demo trial — activate with a key from the developer (banner/modal prompt)",
    },
  });
  console.log("  ✓ licensing (30-day trial)");

  await prisma.setting.createMany({
    data: [
      { key: "result.otp.ttlSeconds", value: "300" },
      { key: "result.otp.maxAttempts", value: "5" },
      { key: "weighting.jhs", value: JSON.stringify({ sba: 50, exam: 50 }) },
      { key: "weighting.shs", value: JSON.stringify({ sba: 50, exam: 50 }) },
      { key: "sms.mode", value: "console" },
      { key: "ai.mode", value: "demo" },
      { key: "license.trialDays", value: process.env.SEED_LICENSE_TRIAL_DAYS ?? "30" },
      { key: "license.price", value: seedLicensePrice },
      { key: "license.momoPhones", value: seedLicenseMomoPhones },
      { key: "hero.slides", value: JSON.stringify([
        { title: "Nurturing Leaders for Ghana & the World", subtitle: "A GES-accredited school from Crèche to Senior High School.", image: "https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=1600&q=80", cta: "Apply for Admission", link: "/admissions" },
        { title: "Excellence in BECE & WASSCE", subtitle: "A proven record of outstanding results under the NaCCA curriculum.", image: "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=1600&q=80", cta: "Check Results", link: "/result-checker" },
        { title: "Knowledge • Integrity • Excellence", subtitle: "Join our vibrant community of learners, teachers and parents.", image: "https://images.unsplash.com/photo-1509062522246-3755977927d7?w=1600&q=80", cta: "Explore Our Programmes", link: "/programmes" },
      ]) },
      // Online payment gateway configuration — values come from env on a fresh
      // seed; otherwise set real keys in Admin → Online Payments.
      { key: "payments.testMode", value: "true" },
      { key: "payments.momo.enabled", value: "true" },
      { key: "payments.momo.env", value: process.env.SEED_MOMO_ENV ?? "sandbox" },
      { key: "payments.momo.subscriptionKey", value: "" },
      { key: "payments.momo.apiUserId", value: "" },
      { key: "payments.momo.apiKey", value: "" },
      { key: "payments.momo.businessPhone", value: seedMomoBusinessPhone },
      { key: "payments.paystack.enabled", value: "true" },
      { key: "payments.paystack.publicKey", value: seedPaystackPublicKey },
      { key: "payments.paystack.secretKey", value: seedPaystackSecretKey },
    ],
  });
  console.log("  ✓ settings");

  console.log("\n✅ Seed complete.");
  console.log("──────────────────────────────────────────────────");
  if (seedAdminEmail) {
    console.log(`Developer login : ${seedAdminEmail}`);
    console.log("Password        : (from SEED_ADMIN_PASSWORD — not printed)");
  } else {
    console.log("Developer account : create it on first run via /setup (no credentials are committed).");
  }
  console.log("──────────────────────────────────────────────────");
  console.log("Portal demo logins (random passwords generated at seed time — change them in Admin → Users):");
  console.log(`  Teacher : teacher@demo.school  / ${demoPasswords.teacher}`);
  console.log(`  Parent  : parent@demo.school   / ${demoPasswords.parent}`);
  console.log(`  Student : student@demo.school  / ${demoPasswords.student}`);
  console.log("──────────────────────────────────────────────────");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
