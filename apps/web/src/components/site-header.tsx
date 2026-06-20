import Link from "next/link";
import { BookOpen, Code2 } from "lucide-react";

const links = [
  { href: "/", label: "Home" },
  { href: "/questions", label: "Questions" },
] as const;

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b bg-white/90 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2.5 font-bold tracking-tight">
          <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm shadow-blue-200">
            <BookOpen className="size-5" aria-hidden="true" />
          </span>
          <span className="text-lg">DIU QBank</span>
        </Link>

        <nav aria-label="Primary navigation" className="flex items-center gap-1">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-950"
            >
              {link.label}
            </Link>
          ))}
          <a
            href="https://github.com/SourovCodes"
            target="_blank"
            rel="noreferrer"
            aria-label="SourovCodes on GitHub"
            className="ml-1 rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-950"
          >
            <Code2 className="size-4.5" />
          </a>
        </nav>
      </div>
    </header>
  );
}
