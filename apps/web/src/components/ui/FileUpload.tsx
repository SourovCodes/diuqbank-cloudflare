import { useRef, useState } from "react";
import { cx } from "../../lib/cx";
import { formatBytes } from "../../lib/format";

const MAX_PDF_BYTES = 20 * 1024 * 1024;
const MAX_MB = Math.round(MAX_PDF_BYTES / 1024 / 1024);
const PDF_MIME_TYPE = "application/pdf";

type FileUploadProps = {
  file: File | null;
  onChange: (file: File | null) => void;
  disabled?: boolean;
};

export function FileUpload({ file, onChange, disabled = false }: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleFile(f: File | null) {
    if (!f) return;
    if (f.type !== PDF_MIME_TYPE) {
      setError("Only PDF files are accepted.");
      return;
    }
    if (f.size > MAX_PDF_BYTES) {
      setError(`File must be under ${MAX_MB} MB.`);
      return;
    }
    setError(null);
    onChange(f);
  }

  return (
    <div>
      <div
        className={cx(
          "relative flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center transition",
          dragging
            ? "border-blue-400 bg-blue-50 dark:border-blue-400 dark:bg-blue-500/10"
            : "border-gray-300 bg-gray-50 hover:border-blue-400 hover:bg-blue-50 dark:border-gray-700 dark:bg-gray-900/50 dark:hover:border-blue-400 dark:hover:bg-blue-500/10",
          disabled && "pointer-events-none opacity-60"
        )}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          handleFile(e.dataTransfer.files[0] ?? null);
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,application/pdf"
          className="sr-only"
          disabled={disabled}
          onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
        />
        <svg
          aria-hidden="true"
          className="mb-3 h-10 w-10 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
          />
        </svg>
        {file ? (
          <div>
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
              {file.name}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{formatBytes(file.size)}</p>
            <p className="mt-1 text-xs text-blue-600 dark:text-blue-400">Click to change file</p>
          </div>
        ) : (
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
              Drop a PDF here or click to browse
            </p>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              PDF only · max {MAX_MB} MB
            </p>
          </div>
        )}
      </div>
      {error && <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
