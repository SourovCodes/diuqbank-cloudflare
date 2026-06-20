import { z } from "zod";

import { googleSignInSchema } from "./schemas/auth";
import { profileUpdateSchema } from "./schemas/profile";

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
  watermarkStatus: z.enum(["awaiting", "completed", "failed"]),
  createdAt: z.number().int().describe("Unix epoch seconds (UTC)"),
  pdfUrl: z
    .string()
    .nullable()
    .describe("Absolute URL to the submission PDF, served by `GET /files/:key`."),
  contributor: contributorSummary.nullable(),
});

const questionDetail = z.object({
  id: z.number().int(),
  submissionCount: z.number().int(),
  department,
  course,
  semester,
  examType,
});

const questionSubmissions = z.object({
  data: z.array(publicSubmission),
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
  QuestionListItem: toSchema(questionListItem),
  QuestionList: toSchema(questionList),
  PublicSubmission: toSchema(publicSubmission),
  QuestionDetail: toSchema(questionDetail),
  QuestionSubmissions: toSchema(questionSubmissions),
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
  "404": errResp("Resource not found"),
};

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
// Document
// ---------------------------------------------------------------------------

const infoDescription = `Backend API for **DIU QuestionBank**, running on Cloudflare Workers.

## Authentication

Sign in with Google. Obtain a Google ID token client-side (Google Sign-In), then exchange it for a
DIU QuestionBank JWT:

\`\`\`http
POST /auth/google
Content-Type: application/json

{ "idToken": "<google-id-token>" }
\`\`\`

The response includes a JWT — pass it on every authenticated request:

\`\`\`
Authorization: Bearer <token>
\`\`\`

If the verified email already exists, the existing user is signed in (\`200\`). If not, a new user
is created with an opaque generated username and \`role: "user"\` (\`201\`).

## Conventions

- All timestamps are **Unix epoch seconds** (UTC integers), not ISO 8601 strings.
- Errors return \`{ "error": "<message>" }\`. Validation failures additionally include an
  \`issues\` array with field-level details.`;

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
  ],
  "x-tagGroups": [
    {
      name: "Public",
      tags: ["auth", "files", "contributors", "questions", "filter-options"],
    },
    // The "Admin" group is reserved for future admin-only routes.
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
          "Exchange a Google ID token for a DIU QuestionBank JWT. Existing email → `200`; new user created → `201`. The response shape is the same in both cases.",
        ),
        requestBody: { required: true, content: json(ref("GoogleSignIn")) },
        responses: {
          "200": okJson("Authenticated — existing user", ref("AuthResponse")),
          "201": okJson("Authenticated — new user created", ref("AuthResponse")),
          "400": commonErrors["400"],
          "401": errResp("Invalid or expired Google ID token"),
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
  },
});

export const openApiDoc = buildOpenApiDoc();
