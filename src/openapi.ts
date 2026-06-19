import { z } from "zod";

import { googleSignInSchema } from "./schemas/auth";

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

const componentSchemas = {
  GoogleSignIn: toSchema(googleSignInSchema),
  AuthConfig: toSchema(authConfig),
  User: toSchema(user),
  AuthResponse: toSchema(authResponse),
  ErrorResponse: toSchema(errorResponse),
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
      description: "Sign in with Google and read the currently signed-in user.",
    },
  ],
  "x-tagGroups": [
    { name: "Public", tags: ["auth"] },
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
          "200": okJson("OK", {
            type: "object",
            properties: { user: ref("User") },
            required: ["user"],
          }),
          "401": commonErrors["401"],
          "404": commonErrors["404"],
        },
      },
    },
  },
});

export const openApiDoc = buildOpenApiDoc();
