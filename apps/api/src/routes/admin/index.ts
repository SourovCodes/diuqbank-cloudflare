import { Hono } from "hono";

import { requireAdmin, requireAuth } from "../../middleware/auth";
import type { AppEnv } from "../../types";
import autoSubmissions from "./auto-submissions";
import backups from "./backups";
import courses from "./courses";
import departments from "./departments";
import examTypes from "./exam-types";
import questions from "./questions";
import semesters from "./semesters";
import submissions from "./submissions";
import users from "./users";

const admin = new Hono<AppEnv>();

// Every admin route requires a valid token from an account with role "admin".
admin.use("*", requireAuth, requireAdmin);

admin.route("/departments", departments);
admin.route("/courses", courses);
admin.route("/semesters", semesters);
admin.route("/exam-types", examTypes);
admin.route("/auto-submissions", autoSubmissions);
admin.route("/questions", questions);
admin.route("/submissions", submissions);
admin.route("/users", users);
admin.route("/backups", backups);

export default admin;
