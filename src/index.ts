import { configureOpenAPI } from "./lib/configure-openapi";
import { createApp } from "./lib/create-app";
import { authRouter } from "./routes/auth/auth.index";

const app = createApp();

configureOpenAPI(app);

// Simple health check / landing route.
app.get("/", (c) =>
  c.json({ status: "ok", service: "diuqbank", docs: "/reference", openapi: "/openapi.json" }),
);

// Feature routers. Each already carries its own path prefix (e.g. /auth/*),
// so they are mounted at the root. Add future routers to this list.
const routers = [authRouter] as const;
for (const router of routers) {
  app.route("/", router);
}

export default app;
