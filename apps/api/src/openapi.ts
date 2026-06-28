import { z } from "zod";

import { courseCreateSchema, courseUpdateSchema } from "@diuqbank/shared/schemas/admin/courses";
import {
  departmentCreateSchema,
  departmentUpdateSchema,
} from "@diuqbank/shared/schemas/admin/departments";
import {
  examTypeCreateSchema,
  examTypeUpdateSchema,
} from "@diuqbank/shared/schemas/admin/exam-types";
import {
  adminManualSubmissionRejectSchema,
  adminManualSubmissionUpdateSchema,
} from "@diuqbank/shared/schemas/admin/manual-submissions";
import {
  questionCreateSchema,
  questionUpdateSchema,
} from "@diuqbank/shared/schemas/admin/questions";
import {
  semesterCreateSchema,
  semesterUpdateSchema,
} from "@diuqbank/shared/schemas/admin/semesters";
import { submissionUpdateSchema } from "@diuqbank/shared/schemas/admin/submissions";
import { userUpdateSchema } from "@diuqbank/shared/schemas/admin/users";
import { googleSignInSchema } from "@diuqbank/shared/schemas/auth";
import { profileUpdateSchema } from "@diuqbank/shared/schemas/profile";

// ---------------------------------------------------------------------------
// Component schemas
// ---------------------------------------------------------------------------
// Request bodies are derived from the same Zod schemas the routes validate
// against (via `z.toJSONSchema`) so the docs can't drift from validation.
// Response shapes are authored by hand.

const toSchema = (s: z.ZodType) => z.toJSONSchema(s);

const user = z.object({
  id: z.number().int(),
  name: z.string(),
  email: z.email(),
  username: z.string(),
  role: z.enum(["admin", "user"]),
  image: z
    .string()
    .nullable()
    .describe("Absolute URL to the profile image, or null if none is set."),
  createdAt: z.number().int().describe("Unix epoch seconds (UTC)"),
});

const authResponse = z.object({
  token: z.string().describe("JWT — send as `Authorization: Bearer <token>`."),
  user,
});

const authConfig = z.object({
  googleClientId: z
    .string()
    .describe("Google OAuth client id, used to initialize Google Sign-In on the frontend."),
});

const errorResponse = z.object({
  error: z.string(),
  issues: z
    .array(z.object({ field: z.string(), message: z.string() }))
    .optional()
    .describe("Field-level details, present on validation failures."),
});

// --- Question bank read models -------------------------------------------

const paginationMeta = z.object({
  page: z.number().int(),
  perPage: z.number().int(),
  total: z.number().int(),
  totalPages: z.number().int(),
});

const department = z.object({
  id: z.number().int(),
  name: z.string(),
  shortName: z.string(),
});

const course = z.object({
  id: z.number().int(),
  departmentId: z.number().int(),
  name: z.string(),
});

const semester = z.object({ id: z.number().int(), name: z.string() });
const examType = z.object({ id: z.number().int(), name: z.string() });

const filterOptions = z.object({
  departments: z.array(department),
  courses: z.array(course),
  semesters: z.array(semester),
  examTypes: z.array(examType),
});

const contributor = z.object({
  id: z.number().int(),
  name: z.string(),
  username: z.string(),
  image: z
    .string()
    .nullable()
    .describe("Absolute URL to the profile image, or null if none is set."),
  submissionCount: z.number().int(),
  createdAt: z.number().int().describe("Unix epoch seconds (UTC)"),
});

const contributorSummary = z.object({
  id: z.number().int(),
  name: z.string(),
  username: z.string(),
  image: z.string().nullable(),
});

const contributorList = z.object({
  data: z.array(contributor),
  meta: paginationMeta,
});

const questionListItem = z.object({
  id: z.number().int(),
  title: z
    .string()
    .describe("Human-readable label, e.g. \"Data Structures (CSE), Summer 26, Quiz\"."),
  submissionCount: z.number().int(),
  department,
  course,
  semester,
  examType,
});

const questionList = z.object({
  data: z.array(questionListItem),
  meta: paginationMeta,
});

const publicSubmission = z.object({
  id: z.number().int(),
  section: z.string().nullable(),
  batch: z.string().nullable(),
  fileSize: z.number().int().describe("Size of the PDF in bytes."),
  createdAt: z.number().int().describe("Unix epoch seconds (UTC)"),
  pdfUrl: z
    .string()
    .nullable()
    .describe("Absolute URL to the submission PDF, served by `GET /files/:key`."),
  contributor: contributorSummary.nullable(),
});

const contributorSubmission = z.object({
  id: z.number().int(),
  question: z.object({
    id: z.number().int(),
    title: z
      .string()
      .describe("Human-readable label of the parent question."),
    department,
    course,
    semester,
    examType,
  }),
  section: z.string().nullable(),
  batch: z.string().nullable(),
  fileSize: z.number().int().describe("Size of the PDF in bytes."),
  createdAt: z.number().int().describe("Unix epoch seconds (UTC)"),
  pdfUrl: z
    .string()
    .nullable()
    .describe("Absolute URL to the submission PDF, served by `GET /files/:key`."),
});

const contributorSubmissionList = z.object({
  data: z.array(contributorSubmission),
  meta: paginationMeta,
});

const questionDetail = z.object({
  id: z.number().int(),
  title: z
    .string()
    .describe("Human-readable label, e.g. \"Data Structures (CSE), Summer 26, Quiz\"."),
  submissionCount: z.number().int(),
  department,
  course,
  semester,
  examType,
});

const questionSubmissions = z.object({
  data: z.array(publicSubmission),
});

const manualDepartment = department.extend({ id: z.number().int().nullable() });
const manualCourse = course.extend({
  id: z.number().int().nullable(),
  departmentId: z.number().int().nullable(),
});
const manualSemester = semester.extend({ id: z.number().int().nullable() });
const manualExamType = examType.extend({ id: z.number().int().nullable() });

const manualSubmission = z.object({
  id: z.number().int(),
  userId: z.number().int(),
  department: manualDepartment,
  course: manualCourse,
  semester: manualSemester,
  examType: manualExamType,
  note: z.string().nullable(),
  status: z.enum(["pending_review", "approved", "rejected"]),
  rejectedReason: z.string().nullable(),
  reviewedBy: z.number().int().nullable(),
  questionId: z.number().int().nullable(),
  submissionId: z.number().int().nullable(),
  pdfUrl: z
    .string()
    .nullable()
    .describe("Absolute URL to the uploaded PDF, served by `GET /files/:key`."),
  createdAt: z.number().int().describe("Unix epoch seconds (UTC)"),
});

const manualSubmissionList = z.object({
  data: z.array(manualSubmission),
  meta: paginationMeta,
});

// --- Admin read models ----------------------------------------------------

const departmentList = z.object({
  data: z.array(department),
  meta: paginationMeta,
});
const courseList = z.object({ data: z.array(course), meta: paginationMeta });
const semesterList = z.object({ data: z.array(semester), meta: paginationMeta });
const examTypeList = z.object({ data: z.array(examType), meta: paginationMeta });

const adminQuestion = z.object({
  id: z.number().int(),
  title: z.string(),
  departmentId: z.number().int(),
  courseId: z.number().int(),
  semesterId: z.number().int(),
  examTypeId: z.number().int(),
  submissionCount: z.number().int(),
  department,
  course,
  semester,
  examType,
});
const adminQuestionList = z.object({
  data: z.array(adminQuestion),
  meta: paginationMeta,
});

const adminSubmission = z.object({
  id: z.number().int(),
  question: z.object({ id: z.number().int(), title: z.string() }),
  contributor: contributorSummary.nullable(),
  section: z.string().nullable(),
  batch: z.string().nullable(),
  fileSize: z.number().int().describe("Size of the PDF in bytes."),
  watermarkStatus: z.enum(["awaiting", "completed", "failed"]),
  watermarkError: z.string().nullable(),
  pdfUrl: z
    .string()
    .nullable()
    .describe("Absolute URL to the original PDF, served by `GET /files/:key`."),
  watermarkedPdfUrl: z
    .string()
    .nullable()
    .describe("Absolute URL to the watermarked PDF, if one has been generated."),
  createdAt: z.number().int().describe("Unix epoch seconds (UTC)"),
});
const adminSubmissionList = z.object({
  data: z.array(adminSubmission),
  meta: paginationMeta,
});

const adminManualSubmission = z.object({
  id: z.number().int(),
  userId: z.number().int(),
  contributor: user,
  department: manualDepartment,
  course: manualCourse,
  semester: manualSemester,
  examType: manualExamType,
  note: z.string().nullable(),
  status: z.enum(["pending_review", "approved", "rejected"]),
  rejectedReason: z.string().nullable(),
  reviewedBy: z.number().int().nullable(),
  reviewer: user.nullable(),
  questionId: z.number().int().nullable(),
  submissionId: z.number().int().nullable(),
  pdfUrl: z
    .string()
    .nullable()
    .describe("Absolute URL to the uploaded PDF, served by `GET /files/:key`."),
  createdAt: z.number().int().describe("Unix epoch seconds (UTC)"),
});

const adminManualSubmissionList = z.object({
  data: z.array(adminManualSubmission),
  meta: paginationMeta,
});

const adminUser = z.object({
  id: z.number().int(),
  name: z.string(),
  email: z.email(),
  username: z.string(),
  role: z.enum(["admin", "user"]),
  image: z.string().nullable(),
  submissionCount: z.number().int(),
  createdAt: z.number().int().describe("Unix epoch seconds (UTC)"),
});
const adminUserList = z.object({
  data: z.array(adminUser),
  meta: paginationMeta,
});

const componentSchemas = {
  GoogleSignIn: toSchema(googleSignInSchema),
  AuthConfig: toSchema(authConfig),
  ProfileUpdate: toSchema(profileUpdateSchema),
  ImageUploadForm: {
    type: "object",
    properties: {
      image: {
        type: "string",
        format: "binary",
        description: "Image file (PNG, JPEG, GIF, or WebP — max 5 MB).",
      },
    },
    required: ["image"],
  },
  User: toSchema(user),
  AuthResponse: toSchema(authResponse),
  ErrorResponse: toSchema(errorResponse),
  PaginationMeta: toSchema(paginationMeta),
  Department: toSchema(department),
  Course: toSchema(course),
  Semester: toSchema(semester),
  ExamType: toSchema(examType),
  FilterOptions: toSchema(filterOptions),
  Contributor: toSchema(contributor),
  ContributorSummary: toSchema(contributorSummary),
  ContributorList: toSchema(contributorList),
  ContributorSubmission: toSchema(contributorSubmission),
  ContributorSubmissionList: toSchema(contributorSubmissionList),
  QuestionListItem: toSchema(questionListItem),
  QuestionList: toSchema(questionList),
  PublicSubmission: toSchema(publicSubmission),
  QuestionDetail: toSchema(questionDetail),
  QuestionSubmissions: toSchema(questionSubmissions),
  ManualSubmission: toSchema(manualSubmission),
  ManualSubmissionList: toSchema(manualSubmissionList),
  ManualSubmissionCreateForm: {
    type: "object",
    properties: {
      pdf: {
        type: "string",
        format: "binary",
        description: "PDF file (max 20 MB).",
      },
      departmentName: { type: "string", minLength: 1, maxLength: 100 },
      departmentShortName: { type: "string", minLength: 1, maxLength: 20 },
      courseName: { type: "string", minLength: 1, maxLength: 150 },
      semesterName: { type: "string", minLength: 1, maxLength: 100 },
      examTypeName: { type: "string", minLength: 1, maxLength: 100 },
      note: { type: "string", maxLength: 1000 },
    },
    required: [
      "pdf",
      "departmentName",
      "departmentShortName",
      "courseName",
      "semesterName",
      "examTypeName",
    ],
  },

  // Admin request bodies (derived from the route validation schemas).
  CreateDepartment: toSchema(departmentCreateSchema),
  UpdateDepartment: toSchema(departmentUpdateSchema),
  CreateCourse: toSchema(courseCreateSchema),
  UpdateCourse: toSchema(courseUpdateSchema),
  CreateSemester: toSchema(semesterCreateSchema),
  UpdateSemester: toSchema(semesterUpdateSchema),
  CreateExamType: toSchema(examTypeCreateSchema),
  UpdateExamType: toSchema(examTypeUpdateSchema),
  CreateQuestion: toSchema(questionCreateSchema),
  UpdateQuestion: toSchema(questionUpdateSchema),
  UpdateManualSubmission: toSchema(adminManualSubmissionUpdateSchema),
  RejectManualSubmission: toSchema(adminManualSubmissionRejectSchema),
  UpdateSubmission: toSchema(submissionUpdateSchema),
  UpdateUser: toSchema(userUpdateSchema),
  SubmissionCreateForm: {
    type: "object",
    properties: {
      pdf: {
        type: "string",
        format: "binary",
        description: "PDF file (max 20 MB).",
      },
      questionId: { type: "integer", description: "Parent question id." },
      userId: {
        type: "integer",
        description: "Contributor (user) id.",
      },
      section: { type: "string", description: "Optional section label." },
      batch: { type: "string", description: "Optional batch label." },
    },
    required: ["pdf", "questionId", "userId"],
  },
  PdfUploadForm: {
    type: "object",
    properties: {
      pdf: {
        type: "string",
        format: "binary",
        description: "Replacement PDF file (max 20 MB).",
      },
    },
    required: ["pdf"],
  },
  MigrationSubmissionForm: {
    type: "object",
    properties: {
      pdf: {
        type: "string",
        format: "binary",
        description: "Submission PDF file (max 20 MB).",
      },
      legacyId: {
        type: "string",
        description: "Unique id of the record in the legacy system.",
      },
      departmentName: { type: "string", description: "Department name." },
      departmentShortName: {
        type: "string",
        description: "Department short name (used when creating a new department).",
      },
      semesterName: { type: "string", description: "Semester name." },
      courseName: { type: "string", description: "Course name." },
      examTypeName: { type: "string", description: "Exam type name." },
      contributorEmail: {
        type: "string",
        format: "email",
        description: "Original contributor's email (used to find or create them).",
      },
      contributorUsername: {
        type: "string",
        description: "Original contributor's username (used when creating them).",
      },
      contributorName: { type: "string", description: "Original contributor's name." },
      contributorImageUrl: {
        type: "string",
        format: "uri",
        description:
          "Optional profile picture URL; downloaded into storage when creating the contributor (best-effort).",
      },
      section: { type: "string", description: "Optional section label." },
      batch: { type: "string", description: "Optional batch label." },
    },
    required: [
      "pdf",
      "legacyId",
      "departmentName",
      "departmentShortName",
      "semesterName",
      "courseName",
      "examTypeName",
      "contributorEmail",
      "contributorUsername",
      "contributorName",
    ],
  },

  // Admin response models.
  DepartmentList: toSchema(departmentList),
  CourseList: toSchema(courseList),
  SemesterList: toSchema(semesterList),
  ExamTypeList: toSchema(examTypeList),
  AdminQuestion: toSchema(adminQuestion),
  AdminQuestionList: toSchema(adminQuestionList),
  AdminSubmission: toSchema(adminSubmission),
  AdminSubmissionList: toSchema(adminSubmissionList),
  AdminManualSubmission: toSchema(adminManualSubmission),
  AdminManualSubmissionList: toSchema(adminManualSubmissionList),
  AdminUser: toSchema(adminUser),
  AdminUserList: toSchema(adminUserList),
};

// ---------------------------------------------------------------------------
// Access levels — every operation is Public, User, or Admin. User/Admin share
// the same bearer scheme (role is checked server-side); the distinction is
// carried by an `x-badges` chip (rendered by Scalar) + an `**Access:**` line.
// ---------------------------------------------------------------------------

type AccessLevel = "Public" | "User" | "Admin";

const ACCESS_COLORS: Record<AccessLevel, string> = {
  Public: "#16a34a",
  User: "#2563eb",
  Admin: "#dc2626",
};

const ACCESS_BLURBS: Record<AccessLevel, string> = {
  Public: "No authentication required.",
  User: "Requires a bearer token. Open to any signed-in user (admins included).",
  Admin: "Requires a bearer token from an account with `role: \"admin\"`.",
};

const bearerSecurity = [{ bearerAuth: [] }];

const authFields = (level: AccessLevel, description: string) => ({
  ...(level === "Public" ? {} : { security: bearerSecurity }),
  "x-badges": [{ name: level, color: ACCESS_COLORS[level], position: "after" as const }],
  description: `**Access:** \`${level}\` — ${ACCESS_BLURBS[level]}\n\n${description}`,
});

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

const ref = (name: keyof typeof componentSchemas) => ({
  $ref: `#/components/schemas/${name}`,
});

const json = (schema: object) => ({ "application/json": { schema } });

const okJson = (description: string, schema: object) => ({
  description,
  content: json(schema),
});

const errResp = (description: string) => ({
  description,
  content: json(ref("ErrorResponse")),
});

const commonErrors = {
  "400": errResp("Validation failed or bad request"),
  "401": errResp("Missing or invalid bearer token"),
  "403": errResp("Admin access required"),
  "404": errResp("Resource not found"),
};

const noContent = { description: "Deleted — no content" };

// `{ user: User }` — the envelope returned by the auth endpoints.
const userEnvelope = {
  type: "object",
  properties: { user: ref("User") },
  required: ["user"],
};

// Shared query parameters for paginated list endpoints.
const pageParams = [
  {
    name: "page",
    in: "query",
    required: false,
    schema: { type: "integer", minimum: 1, default: 1 },
    description: "1-based page number.",
  },
  {
    name: "perPage",
    in: "query",
    required: false,
    schema: { type: "integer", minimum: 1, maximum: 100, default: 20 },
    description: "Items per page (max 100).",
  },
];

// Optional question filters, matched to the ids returned by `/filter-options`.
const questionFilterParams = (
  ["departmentId", "courseId", "semesterId", "examTypeId"] as const
).map((name) => ({
  name,
  in: "query",
  required: false,
  schema: { type: "integer", minimum: 1 },
  description: `Filter by ${name}.`,
}));

// ---------------------------------------------------------------------------
// Admin paths
// ---------------------------------------------------------------------------

type SchemaName = keyof typeof componentSchemas;

const idPathParam = (noun: string) => ({
  name: "id",
  in: "path",
  required: true,
  schema: { type: "integer" },
  description: `${noun} id.`,
});

const searchParam = (what: string) => ({
  name: "search",
  in: "query",
  required: false,
  schema: { type: "string" },
  description: `Case-insensitive substring match on ${what}.`,
});

const departmentIdFilter = {
  name: "departmentId",
  in: "query",
  required: false,
  schema: { type: "integer", minimum: 1 },
  description: "Filter by department id.",
};

// Standard CRUD path entries for a simple lookup resource.
const lookupResource = (cfg: {
  base: string;
  tag: string;
  noun: string;
  nounPlural: string;
  listRef: SchemaName;
  itemRef: SchemaName;
  createRef: SchemaName;
  updateRef: SchemaName;
  listParams: object[];
}) => ({
  [cfg.base]: {
    get: {
      tags: [cfg.tag],
      summary: `List ${cfg.nounPlural}`,
      ...authFields("Admin", `Paginated list of ${cfg.nounPlural}.`),
      parameters: cfg.listParams,
      responses: {
        "200": okJson("OK", ref(cfg.listRef)),
        "400": commonErrors["400"],
        "401": commonErrors["401"],
        "403": commonErrors["403"],
      },
    },
    post: {
      tags: [cfg.tag],
      summary: `Create a ${cfg.noun}`,
      ...authFields("Admin", `Creates a new ${cfg.noun}.`),
      requestBody: { required: true, content: json(ref(cfg.createRef)) },
      responses: {
        "201": okJson("Created", ref(cfg.itemRef)),
        "400": commonErrors["400"],
        "401": commonErrors["401"],
        "403": commonErrors["403"],
        "409": errResp("A conflicting record already exists"),
      },
    },
  },
  [`${cfg.base}/{id}`]: {
    get: {
      tags: [cfg.tag],
      summary: `Get a ${cfg.noun} by id`,
      ...authFields("Admin", `A single ${cfg.noun}.`),
      parameters: [idPathParam(cfg.noun)],
      responses: {
        "200": okJson("OK", ref(cfg.itemRef)),
        "401": commonErrors["401"],
        "403": commonErrors["403"],
        "404": commonErrors["404"],
      },
    },
    patch: {
      tags: [cfg.tag],
      summary: `Update a ${cfg.noun}`,
      ...authFields(
        "Admin",
        `Updates a ${cfg.noun}. Only the fields you send are changed.`,
      ),
      parameters: [idPathParam(cfg.noun)],
      requestBody: { required: true, content: json(ref(cfg.updateRef)) },
      responses: {
        "200": okJson("Updated", ref(cfg.itemRef)),
        "400": commonErrors["400"],
        "401": commonErrors["401"],
        "403": commonErrors["403"],
        "404": commonErrors["404"],
        "409": errResp("A conflicting record already exists"),
      },
    },
    delete: {
      tags: [cfg.tag],
      summary: `Delete a ${cfg.noun}`,
      ...authFields(
        "Admin",
        `Deletes a ${cfg.noun}. Blocked with 409 if other records reference it.`,
      ),
      parameters: [idPathParam(cfg.noun)],
      responses: {
        "204": noContent,
        "401": commonErrors["401"],
        "403": commonErrors["403"],
        "404": commonErrors["404"],
        "409": errResp("In use by other records"),
      },
    },
  },
});

const submissionFilterParams = [
  {
    name: "questionId",
    in: "query",
    required: false,
    schema: { type: "integer", minimum: 1 },
    description: "Filter by question id.",
  },
  {
    name: "userId",
    in: "query",
    required: false,
    schema: { type: "integer", minimum: 1 },
    description: "Filter by contributor (user) id.",
  },
  {
    name: "watermarkStatus",
    in: "query",
    required: false,
    schema: { type: "string", enum: ["awaiting", "completed", "failed"] },
    description: "Filter by watermark status.",
  },
];

const manualSubmissionFilterParams = [
  {
    name: "status",
    in: "query",
    required: false,
    schema: {
      type: "string",
      enum: ["pending_review", "approved", "rejected"],
    },
    description: "Filter by review status.",
  },
  {
    name: "userId",
    in: "query",
    required: false,
    schema: { type: "integer", minimum: 1 },
    description: "Filter by submitting user id.",
  },
  ...(
    [
      ["departmentName", 100],
      ["departmentShortName", 20],
      ["courseName", 150],
      ["semesterName", 100],
      ["examTypeName", 100],
    ] as const
  ).map(([name, maxLength]) => ({
    name,
    in: "query",
    required: false,
    schema: { type: "string", minLength: 1, maxLength },
    description: `Case-insensitive exact match on ${name}.`,
  })),
];

const userFilterParams = [
  searchParam("name, email, or username"),
  {
    name: "role",
    in: "query",
    required: false,
    schema: { type: "string", enum: ["admin", "user"] },
    description: "Filter by role.",
  },
];

const multipart = (schema: SchemaName) => ({
  "multipart/form-data": { schema: ref(schema) },
});

const adminPaths = {
  ...lookupResource({
    base: "/admin/departments",
    tag: "admin-departments",
    noun: "department",
    nounPlural: "departments",
    listRef: "DepartmentList",
    itemRef: "Department",
    createRef: "CreateDepartment",
    updateRef: "UpdateDepartment",
    listParams: [...pageParams, searchParam("name or short name")],
  }),
  ...lookupResource({
    base: "/admin/courses",
    tag: "admin-courses",
    noun: "course",
    nounPlural: "courses",
    listRef: "CourseList",
    itemRef: "Course",
    createRef: "CreateCourse",
    updateRef: "UpdateCourse",
    listParams: [...pageParams, departmentIdFilter, searchParam("name")],
  }),
  ...lookupResource({
    base: "/admin/semesters",
    tag: "admin-semesters",
    noun: "semester",
    nounPlural: "semesters",
    listRef: "SemesterList",
    itemRef: "Semester",
    createRef: "CreateSemester",
    updateRef: "UpdateSemester",
    listParams: [...pageParams, searchParam("name")],
  }),
  ...lookupResource({
    base: "/admin/exam-types",
    tag: "admin-exam-types",
    noun: "exam type",
    nounPlural: "exam types",
    listRef: "ExamTypeList",
    itemRef: "ExamType",
    createRef: "CreateExamType",
    updateRef: "UpdateExamType",
    listParams: [...pageParams, searchParam("name")],
  }),
  "/admin/questions": {
    get: {
      tags: ["admin-questions"],
      summary: "List questions",
      ...authFields(
        "Admin",
        "Paginated, filterable by `departmentId`/`courseId`/`semesterId`/`examTypeId`. Each item includes the nested lookup entities and a dynamic submission count.",
      ),
      parameters: [...pageParams, ...questionFilterParams],
      responses: {
        "200": okJson("OK", ref("AdminQuestionList")),
        "400": commonErrors["400"],
        "401": commonErrors["401"],
        "403": commonErrors["403"],
      },
    },
    post: {
      tags: ["admin-questions"],
      summary: "Create a question",
      ...authFields(
        "Admin",
        "Creates a question from the four lookup ids. The combination must be unique.",
      ),
      requestBody: { required: true, content: json(ref("CreateQuestion")) },
      responses: {
        "201": okJson("Created", ref("AdminQuestion")),
        "400": errResp("Validation failed, or a referenced entity does not exist"),
        "401": commonErrors["401"],
        "403": commonErrors["403"],
        "409": errResp("A question with this combination already exists"),
      },
    },
  },
  "/admin/questions/{id}": {
    get: {
      tags: ["admin-questions"],
      summary: "Get a question by id",
      ...authFields("Admin", "A single question with its entities and submission count."),
      parameters: [idPathParam("Question")],
      responses: {
        "200": okJson("OK", ref("AdminQuestion")),
        "401": commonErrors["401"],
        "403": commonErrors["403"],
        "404": commonErrors["404"],
      },
    },
    patch: {
      tags: ["admin-questions"],
      summary: "Update a question",
      ...authFields(
        "Admin",
        "Updates the lookup ids of a question. Only the fields you send are changed.",
      ),
      parameters: [idPathParam("Question")],
      requestBody: { required: true, content: json(ref("UpdateQuestion")) },
      responses: {
        "200": okJson("Updated", ref("AdminQuestion")),
        "400": errResp("Validation failed, or a referenced entity does not exist"),
        "401": commonErrors["401"],
        "403": commonErrors["403"],
        "404": commonErrors["404"],
        "409": errResp("A question with this combination already exists"),
      },
    },
    delete: {
      tags: ["admin-questions"],
      summary: "Delete a question",
      ...authFields(
        "Admin",
        "Deletes a question. Blocked with 409 if it has submissions.",
      ),
      parameters: [idPathParam("Question")],
      responses: {
        "204": noContent,
        "401": commonErrors["401"],
        "403": commonErrors["403"],
        "404": commonErrors["404"],
        "409": errResp("The question has submissions"),
      },
    },
  },
  "/admin/submissions": {
    get: {
      tags: ["admin-submissions"],
      summary: "List submissions",
      ...authFields(
        "Admin",
        "Paginated, filterable by `questionId`, `userId`, and `watermarkStatus`. Newest first.",
      ),
      parameters: [...pageParams, ...submissionFilterParams],
      responses: {
        "200": okJson("OK", ref("AdminSubmissionList")),
        "400": commonErrors["400"],
        "401": commonErrors["401"],
        "403": commonErrors["403"],
      },
    },
    post: {
      tags: ["admin-submissions"],
      summary: "Create a submission",
      ...authFields(
        "Admin",
        "Uploads a PDF (multipart field `pdf`, max 20 MB) and creates a submission for the given `questionId`, attributed to a `userId` (contributor, required).",
      ),
      requestBody: { required: true, content: multipart("SubmissionCreateForm") },
      responses: {
        "201": okJson("Created", ref("AdminSubmission")),
        "400": commonErrors["400"],
        "401": commonErrors["401"],
        "403": commonErrors["403"],
        "413": errResp("PDF exceeds the 20 MB size limit"),
      },
    },
  },
  "/admin/submissions/{id}": {
    get: {
      tags: ["admin-submissions"],
      summary: "Get a submission by id",
      ...authFields("Admin", "A single submission with its question, contributor, and file URLs."),
      parameters: [idPathParam("Submission")],
      responses: {
        "200": okJson("OK", ref("AdminSubmission")),
        "401": commonErrors["401"],
        "403": commonErrors["403"],
        "404": commonErrors["404"],
      },
    },
    patch: {
      tags: ["admin-submissions"],
      summary: "Update submission metadata",
      ...authFields(
        "Admin",
        "Updates submission metadata (`questionId`, `userId`, `section`, `batch`, `watermarkStatus`). `section`/`batch` accept `null` to clear them. Use `PUT /admin/submissions/{id}/pdf` to replace the file.",
      ),
      parameters: [idPathParam("Submission")],
      requestBody: { required: true, content: json(ref("UpdateSubmission")) },
      responses: {
        "200": okJson("Updated", ref("AdminSubmission")),
        "400": errResp("Validation failed, or a referenced entity does not exist"),
        "401": commonErrors["401"],
        "403": commonErrors["403"],
        "404": commonErrors["404"],
      },
    },
    delete: {
      tags: ["admin-submissions"],
      summary: "Delete a submission",
      ...authFields(
        "Admin",
        "Deletes a submission and removes its PDF (and watermarked PDF) from storage.",
      ),
      parameters: [idPathParam("Submission")],
      responses: {
        "204": noContent,
        "401": commonErrors["401"],
        "403": commonErrors["403"],
        "404": commonErrors["404"],
        "409": errResp("An approved manual submission references this submission"),
      },
    },
  },
  "/admin/submissions/{id}/pdf": {
    put: {
      tags: ["admin-submissions"],
      summary: "Replace a submission's PDF",
      ...authFields(
        "Admin",
        "Replaces the PDF (multipart field `pdf`, max 20 MB). Resets watermarking to `awaiting` and clears any existing watermarked file.",
      ),
      parameters: [idPathParam("Submission")],
      requestBody: { required: true, content: multipart("PdfUploadForm") },
      responses: {
        "200": okJson("Replaced", ref("AdminSubmission")),
        "400": commonErrors["400"],
        "401": commonErrors["401"],
        "403": commonErrors["403"],
        "404": commonErrors["404"],
        "413": errResp("PDF exceeds the 20 MB size limit"),
      },
    },
  },
  "/admin/migration/submissions": {
    post: {
      tags: ["admin-migration"],
      summary: "Migrate a legacy submission",
      ...authFields(
        "Admin",
        "Imports one legacy submission: uploads its PDF (multipart field `pdf`, max 20 MB) plus flat metadata. Department/semester/course/exam type are resolved or created by name; the contributor is found or created by email (with their profile picture downloaded best-effort). The PDF is stored as-is (no watermarking). `legacyId` is unique — a record can only be migrated once.",
      ),
      requestBody: {
        required: true,
        content: multipart("MigrationSubmissionForm"),
      },
      responses: {
        "201": okJson("Migrated", ref("AdminSubmission")),
        "400": commonErrors["400"],
        "401": commonErrors["401"],
        "403": commonErrors["403"],
        "409": errResp("Legacy id already migrated, or a username/short-name conflict"),
        "413": errResp("PDF exceeds the 20 MB size limit"),
      },
    },
  },
  "/admin/manual-submissions": {
    get: {
      tags: ["admin-manual-submissions"],
      summary: "List manual submissions",
      ...authFields(
        "Admin",
        "Paginated review queue. Filter by status, user, or submitted lookup text.",
      ),
      parameters: [...pageParams, ...manualSubmissionFilterParams],
      responses: {
        "200": okJson("OK", ref("AdminManualSubmissionList")),
        "400": commonErrors["400"],
        "401": commonErrors["401"],
        "403": commonErrors["403"],
      },
    },
  },
  "/admin/manual-submissions/{id}": {
    get: {
      tags: ["admin-manual-submissions"],
      summary: "Get a manual submission",
      ...authFields(
        "Admin",
        "Returns the review request, submitter, reviewer, lookup entities, PDF URL, and approval links.",
      ),
      parameters: [idPathParam("Manual submission")],
      responses: {
        "200": okJson("OK", ref("AdminManualSubmission")),
        "401": commonErrors["401"],
        "403": commonErrors["403"],
        "404": commonErrors["404"],
      },
    },
    patch: {
      tags: ["admin-manual-submissions"],
      summary: "Edit a manual submission",
      ...authFields(
        "Admin",
        "Edits the five submitted lookup text fields before approval. Approved requests are immutable.",
      ),
      parameters: [idPathParam("Manual submission")],
      requestBody: {
        required: true,
        content: json(ref("UpdateManualSubmission")),
      },
      responses: {
        "200": okJson("Updated", ref("AdminManualSubmission")),
        "400": commonErrors["400"],
        "401": commonErrors["401"],
        "403": commonErrors["403"],
        "404": commonErrors["404"],
        "409": errResp("Approved manual submissions cannot be edited"),
      },
    },
    delete: {
      tags: ["admin-manual-submissions"],
      summary: "Delete a manual submission",
      ...authFields(
        "Admin",
        "Deletes the review record. Pending/rejected PDFs are removed; an approved submission and its PDF are preserved.",
      ),
      parameters: [idPathParam("Manual submission")],
      responses: {
        "204": noContent,
        "401": commonErrors["401"],
        "403": commonErrors["403"],
        "404": commonErrors["404"],
      },
    },
  },
  "/admin/manual-submissions/{id}/approve": {
    post: {
      tags: ["admin-manual-submissions"],
      summary: "Approve a manual submission",
      ...authFields(
        "Admin",
        "Resolves all submitted lookup text against existing records using case-insensitive full-string matching. If every record exists, moves the PDF into `submissions/`, atomically creates or reuses the question, creates the real submission, and records the reviewing admin. Missing lookup records must be created through their admin APIs first.",
      ),
      parameters: [idPathParam("Manual submission")],
      responses: {
        "200": okJson("Approved", ref("AdminManualSubmission")),
        "400": commonErrors["400"],
        "401": commonErrors["401"],
        "403": commonErrors["403"],
        "404": commonErrors["404"],
        "409": errResp(
          "Already approved, a lookup record is missing/conflicting, or the PDF is missing",
        ),
      },
    },
  },
  "/admin/manual-submissions/{id}/reject": {
    post: {
      tags: ["admin-manual-submissions"],
      summary: "Reject a manual submission",
      ...authFields(
        "Admin",
        "Rejects an unapproved request with a required reason and records the reviewing admin.",
      ),
      parameters: [idPathParam("Manual submission")],
      requestBody: {
        required: true,
        content: json(ref("RejectManualSubmission")),
      },
      responses: {
        "200": okJson("Rejected", ref("AdminManualSubmission")),
        "400": commonErrors["400"],
        "401": commonErrors["401"],
        "403": commonErrors["403"],
        "404": commonErrors["404"],
        "409": errResp("Approved manual submissions cannot be rejected"),
      },
    },
  },
  "/admin/users": {
    get: {
      tags: ["admin-users"],
      summary: "List users",
      ...authFields(
        "Admin",
        "Paginated, searchable by name/email/username and filterable by `role`. Each item includes `email`, `role`, and a dynamic submission count.",
      ),
      parameters: [...pageParams, ...userFilterParams],
      responses: {
        "200": okJson("OK", ref("AdminUserList")),
        "400": commonErrors["400"],
        "401": commonErrors["401"],
        "403": commonErrors["403"],
      },
    },
  },
  "/admin/users/{id}": {
    get: {
      tags: ["admin-users"],
      summary: "Get a user by id",
      ...authFields("Admin", "A single user, including email, role, and submission count."),
      parameters: [idPathParam("User")],
      responses: {
        "200": okJson("OK", ref("AdminUser")),
        "401": commonErrors["401"],
        "403": commonErrors["403"],
        "404": commonErrors["404"],
      },
    },
    patch: {
      tags: ["admin-users"],
      summary: "Update a user",
      ...authFields(
        "Admin",
        "Updates a user's `name`, `username`, and/or `role`. You cannot remove your own admin role.",
      ),
      parameters: [idPathParam("User")],
      requestBody: { required: true, content: json(ref("UpdateUser")) },
      responses: {
        "200": okJson("Updated", ref("AdminUser")),
        "400": commonErrors["400"],
        "401": commonErrors["401"],
        "403": commonErrors["403"],
        "404": commonErrors["404"],
        "409": errResp("Username already taken, or you tried to demote yourself"),
      },
    },
    delete: {
      tags: ["admin-users"],
      summary: "Delete a user",
        ...authFields(
          "Admin",
          "Deletes a user only when no question-bank or manual submissions reference them. You cannot delete your own account.",
      ),
      parameters: [idPathParam("User")],
      responses: {
        "204": noContent,
        "401": commonErrors["401"],
        "403": commonErrors["403"],
        "404": commonErrors["404"],
        "409": errResp("Self-delete is forbidden, or submissions reference this user"),
      },
    },
  },
};

// ---------------------------------------------------------------------------
// Document
// ---------------------------------------------------------------------------

const infoDescription = `Backend API for **DIU QuestionBank**, running on Cloudflare Workers.

## Authentication

Sign in with a verified \`@diu.edu.bd\` Google account. Obtain a Google ID token client-side
(Google Sign-In), then exchange it for a DIU QuestionBank JWT:

\`\`\`http
POST /auth/google
Content-Type: application/json

{ "idToken": "<google-id-token>" }
\`\`\`

The response includes a JWT — pass it on every authenticated request:

\`\`\`
Authorization: Bearer <token>
\`\`\`

If the verified DIU email already exists, the existing user is signed in (\`200\`). If not, a new
user is created with an opaque generated username (\`201\`). Its role is \`"admin"\` when the
email matches the configured \`ADMIN_EMAIL\`; otherwise it is \`"user"\`. Google accounts outside
the \`diu.edu.bd\` domain are rejected (\`403\`).

## Conventions

- All timestamps are **Unix epoch seconds** (UTC integers), not ISO 8601 strings.
- Errors return \`{ "error": "<message>" }\`. Validation failures additionally include an
  \`issues\` array with field-level details.
- Requests are **rate limited**. Exceeding a limit returns \`429 Too Many Requests\` with a
  \`Retry-After\` header (seconds). Sign-in and upload endpoints are limited more strictly
  than general reads.`;

export const buildOpenApiDoc = () => ({
  openapi: "3.1.0",
  info: {
    title: "DIU QuestionBank API",
    version: "1.0.0",
    description: infoDescription,
  },
  servers: [{ url: "/", description: "Current host" }],
  tags: [
    {
      name: "auth",
      description:
        "Sign in with Google and manage the currently signed-in user (profile, avatar).",
    },
    {
      name: "files",
      description: "Public file serving for uploaded objects (e.g. profile images).",
    },
    {
      name: "contributors",
      description: "Public read access to contributors (users who have submitted).",
    },
    {
      name: "questions",
      description: "Public read access to the question bank.",
    },
    {
      name: "filter-options",
      description: "Lookup entities (departments, courses, semesters, exam types) for the filter UI.",
    },
    {
      name: "manual-submissions",
      description: "Signed-in users: upload and manage PDFs submitted for review.",
    },
    { name: "admin-departments", description: "Admin: manage departments." },
    { name: "admin-courses", description: "Admin: manage courses." },
    { name: "admin-semesters", description: "Admin: manage semesters." },
    { name: "admin-exam-types", description: "Admin: manage exam types." },
    { name: "admin-questions", description: "Admin: manage questions." },
    { name: "admin-submissions", description: "Admin: manage submissions." },
    {
      name: "admin-manual-submissions",
      description: "Admin: review and manage manual submissions.",
    },
    {
      name: "admin-migration",
      description: "Admin: import legacy submissions.",
    },
    { name: "admin-users", description: "Admin: manage users." },
  ],
  "x-tagGroups": [
    {
      name: "Non-admin",
      tags: [
        "auth",
        "files",
        "contributors",
        "questions",
        "filter-options",
        "manual-submissions",
      ],
    },
    {
      name: "Admin",
      tags: [
        "admin-departments",
        "admin-courses",
        "admin-semesters",
        "admin-exam-types",
        "admin-questions",
        "admin-submissions",
        "admin-manual-submissions",
        "admin-migration",
        "admin-users",
      ],
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "JWT obtained from `POST /auth/google`.",
      },
    },
    schemas: componentSchemas,
  },
  paths: {
    "/auth/config": {
      get: {
        tags: ["auth"],
        summary: "Get public auth configuration",
        ...authFields(
          "Public",
          "Returns the public configuration a client needs to start the Google sign-in flow (currently the Google OAuth client id). No secrets are exposed.",
        ),
        responses: {
          "200": okJson("OK", ref("AuthConfig")),
        },
      },
    },
    "/auth/google": {
      post: {
        tags: ["auth"],
        summary: "Sign in with Google",
        ...authFields(
          "Public",
          "Exchange a Google ID token for a DIU QuestionBank JWT. Only verified `@diu.edu.bd` emails are allowed. Existing email → `200`; new user created → `201`. The response shape is the same in both cases.",
        ),
        requestBody: { required: true, content: json(ref("GoogleSignIn")) },
        responses: {
          "200": okJson("Authenticated — existing user", ref("AuthResponse")),
          "201": okJson("Authenticated — new user created", ref("AuthResponse")),
          "400": commonErrors["400"],
          "401": errResp("Invalid or expired Google ID token"),
          "403": errResp("Only @diu.edu.bd email addresses can sign in"),
        },
      },
    },
    "/auth/me": {
      get: {
        tags: ["auth"],
        summary: "Get the current user",
        ...authFields("User", "Returns the user record for the token on the request."),
        responses: {
          "200": okJson("OK", userEnvelope),
          "401": commonErrors["401"],
          "404": commonErrors["404"],
        },
      },
      patch: {
        tags: ["auth"],
        summary: "Update your own profile",
        ...authFields(
          "User",
          "Updates editable fields on your own account (`name` and/or `username`). Only the fields you send are changed. Email is immutable (it comes from Google).",
        ),
        requestBody: { required: true, content: json(ref("ProfileUpdate")) },
        responses: {
          "200": okJson("Updated", userEnvelope),
          "400": commonErrors["400"],
          "401": commonErrors["401"],
          "404": commonErrors["404"],
          "409": errResp("Username already taken"),
        },
      },
    },
    "/auth/me/image": {
      put: {
        tags: ["auth"],
        summary: "Upload your profile image",
        ...authFields(
          "User",
          "Uploads a new profile image (or replaces the existing one), stored in R2. Accepts PNG, JPEG, GIF, or WebP, max 5 MB. The previous image, if any, is deleted after the swap. The returned `user.image` is an absolute URL.",
        ),
        requestBody: {
          required: true,
          content: { "multipart/form-data": { schema: ref("ImageUploadForm") } },
        },
        responses: {
          "200": okJson("Uploaded", userEnvelope),
          "400": commonErrors["400"],
          "401": commonErrors["401"],
          "404": commonErrors["404"],
          "413": errResp("Image exceeds the 5 MB size limit"),
        },
      },
    },
    "/files/{key}": {
      get: {
        tags: ["files"],
        summary: "Serve an uploaded file",
        ...authFields(
          "Public",
          "Streams a stored file (e.g. a profile image) from object storage. Keys come from the `image` field on user objects. Responses are immutable and cacheable.",
        ),
        parameters: [
          {
            name: "key",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "Object key, e.g. `users/<uuid>.png` (may contain slashes).",
          },
        ],
        responses: {
          "200": {
            description: "The file",
            content: { "image/*": { schema: { type: "string", format: "binary" } } },
          },
          "404": commonErrors["404"],
        },
      },
    },
    "/contributors": {
      get: {
        tags: ["contributors"],
        summary: "List contributors",
        ...authFields(
          "Public",
          "Users who have at least one submission, most prolific first. Paginated.",
        ),
        parameters: pageParams,
        responses: {
          "200": okJson("OK", ref("ContributorList")),
          "400": commonErrors["400"],
        },
      },
    },
    "/contributors/{username}": {
      get: {
        tags: ["contributors"],
        summary: "Get a contributor by username",
        ...authFields(
          "Public",
          "A single contributor's public profile and total submission count.",
        ),
        parameters: [
          {
            name: "username",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "The contributor's username.",
          },
        ],
        responses: {
          "200": okJson("OK", ref("Contributor")),
          "404": commonErrors["404"],
        },
      },
    },
    "/contributors/{username}/submissions": {
      get: {
        tags: ["contributors"],
        summary: "List a contributor's submissions",
        ...authFields(
          "Public",
          "A contributor's own submissions, newest first. Paginated. Each row carries its parent question (`id` + `title`) instead of the contributor, and links to its PDF via `pdfUrl` (served by `GET /files/:key`).",
        ),
        parameters: [
          {
            name: "username",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "The contributor's username.",
          },
          ...pageParams,
        ],
        responses: {
          "200": okJson("OK", ref("ContributorSubmissionList")),
          "400": commonErrors["400"],
          "404": commonErrors["404"],
        },
      },
    },
    "/filter-options": {
      get: {
        tags: ["filter-options"],
        summary: "Get filter options",
        ...authFields(
          "Public",
          "All departments, courses, semesters, and exam types — the lookup entities a client needs to build the questions filter UI.",
        ),
        responses: {
          "200": okJson("OK", ref("FilterOptions")),
        },
      },
    },
    "/questions": {
      get: {
        tags: ["questions"],
        summary: "List questions",
        ...authFields(
          "Public",
          "Questions with their lookup entities and submission count, newest first. Paginated and filterable by `departmentId`, `courseId`, `semesterId`, and `examTypeId`.",
        ),
        parameters: [...pageParams, ...questionFilterParams],
        responses: {
          "200": okJson("OK", ref("QuestionList")),
          "400": commonErrors["400"],
        },
      },
    },
    "/questions/{id}": {
      get: {
        tags: ["questions"],
        summary: "Get a question by id",
        ...authFields(
          "Public",
          "A single question with its lookup entities and submission count. The submissions themselves are served by `GET /questions/{id}/submissions`.",
        ),
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "integer" },
            description: "Question id.",
          },
        ],
        responses: {
          "200": okJson("OK", ref("QuestionDetail")),
          "404": commonErrors["404"],
        },
      },
    },
    "/questions/{id}/submissions": {
      get: {
        tags: ["questions"],
        summary: "List a question's submissions",
        ...authFields(
          "Public",
          "**All** submissions for a question (no pagination — a single question has few). Each submission links to its PDF via `pdfUrl` (served by `GET /files/:key`) and includes the contributor, if any.",
        ),
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "integer" },
            description: "Question id.",
          },
        ],
        responses: {
          "200": okJson("OK", ref("QuestionSubmissions")),
          "404": commonErrors["404"],
        },
      },
    },
    "/manual-submissions": {
      get: {
        tags: ["manual-submissions"],
        summary: "List your manual submissions",
        ...authFields(
          "User",
          "Returns only manual submissions owned by the authenticated user, newest first.",
        ),
        parameters: pageParams,
        responses: {
          "200": okJson("OK", ref("ManualSubmissionList")),
          "400": commonErrors["400"],
          "401": commonErrors["401"],
        },
      },
      post: {
        tags: ["manual-submissions"],
        summary: "Create a manual submission",
        ...authFields(
          "User",
          "Uploads a PDF plus department, course, semester, and exam-type text for review. No lookup IDs are accepted; status starts as `pending_review`.",
        ),
        requestBody: {
          required: true,
          content: multipart("ManualSubmissionCreateForm"),
        },
        responses: {
          "201": okJson("Created", ref("ManualSubmission")),
          "400": commonErrors["400"],
          "401": commonErrors["401"],
          "413": errResp("PDF exceeds the 20 MB size limit"),
        },
      },
    },
    "/manual-submissions/{id}": {
      get: {
        tags: ["manual-submissions"],
        summary: "Get one of your manual submissions",
        ...authFields(
          "User",
          "A single manual submission you own, including its review status and linked records once approved.",
        ),
        parameters: [idPathParam("Manual submission")],
        responses: {
          "200": okJson("OK", ref("ManualSubmission")),
          "401": commonErrors["401"],
          "404": commonErrors["404"],
        },
      },
      delete: {
        tags: ["manual-submissions"],
        summary: "Delete your manual submission",
        ...authFields(
          "User",
          "Deletes a manual submission only when it belongs to the authenticated user, then removes its PDF from storage.",
        ),
        parameters: [idPathParam("Manual submission")],
        responses: {
          "204": noContent,
          "401": commonErrors["401"],
          "404": commonErrors["404"],
          "409": errResp("Approved manual submissions cannot be deleted by users"),
        },
      },
    },
    ...adminPaths,
  },
});

export const openApiDoc = buildOpenApiDoc();
