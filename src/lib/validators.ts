import { z } from "zod";

// Ghana phone numbers are 10 digits (e.g. 0241234567). The +233 international
// form (which represents the same number) is accepted and normalized. Spaces,
// dashes, dots and brackets are stripped before validating.
const GH_PHONE = /^(0\d{9}|\+?233\d{9})$/;

export const ghPhone = z
  .string()
  .transform((v) => v.trim().replace(/[\s\-().]/g, ""))
  .refine((v) => GH_PHONE.test(v), "Enter a valid 10-digit Ghana phone number (e.g. 0241234567)");

/** Optional phone — accepts empty string / null, validates when filled. */
export const ghPhoneOptional = z.union([z.literal(""), z.null(), ghPhone]).optional();

// Ghana Card numbers follow the official GHA format: the GHA- country prefix,
// 9 system-generated digits and a 1-digit check digit, separated by hyphens
// (GHA-XXXXXXXXX-X). "GHA123…" is normalized to "GHA-123…"; input is uppercased.
const GHANA_CARD = /^GHA-\d{9}-\d{1}$/;

export const ghanaCard = z
  .string()
  .transform((v) => v.trim().toUpperCase().replace(/^GHA-?/, "GHA-"))
  .refine((v) => GHANA_CARD.test(v), "Ghana Card must be GHA- followed by 9 digits and a check digit (e.g. GHA-123456789-0)");

/** Optional Ghana Card — accepts empty string / null, validates when filled. */
export const ghanaCardOptional = z.union([z.literal(""), z.null(), ghanaCard]).optional();

// NHIS numbers are exactly 9 numeric digits (e.g. 123456789).
const NHIS_NUMBER = /^\d{9}$/;

export const nhisNumber = z
  .string()
  .transform((v) => v.trim().replace(/[\s\-.]/g, ""))
  .refine((v) => NHIS_NUMBER.test(v), "NHIS number must be exactly 9 digits (e.g. 123456789)");

/** Optional NHIS — accepts empty string / null, validates when filled. */
export const nhisNumberOptional = z.union([z.literal(""), z.null(), nhisNumber]).optional();

export const studentSchema = z.object({
  fullName: z.string().trim().min(3, "Full name is required"),
  gender: z.enum(["MALE", "FEMALE"]),
  dateOfBirth: z.string().optional().nullable(),
  classId: z.string().optional().nullable(),
  phone: ghPhoneOptional,
  email: z.string().email("Invalid email").optional().nullable().or(z.literal("")),
  ghanaCard: ghanaCardOptional,
  nhisNumber: nhisNumberOptional,
  address: z.string().optional().nullable(),
  hometown: z.string().optional().nullable(),
  district: z.string().optional().nullable(),
  region: z.string().optional().nullable(),
  religion: z.string().optional().nullable(),
  status: z.string().optional(),
});

export const parentSchema = z.object({
  fullName: z.string().trim().min(3, "Parent name is required"),
  phone: ghPhone,
  email: z.string().email("Invalid email").optional().nullable().or(z.literal("")),
  occupation: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  relationship: z.string().optional().nullable(),
  ghanaCard: ghanaCardOptional,
});

export const teacherSchema = z.object({
  staffId: z.string().trim().min(2, "Staff ID is required"),
  fullName: z.string().trim().min(3, "Full name is required"),
  gender: z.string().optional().nullable(),
  phone: ghPhoneOptional,
  email: z.string().email("Invalid email").optional().nullable().or(z.literal("")),
  mainSubject: z.string().optional().nullable(),
  rank: z.string().optional().nullable(),
  salaryGrade: z.string().optional().nullable(),
  ssfNumber: z.string().optional().nullable(),
  ntcReg: z.string().optional().nullable(),
  highestProfQual: z.string().optional().nullable(),
  highestAcadQual: z.string().optional().nullable(),
  status: z.string().optional(),
  // confidential profile
  dateOfBirth: z.string().optional().nullable(),
  gradeType: z.string().optional().nullable(),
  gradeLevel: z.string().optional().nullable(),
  otherSubjects: z.string().optional().nullable(),
  specialization: z.string().optional().nullable(),
  institution: z.string().optional().nullable(),
  yearCompleted: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? null : v),
    z.coerce.number().int().min(1950).max(2100).nullable().optional()
  ),
  dateOfFirstAppointment: z.string().optional().nullable(),
  dateOfLastPromotion: z.string().optional().nullable(),
  datePosted: z.string().optional().nullable(),
  hometown: z.string().optional().nullable(),
  district: z.string().optional().nullable(),
  region: z.string().optional().nullable(),
  ghanaCard: ghanaCardOptional,
  emergencyContact: ghPhoneOptional,
  association: z.string().optional().nullable(),
  religion: z.string().optional().nullable(),
  maritalStatus: z.string().optional().nullable(),
  teachingPeriodsPerWeek: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? null : v),
    z.coerce.number().int().min(0).max(60).nullable().optional()
  ),
});

export const staffSchema = z.object({
  staffId: z.string().trim().min(2, "Staff ID is required"),
  fullName: z.string().trim().min(3, "Full name is required"),
  gender: z.string().optional().nullable(),
  phone: ghPhoneOptional,
  email: z.string().email("Invalid email").optional().nullable().or(z.literal("")),
  department: z.string().optional().nullable(),
  designation: z.string().optional().nullable(),
  status: z.string().optional(),
});

export const feeSchema = z.object({
  name: z.string().trim().min(2, "Fee name is required"),
  levelId: z.string().optional().nullable(),
  classId: z.string().optional().nullable(),
  amount: z.coerce.number().positive("Amount must be positive"),
  mandatory: z.boolean().optional(),
  description: z.string().optional().nullable(),
});

export const paymentSchema = z.object({
  studentId: z.string().min(1, "Select a student"),
  amount: z.coerce.number().positive("Amount must be positive"),
  method: z.enum(["CASH", "MOMO", "CARD", "BANK", "PAYSTACK"]),
  reference: z.string().optional().nullable(),
  paidBy: z.string().optional().nullable(),
  date: z.string().optional().nullable(),
  note: z.string().optional().nullable(),
});

export const otpRequestSchema = z.object({
  admissionNo: z.string().trim().min(3, "Enter the admission / index number"),
  phone: ghPhone,
});

export const otpVerifySchema = z.object({
  admissionNo: z.string().trim().min(3, "Enter the admission / index number"),
  phone: ghPhone,
  code: z.string().trim().length(6, "OTP must be 6 digits").regex(/^\d{6}$/, "OTP must be 6 digits"),
  requestId: z.string().min(1, "Invalid request"),
});

export const admissionSchema = z.object({
  fullName: z.string().trim().min(3, "Child's full name is required"),
  dateOfBirth: z.string().optional().nullable(),
  gender: z.enum(["MALE", "FEMALE"]).optional(),
  // The SPECIFIC class the applicant is applying for (e.g. "Basic 4"). When
  // set, the API derives the level from the class. Falls back to a bare level
  // for schools that haven't created their classes yet.
  classId: z.string().optional().nullable(),
  levelId: z.string().min(1, "Select the class level"),
  nhisNumber: nhisNumberOptional,
  weighingCardNumber: z.string().optional().nullable(),
  previousSchool: z.string().optional().nullable(),
  previousSchoolClass: z.string().optional().nullable(),
  parentName: z.string().trim().min(3, "Parent/guardian name is required"),
  parentPhone: ghPhone,
  parentEmail: z.string().email("Invalid email").optional().nullable().or(z.literal("")),
  parentOccupation: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  digitalAddress: z.string().optional().nullable(),
  message: z.string().optional().nullable(),
});

export const contactSchema = z.object({
  name: z.string().trim().min(2, "Your name is required"),
  email: z.string().email("Invalid email"),
  phone: ghPhoneOptional,
  subject: z.string().trim().min(2, "Subject is required"),
  message: z.string().trim().min(5, "Message is required"),
});

// Sign-in accepts the friendly username (e.g. the Developer's "shacomputec")
// OR an email address — one field, either format.
export const loginSchema = z.object({
  email: z.string().trim().min(2, "Enter your username or email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const userSchema = z.object({
  fullName: z.string().trim().min(2, "Full name is required"),
  email: z.string().email("Enter a valid email"),
  // Optional friendly sign-in name (username OR email both work at /login).
  username: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9._-]{3,40}$/, "Username must be 3–40 characters (letters, numbers, . _ -)")
    .optional()
    .nullable()
    .transform((v) => (v ? v.toLowerCase() : null)),
  password: z.string().min(8, "Password must be at least 8 characters").optional(),
  roleId: z.string().min(1, "Select a role"),
  phone: ghPhoneOptional,
  status: z.string().optional(),
});

export const newsSchema = z.object({
  title: z.string().trim().min(3, "Title is required"),
  excerpt: z.string().optional().nullable(),
  body: z.string().optional().nullable(),
  coverImage: z.string().optional().nullable(),
  author: z.string().optional().nullable(),
  published: z.boolean().optional(),
});

export const eventSchema = z.object({
  title: z.string().trim().min(3, "Title is required"),
  description: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().optional().nullable(),
  coverImage: z.string().optional().nullable(),
  published: z.boolean().optional(),
});

export const announcementSchema = z.object({
  title: z.string().trim().min(3, "Title is required"),
  body: z.string().optional().nullable(),
  priority: z.enum(["NORMAL", "HIGH"]).optional(),
  published: z.boolean().optional(),
});

export const gallerySchema = z.object({
  title: z.string().optional().nullable(),
  url: z.string().url("Enter a valid image URL"),
  caption: z.string().optional().nullable(),
});

export const attendanceSchema = z.object({
  date: z.string().min(1, "Date is required"),
  classId: z.string().min(1, "Select a class"),
  records: z.array(
    z.object({
      studentId: z.string(),
      status: z.enum(["PRESENT", "ABSENT", "LATE", "EXCUSED"]),
      note: z.string().optional().nullable(),
    })
  ),
});

export const assessmentSchema = z.object({
  title: z.string().trim().min(2, "Title is required"),
  type: z.enum(["SBA", "EXAM"]),
  classId: z.string().min(1, "Select a class"),
  subjectId: z.string().min(1, "Select a subject"),
  termId: z.string().min(1, "Select a term"),
  maxScore: z.coerce.number().positive().default(100),
  weight: z.coerce.number().optional(),
  date: z.string().optional().nullable(),
});

export const scoresSchema = z.object({
  assessmentId: z.string().min(1),
  records: z.array(z.object({ studentId: z.string(), score: z.coerce.number().min(0).max(200) })),
});

export const schoolSchema = z.object({
  name: z.string().trim().min(2, "School name is required"),
  schoolType: z.enum(["BASIC", "SHS", "BOTH"]).optional(),
  shortName: z.string().optional().nullable(),
  motto: z.string().optional().nullable(),
  vision: z.string().optional().nullable(),
  mission: z.string().optional().nullable(),
  history: z.string().optional().nullable(),
  welcomeMessage: z.string().optional().nullable(),
  logo: z.string().optional().nullable(),
  primaryColor: z.string().optional().nullable(),
  accentColor: z.string().optional().nullable(),
  phone: ghPhoneOptional,
  email: z.string().email("Invalid email").optional().nullable().or(z.literal("")),
  address: z.string().optional().nullable(),
  district: z.string().optional().nullable(),
  region: z.string().optional().nullable(),
  locationName: z.string().optional().nullable(),
  mapLat: z.string().optional().nullable(),
  mapLng: z.string().optional().nullable(),
  facebook: z.string().optional().nullable(),
  twitter: z.string().optional().nullable(),
  instagram: z.string().optional().nullable(),
  whatsapp: ghPhoneOptional,
  youtube: z.string().optional().nullable(),
  developerName: z.string().optional().nullable(),
  developerPhone: ghPhoneOptional,
  developerEmail: z.string().email("Invalid developer email").optional().nullable().or(z.literal("")),
});

