import { sign, verify } from "hono/jwt";

const SEVEN_DAYS_SECONDS = 60 * 60 * 24 * 7;
const ALG = "HS256";

export type AuthPayload = {
  sub: number;
  username: string;
  role: "admin" | "user";
  iat: number;
  exp: number;
};

export const signAuthToken = async (
  user: { id: number; username: string; role: "admin" | "user" },
  secret: string,
): Promise<string> => {
  const now = Math.floor(Date.now() / 1000);
  const payload: AuthPayload = {
    sub: user.id,
    username: user.username,
    role: user.role,
    iat: now,
    exp: now + SEVEN_DAYS_SECONDS,
  };
  return sign(payload, secret, ALG);
};

export const verifyAuthToken = async (
  token: string,
  secret: string,
): Promise<AuthPayload> => {
  return (await verify(token, secret, ALG)) as unknown as AuthPayload;
};
