import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Download,
  FileCheck2,
  FileText,
  GraduationCap,
  Search,
  Users,
} from "lucide-react";

const features = [
  {
    icon: FileText,
    title: "Organized collection",
    description: "Browse question papers by department, course, semester, and exam type.",
    tone: "bg-blue-50 text-blue-600",
  },
  {
    icon: Download,
    title: "Read or download",
    description: "Open submitted PDFs in the built-in reader or save them for offline study.",
    tone: "bg-emerald-50 text-emerald-600",
  },
  {
    icon: Users,
    title: "Community powered",
    description: "Every useful paper comes from students helping the next batch prepare.",
    tone: "bg-violet-50 text-violet-600",
  },
  {
    icon: GraduationCap,
    title: "All departments",
    description: "One searchable home for courses across the university.",
    tone: "bg-cyan-50 text-cyan-600",
  },
  {
    icon: FileCheck2,
    title: "Useful metadata",
    description: "See exam type, semester, contributor, section, batch, and file details.",
    tone: "bg-rose-50 text-rose-600",
  },
  {
    icon: BookOpen,
    title: "Study with context",
    description: "Compare multiple submissions for the same question without losing your place.",
    tone: "bg-amber-50 text-amber-600",
  },
] as const;

export default function Home() {
  return (
    <>
      <section className="relative overflow-hidden px-4 py-24 sm:px-6 lg:py-32">
        <div className="absolute inset-x-0 top-0 -z-10 mx-auto h-96 max-w-4xl rounded-full bg-blue-200/30 blur-3xl" />
        <div className="mx-auto max-w-4xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border bg-white/80 px-4 py-2 text-sm font-medium text-slate-600 shadow-sm">
            <span aria-hidden="true">📚</span>
            Daffodil International University
          </div>
          <h1 className="text-balance text-5xl font-bold tracking-[-0.045em] text-slate-950 sm:text-6xl lg:text-7xl">
            Find the paper. <span className="text-primary">Focus on the exam.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-pretty text-lg leading-8 text-muted-foreground sm:text-xl">
            Past exam questions from DIU, arranged so you can get from a course name to the right PDF in seconds.
          </p>
          <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="/questions"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary px-6 font-semibold text-primary-foreground shadow-lg shadow-blue-200 transition hover:-translate-y-0.5 hover:bg-blue-700"
            >
              <Search className="size-4.5" /> Browse questions
            </Link>
            <a
              href="https://diuqbank.sourovcodes.workers.dev/docs"
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border bg-white px-6 font-semibold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50"
            >
              Explore the API <ArrowRight className="size-4.5" />
            </a>
          </div>
        </div>
      </section>

      <section className="border-y bg-white/70 px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-primary">Made for revision</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              Less searching, more studying
            </h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {features.map(({ icon: Icon, title, description, tone }) => (
              <article key={title} className="rounded-2xl border bg-card p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
                <div className={`flex size-11 items-center justify-center rounded-xl ${tone}`}>
                  <Icon className="size-5.5" />
                </div>
                <h3 className="mt-5 text-lg font-bold text-slate-950">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-5xl overflow-hidden rounded-3xl bg-slate-950 px-6 py-14 text-center text-white shadow-2xl sm:px-12">
          <BookOpen className="mx-auto size-10 text-blue-300" />
          <h2 className="mt-5 text-3xl font-bold tracking-tight sm:text-4xl">Ready for the next exam?</h2>
          <p className="mx-auto mt-3 max-w-xl text-slate-300">Choose your department and semester, then open the paper you need.</p>
          <Link href="/questions" className="mt-8 inline-flex h-11 items-center gap-2 rounded-xl bg-white px-5 font-semibold text-slate-950 transition hover:bg-blue-50">
            Start browsing <ArrowRight className="size-4" />
          </Link>
        </div>
      </section>
    </>
  );
}
