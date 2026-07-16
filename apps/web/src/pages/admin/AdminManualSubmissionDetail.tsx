import { ALLOWED_EXAM_TYPES } from "@diuqbank/shared";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  approveManualSubmission,
  coursesApi,
  deleteAdminManualSubmission,
  departmentsApi,
  examTypesApi,
  getAdminManualSubmissions,
  rejectManualSubmission,
  semestersApi,
  updateAdminManualSubmission,
} from "../../api";
import type {
  AdminManualSubmissionDetail,
  SelectOption,
  UpdateManualSubmission,
} from "../../types/api";
import { useAdminManualSubmission } from "../../hooks/adminQueries";
import { useFilterOptions } from "../../hooks/queries";
import { Button, Field, inputClass } from "../../components/ui/form";
import { CreatableSelect } from "../../components/ui/CreatableSelect";
import { Modal } from "../../components/ui/Modal";
import { SubmissionStatusBadge } from "../../components/ui/SubmissionStatusBadge";
import { DetailRow, PdfPreview } from "../../components/submissions/SubmissionParts";
import { formatDate } from "../../lib/format";
import { ErrorBox } from "./shared";
import { useAdvanceQueue } from "./useAdvanceQueue";

// Canned rejection reasons for the most common cases; clicking one fills the
// reason box (the submitter sees the full text, so keep it actionable).
const QUICK_REJECT_REASONS: { label: string; reason: string }[] = [
  {
    label: "Multiple questions",
    reason:
      "This PDF contains multiple question papers. Please upload each question paper as a separate PDF.",
  },
  {
    label: "Invalid question",
    reason: "This file is not a valid exam question paper.",
  },
  {
    label: "Wrong details",
    reason:
      "The details you provided (department, course, semester or exam type) do not match the uploaded paper.",
  },
];

// e.g. "12 published · 3 rejected" — pending only shown when non-zero, and a
// contributor with no history at all reads "None".
function formatTrackRecord(published: number, rejected: number, pending: number) {
  if (published === 0 && rejected === 0 && pending === 0) return "None";
  const parts = [`${published} published`, `${rejected} rejected`];
  if (pending > 0) parts.push(`${pending} pending`);
  return parts.join(" · ");
}

/** Initials of the significant words, mirroring the API's short-name style. */
function suggestShortName(name: string): string {
  const stop = new Set(["and", "of", "the", "in", "for"]);
  const words = name
    .split(/[^A-Za-z0-9]+/)
    .filter((w) => w && !stop.has(w.toLowerCase()));
  const base = words.length > 1 ? words.map((w) => w[0]).join("") : words[0] ?? "";
  return base.toUpperCase().slice(0, 20);
}

export default function AdminManualSubmissionDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: sub, isPending, isError } = useAdminManualSubmission(id);

  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    document.title = "Review submission | Admin";
  }, []);

  const advance = useAdvanceQueue({
    listPath: "/admin/manual-submissions",
    currentId: Number(id),
    fetchPending: () =>
      getAdminManualSubmissions({
        page: 1,
        perPage: 2,
        status: "pending",
      }).then((r) => r.data),
  });

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["admin", "manual-submissions"] });
    queryClient.invalidateQueries({
      queryKey: ["admin", "manual-submission", id],
    });
  }

  const approve = useMutation({
    mutationFn: () => approveManualSubmission(Number(id)),
    onSuccess: () => {
      invalidate();
      advance();
    },
  });
  const reject = useMutation({
    mutationFn: () => rejectManualSubmission(Number(id), reason.trim()),
    onSuccess: () => {
      invalidate();
      setRejecting(false);
      setReason("");
      advance();
    },
  });
  const remove = useMutation({
    mutationFn: () => deleteAdminManualSubmission(Number(id)),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["admin", "manual-submissions"],
      });
      navigate("/admin/manual-submissions", { replace: true });
    },
  });

  if (isPending) {
    return (
      <div className="rounded-lg border border-dashed border-gray-200 py-14 text-center text-sm text-gray-500 dark:border-gray-800 dark:text-gray-400">
        Loading submission…
      </div>
    );
  }

  if (isError || !sub) {
    return <ErrorBox message="Submission not found — it may have been removed." />;
  }

  const canReview = sub.status === "pending";
  const canEdit = sub.status !== "published";
  const allMatched =
    sub.taxonomyMatches.departmentId !== null &&
    sub.taxonomyMatches.courseId !== null &&
    sub.taxonomyMatches.semesterId !== null &&
    sub.taxonomyMatches.examTypeId !== null;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-3">
        <Link
          to="/admin/manual-submissions"
          className="inline-flex text-sm font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400"
        >
          ← Back to queue
        </Link>
        <button
          type="button"
          onClick={() => advance()}
          className="text-sm font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400"
        >
          Skip to next →
        </button>
      </div>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 pb-5 dark:border-gray-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
            {sub.courseName ?? "Untitled paper"}
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {sub.departmentName ?? "No department given"}
          </p>
        </div>
        <SubmissionStatusBadge status={sub.status} />
      </div>

      {sub.status === "rejected" && sub.rejectedReason && (
        <p className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
          <span className="font-semibold">Rejected:</span> {sub.rejectedReason}
        </p>
      )}
      {sub.status === "published" && sub.questionId && (
        <p className="mb-6 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700 dark:border-green-500/30 dark:bg-green-500/10 dark:text-green-300">
          Published.{" "}
          <Link
            to={`/questions/${sub.questionId}`}
            className="font-semibold underline"
          >
            View the live question
          </Link>
          .
        </p>
      )}

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <div className="min-w-0 flex-1">
          <PdfPreview url={sub.pdfUrl} />
        </div>

        <aside className="w-full shrink-0 space-y-4 lg:w-80">
          <TaxonomyCard
            sub={sub}
            editable={canEdit}
            onEdit={() => setEditing(true)}
            onChanged={invalidate}
          />

          <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Extras
            </h2>
            <dl className="space-y-1.5 text-sm">
              <DetailRow label="Section" value={sub.section ?? "—"} />
              <DetailRow label="Batch" value={sub.batch ?? "—"} />
              <DetailRow label="Uploaded" value={formatDate(sub.createdAt)} />
            </dl>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Contributor
              </h2>
              <Link
                to={`/admin/users/${sub.userId}`}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400"
              >
                View profile
              </Link>
            </div>
            <div className="mb-3 flex items-center gap-3">
              {sub.contributor.image ? (
                <img
                  src={sub.contributor.image}
                  alt=""
                  className="h-9 w-9 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-sm font-semibold text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                  {sub.contributor.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-gray-800 dark:text-gray-200">
                  {sub.contributor.name}
                </p>
                <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                  @{sub.contributor.username}
                </p>
              </div>
            </div>
            <dl className="space-y-1.5 text-sm">
              <DetailRow
                label="Member since"
                value={formatDate(sub.contributor.createdAt)}
              />
              <DetailRow
                label="Live submissions"
                value={String(sub.contributorStats.liveSubmissionCount)}
              />
              <DetailRow
                label="Uploads"
                value={formatTrackRecord(
                  sub.contributorStats.manualPublished,
                  sub.contributorStats.manualRejected,
                  sub.contributorStats.manualPending,
                )}
              />
            </dl>
          </div>

          {canReview && (
            <div className="space-y-2 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
              <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Review
              </h2>
              <Button
                className="w-full"
                loading={approve.isPending}
                disabled={!allMatched}
                onClick={() => approve.mutate()}
              >
                Approve &amp; publish
              </Button>
              {!allMatched && (
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  All four values must match an existing entity before this can
                  be approved — create the missing ones above or edit the
                  values.
                </p>
              )}
              <Button
                variant="secondary"
                className="w-full"
                onClick={() => setRejecting(true)}
              >
                Reject…
              </Button>
              {approve.isError && (
                <p className="text-xs text-red-600 dark:text-red-400">
                  {(approve.error as Error).message}
                </p>
              )}
            </div>
          )}

          <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
            <Button
              variant="danger"
              className="w-full"
              loading={remove.isPending}
              onClick={() => {
                if (
                  confirm(
                    "Delete this manual submission and its uploaded PDF? A published live submission keeps its own copy."
                  )
                ) {
                  remove.mutate();
                }
              }}
            >
              Delete manual submission
            </Button>
            {remove.isError && (
              <p className="mt-2 text-xs text-red-600 dark:text-red-400">
                {(remove.error as Error).message}
              </p>
            )}
          </div>
        </aside>
      </div>

      <Modal
        open={rejecting}
        onClose={() => setRejecting(false)}
        title="Reject submission"
        description="The submitter will see this reason."
        footer={
          <>
            <Button variant="secondary" onClick={() => setRejecting(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              loading={reject.isPending}
              disabled={!reason.trim()}
              onClick={() => reject.mutate()}
            >
              Reject
            </Button>
          </>
        }
      >
        <div className="mb-3 flex flex-wrap gap-2">
          {QUICK_REJECT_REASONS.map((q) => (
            <button
              key={q.label}
              type="button"
              onClick={() => setReason(q.reason)}
              className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                reason === q.reason
                  ? "border-blue-600 bg-blue-50 text-blue-700 dark:border-blue-400 dark:bg-blue-500/10 dark:text-blue-300"
                  : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:text-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:border-gray-600 dark:hover:text-gray-100"
              }`}
            >
              {q.label}
            </button>
          ))}
        </div>
        <Field label="Reason">
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={4}
            className={inputClass}
            placeholder="e.g. Not a question paper, duplicate…"
          />
        </Field>
        {reject.isError && (
          <p className="mt-2 text-xs text-red-600 dark:text-red-400">
            {(reject.error as Error).message}
          </p>
        )}
      </Modal>

      {editing && (
        <EditMetaModal
          initial={sub}
          onClose={() => setEditing(false)}
          onSaved={() => {
            setEditing(false);
            invalidate();
          }}
        />
      )}
    </div>
  );
}

/**
 * The uploader's four taxonomy values with their resolution state. A value
 * that doesn't match an existing entity blocks approval; each missing one
 * offers a one-click create (except values that first need correcting, e.g. a
 * course before its department exists, or a non-allowed exam type).
 */
function TaxonomyCard({
  sub,
  editable,
  onEdit,
  onChanged,
}: {
  sub: AdminManualSubmissionDetail;
  editable: boolean;
  onEdit: () => void;
  onChanged: () => void;
}) {
  const queryClient = useQueryClient();
  const [creatingDepartment, setCreatingDepartment] = useState(false);
  const matches = sub.taxonomyMatches;

  function refresh() {
    // New taxonomy affects the public filter options (used for suggestions)
    // and the admin taxonomy tables, not just this detail view.
    queryClient.invalidateQueries({ queryKey: ["filter-options"] });
    onChanged();
  }

  const createCourse = useMutation({
    mutationFn: () =>
      coursesApi.create({
        departmentId: matches.departmentId,
        name: sub.courseName,
      }),
    onSuccess: refresh,
  });
  const createSemester = useMutation({
    mutationFn: () => semestersApi.create({ name: sub.semesterName }),
    onSuccess: refresh,
  });
  const createExamType = useMutation({
    mutationFn: () => examTypesApi.create({ name: sub.examTypeName }),
    onSuccess: refresh,
  });

  const examTypeAllowed =
    !!sub.examTypeName &&
    ALLOWED_EXAM_TYPES.some(
      (t) => t.toLowerCase() === sub.examTypeName!.trim().toLowerCase(),
    );

  const rows: {
    label: string;
    value: string | null;
    matched: boolean;
    action?: { label: string; run: () => void; pending: boolean; error?: string };
    hint?: string;
  }[] = [
    {
      label: "Department",
      value: sub.departmentName,
      matched: matches.departmentId !== null,
      action: sub.departmentName
        ? {
            label: "Create department…",
            run: () => setCreatingDepartment(true),
            pending: false,
          }
        : undefined,
    },
    {
      label: "Course",
      value: sub.courseName,
      matched: matches.courseId !== null,
      action:
        sub.courseName && matches.departmentId !== null
          ? {
              label: "Create course",
              run: () => createCourse.mutate(),
              pending: createCourse.isPending,
              error: createCourse.isError
                ? (createCourse.error as Error).message
                : undefined,
            }
          : undefined,
      hint:
        sub.courseName && matches.departmentId === null
          ? "Resolve the department first."
          : undefined,
    },
    {
      label: "Semester",
      value: sub.semesterName,
      matched: matches.semesterId !== null,
      action: sub.semesterName
        ? {
            label: "Create semester",
            run: () => createSemester.mutate(),
            pending: createSemester.isPending,
            error: createSemester.isError
              ? (createSemester.error as Error).message
              : undefined,
          }
        : undefined,
    },
    {
      label: "Exam type",
      value: sub.examTypeName,
      matched: matches.examTypeId !== null,
      action:
        sub.examTypeName && examTypeAllowed
          ? {
              label: "Create exam type",
              run: () => createExamType.mutate(),
              pending: createExamType.isPending,
              error: createExamType.isError
                ? (createExamType.error as Error).message
                : undefined,
            }
          : undefined,
      hint:
        sub.examTypeName && !examTypeAllowed
          ? `Not an allowed exam type — edit it to one of: ${ALLOWED_EXAM_TYPES.join(", ")}.`
          : undefined,
    },
  ];

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          Paper details
        </h2>
        {editable && (
          <button
            type="button"
            onClick={onEdit}
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400"
          >
            Edit
          </button>
        )}
      </div>
      <div className="space-y-2.5">
        {rows.map((row) => (
          <div key={row.label}>
            <div className="flex items-center justify-between gap-2 text-sm">
              <span className="text-gray-500 dark:text-gray-400">{row.label}</span>
              <span className="flex min-w-0 items-center gap-1.5">
                <span className="truncate font-medium text-gray-900 dark:text-gray-100">
                  {row.value ?? "—"}
                </span>
                {row.matched ? (
                  <span className="shrink-0 rounded bg-green-50 px-1.5 py-0.5 text-[10px] font-semibold text-green-700 dark:bg-green-500/15 dark:text-green-300">
                    exists
                  </span>
                ) : (
                  <span className="shrink-0 rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
                    missing
                  </span>
                )}
              </span>
            </div>
            {!row.matched && editable && (
              <div className="mt-1 text-right">
                {row.action && (
                  <button
                    type="button"
                    disabled={row.action.pending}
                    onClick={row.action.run}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-700 disabled:opacity-60 dark:text-blue-400"
                  >
                    {row.action.pending ? "Creating…" : row.action.label}
                  </button>
                )}
                {row.hint && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {row.hint}
                  </p>
                )}
                {row.action?.error && (
                  <p className="text-xs text-red-600 dark:text-red-400">
                    {row.action.error}
                  </p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {creatingDepartment && sub.departmentName && (
        <CreateDepartmentModal
          name={sub.departmentName}
          onClose={() => setCreatingDepartment(false)}
          onCreated={() => {
            setCreatingDepartment(false);
            refresh();
          }}
        />
      )}
    </div>
  );
}

/** Departments also need a unique short name, so their create gets a mini form. */
function CreateDepartmentModal({
  name,
  onClose,
  onCreated,
}: {
  name: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [shortName, setShortName] = useState(() => suggestShortName(name));

  const create = useMutation({
    mutationFn: () => departmentsApi.create({ name, shortName: shortName.trim() }),
    onSuccess: onCreated,
  });

  return (
    <Modal
      open
      onClose={onClose}
      title="Create department"
      description={`"${name}" will be created as a new department.`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            loading={create.isPending}
            disabled={!shortName.trim()}
            onClick={() => create.mutate()}
          >
            Create
          </Button>
        </>
      }
    >
      <Field label="Short name" htmlFor="dept-short-name" hint="Shown in question titles, e.g. CSE.">
        <input
          id="dept-short-name"
          value={shortName}
          onChange={(e) => setShortName(e.target.value)}
          maxLength={20}
          className={inputClass}
        />
      </Field>
      {create.isError && (
        <p className="mt-2 text-xs text-red-600 dark:text-red-400">
          {(create.error as Error).message}
        </p>
      )}
    </Modal>
  );
}

function EditMetaModal({
  initial,
  onClose,
  onSaved,
}: {
  initial: {
    id: number;
    departmentName: string | null;
    courseName: string | null;
    semesterName: string | null;
    examTypeName: string | null;
    section: string | null;
    batch: string | null;
  };
  onClose: () => void;
  onSaved: () => void;
}) {
  const { data: options } = useFilterOptions();
  const [departmentName, setDepartmentName] = useState(initial.departmentName ?? "");
  const [courseName, setCourseName] = useState(initial.courseName ?? "");
  const [semesterName, setSemesterName] = useState(initial.semesterName ?? "");
  const [examTypeName, setExamTypeName] = useState(initial.examTypeName ?? "");
  const [section, setSection] = useState(initial.section ?? "");
  const [batch, setBatch] = useState(initial.batch ?? "");

  const departmentOptions: SelectOption[] = useMemo(
    () =>
      (options?.departments ?? []).map((d) => ({
        value: d.name,
        label: `${d.name} (${d.shortName})`,
      })),
    [options]
  );

  const courseOptions: SelectOption[] = useMemo(() => {
    const department = (options?.departments ?? []).find(
      (d) => d.name.toLowerCase() === departmentName.trim().toLowerCase()
    );
    if (!department) return [];
    return (options?.courses ?? [])
      .filter((c) => c.departmentId === department.id)
      .map((c) => ({ value: c.name, label: c.name }));
  }, [options, departmentName]);

  const semesterOptions: SelectOption[] = useMemo(
    () =>
      (options?.semesters ?? []).map((s) => ({ value: s.name, label: s.name })),
    [options]
  );

  const save = useMutation({
    mutationFn: () => {
      // Taxonomy names must be non-empty when sent, so skip blank ones; the
      // clearable fields are always sent ("" clears the stored value).
      const payload: UpdateManualSubmission = {
        section,
        batch,
      };
      if (departmentName.trim()) payload.departmentName = departmentName.trim();
      if (courseName.trim()) payload.courseName = courseName.trim();
      if (semesterName.trim()) payload.semesterName = semesterName.trim();
      if (examTypeName) {
        payload.examTypeName =
          examTypeName as UpdateManualSubmission["examTypeName"];
      }
      return updateAdminManualSubmission(initial.id, payload);
    },
    onSuccess: onSaved,
  });

  return (
    <Modal
      open
      onClose={onClose}
      title="Edit paper details"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={save.isPending} onClick={() => save.mutate()}>
            Save changes
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <Field label="Department" htmlFor="edit-department">
          <CreatableSelect
            id="edit-department"
            options={departmentOptions}
            value={departmentName}
            onChange={(next) => {
              setDepartmentName(next);
              setCourseName("");
            }}
          />
        </Field>
        <Field label="Course" htmlFor="edit-course">
          <CreatableSelect
            id="edit-course"
            options={courseOptions}
            value={courseName}
            onChange={setCourseName}
          />
        </Field>
        <Field label="Semester" htmlFor="edit-semester">
          <CreatableSelect
            id="edit-semester"
            options={semesterOptions}
            value={semesterName}
            onChange={setSemesterName}
          />
        </Field>
        <Field label="Exam type" htmlFor="edit-exam-type">
          <select
            id="edit-exam-type"
            value={examTypeName}
            onChange={(e) => setExamTypeName(e.target.value)}
            className={inputClass}
          >
            <option value="">Select exam type…</option>
            {ALLOWED_EXAM_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Section" htmlFor="edit-section">
            <input
              id="edit-section"
              value={section}
              onChange={(e) => setSection(e.target.value)}
              maxLength={100}
              className={inputClass}
            />
          </Field>
          <Field label="Batch" htmlFor="edit-batch">
            <input
              id="edit-batch"
              value={batch}
              onChange={(e) => setBatch(e.target.value)}
              maxLength={100}
              className={inputClass}
            />
          </Field>
        </div>
        {save.isError && (
          <p className="text-xs text-red-600 dark:text-red-400">
            {(save.error as Error).message}
          </p>
        )}
      </div>
    </Modal>
  );
}
