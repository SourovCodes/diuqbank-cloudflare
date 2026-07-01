export function PdfPreview({ url }: { url: string | null }) {
  if (!url) {
    return (
      <div
        className="flex items-center justify-center rounded-lg border border-dashed border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900"
        style={{ minHeight: "440px" }}
      >
        <p className="text-sm text-gray-500 dark:text-gray-400">
          No PDF available.
        </p>
      </div>
    );
  }
  return (
    <div>
      <iframe
        src={url}
        title="Submission PDF"
        className="w-full rounded-lg border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900"
        style={{ height: "calc(100vh - 300px)", minHeight: "440px" }}
      />
      <a
        href={url}
        target="_blank"
        rel="noreferrer noopener"
        className="mt-3 inline-flex text-sm font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400"
      >
        Open in new tab
      </a>
    </div>
  );
}

export function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-gray-500 dark:text-gray-400">{label}</dt>
      <dd className="text-right font-medium text-gray-800 dark:text-gray-200">
        {value}
      </dd>
    </div>
  );
}
