import { createRouter } from "../../lib/create-app";
import { loginHandler, meHandler, registerHandler } from "./auth.handlers";
import { login, me, register } from "./auth.routes";

export const authRouter = createRouter()
  .openapi(register, registerHandler)
  .openapi(login, loginHandler)
  .openapi(me, meHandler);
