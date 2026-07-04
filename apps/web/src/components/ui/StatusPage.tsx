import { Link } from "react-router-dom";

type StatusAction = {
  label: string;
  to: string;
  variant?: "primary" | "secondary";
};

type StatusPageProps = {
  eyebrow: string;
  title: string;
  description: string;
  actions: StatusAction[];
};

export function StatusPage({
  eyebrow,
  title,
  description,
  actions,
}: StatusPageProps) {
  return (
    <main className="relative isolate flex flex-1 items-center justify-center px-4 py-16 text-center sm:py-24">
      <div className="hero-glow absolute inset-0 -z-10" aria-hidden="true" />
      <section className="animate-fade-up max-w-xl">
        <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-blue-600 dark:text-blue-400">
          {eyebrow}
        </p>
        <h1 className="text-3xl font-bold leading-tight tracking-tight text-gray-900 dark:text-gray-100 sm:text-4xl">
          {title}
        </h1>
        <p className="mx-auto mt-4 max-w-[48ch] text-sm leading-6 text-gray-500 dark:text-gray-400">
          {description}
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {actions.map((action) => (
            <Link
              key={action.to}
              to={action.to}
              className={
                action.variant === "secondary"
                  ? "rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-semibold transition hover:bg-gray-50 active:scale-[0.98] dark:border-gray-700 dark:hover:bg-gray-900"
                  : "rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 active:scale-[0.98]"
              }
            >
              {action.label}
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
