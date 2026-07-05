import type {
  AdminSubmission as AdminSubmissionDTO,
  AdminSubmissionDetail as AdminSubmissionDetailDTO,
  AdminUser as AdminUserDTO,
} from "../shared/types";
import type { Submission, User } from "../db/schema";
import { buildQuestionTitle } from "../shared/utils/question-title";
import { fileUrlFor, toAuthUser, toContributorSummary } from "./user-shape";

type AdminUserRow = Pick<
  User,
  "id" | "name" | "email" | "username" | "role" | "imageKey" | "createdAt"
> & { submissionCount: number };

/**
 * Admin-facing user shape: the full auth-user fields (incl. `email` and `role`)
 * plus a dynamically-computed `submissionCount`.
 */
export const toAdminUser = (row: AdminUserRow, origin: string): AdminUserDTO => ({
  ...toAuthUser(row, origin),
  submissionCount: row.submissionCount,
});

export type AdminUser = ReturnType<typeof toAdminUser>;

type AdminSubmissionRow = Pick<
  Submission,
  | "id"
  | "section"
  | "batch"
  | "fileSize"
  | "viewCount"
  | "watermarkStatus"
  | "watermarkError"
  | "pdfKey"
  | "watermarkedPdfKey"
  | "createdAt"
> & {
  question: {
    id: number;
    department: { shortName: string };
    course: { name: string };
    semester: { name: string };
    examType: { name: string };
  };
  user: Pick<User, "id" | "name" | "username" | "imageKey"> | null;
};

/**
 * Admin-facing submission shape: the full row plus the parent question (id +
 * human-readable title), the contributor summary, and absolute file URLs.
 */
export const toAdminSubmission = (row: AdminSubmissionRow, origin: string): AdminSubmissionDTO => ({
  id: row.id,
  question: {
    id: row.question.id,
    title: buildQuestionTitle(row.question),
  },
  contributor: row.user ? toContributorSummary(row.user, origin) : null,
  section: row.section,
  batch: row.batch,
  fileSize: row.fileSize,
  viewCount: row.viewCount,
  watermarkStatus: row.watermarkStatus,
  watermarkError: row.watermarkError,
  pdfUrl: fileUrlFor(origin, row.pdfKey),
  watermarkedPdfUrl: fileUrlFor(origin, row.watermarkedPdfKey),
  createdAt: row.createdAt,
});

export type AdminSubmission = ReturnType<typeof toAdminSubmission>;

/**
 * Detail variant: the base admin shape plus the id of the auto submission
 * this submission was published from (null when there is none).
 */
export const toAdminSubmissionDetail = (
  row: AdminSubmissionRow,
  origin: string,
  source: { autoSubmissionId: number | null },
): AdminSubmissionDetailDTO => ({
  ...toAdminSubmission(row, origin),
  autoSubmissionId: source.autoSubmissionId,
});
