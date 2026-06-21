import type { components } from "@diuqbank/api-client";

export type AuthUser = components["schemas"]["User"];
export type ProfileUpdate = components["schemas"]["ProfileUpdate"];

type AuthResponse = components["schemas"]["AuthResponse"];
type UserResponse = { user: AuthUser };
type ErrorResponse = components["schemas"]["ErrorResponse"];

const API_ORIGIN = (
  process.env.NEXT_PUBLIC_API_ORIGIN ??
  "https://diuqbank.sourovcodes.workers.dev"
).replace(/\/$/, "");

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_ORIGIN}${path}`, init);
  const payload = (await response.json().catch(() => null)) as
    | T
    | ErrorResponse
    | null;

  if (!response.ok) {
    const error = payload as ErrorResponse | null;
    const issue = error?.issues?.[0]?.message;
    throw new ApiError(issue ?? error?.error ?? "Something went wrong", response.status);
  }

  return payload as T;
}

const bearerHeaders = (token: string, headers?: HeadersInit) => ({
  ...Object.fromEntries(new Headers(headers).entries()),
  Authorization: `Bearer ${token}`,
});

export const signInWithGoogle = (idToken: string) =>
  request<AuthResponse>("/auth/google", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken }),
  });

export const getMe = (token: string) =>
  request<UserResponse>("/auth/me", {
    headers: bearerHeaders(token),
  });

export const updateMe = (token: string, input: ProfileUpdate) =>
  request<UserResponse>("/auth/me", {
    method: "PATCH",
    headers: bearerHeaders(token, { "Content-Type": "application/json" }),
    body: JSON.stringify(input),
  });

export const uploadProfileImage = (token: string, image: File) => {
  const body = new FormData();
  body.set("image", image);

  return request<UserResponse>("/auth/me/image", {
    method: "PUT",
    headers: bearerHeaders(token),
    body,
  });
};
