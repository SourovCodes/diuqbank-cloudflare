import type { LucideIcon } from "lucide-react";
export function EmptyState({ icon: Icon, title, description }: { icon: LucideIcon; title: string; description: string }) {
  return <div className="rounded-xl border bg-card p-12 text-center shadow-sm"><Icon className="mx-auto mb-4 size-16 text-blue-400/50 dark:text-blue-500/40" /><h2 className="mb-2 text-lg font-medium">{title}</h2><p className="text-muted-foreground">{description}</p></div>;
}
