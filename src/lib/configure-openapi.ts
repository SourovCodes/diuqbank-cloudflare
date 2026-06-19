import { Scalar } from "@scalar/hono-api-reference";

import type { AppOpenAPI } from "../types";

/**
 * Register the OpenAPI document, the Bearer security scheme, and the Scalar
 * documentation UI on the root app.
 *
 * - Spec JSON:  GET /openapi.json
 * - Docs UI:    GET /reference
 */
export function configureOpenAPI(app: AppOpenAPI) {
  app.openAPIRegistry.registerComponent("securitySchemes", "Bearer", {
    type: "http",
    scheme: "bearer",
    bearerFormat: "JWT",
  });

  app.doc31("/openapi.json", {
    openapi: "3.1.0",
    info: {
      version: "1.0.0",
      title: "DIU QuestionBank API",
      description: "Backend API for DIU QuestionBank, running on Cloudflare Workers.",
    },
  });

  app.get(
    "/reference",
    Scalar({
      url: "/openapi.json",
      pageTitle: "DIU QuestionBank API",
      theme: "kepler",
    }),
  );
}
