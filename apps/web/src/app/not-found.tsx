import Link from "next/link";
import { FileSearch } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex flex-1 items-center justify-center px-4 py-20 text-center">
      <div>
        <span className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-blue-50 text-primary"><FileSearch className="size-8" /></span>
        <p className="mt-6 text-sm font-bold uppercase tracking-[0.2em] text-primary">404</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-950">Question not found</h1>
        <p className="mt-3 text-muted-foreground">The question may have been removed or the link is incorrect.</p>
        <Link href="/questions" className="mt-7 inline-flex h-11 items-center rounded-xl bg-primary px-5 font-semibold text-white">Browse questions</Link>
      </div>
    </div>
  );
}
