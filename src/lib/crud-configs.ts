// Pure-data configuration shared between the generic CRUD API layer and the
// generic admin UI. Do NOT import server-only code here.

export type FieldType = "text" | "textarea" | "number" | "date" | "select" | "boolean";

export type FieldDef = {
  name: string;
  label: string;
  type: FieldType;
  options?: string[];
  required?: boolean;
};

export type RefDef = {
  /** label of the reference option (e.g. "fullName") */
  labelField: string;
  /** API path that returns an array of { id, [labelField] } objects */
  api: string;
};

export type CrudConfig = {
  /** prisma model name (allow-listed) */
  model: string;
  /** REST route segment, e.g. "library" -> /api/library */
  route: string;
  /** RBAC permission module */
  module: string;
  label: string;
  singular: string;
  /** text fields searched by the search box */
  searchFields: string[];
  /** fields rendered in the table (defaults to first 6 fields) */
  tableFields: string[];
  fields: FieldDef[];
  /** optional id-field -> reference data for select rendering */
  refs?: Record<string, RefDef>;
  orderBy?: Record<string, "asc" | "desc">;
  titleField?: string;
};

export const OPERATIONS: CrudConfig[] = [
  {
    model: "libraryBook",
    route: "library/books",
    module: "library",
    label: "Library Books",
    singular: "Book",
    searchFields: ["title", "author", "isbn"],
    tableFields: ["title", "author", "category", "quantity", "available", "status"],
    titleField: "title",
    fields: [
      { name: "title", label: "Title", type: "text", required: true },
      { name: "author", label: "Author", type: "text" },
      { name: "isbn", label: "ISBN", type: "text" },
      { name: "category", label: "Category", type: "text" },
      { name: "quantity", label: "Quantity", type: "number" },
      { name: "available", label: "Available", type: "number" },
      { name: "shelf", label: "Shelf", type: "text" },
      { name: "status", label: "Status", type: "select", options: ["ACTIVE", "ARCHIVED"] },
    ],
  },
  {
    model: "libraryLoan",
    route: "library/loans",
    module: "library",
    label: "Book Loans",
    singular: "Loan",
    searchFields: ["studentId", "bookId"],
    tableFields: ["bookId", "studentId", "borrowedAt", "dueAt", "status"],
    fields: [
      { name: "bookId", label: "Book", type: "text", required: true },
      { name: "studentId", label: "Student", type: "text", required: true },
      { name: "borrowedAt", label: "Borrowed", type: "date" },
      { name: "dueAt", label: "Due", type: "date" },
      { name: "returnedAt", label: "Returned", type: "date" },
      { name: "status", label: "Status", type: "select", options: ["BORROWED", "RETURNED", "OVERDUE"] },
      { name: "note", label: "Note", type: "textarea" },
    ],
    refs: {
      bookId: { labelField: "title", api: "/api/library/books" },
      studentId: { labelField: "fullName", api: "/api/students?take=500" },
    },
  },
  {
    model: "hostelRoom",
    route: "hostel/rooms",
    module: "hostel",
    label: "Hostel Rooms",
    singular: "Room",
    searchFields: ["name"],
    tableFields: ["name", "roomType", "floor", "capacity", "occupants", "status"],
    titleField: "name",
    fields: [
      { name: "name", label: "Room", type: "text", required: true },
      { name: "roomType", label: "Type", type: "select", options: ["BOYS", "GIRLS", "MIXED"] },
      { name: "floor", label: "Floor", type: "text" },
      { name: "capacity", label: "Capacity", type: "number" },
      { name: "occupants", label: "Occupants", type: "number" },
      { name: "status", label: "Status", type: "select", options: ["ACTIVE", "MAINTENANCE"] },
    ],
  },
  {
    model: "hostelAllocation",
    route: "hostel/allocations",
    module: "hostel",
    label: "Bed Allocations",
    singular: "Allocation",
    searchFields: ["studentId"],
    tableFields: ["studentId", "roomId", "bedNo", "academicYear", "status"],
    fields: [
      { name: "studentId", label: "Student", type: "text", required: true },
      { name: "roomId", label: "Room", type: "text", required: true },
      { name: "bedNo", label: "Bed No.", type: "text" },
      { name: "academicYear", label: "Academic Year", type: "text" },
      { name: "status", label: "Status", type: "select", options: ["ACTIVE", "VACATED"] },
    ],
    refs: {
      studentId: { labelField: "fullName", api: "/api/students?take=500" },
      roomId: { labelField: "name", api: "/api/hostel/rooms" },
    },
  },
  {
    model: "transportRoute",
    route: "transport/routes",
    module: "transport",
    label: "Transport Routes",
    singular: "Route",
    searchFields: ["name", "driver", "vehicle"],
    tableFields: ["name", "driver", "vehicle", "capacity", "departureTime", "status"],
    titleField: "name",
    fields: [
      { name: "name", label: "Route", type: "text", required: true },
      { name: "driver", label: "Driver", type: "text" },
      { name: "vehicle", label: "Vehicle", type: "text" },
      { name: "capacity", label: "Capacity", type: "number" },
      { name: "departureTime", label: "Departure", type: "text" },
      { name: "days", label: "Days", type: "text" },
      { name: "status", label: "Status", type: "select", options: ["ACTIVE", "INACTIVE"] },
    ],
  },
  {
    model: "transportRider",
    route: "transport/riders",
    module: "transport",
    label: "Transport Riders",
    singular: "Rider",
    searchFields: ["studentId"],
    tableFields: ["studentId", "routeId", "pickupPoint", "status"],
    fields: [
      { name: "studentId", label: "Student", type: "text", required: true },
      { name: "routeId", label: "Route", type: "text", required: true },
      { name: "pickupPoint", label: "Pickup Point", type: "text" },
      { name: "status", label: "Status", type: "select", options: ["ACTIVE", "INACTIVE"] },
    ],
    refs: {
      studentId: { labelField: "fullName", api: "/api/students?take=500" },
      routeId: { labelField: "name", api: "/api/transport/routes" },
    },
  },
  {
    model: "clinicVisit",
    route: "clinic/visits",
    module: "clinic",
    label: "Sick Bay Visits",
    singular: "Visit",
    searchFields: ["studentId", "complaint"],
    tableFields: ["studentId", "date", "complaint", "diagnosis", "referred", "status"],
    fields: [
      { name: "studentId", label: "Student", type: "text", required: true },
      { name: "date", label: "Date", type: "date" },
      { name: "complaint", label: "Complaint", type: "textarea" },
      { name: "temperature", label: "Temp (°C)", type: "text" },
      { name: "diagnosis", label: "Diagnosis", type: "text" },
      { name: "treatment", label: "Treatment", type: "textarea" },
      { name: "referred", label: "Referred", type: "boolean" },
      { name: "status", label: "Status", type: "select", options: ["TREATED", "REFERRED", "OBSERVATION"] },
    ],
    refs: {
      studentId: { labelField: "fullName", api: "/api/students?take=500" },
    },
  },
  {
    model: "disciplineCase",
    route: "discipline",
    module: "discipline",
    label: "Discipline Cases",
    singular: "Case",
    searchFields: ["studentId", "category"],
    tableFields: ["studentId", "date", "category", "description", "status"],
    fields: [
      { name: "studentId", label: "Student", type: "text", required: true },
      { name: "date", label: "Date", type: "date" },
      { name: "category", label: "Category", type: "select", options: ["ABSENTEEISM", "FIGHTING", "MISCONDUCT", "CHEATING", "OTHER"] },
      { name: "description", label: "Description", type: "textarea" },
      { name: "action", label: "Action Taken", type: "textarea" },
      { name: "status", label: "Status", type: "select", options: ["OPEN", "RESOLVED", "CLOSED"] },
    ],
    refs: {
      studentId: { labelField: "fullName", api: "/api/students?take=500" },
    },
  },
  {
    model: "club",
    route: "clubs",
    module: "clubs",
    label: "Clubs & Societies",
    singular: "Club",
    searchFields: ["name", "patron"],
    tableFields: ["name", "patron", "meetingDay", "status"],
    titleField: "name",
    fields: [
      { name: "name", label: "Club name", type: "text", required: true },
      { name: "patron", label: "Patron", type: "text" },
      { name: "meetingDay", label: "Meeting day", type: "text" },
      { name: "description", label: "Description", type: "textarea" },
      { name: "status", label: "Status", type: "select", options: ["ACTIVE", "INACTIVE"] },
    ],
  },
  {
    model: "clubMember",
    route: "clubs/members",
    module: "clubs",
    label: "Club Members",
    singular: "Member",
    searchFields: ["studentId"],
    tableFields: ["clubId", "studentId", "role", "joinedAt"],
    fields: [
      { name: "clubId", label: "Club", type: "text", required: true },
      { name: "studentId", label: "Student", type: "text", required: true },
      { name: "role", label: "Role", type: "select", options: ["MEMBER", "EXECUTIVE", "PRESIDENT"] },
      { name: "joinedAt", label: "Joined", type: "date" },
    ],
    refs: {
      clubId: { labelField: "name", api: "/api/clubs" },
      studentId: { labelField: "fullName", api: "/api/students?take=500" },
    },
  },
  {
    model: "salaryScale",
    route: "payroll/scales",
    module: "payroll",
    label: "Salary Scales",
    singular: "Scale",
    searchFields: ["grade", "title"],
    tableFields: ["grade", "title", "basic", "allowance", "taxRate"],
    titleField: "title",
    orderBy: { grade: "asc" },
    fields: [
      { name: "grade", label: "Grade", type: "text", required: true },
      { name: "title", label: "Title", type: "text" },
      { name: "basic", label: "Basic (GHS)", type: "number", required: true },
      { name: "allowance", label: "Allowance (GHS)", type: "number" },
      { name: "taxRate", label: "Tax rate (%)", type: "number" },
    ],
  },
  {
    model: "inventoryItem",
    route: "inventory/items",
    module: "inventory",
    label: "Inventory Items",
    singular: "Item",
    searchFields: ["name", "sku", "category"],
    tableFields: ["name", "sku", "category", "quantity", "reorderLevel", "status"],
    titleField: "name",
    orderBy: { name: "asc" },
    fields: [
      { name: "name", label: "Item name", type: "text", required: true },
      { name: "sku", label: "SKU / Code", type: "text" },
      { name: "category", label: "Category", type: "select", options: ["STATIONERY", "SPORTS", "LAB", "FURNITURE", "ICT", "FOOD", "OTHER"] },
      { name: "unit", label: "Unit", type: "text" },
      { name: "quantity", label: "Quantity", type: "number" },
      { name: "reorderLevel", label: "Reorder level", type: "number" },
      { name: "unitCost", label: "Unit cost (GHS)", type: "number" },
      { name: "location", label: "Location", type: "text" },
      { name: "supplierId", label: "Supplier", type: "text" },
      { name: "status", label: "Status", type: "select", options: ["ACTIVE", "LOW", "OUT", "ARCHIVED"] },
    ],
    refs: {
      supplierId: { labelField: "name", api: "/api/inventory/suppliers" },
    },
  },
  {
    model: "supplier",
    route: "inventory/suppliers",
    module: "inventory",
    label: "Suppliers",
    singular: "Supplier",
    searchFields: ["name", "contact", "phone"],
    tableFields: ["name", "contact", "phone", "category", "status"],
    titleField: "name",
    orderBy: { name: "asc" },
    fields: [
      { name: "name", label: "Supplier name", type: "text", required: true },
      { name: "contact", label: "Contact person", type: "text" },
      { name: "phone", label: "Phone", type: "text" },
      { name: "email", label: "Email", type: "text" },
      { name: "address", label: "Address", type: "textarea" },
      { name: "category", label: "Category", type: "select", options: ["STATIONERY", "SPORTS", "LAB", "ICT", "FOOD", "OTHER"] },
      { name: "status", label: "Status", type: "select", options: ["ACTIVE", "INACTIVE"] },
    ],
  },
];

export const OPERATIONS_BY_ROUTE = new Map(OPERATIONS.map((c) => [c.route, c]));
