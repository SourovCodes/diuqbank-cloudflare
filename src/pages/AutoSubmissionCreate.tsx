import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createAutoSubmission } from "../api";
import { Button, Field, inputClass } from "../components/ui/form";
import { Card, CardTitle } from "../components/ui/Card";

const MAX_PDF_BYTES = 20 * 1024 * 1024;

const steps = [
  "You upload just the PDF.",
  "The AI reads it and extracts the course, semester, and exam type.",
  "Clear papers publish automatically; ambiguous ones go to a reviewer.",
];

export default function AutoSubmissionCreate() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [pdf, setPdf] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  useEffect(() => {
    document.title = "AI upload | DIUQBank";
  }, []);

  const create = useMutation({
    mutationFn: (form: FormData) => createAutoSubmission(form),
    onSuccess: (submission) => {
      queryClient.invalidateQueries({ queryKey: ["auto-submissions"] });
      navigate(`/submissions/auto/${submission.id}`, { replace: true });
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
    <div>
      <Link
        to="/submissions/auto"
        className="mb-6 inline-flex text-sm font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400"
      >
        Back to submissions
      </Link>

      <div className="mb-7 border-b border-gray-200 pb-6 dark:border-gray-800">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100 sm:text-3xl">
          AI-assisted upload
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-500 dark:text-gray-400">
          Upload just the PDF. Our AI reads it and extracts the department,
          course, semester, and exam type. You can watch the result on the next
          screen.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
        <Card className="p-6">
          <form className="space-y-5" onSubmit={handleSubmit}>
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

            <Field
              label="Context hint (optional)"
              htmlFor="extraContext"
              hint="Helps the AI when the paper is ambiguous — e.g. department or semester."
            >
              <textarea
                id="extraContext"
                name="extraContext"
                rows={3}
                className={inputClass}
                placeholder="e.g. This is a CSE Data Structures midterm from Summer 2026."
              />
            </Field>

            {create.isError && (
              <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
                {(create.error as Error).message}
              </p>
            )}

            <div className="border-t border-gray-100 pt-5 dark:border-gray-800">
              <Button type="submit" loading={create.isPending}>
                Upload &amp; process
              </Button>
            </div>
          </form>
        </Card>

        <aside className="space-y-4">
          <Card className="p-5">
            <CardTitle>How it works</CardTitle>
            <ol className="mt-4 space-y-4">
              {steps.map((step, i) => (
                <li key={i} className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 text-xs font-bold text-white">
                    {i + 1}
                  </span>
                  <span className="text-sm leading-6 text-gray-600 dark:text-gray-300">
                    {step}
                  </span>
                </li>
              ))}
            </ol>
          </Card>
          <Card className="p-5">
            <CardTitle>Prefer full control?</CardTitle>
            <p className="mt-3 text-sm leading-6 text-gray-600 dark:text-gray-300">
              Enter the department, course, and exam details yourself with a
              manual submission.
            </p>
            <Link
              to="/submissions/manual/new"
              className="mt-3 inline-flex text-sm font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400"
            >
              Switch to manual →
            </Link>
          </Card>
        </aside>
      </div>
    </div>
  );
}
