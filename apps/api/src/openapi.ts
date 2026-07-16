import { ALLOWED_EXAM_TYPES } from "@diuqbank/shared";
import { z } from "zod";

import { courseCreateSchema, courseUpdateSchema } from "./shared/schemas/admin/courses";
import {
  departmentCreateSchema,
  departmentUpdateSchema,
} from "./shared/schemas/admin/departments";
import {
  examTypeCreateSchema,
  examTypeUpdateSchema,
} from "./shared/schemas/admin/exam-types";
import {
  adminManualSubmissionRejectSchema,
  adminManualSubmissionUpdateSchema,
} from "./shared/schemas/admin/manual-submissions";
import {
  questionCreateSchema,
  questionUpdateSchema,
} from "./shared/schemas/admin/questions";
import {
  semesterCreateSchema,
  semesterUpdateSchema,
} from "./shared/schemas/admin/semesters";
import { mergeSchema } from "./shared/schemas/admin/merge";
import {
  submissionUpdateSchema,
  submissionViewIncrementSchema,
} from "./shared/schemas/admin/submissions";
import { userUpdateSchema } from "./shared/schemas/admin/users";
import { submissionViewSchema } from "./shared/schemas/submissions";
import { googleSignInSchema } from "./shared/schemas/auth";
import { profileUpdateSchema } from "./shared/schemas/profile";

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

// Impact of a category merge, returned as `preview` (dry run) or `summary`.
const mergeSummary = z.object({
  itemsDeleted: z.number().int(),
  questionsCombined: z.number().int(),
  submissionsMoved: z.number().int(),
  coursesMerged: z.number().int().optional(),
});

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
  viewCount: z
    .number()
    .int()
    .describe("Total views across all of this question's submissions."),
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
  viewCount: z
    .number()
    .int()
    .describe("Number of times this submission has been viewed."),
  createdAt: z.number().int().describe("Unix epoch seconds (UTC)"),
  pdfUrl: z
    .string()
    .nullable()
    .describe("Absolute URL to the submission PDF, served from the public R2 domain (`r2.diuqbank.com`)."),
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
  viewCount: z
    .number()
    .int()
    .describe("Number of times this submission has been viewed."),
  createdAt: z.number().int().describe("Unix epoch seconds (UTC)"),
  pdfUrl: z
    .string()
    .nullable()
    .describe("Absolute URL to the submission PDF, served from the public R2 domain (`r2.diuqbank.com`)."),
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
  viewCount: z
    .number()
    .int()
    .describe("Total views across all of this question's submissions."),
  department,
  course,
  semester,
  examType,
});

const questionSubmissions = z.object({
  data: z.array(publicSubmission),
});

const manualSubmissionStatusEnum = z.enum(["pending", "published", "rejected"]);

const manualSubmission = z.object({
  id: z.number().int(),
  status: manualSubmissionStatusEnum,
  departmentName: z.string().nullable(),
  courseName: z.string().nullable(),
  semesterName: z.string().nullable(),
  examTypeName: z.string().nullable(),
  section: z.string().nullable(),
  batch: z.string().nullable(),
  rejectedReason: z.string().nullable(),
  questionId: z.number().int().nullable(),
  submissionId: z.number().int().nullable(),
  pdfUrl: z
    .string()
    .nullable()
    .describe("Absolute URL to the uploaded PDF, served from the public R2 domain (`r2.diuqbank.com`)."),
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
  viewCount: z
    .number()
    .int()
    .describe("Total views across all of this question's submissions."),
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
  viewCount: z
    .number()
    .int()
    .describe("Number of times this submission has been viewed."),
  watermarkStatus: z.enum(["awaiting", "completed", "failed"]),
  watermarkError: z.string().nullable(),
  pdfUrl: z
    .string()
    .nullable()
    .describe("Absolute URL to the original PDF, served from the public R2 domain (`r2.diuqbank.com`)."),
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
const adminSubmissionDetail = adminSubmission.extend({
  manualSubmissionId: z
    .number()
    .int()
    .nullable()
    .describe(
      "Id of the manual submission this submission was published from, if any.",
    ),
});

const adminManualSubmission = z.object({
  id: z.number().int(),
  userId: z.number().int(),
  legacyId: z
    .number()
    .int()
    .nullable()
    .describe("Source id when bulk-imported from legacy diuqbank.com; else null."),
  legacyViews: z
    .number()
    .int()
    .nullable()
    .describe(
      "View count carried over from the legacy site; seeds the submission's view count on publish. Null for normal uploads.",
    ),
  contributor: user,
  status: manualSubmissionStatusEnum,
  departmentName: z.string().nullable(),
  courseName: z.string().nullable(),
  semesterName: z.string().nullable(),
  examTypeName: z.string().nullable(),
  section: z.string().nullable(),
  batch: z.string().nullable(),
  fileSize: z.number().int().describe("Size of the uploaded PDF in bytes."),
  rejectedReason: z.string().nullable(),
  reviewedBy: z.number().int().nullable(),
  reviewer: user.nullable(),
  questionId: z.number().int().nullable(),
  submissionId: z.number().int().nullable(),
  pdfUrl: z
    .string()
    .nullable()
    .describe("Absolute URL to the uploaded PDF, served from the public R2 domain (`r2.diuqbank.com`)."),
  createdAt: z.number().int().describe("Unix epoch seconds (UTC)"),
});

const adminManualSubmissionList = z.object({
  data: z.array(adminManualSubmission),
  meta: paginationMeta,
});

const adminContributorStats = z
  .object({
    liveSubmissionCount: z
      .number()
      .int()
      .describe("Live submissions currently on the site."),
    manualPublished: z.number().int(),
    manualRejected: z.number().int(),
    manualPending: z.number().int(),
  })
  .describe(
    "Review-history overview of a contributor, so admins can judge the uploader's track record at a glance.",
  );

const taxonomyMatches = z
  .object({
    departmentId: z.number().int().nullable(),
    courseId: z
      .number()
      .int()
      .nullable()
      .describe(
        "Matched within the matched department; always null while the department is unmatched.",
      ),
    semesterId: z.number().int().nullable(),
    examTypeId: z.number().int().nullable(),
  })
  .describe(
    "Which existing taxonomy entity each free-text value resolves to (case-insensitive), or null when none exists yet. Approving requires every id to be non-null.",
  );

const adminManualSubmissionDetail = adminManualSubmission.extend({
  contributorStats: adminContributorStats,
  taxonomyMatches,
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

// Backup run metadata (from `backup-meta.json`), returned by GET /admin/backups
// and POST /admin/backups/run.
const backupArtifact = z.object({
  key: z.string().describe("Object key in the private backup bucket."),
  size: z.number().int().nullable().describe("Size in bytes, or null if it failed."),
  status: z.enum(["ok", "failed"]),
  error: z.string().nullable().describe("Failure detail when `status` is `failed`."),
});
const backupMeta = z.object({
  generatedAt: z.string().describe("ISO 8601 timestamp of when the run started."),
  fileCount: z.number().int().describe("Referenced files captured in the manifest."),
  manifest: backupArtifact,
  database: backupArtifact,
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
      departmentName: {
        type: "string",
        maxLength: 100,
        description:
          "Department name as free text. Pick an existing department when possible; new values need an admin to create the department before the submission can be approved.",
      },
      courseName: {
        type: "string",
        maxLength: 150,
        description:
          "Course name as free text (scoped to the department). New values need an admin to create the course before approval.",
      },
      semesterName: {
        type: "string",
        maxLength: 100,
        description:
          "Semester name as free text, e.g. \"Spring 25\". New values need an admin to create the semester before approval.",
      },
      examTypeName: {
        type: "string",
        enum: [...ALLOWED_EXAM_TYPES],
        description: "One of the platform's allowed exam types.",
      },
      section: { type: "string", maxLength: 100, description: "Optional section label." },
      batch: { type: "string", maxLength: 100, description: "Optional batch label." },
    },
    required: ["pdf", "departmentName", "courseName", "semesterName", "examTypeName"],
  },

  // Admin request bodies (derived from the route validation schemas).
  MergeRequest: toSchema(mergeSchema),
  MergeSummary: toSchema(mergeSummary),
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
  IncrementSubmissionView: toSchema(submissionViewIncrementSchema),
  SubmissionView: toSchema(submissionViewSchema),
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
  // Admin response models.
  DepartmentList: toSchema(departmentList),
  CourseList: toSchema(courseList),
  SemesterList: toSchema(semesterList),
  ExamTypeList: toSchema(examTypeList),
  AdminQuestion: toSchema(adminQuestion),
  AdminQuestionList: toSchema(adminQuestionList),
  AdminSubmission: toSchema(adminSubmission),
  AdminSubmissionDetail: toSchema(adminSubmissionDetail),
  AdminSubmissionList: toSchema(adminSubmissionList),
  AdminManualSubmission: toSchema(adminManualSubmission),
  AdminManualSubmissionDetail: toSchema(adminManualSubmissionDetail),
  AdminManualSubmissionList: toSchema(adminManualSubmissionList),
  AdminContributorStats: toSchema(adminContributorStats),
  TaxonomyMatches: toSchema(taxonomyMatches),
  AdminUser: toSchema(adminUser),
  AdminUserList: toSchema(adminUserList),
  BackupArtifact: toSchema(backupArtifact),
  BackupMeta: toSchema(backupMeta),
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

// `POST /admin/<base>/merge` — fold several entities into a keeper.
const mergeResource = (cfg: {
  base: string;
  tag: string;
  noun: string;
  nounPlural: string;
  itemRef: SchemaName;
}) => ({
  [`${cfg.base}/merge`]: {
    post: {
      tags: [cfg.tag],
      summary: `Merge ${cfg.nounPlural}`,
      ...authFields(
        "Admin",
        `Folds every ${cfg.noun} in \`mergeIds\` into the \`keepId\` ${cfg.noun}: ` +
          `all references are repointed to the keeper and the merged ${cfg.nounPlural} are deleted. ` +
          `Questions that collapse onto the same combination are auto-merged (the lowest-id question survives). ` +
          `Send \`dryRun: true\` to receive the projected impact without writing.`,
      ),
      requestBody: { required: true, content: json(ref("MergeRequest")) },
      responses: {
        "200": okJson("Merge applied, or (when `dryRun`) the projected impact", {
          type: "object",
          properties: {
            keeper: ref(cfg.itemRef),
            summary: ref("MergeSummary"),
            preview: ref("MergeSummary"),
          },
          required: ["keeper"],
        }),
        "400": commonErrors["400"],
        "401": commonErrors["401"],
        "403": commonErrors["403"],
        "404": commonErrors["404"],
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
      enum: ["pending", "published", "rejected"],
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
  ...mergeResource({
    base: "/admin/departments",
    tag: "admin-departments",
    noun: "department",
    nounPlural: "departments",
    itemRef: "Department",
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
  ...mergeResource({
    base: "/admin/courses",
    tag: "admin-courses",
    noun: "course",
    nounPlural: "courses",
    itemRef: "Course",
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
  ...mergeResource({
    base: "/admin/semesters",
    tag: "admin-semesters",
    noun: "semester",
    nounPlural: "semesters",
    itemRef: "Semester",
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
  ...mergeResource({
    base: "/admin/exam-types",
    tag: "admin-exam-types",
    noun: "exam type",
    nounPlural: "exam types",
    itemRef: "ExamType",
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
      ...authFields(
        "Admin",
        "A single submission with its question, contributor, file URLs, and the id of the manual submission it was published from (if any).",
      ),
      parameters: [idPathParam("Submission")],
      responses: {
        "200": okJson("OK", ref("AdminSubmissionDetail")),
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
  "/admin/submissions/{id}/views": {
    post: {
      tags: ["admin-submissions"],
      summary: "Increment a submission's view count",
      ...authFields(
        "Admin",
        "Increments the submission's `viewCount`. Optional JSON body `{ by?: number }` (positive integer, default 1) adds several views at once. The parent question's summed `viewCount` is updated automatically at the database level.",
      ),
      parameters: [idPathParam("Submission")],
      requestBody: {
        required: false,
        content: json(ref("IncrementSubmissionView")),
      },
      responses: {
        "200": okJson("Updated", ref("AdminSubmission")),
        "400": errResp("Validation failed (`by` must be a positive integer)"),
        "401": commonErrors["401"],
        "403": commonErrors["403"],
        "404": commonErrors["404"],
      },
    },
  },
  "/admin/manual-submissions": {
    get: {
      tags: ["admin-manual-submissions"],
      summary: "List manual submissions",
      ...authFields(
        "Admin",
        "Paginated review queue for manual submissions. Filter by status or user. `pending` rows are the ones awaiting an admin.",
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
        "Returns the uploader's metadata, submitter, reviewer, PDF URL, linked records once published, the contributor's review-history stats, and `taxonomyMatches` — which existing taxonomy entity each free-text value resolves to (null = missing; approval is blocked until every value matches).",
      ),
      parameters: [idPathParam("Manual submission")],
      responses: {
        "200": okJson("OK", ref("AdminManualSubmissionDetail")),
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
        "Corrects the uploader's metadata (department, course, semester, exam type, section, batch) before approving — e.g. to align a free-text value with an existing taxonomy entity. Published rows are immutable.",
      ),
      parameters: [idPathParam("Manual submission")],
      requestBody: {
        required: true,
        content: json(ref("UpdateManualSubmission")),
      },
      responses: {
        "200": okJson("Updated", ref("AdminManualSubmissionDetail")),
        "400": commonErrors["400"],
        "401": commonErrors["401"],
        "403": commonErrors["403"],
        "404": commonErrors["404"],
        "409": errResp("Published manual submissions cannot be edited"),
      },
    },
    delete: {
      tags: ["admin-manual-submissions"],
      summary: "Delete a manual submission",
      ...authFields(
        "Admin",
        "Deletes the manual-submission record and its original uploaded PDF. The published live submission (with its own copied PDF) is unaffected.",
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
        "Publishes a pending manual submission as a live submission. Every free-text taxonomy value must resolve to an EXISTING entity (case-insensitive) — this endpoint never creates taxonomy; a `409` lists the missing entities so the admin can create them (or edit the values) first. On success the question row is find-or-created from the resolved ids, the PDF is copied into `submissions/`, the live submission is created and linked, and the reviewing admin is recorded.",
      ),
      parameters: [idPathParam("Manual submission")],
      responses: {
        "200": okJson("Approved", ref("AdminManualSubmissionDetail")),
        "400": errResp("Required metadata is missing — fill it in before approving"),
        "401": commonErrors["401"],
        "403": commonErrors["403"],
        "404": commonErrors["404"],
        "409": errResp(
          "Missing taxonomy entities, already published, or the PDF is missing from storage",
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
        "Rejects an unpublished manual submission with a required reason and records the reviewing admin.",
      ),
      parameters: [idPathParam("Manual submission")],
      requestBody: {
        required: true,
        content: json(ref("RejectManualSubmission")),
      },
      responses: {
        "200": okJson("Rejected", ref("AdminManualSubmissionDetail")),
        "400": commonErrors["400"],
        "401": commonErrors["401"],
        "403": commonErrors["403"],
        "404": commonErrors["404"],
        "409": errResp("Published manual submissions cannot be rejected"),
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
          "Deletes a user only when no live or manual submissions reference them. You cannot delete your own account.",
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
  "/admin/backups": {
    get: {
      tags: ["admin-backups"],
      summary: "Get latest backup metadata",
      ...authFields(
        "Admin",
        "Metadata about the most recent backup run: timestamp, referenced-file count, and per-artifact byte size and status. `404` until the first run.",
      ),
      responses: {
        "200": okJson("OK", ref("BackupMeta")),
        "401": commonErrors["401"],
        "403": commonErrors["403"],
        "404": errResp("No backup has been generated yet"),
      },
    },
  },
  "/admin/backups/manifest": {
    get: {
      tags: ["admin-backups"],
      summary: "Download the referenced-files manifest",
      ...authFields(
        "Admin",
        "Downloads `files-manifest.json`: for every R2 object the database references, its download URL, folder path, and file name. Regenerated every 6 hours.",
      ),
      responses: {
        "200": {
          description: "The manifest JSON.",
          content: { "application/json": { schema: { type: "object" } } },
        },
        "401": commonErrors["401"],
        "403": commonErrors["403"],
        "404": errResp("No manifest has been generated yet"),
      },
    },
  },
  "/admin/backups/database": {
    get: {
      tags: ["admin-backups"],
      summary: "Download the database SQL dump",
      ...authFields(
        "Admin",
        "Downloads the latest D1 SQL dump (`database-backup.sql`, schema + data). Regenerated every 6 hours.",
      ),
      responses: {
        "200": {
          description: "The SQL dump.",
          content: { "application/sql": { schema: { type: "string", format: "binary" } } },
        },
        "401": commonErrors["401"],
        "403": commonErrors["403"],
        "404": errResp("No database backup has been generated yet"),
      },
    },
  },
  "/admin/backups/run": {
    post: {
      tags: ["admin-backups"],
      summary: "Generate a backup snapshot now",
      ...authFields(
        "Admin",
        "Runs the same routine as the 6-hourly cron on demand: rewrites the files manifest and D1 SQL dump, and returns the run metadata.",
      ),
      responses: {
        "200": okJson("Backup complete", ref("BackupMeta")),
        "401": commonErrors["401"],
        "403": commonErrors["403"],
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
      name: "contributors",
      description: "Public read access to contributors (users who have submitted).",
    },
    {
      name: "questions",
      description: "Public read access to the question bank.",
    },
    {
      name: "submissions",
      description: "Public, reCAPTCHA-protected view counting for submissions.",
    },
    {
      name: "filter-options",
      description: "Lookup entities (departments, courses, semesters, exam types) for the filter UI.",
    },
    {
      name: "manual-submissions",
      description:
        "Signed-in users: upload a PDF with its metadata typed as free text; an admin reviews it before it goes live.",
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
    { name: "admin-users", description: "Admin: manage users." },
    {
      name: "admin-backups",
      description: "Admin: download the referenced-files manifest and DB backup.",
    },
  ],
  "x-tagGroups": [
    {
      name: "Non-admin",
      tags: [
        "auth",
        "contributors",
        "questions",
        "submissions",
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
        "admin-users",
        "admin-backups",
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
          "429": errResp("Too many sign-in attempts from this IP"),
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
          "A contributor's own submissions, newest first. Paginated. Each row carries its parent question (`id` + `title`) instead of the contributor, and links to its PDF via `pdfUrl` (served from the public R2 domain).",
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
          "**All** submissions for a question (no pagination — a single question has few). Each submission links to its PDF via `pdfUrl` (served from the public R2 domain) and includes the contributor, if any.",
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
    "/submissions/{id}/views": {
      post: {
        tags: ["submissions"],
        summary: "Count a submission view",
        ...authFields(
          "Public",
          "Records one view for a submission. Requires a Google reCAPTCHA v3 token in the JSON body `{ token }` (single-use, ~2-minute expiry — obtain a fresh one per view). Call `grecaptcha.execute()` with **site key `6LfNQUMtAAAAALqjSZZS8oIFmJQXA-xAv-z03KvH`** to obtain the token. The view is buffered in Analytics Engine and flushed into `viewCount` by a cron every ~15 minutes, so the increment is not reflected in reads immediately. No auth and no rate limiting.",
        ),
        parameters: [idPathParam("Submission")],
        requestBody: { required: true, content: json(ref("SubmissionView")) },
        responses: {
          "202": { description: "Accepted — the view was buffered" },
          "400": errResp("Validation failed (missing or empty `token`)"),
          "403": errResp("reCAPTCHA verification failed"),
          "404": errResp("Submission not found (invalid id)"),
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
          "Uploads a PDF plus the paper's metadata as free text (department, course, semester, exam type; the UI suggests existing values but new ones are allowed). The submission starts as `pending` and becomes a live submission once an admin approves it.",
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
          "429": errResp("Upload rate limit exceeded"),
        },
      },
    },
    "/manual-submissions/{id}": {
      get: {
        tags: ["manual-submissions"],
        summary: "Get one of your manual submissions",
        ...authFields(
          "User",
          "A single manual submission you own, including its review status, the rejection reason if any, and the linked live submission once published.",
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
          "Deletes a manual submission only when it belongs to the authenticated user, then removes its PDF from storage. Published manual submissions cannot be deleted by users.",
        ),
        parameters: [idPathParam("Manual submission")],
        responses: {
          "204": noContent,
          "401": commonErrors["401"],
          "404": commonErrors["404"],
          "409": errResp("Published manual submissions cannot be deleted by users"),
        },
      },
    },
    ...adminPaths,
  },
});

export const openApiDoc = buildOpenApiDoc();
