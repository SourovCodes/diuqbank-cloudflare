import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useContributors, useFilterOptions, useQuestions } from "../hooks/queries";
import { AdSlot } from "../components/AdSlot";
import type { Contributor } from "../types/api";

const EMPTY_FILTERS = {
  page: 1,
  perPage: 1,
  departmentId: "",
  courseId: "",
  semesterId: "",
  examTypeId: "",
};

export default function Home() {
  const { data: options } = useFilterOptions();
  const { data: questions } = useQuestions(EMPTY_FILTERS);
  // ponytail: sort the first page client-side for "top"; the coming home-stats API refines this.
  const { data: contributors } = useContributors({ page: 1, perPage: 12 });

  useEffect(() => {
    document.title = "DIUQBank — Past questions for every DIU course";
  }, []);

  const stats = [
    { label: "Questions", value: questions?.meta.total },
    { label: "Departments", value: options?.departments.length },
    { label: "Courses", value: options?.courses.length },
    { label: "Contributors", value: contributors?.meta.total },
  ];

  const topContributors = useMemo(
    () =>
      [...(contributors?.data ?? [])]
        .sort((a, b) => b.submissionCount - a.submissionCount)
        .slice(0, 6),
    [contributors]
  );

  return (
    <main className="flex-1">
      <Hero />
      <Stats stats={stats} />
      <BrowseByDepartment />
      <div className="container mx-auto px-4">
        <AdSlot name="home-inline" />
      </div>
      <Contributors contributors={topContributors} total={contributors?.meta.total} />
      <Contribute />
      <ClosingCta />
    </main>
  );
}

/* --------------------------------- Hero --------------------------------- */

function Hero() {
  return (
    <section className="relative isolate overflow-hidden">
      <div className="hero-glow absolute inset-0 -z-10" aria-hidden="true" />
      <div className="bg-grid absolute inset-0 -z-10" aria-hidden="true" />

      <div className="container mx-auto px-4 pb-16 pt-20 text-center sm:pt-28">
        <p className="animate-fade-up mb-5 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3.5 py-1.5 text-xs font-semibold text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-500 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-500" />
          </span>
          Built by DIU students, for DIU students
        </p>

        <h1
          className="animate-fade-up mx-auto max-w-[18ch] text-4xl font-bold leading-[1.05] tracking-tight sm:text-6xl"
          style={{ animationDelay: "60ms" }}
        >
          Past questions that get you{" "}
          <span className="bg-gradient-to-r from-blue-600 to-indigo-500 bg-clip-text text-transparent dark:from-blue-400 dark:to-indigo-300">
            exam-ready.
          </span>
        </h1>

        <p
          className="animate-fade-up mx-auto mt-6 max-w-[54ch] text-lg leading-8 text-gray-500 dark:text-gray-400"
          style={{ animationDelay: "120ms" }}
        >
          Browse the DIUQBank archive by department, course, semester and exam
          type — then read every paper right in your browser.
        </p>

        <div
          className="animate-fade-up mt-9 flex flex-wrap justify-center gap-3"
          style={{ animationDelay: "180ms" }}
        >
          <Link
            to="/questions"
            className="rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 active:scale-[0.98]"
          >
            Browse questions
          </Link>
          <Link
            to="/submissions/auto/new"
            className="rounded-lg border border-gray-300 px-6 py-3 text-sm font-semibold transition hover:bg-gray-50 active:scale-[0.98] dark:border-gray-700 dark:hover:bg-gray-900"
          >
            Contribute a paper
          </Link>
        </div>
      </div>
    </section>
  );
}

/* --------------------------------- Stats -------------------------------- */

function Stats({ stats }: { stats: { label: string; value?: number }[] }) {
  return (
    <section className="container mx-auto px-4">
      <dl className="grid grid-cols-2 gap-3 rounded-2xl border border-gray-200 bg-gray-50/60 p-3 sm:gap-4 lg:grid-cols-4 dark:border-gray-800 dark:bg-gray-900/40">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl bg-white px-4 py-6 text-center shadow-sm dark:bg-gray-900"
          >
            <dd className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl dark:text-gray-100">
              <CountUp value={stat.value} />
            </dd>
            <dt className="mt-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              {stat.label}
            </dt>
          </div>
        ))}
      </dl>
    </section>
  );
}

/* --------------------------- Browse by department ----------------------- */

function BrowseByDepartment() {
  const { data: options } = useFilterOptions();
  const departments = options?.departments ?? [];

  return (
    <section className="container mx-auto px-4 py-16">
      <SectionHeading
        eyebrow="Jump straight in"
        title="Browse by department"
        subtitle="Pick your department and go straight to its papers."
        action={<SeeAll to="/questions" label="All questions" />}
      />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {departments.length === 0
          ? Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="h-[76px] animate-pulse rounded-xl border border-gray-200 bg-gray-100 dark:border-gray-800 dark:bg-gray-900"
              />
            ))
          : departments.map((d) => (
              <Link
                key={d.id}
                to={`/questions?departmentId=${d.id}`}
                className="group flex flex-col justify-between rounded-xl border border-gray-200 bg-white p-4 transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md dark:border-gray-800 dark:bg-gray-900 dark:hover:border-blue-500"
              >
                <span className="text-xs font-bold uppercase tracking-wide text-blue-600 dark:text-blue-400">
                  {d.shortName}
                </span>
                <span className="mt-2 line-clamp-2 text-sm font-medium text-gray-700 group-hover:text-gray-900 dark:text-gray-300 dark:group-hover:text-gray-100">
                  {d.name}
                </span>
              </Link>
            ))}
      </div>
    </section>
  );
}

/* ------------------------------ Contributors ---------------------------- */

function Contributors({
  contributors,
  total,
}: {
  contributors: Contributor[];
  total?: number;
}) {
  if (contributors.length === 0) return null;

  return (
    <section className="border-y border-gray-200 bg-gray-50 py-16 dark:border-gray-800 dark:bg-gray-900/50">
      <div className="container mx-auto px-4">
        <SectionHeading
          eyebrow="Powered by the community"
          title="Meet the top contributors"
          subtitle={
            total
              ? `${total.toLocaleString()} students have shared papers so far.`
              : "Real students keeping the archive alive."
          }
          action={<SeeAll to="/contributors" label="All contributors" />}
        />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {contributors.map((c) => (
            <Link
              key={c.id}
              to={`/contributors/${encodeURIComponent(c.username)}`}
              state={{ contributor: c }}
              className="group flex flex-col items-center rounded-xl border border-gray-200 bg-white p-5 text-center transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md dark:border-gray-800 dark:bg-gray-900 dark:hover:border-blue-500"
            >
              <Avatar contributor={c} />
              <span className="mt-3 w-full truncate text-sm font-semibold text-gray-900 group-hover:text-blue-700 dark:text-gray-100 dark:group-hover:text-blue-400">
                {c.name}
              </span>
              <span className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                {c.submissionCount} paper{c.submissionCount !== 1 ? "s" : ""}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function Avatar({ contributor }: { contributor: Contributor }) {
  if (contributor.image) {
    return (
      <img
        src={contributor.image}
        alt=""
        className="h-14 w-14 rounded-full object-cover ring-2 ring-white dark:ring-gray-800"
      />
    );
  }
  return (
    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 text-lg font-bold text-white ring-2 ring-white dark:ring-gray-800">
      {contributor.name[0]?.toUpperCase() ?? "?"}
    </div>
  );
}

/* ------------------------------- Contribute ----------------------------- */

function Contribute() {
  return (
    <section className="container mx-auto px-4 py-16">
      <SectionHeading
        eyebrow="Give back"
        title="Add a paper in seconds"
        subtitle="All it takes is a single PDF — the AI handles the rest."
      />
      <div className="grid gap-4 md:grid-cols-1">
        <ContributeCard
          to="/submissions/auto/new"
          badge="Fastest"
          title="AI-assisted upload"
          description="Drop in a PDF and let the AI read it — it fills in the department, course, semester and exam type for you."
          cta="Upload a PDF"
          icon={
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M13 3 4 14h7l-1 7 9-11h-7l1-7Z"
            />
          }
        />
      </div>
    </section>
  );
}

type ContributeCardProps = {
  to: string;
  badge: string;
  title: string;
  description: string;
  cta: string;
  icon: ReactNode;
};

function ContributeCard({ to, badge, title, description, cta, icon }: ContributeCardProps) {
  return (
    <Link
      to={to}
      className="group flex flex-col rounded-2xl border border-gray-200 bg-white p-6 transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md dark:border-gray-800 dark:bg-gray-900 dark:hover:border-blue-500"
    >
      <div className="mb-4 flex items-center justify-between">
        <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 text-white">
          <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            {icon}
          </svg>
        </span>
        <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-300">
          {badge}
        </span>
      </div>
      <h3 className="text-base font-semibold text-gray-900 group-hover:text-blue-700 dark:text-gray-100 dark:group-hover:text-blue-400">
        {title}
      </h3>
      <p className="mt-2 flex-1 text-sm leading-6 text-gray-500 dark:text-gray-400">
        {description}
      </p>
      <span className="mt-4 text-sm font-semibold text-blue-600 dark:text-blue-400">
        {cta} →
      </span>
    </Link>
  );
}

/* ------------------------------ Closing CTA ----------------------------- */

function ClosingCta() {
  return (
    <section className="container mx-auto px-4 pb-20">
      <div className="relative isolate overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 to-indigo-600 px-6 py-14 text-center text-white sm:px-12 sm:py-16">
        <div className="bg-grid absolute inset-0 -z-10 opacity-30" aria-hidden="true" />
        <h2 className="mx-auto max-w-[20ch] text-2xl font-bold tracking-tight sm:text-3xl">
          Your next exam paper is probably already here.
        </h2>
        <p className="mx-auto mt-3 max-w-[48ch] text-sm leading-6 text-blue-100">
          Search the archive, read it in your browser, and pay it forward by
          uploading the papers you have.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            to="/questions"
            className="rounded-lg bg-white px-6 py-3 text-sm font-semibold text-blue-700 transition hover:bg-blue-50 active:scale-[0.98]"
          >
            Browse questions
          </Link>
          <Link
            to="/submissions/auto/new"
            className="rounded-lg border border-white/40 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10 active:scale-[0.98]"
          >
            Contribute a paper
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------- Primitives ----------------------------- */

function SectionHeading({
  eyebrow,
  title,
  subtitle,
  action,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-blue-600 dark:text-blue-400">
          {eyebrow}
        </p>
        <h2 className="mt-1.5 text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
          {title}
        </h2>
        <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>
      </div>
      {action}
    </div>
  );
}

function SeeAll({ to, label }: { to: string; label: string }) {
  return (
    <Link
      to={to}
      className="shrink-0 text-sm font-semibold text-blue-600 hover:underline dark:text-blue-400"
    >
      {label} →
    </Link>
  );
}

// Counts up to `value` once it arrives; respects reduced-motion. Shows "—" while loading.
function CountUp({ value }: { value?: number }) {
  const [display, setDisplay] = useState(() =>
    typeof value === "number" ? value : 0
  );
  const hasDisplayedValue = useRef(typeof value === "number");

  useEffect(() => {
    if (typeof value !== "number") return;

    if (hasDisplayedValue.current) {
      setDisplay(value);
      return;
    }

    hasDisplayedValue.current = true;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setDisplay(value);
      return;
    }

    const duration = 900;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(value * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);

  if (typeof value !== "number") return <>—</>;
  return <>{display.toLocaleString()}</>;
}
