import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AUTO_SUBMISSIONS_ENABLED } from "@diuqbank/shared";
import { createAutoSubmission } from "../api";
import { Button, inputClass, labelClass } from "../components/ui/form";
import { Card, CardTitle } from "../components/ui/Card";
import { FileUpload } from "../components/ui/FileUpload";

export default function AutoSubmissionCreate() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [extraContext, setExtraContext] = useState("");

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
    if (!file) return;
    const form = new FormData();
    form.set("pdf", file);
    if (extraContext.trim()) form.set("extraContext", extraContext.trim());
    create.mutate(form);
  }

  // Temporary kill switch (AUTO_SUBMISSIONS_ENABLED in @diuqbank/shared): the
  // upload links stay visible so people can reach this page, but the form is
  // swapped for a notice (and the API rejects POSTs) while uploads are paused.
  if (!AUTO_SUBMISSIONS_ENABLED) {
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
        </div>

        <Card className="p-8 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-2xl dark:bg-amber-500/15">
            🚧
          </span>
          <h2 className="mt-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
            Uploads are temporarily disabled
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-500 dark:text-gray-400">
            We've paused new question uploads for a short while. We'll be turning
            this back on very soon — thanks for your patience! Your existing
            submissions are unaffected.
          </p>
        </Card>
      </div>
    );
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
          Just upload the PDF — the AI reads it, fills in the department, course,
          semester and exam type, and publishes it automatically when it's
          confident. Anything it's unsure about goes to a reviewer.
        </p>
      </div>

      <form className="space-y-5" onSubmit={handleSubmit}>
        <Card className="p-6">
          <CardTitle>Question paper (PDF)</CardTitle>
          <div className="mt-4">
            <FileUpload file={file} onChange={setFile} disabled={create.isPending} />
          </div>
        </Card>

        <Card className="p-6">
          <label htmlFor="extraContext" className={labelClass}>
            Extra context (optional)
          </label>
          <textarea
            id="extraContext"
            className={inputClass}
            rows={3}
            maxLength={1000}
            value={extraContext}
            onChange={(e) => setExtraContext(e.target.value)}
            placeholder="Anything that helps the AI, e.g. the department or semester if the paper doesn't print it clearly."
          />
        </Card>

        {create.isError && (
          <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
            {(create.error as Error).message}
          </p>
        )}

        <Button type="submit" className="w-full" loading={create.isPending} disabled={!file}>
          Upload &amp; process with AI
        </Button>
      </form>
    </div>
  );
}
