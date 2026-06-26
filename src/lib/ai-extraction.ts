import { asc } from "drizzle-orm";
import { z } from "zod";

import type { Db } from "../db/client";
import { courses, departments, examTypes, semesters } from "../db/schema";
import type { Bindings } from "../types";

const GEMINI_MODEL = "gemini-2.5-flash";

/**
 * What the model returns for one uploaded PDF. `isAcceptable` is a self-grading
 * quality gate; when false, `rejectionReason` explains why. Name fields are
 * null when the model couldn't determine them.
 */
export type AiExtraction = {
  isAcceptable: boolean;
  rejectionReason: string | null;
  departmentName: string | null;
  departmentShortName: string | null;
  courseName: string | null;
  semesterName: string | null;
  examTypeName: string | null;
  section: string | null;
  batch: string | null;
  reasoning: string;
};

/** Existing lookup values fed to the model so it reuses canonical names. */
export type Vocab = {
  departments: { name: string; shortName: string }[];
  courses: string[];
  semesters: string[];
  examTypes: string[];
};

/** Snapshot the lookup tables (same shape as the /filter-options endpoint). */
export const buildVocab = async (db: Db): Promise<Vocab> => {
  const [departmentRows, courseRows, semesterRows, examTypeRows] =
    await Promise.all([
      db
        .select({ name: departments.name, shortName: departments.shortName })
        .from(departments)
        .orderBy(asc(departments.name)),
      db.select({ name: courses.name }).from(courses).orderBy(asc(courses.name)),
      db.select({ name: semesters.name }).from(semesters).orderBy(asc(semesters.id)),
      db
        .select({ name: examTypes.name })
        .from(examTypes)
        .orderBy(asc(examTypes.name)),
    ]);

  return {
    departments: departmentRows,
    // Course names repeat across departments; de-dupe for the prompt.
    courses: [...new Set(courseRows.map((c) => c.name))],
    semesters: semesterRows.map((s) => s.name),
    examTypes: examTypeRows.map((e) => e.name),
  };
};

// Lenient parser for the model's JSON: tolerate missing/null fields, then
// normalize blanks to null.
const aiResultSchema = z.object({
  isAcceptable: z.boolean(),
  rejectionReason: z.string().nullish(),
  departmentName: z.string().nullish(),
  departmentShortName: z.string().nullish(),
  courseName: z.string().nullish(),
  semesterName: z.string().nullish(),
  examTypeName: z.string().nullish(),
  section: z.string().nullish(),
  batch: z.string().nullish(),
  reasoning: z.string().nullish(),
});

// Gemini structured-output schema (OpenAPI 3.0 subset). Keep in sync with
// AiExtraction above.
const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    isAcceptable: { type: "boolean" },
    rejectionReason: { type: "string", nullable: true },
    departmentName: { type: "string", nullable: true },
    departmentShortName: { type: "string", nullable: true },
    courseName: { type: "string", nullable: true },
    semesterName: { type: "string", nullable: true },
    examTypeName: { type: "string", nullable: true },
    section: { type: "string", nullable: true },
    batch: { type: "string", nullable: true },
    reasoning: { type: "string" },
  },
  required: ["isAcceptable", "reasoning"],
  propertyOrdering: [
    "isAcceptable",
    "rejectionReason",
    "departmentName",
    "departmentShortName",
    "courseName",
    "semesterName",
    "examTypeName",
    "section",
    "batch",
    "reasoning",
  ],
} as const;

type GeminiResponse = {
  candidates?: { content?: { parts?: { text?: string }[] } }[];
};

const clean = (value: string | null | undefined): string | null => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

// Encode an ArrayBuffer to base64 in chunks (a single
// String.fromCharCode(...bigArray) overflows the call stack on large PDFs).
const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = "";
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
};

const buildPrompt = (vocab: Vocab, extraContext: string | null): string => {
  const departmentList =
    vocab.departments.map((d) => `- ${d.name} (${d.shortName})`).join("\n") ||
    "(none yet)";
  const courseList = vocab.courses.map((c) => `- ${c}`).join("\n") || "(none yet)";
  const semesterList =
    vocab.semesters.map((s) => `- ${s}`).join("\n") || "(none yet)";
  const examTypeList =
    vocab.examTypes.map((e) => `- ${e}`).join("\n") || "(none yet)";

  return [
    "You extract metadata from a university exam question paper PDF for Daffodil International University (DIU).",
    "Return ONLY JSON matching the provided schema.",
    "",
    "## Task",
    "Identify the department, course, semester, exam type, and (only if printed) the section and batch.",
    "",
    "## Acceptance gate",
    "Set isAcceptable=false with a concrete rejectionReason if ANY of these fail:",
    "1. The document is a real exam question paper (not notes, a syllabus, an answer script, a blank form, or junk).",
    "2. The pages are legible enough to read the header / course information.",
    "3. It is a SINGLE exam paper (not several different papers concatenated).",
    "4. You can determine at least the department, course, semester, and exam type with reasonable confidence.",
    "",
    "## Matching rules",
    "Prefer the EXACT existing values below whenever the paper refers to the same thing — match spelling, casing,",
    "and abbreviations so we don't create duplicates. Only introduce a new value when the paper clearly refers to",
    "something that is genuinely not in the lists.",
    "",
    "Departments — name (shortName):",
    departmentList,
    "",
    "Courses:",
    courseList,
    "",
    'Semesters (follow this exact naming convention, e.g. "Summer 26"):',
    semesterList,
    "",
    "Exam types:",
    examTypeList,
    "",
    "## Field rules",
    "- departmentName: the full department name; departmentShortName: its abbreviation (e.g. CSE).",
    "- courseName: the course/subject title (drop the course code if a title is present).",
    "- semesterName: follow the existing naming convention shown above.",
    "- examTypeName: e.g. Midterm, Final, Quiz — reuse an existing exam type when possible.",
    "- section / batch: only when explicitly printed on the paper, otherwise null.",
    "- reasoning: one or two sentences explaining your decision.",
    extraContext
      ? `\n## Extra context from the uploader (use it to resolve ambiguity)\n${extraContext}`
      : "",
  ].join("\n");
};

/**
 * Send the (already compressed) PDF to Gemini 2.5 Flash through Cloudflare AI
 * Gateway and return the structured extraction. Throws on transport / parse
 * failures (the caller is a Workflow step that retries).
 */
export const extractQuestionMetadata = async (args: {
  env: Bindings;
  pdfBuffer: ArrayBuffer;
  vocab: Vocab;
  extraContext: string | null;
}): Promise<AiExtraction> => {
  const { env, pdfBuffer, vocab, extraContext } = args;

  // Route through Cloudflare AI Gateway when configured (adds caching, retries,
  // and cost analytics); otherwise call the Google Generative Language API
  // directly. Both accept the same body and `x-goog-api-key` header. Widen to
  // `string` so an empty value (gateway off) is a plain runtime check.
  const accountId: string = env.CF_ACCOUNT_ID;
  const gatewayName: string = env.AI_GATEWAY_NAME;
  const useGateway = gatewayName !== "" && accountId !== "";
  const url = useGateway
    ? `https://gateway.ai.cloudflare.com/v1/${accountId}/${gatewayName}/google-ai-studio/v1beta/models/${GEMINI_MODEL}:generateContent`
    : `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

  const requestBody = {
    contents: [
      {
        role: "user",
        parts: [
          {
            inlineData: {
              mimeType: "application/pdf",
              data: arrayBufferToBase64(pdfBuffer),
            },
          },
          { text: buildPrompt(vocab, extraContext) },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.1,
      responseMimeType: "application/json",
      responseSchema: RESPONSE_SCHEMA,
    },
  };

  const headers: Record<string, string> = {
    "content-type": "application/json",
    "x-goog-api-key": env.GEMINI_API_KEY,
  };
  // An *authenticated* AI Gateway additionally requires a `cf-aig-authorization`
  // token. Optional secret — only sent when set and when routing via the gateway.
  const gatewayToken = (env as unknown as { AI_GATEWAY_TOKEN?: string })
    .AI_GATEWAY_TOKEN;
  if (useGateway && gatewayToken) {
    headers["cf-aig-authorization"] = `Bearer ${gatewayToken}`;
  }

  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(requestBody),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(
      `Gemini request failed (${res.status}): ${detail.slice(0, 500)}`,
    );
  }

  const data = (await res.json()) as GeminiResponse;
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error("Gemini returned no content");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("Gemini returned malformed JSON");
  }

  const result = aiResultSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error(`Gemini output failed validation: ${result.error.message}`);
  }

  const d = result.data;
  return {
    isAcceptable: d.isAcceptable,
    rejectionReason: clean(d.rejectionReason),
    departmentName: clean(d.departmentName),
    departmentShortName: clean(d.departmentShortName),
    courseName: clean(d.courseName),
    semesterName: clean(d.semesterName),
    examTypeName: clean(d.examTypeName),
    section: clean(d.section),
    batch: clean(d.batch),
    reasoning: clean(d.reasoning) ?? "",
  };
};
