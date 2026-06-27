// Imports public submissions from https://diuqbank.com/public/submissions
// into ./scripts/import.sql. Idempotent (INSERT OR IGNORE keyed on the
// external ids, which we preserve as our local ids).
//
// PDFs are NOT downloaded. Each submission gets `pdf_key='test.pdf'`; the
// existing file-serving endpoint (GET /files/:key) streams /files/test.pdf,
// a single dummy PDF you upload to the R2 bucket (diuqbank-files) manually.
//
// Apply with: pnpm db:import:local (or db:import:remote)

import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

const API = "https://diuqbank.com/public/submissions";

type ExtMedia = { size: number };
type ExtUser = {
  id: number;
  name: string;
  username: string;
  email: string;
  created_at: string;
};
type ExtDept = { id: number; name: string; short_name: string };
type ExtCourse = { id: number; department_id: number; name: string };
type ExtSemester = { id: number; name: string };
type ExtExamType = { id: number; name: string };
type ExtQuestion = {
  id: number;
  department_id: number;
  course_id: number;
  semester_id: number;
  exam_type_id: number;
  department: ExtDept;
  course: ExtCourse;
  semester: ExtSemester;
  exam_type: ExtExamType;
};
type ExtSubmission = {
  id: number;
  question_id: number;
  user_id: number;
  section: string | null;
  created_at: string;
  media: ExtMedia[];
  user: ExtUser;
  question: ExtQuestion;
};
type Page = {
  data: ExtSubmission[];
  meta: { current_page: number; last_page: number; total: number };
};

const esc = (s: string) => s.replace(/'/g, "''");
const toUnix = (iso: string) => Math.floor(new Date(iso).getTime() / 1000);

const fetchPage = async (page: number): Promise<Page> => {
  const res = await fetch(`${API}?page=${page}`);
  if (!res.ok) throw new Error(`page ${page} failed: ${res.status}`);
  return (await res.json()) as Page;
};

const main = async () => {
  console.log("Fetching page 1 to discover pagination…");
  const first = await fetchPage(1);
  const totalPages = first.meta.last_page;
  console.log(
    `Total: ${first.meta.total} submissions across ${totalPages} pages.`,
  );

  const all: ExtSubmission[] = [...first.data];
  for (let p = 2; p <= totalPages; p++) {
    process.stdout.write(`  fetching page ${p}/${totalPages}\r`);
    const page = await fetchPage(p);
    all.push(...page.data);
  }
  console.log(`\nFetched ${all.length} submissions.`);

  // Dedup entities by external id across pages.
  const depts = new Map<number, ExtDept>();
  const courses = new Map<number, ExtCourse>();
  const semesters = new Map<number, ExtSemester>();
  const examTypes = new Map<number, ExtExamType>();
  const users = new Map<number, ExtUser>();
  const questions = new Map<number, ExtQuestion>();

  for (const s of all) {
    depts.set(s.question.department.id, s.question.department);
    courses.set(s.question.course.id, s.question.course);
    semesters.set(s.question.semester.id, s.question.semester);
    examTypes.set(s.question.exam_type.id, s.question.exam_type);
    users.set(s.user.id, s.user);
    questions.set(s.question.id, s.question);
  }

  // Some source rows violate our local unique constraints — e.g. the source
  // has two course rows with the same (department_id, name) under different
  // ids. INSERT OR IGNORE would silently skip the second insert, leaving any
  // question that references the dropped id orphaned at FK-check time.
  //
  // Resolve by picking the lowest external id as canonical for each unique
  // tuple, and aliasing every other id to it. Aliases cascade: course alias
  // is applied before question dedup; question alias is applied to submissions.
  const dedupe = <T>(
    items: Iterable<[number, T]>,
    keyOf: (t: T) => string,
  ): { kept: Map<number, T>; alias: Map<number, number> } => {
    const sorted = [...items].sort(([a], [b]) => a - b);
    const kept = new Map<number, T>();
    const alias = new Map<number, number>();
    const byKey = new Map<string, number>();
    for (const [id, item] of sorted) {
      const k = keyOf(item);
      const winner = byKey.get(k);
      if (winner !== undefined) {
        alias.set(id, winner);
      } else {
        byKey.set(k, id);
        kept.set(id, item);
      }
    }
    return { kept, alias };
  };

  const resolveId = (alias: Map<number, number>, id: number) =>
    alias.get(id) ?? id;

  const deptDedup = dedupe(depts.entries(), (d) => d.short_name.toLowerCase());
  const courseDedup = dedupe(
    courses.entries(),
    (c) =>
      `${resolveId(deptDedup.alias, c.department_id)}|${c.name.toLowerCase().trim()}`,
  );
  const semDedup = dedupe(semesters.entries(), (s) =>
    s.name.toLowerCase().trim(),
  );
  const examDedup = dedupe(examTypes.entries(), (e) =>
    e.name.toLowerCase().trim(),
  );
  const userDedup = dedupe(users.entries(), (u) => u.email.toLowerCase());

  // Apply FK aliases to questions, then dedupe questions on the resolved tuple.
  const questionsResolved = new Map<number, ExtQuestion>();
  for (const [id, q] of questions) {
    questionsResolved.set(id, {
      ...q,
      department_id: resolveId(deptDedup.alias, q.department_id),
      course_id: resolveId(courseDedup.alias, q.course_id),
      semester_id: resolveId(semDedup.alias, q.semester_id),
      exam_type_id: resolveId(examDedup.alias, q.exam_type_id),
    });
  }
  const questionDedup = dedupe(
    questionsResolved.entries(),
    (q) =>
      `${q.department_id}|${q.course_id}|${q.semester_id}|${q.exam_type_id}`,
  );

  const lines: string[] = [];
  const out = (s: string) => lines.push(s);

  out("-- diuqbank import (generated by scripts/import.ts — do not edit)");
  out("-- DESTRUCTIVE: wipes the affected tables so external ids drop in cleanly.");
  out("-- (Pre-existing rows with the same unique fields but different ids would");
  out("-- otherwise block this import and orphan FK references.)");
  out("");
  out("DELETE FROM submissions;");
  out("DELETE FROM questions;");
  out("DELETE FROM courses;");
  out("DELETE FROM departments;");
  out("DELETE FROM semesters;");
  out("DELETE FROM exam_types;");
  out("DELETE FROM users;");
  out(
    "DELETE FROM sqlite_sequence WHERE name IN ('submissions','questions','courses','departments','semesters','exam_types','users');",
  );
  out("");

  out("-- departments");
  for (const d of deptDedup.kept.values()) {
    out(
      `INSERT OR IGNORE INTO departments (id, name, short_name) VALUES (${d.id}, '${esc(d.name)}', '${esc(d.short_name)}');`,
    );
  }
  out("");

  out("-- courses");
  for (const c of courseDedup.kept.values()) {
    const deptId = resolveId(deptDedup.alias, c.department_id);
    out(
      `INSERT OR IGNORE INTO courses (id, department_id, name) VALUES (${c.id}, ${deptId}, '${esc(c.name)}');`,
    );
  }
  out("");

  out("-- semesters");
  for (const s of semDedup.kept.values()) {
    out(
      `INSERT OR IGNORE INTO semesters (id, name) VALUES (${s.id}, '${esc(s.name)}');`,
    );
  }
  out("");

  out("-- exam_types");
  for (const e of examDedup.kept.values()) {
    out(
      `INSERT OR IGNORE INTO exam_types (id, name) VALUES (${e.id}, '${esc(e.name)}');`,
    );
  }
  out("");

  out("-- users");
  for (const u of userDedup.kept.values()) {
    out(
      `INSERT OR IGNORE INTO users (id, name, email, username, role, created_at) ` +
        `VALUES (${u.id}, '${esc(u.name)}', '${esc(u.email)}', '${esc(u.username)}', 'user', ${toUnix(u.created_at)});`,
    );
  }
  out("");

  out("-- questions");
  for (const q of questionDedup.kept.values()) {
    out(
      `INSERT OR IGNORE INTO questions (id, department_id, course_id, semester_id, exam_type_id) ` +
        `VALUES (${q.id}, ${q.department_id}, ${q.course_id}, ${q.semester_id}, ${q.exam_type_id});`,
    );
  }
  out("");

  out("-- submissions (pdf_key='test.pdf' — GET /files/test.pdf serves a dummy)");
  for (const s of all) {
    const section = s.section === null ? "NULL" : `'${esc(s.section)}'`;
    const fileSize = s.media?.[0]?.size ?? 0;
    const questionId = resolveId(questionDedup.alias, s.question_id);
    const userId = resolveId(userDedup.alias, s.user_id);
    out(
      `INSERT OR IGNORE INTO submissions (id, question_id, user_id, section, batch, pdf_key, file_size, watermark_status, created_at) ` +
        `VALUES (${s.id}, ${questionId}, ${userId}, ${section}, NULL, 'test.pdf', ${fileSize}, 'completed', ${toUnix(s.created_at)});`,
    );
  }
  out("");

  const targetPath = resolve(import.meta.dirname ?? ".", "import.sql");
  writeFileSync(targetPath, lines.join("\n"), "utf8");
  const alias = (m: Map<number, number>) => (m.size ? ` (${m.size} aliased)` : "");
  console.log(`Wrote ${targetPath}`);
  console.log(`  departments: ${deptDedup.kept.size}${alias(deptDedup.alias)}`);
  console.log(`  courses:     ${courseDedup.kept.size}${alias(courseDedup.alias)}`);
  console.log(`  semesters:   ${semDedup.kept.size}${alias(semDedup.alias)}`);
  console.log(`  exam_types:  ${examDedup.kept.size}${alias(examDedup.alias)}`);
  console.log(`  users:       ${userDedup.kept.size}${alias(userDedup.alias)}`);
  console.log(`  questions:   ${questionDedup.kept.size}${alias(questionDedup.alias)}`);
  console.log(`  submissions: ${all.length}`);
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
