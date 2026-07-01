import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createManualSubmission } from "../api";
import { useFilterOptions } from "../hooks/queries";
import { Button, Field, inputClass } from "../components/ui/form";

const MAX_PDF_BYTES = 20 * 1024 * 1024;

export default function ManualSubmissionCreate() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: options } = useFilterOptions();
  const [pdf, setPdf] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  useEffect(() => {
    document.title = "New submission | DIUQBank";
  }, []);

  const create = useMutation({
    mutationFn: (form: FormData) => createManualSubmission(form),
    onSuccess: (submission) => {
      queryClient.invalidateQueries({ queryKey: ["manual-submissions"] });
      navigate(`/submissions/manual/${submission.id}`, { replace: true });
    },
  });

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!pdf) {
      setFileError("A PDF file is required.");
      return;
    }
    const form = new FormData(e.currentTarget);
    form.set("pdf", pdf);
    create.mutate(form);
  }

  return (
    <main className="container mx-auto max-w-2xl flex-1 px-4 py-10 sm:py-12">
      <Link
        to="/submissions/manual"
        className="mb-6 inline-flex text-sm font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400"
      >
        Back to submissions
      </Link>

      <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100 sm:text-3xl">
        New manual submission
      </h1>
      <p className="mt-2 text-sm leading-6 text-gray-500 dark:text-gray-400">
        Upload the question paper and tell us where it belongs. A reviewer will
        publish it once approved.
      </p>

      <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
        <Field label="Question paper (PDF)" htmlFor="pdf" hint="Max 20 MB.">
          <input
            id="pdf"
            name="pdf"
            type="file"
            accept="application/pdf"
            required
            className={inputClass}
            onChange={(e) => {
              const file = e.target.files?.[0] ?? null;
              if (file && file.size > MAX_PDF_BYTES) {
                setFileError("PDF exceeds the 20 MB limit.");
                setPdf(null);
              } else {
                setFileError(null);
                setPdf(file);
              }
            }}
          />
          {fileError && (
            <p className="mt-1 text-xs text-red-600 dark:text-red-400">{fileError}</p>
          )}
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Department" htmlFor="departmentName">
            <input id="departmentName" name="departmentName" list="departments" required className={inputClass} placeholder="Computer Science and Engineering" />
          </Field>
          <Field label="Department short name" htmlFor="departmentShortName">
            <input id="departmentShortName" name="departmentShortName" list="departmentShorts" required className={inputClass} placeholder="CSE" />
          </Field>
        </div>

        <Field label="Course" htmlFor="courseName">
          <input id="courseName" name="courseName" list="courses" required className={inputClass} placeholder="Data Structures" />
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Semester" htmlFor="semesterName">
            <input id="semesterName" name="semesterName" list="semesters" required className={inputClass} placeholder="Summer 2026" />
          </Field>
          <Field label="Exam type" htmlFor="examTypeName">
            <input id="examTypeName" name="examTypeName" list="examTypes" required className={inputClass} placeholder="Midterm" />
          </Field>
        </div>

        <Field label="Note (optional)" htmlFor="note">
          <textarea id="note" name="note" rows={3} className={inputClass} placeholder="Anything the reviewer should know." />
        </Field>

        {/* Suggestions from the existing catalogue so names stay consistent. */}
        <datalist id="departments">
          {options?.departments.map((d) => <option key={d.id} value={d.name} />)}
        </datalist>
        <datalist id="departmentShorts">
          {options?.departments.map((d) => <option key={d.id} value={d.shortName} />)}
        </datalist>
        <datalist id="courses">
          {options?.courses.map((c) => <option key={c.id} value={c.name} />)}
        </datalist>
        <datalist id="semesters">
          {options?.semesters.map((s) => <option key={s.id} value={s.name} />)}
        </datalist>
        <datalist id="examTypes">
          {options?.examTypes.map((t) => <option key={t.id} value={t.name} />)}
        </datalist>

        {create.isError && (
          <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
            {(create.error as Error).message}
          </p>
        )}

        <div className="flex gap-3">
          <Button type="submit" loading={create.isPending}>
            Submit for review
          </Button>
        </div>
      </form>
    </main>
  );
}
