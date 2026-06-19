import type { OpenAPIHono, RouteConfig, RouteHandler } from "@hono/zod-openapi";

import type { AppBindings } from "./env";

/** An OpenAPIHono app/router pre-bound to our environment. */
export type AppOpenAPI = OpenAPIHono<AppBindings>;

/** A route handler whose context is typed against a specific route + our bindings. */
export type AppRouteHandler<R extends RouteConfig> = RouteHandler<R, AppBindings>;
