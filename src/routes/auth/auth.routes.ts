import { createRoute, z } from "@hono/zod-openapi";

import { requireAuth } from "../../middlewares/require-auth";

// ---- Schemas -------------------------------------------------------------

const UserSchema = z
  .object({
    id: z.number().int().openapi({ example: 1 }),
    email: z.email().openapi({ example: "student@diu.edu.bd" }),
    name: z.string().openapi({ example: "Rahim Uddin" }),
    createdAt: z
      .string()
      .openapi({ example: "2026-06-20T10:00:00.000Z", description: "ISO 8601 timestamp" }),
  })
  .openapi("User");

const RegisterBody = z
  .object({
    email: z.email().openapi({ example: "student@diu.edu.bd" }),
    name: z.string().min(1).max(100).openapi({ example: "Rahim Uddin" }),
    password: z.string().min(8).max(256).openapi({ example: "s3curePassw0rd" }),
  })
  .openapi("RegisterBody");

const LoginBody = z
  .object({
    email: z.email().openapi({ example: "student@diu.edu.bd" }),
    password: z.string().min(1).openapi({ example: "s3curePassw0rd" }),
  })
  .openapi("LoginBody");

const AuthResponse = z
  .object({ user: UserSchema, token: z.string() })
  .openapi("AuthResponse");

const MeResponse = z.object({ user: UserSchema }).openapi("MeResponse");

const ErrorResponse = z
  .object({ success: z.literal(false), message: z.string() })
  .openapi("ErrorResponse");

const ValidationErrorResponse = z
  .object({
    success: z.literal(false),
    error: z.object({
      formErrors: z.array(z.string()),
      fieldErrors: z.record(z.string(), z.array(z.string())),
    }),
  })
  .openapi("ValidationError");

const jsonContent = <T extends z.ZodTypeAny>(schema: T, description: string) => ({
  content: { "application/json": { schema } },
  description,
});

// ---- Routes --------------------------------------------------------------

export const register = createRoute({
  method: "post",
  path: "/auth/register",
  tags: ["Auth"],
  summary: "Register a new user",
  request: {
    body: {
      required: true,
      content: { "application/json": { schema: RegisterBody } },
    },
  },
  responses: {
    201: jsonContent(AuthResponse, "User created; returns the user and a JWT"),
    409: jsonContent(ErrorResponse, "Email already registered"),
    422: jsonContent(ValidationErrorResponse, "Validation error"),
  },
});

export const login = createRoute({
  method: "post",
  path: "/auth/login",
  tags: ["Auth"],
  summary: "Log in with email and password",
  request: {
    body: {
      required: true,
      content: { "application/json": { schema: LoginBody } },
    },
  },
  responses: {
    200: jsonContent(AuthResponse, "Logged in; returns the user and a JWT"),
    401: jsonContent(ErrorResponse, "Invalid email or password"),
    422: jsonContent(ValidationErrorResponse, "Validation error"),
  },
});

export const me = createRoute({
  method: "get",
  path: "/auth/me",
  tags: ["Auth"],
  summary: "Get the current authenticated user",
  security: [{ Bearer: [] }],
  middleware: [requireAuth],
  responses: {
    200: jsonContent(MeResponse, "The current authenticated user"),
    401: jsonContent(ErrorResponse, "Missing or invalid token"),
  },
});
