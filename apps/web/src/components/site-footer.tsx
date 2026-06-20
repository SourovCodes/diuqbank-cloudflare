import Link from "next/link";
import { BookOpen } from "lucide-react";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t bg-white">
      <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-10 sm:grid-cols-[1fr_auto] sm:px-6 lg:px-8">
        <div>
          <Link href="/" className="inline-flex items-center gap-2 font-bold">
            <BookOpen className="size-5 text-primary" />
            DIU QBank
          </Link>
          <p className="mt-3 max-w-md text-sm leading-6 text-muted-foreground">
            A community question bank for students of Daffodil International University.
          </p>
        </div>
        <div className="flex items-start gap-5 text-sm font-medium text-slate-600">
          <Link href="/" className="hover:text-primary">Home</Link>
          <Link href="/questions" className="hover:text-primary">Questions</Link>
          <a
            href="https://diuqbank.sourovcodes.workers.dev/docs"
            target="_blank"
            rel="noreferrer"
            className="hover:text-primary"
          >
            API
          </a>
        </div>
      </div>
      <div className="border-t px-4 py-5 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} DIU Question Bank. Built for students, by students.
      </div>
    </footer>
  );
}
