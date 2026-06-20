import type { LucideIcon } from "lucide-react";

export function EmptyState({ icon: Icon, title, description }: { icon: LucideIcon; title: string; description: string }) {
  return (
    <div className="rounded-2xl border border-dashed bg-white px-6 py-16 text-center">
      <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-500"><Icon className="size-7" /></span>
      <h2 className="mt-5 text-lg font-bold text-slate-900">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">{description}</p>
    </div>
  );
}
