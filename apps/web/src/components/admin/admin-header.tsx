"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Fragment } from "react";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";

const labels: Record<string, string> = {
  questions: "Questions",
  departments: "Departments",
  courses: "Courses",
  semesters: "Semesters",
  "exam-types": "Exam Types",
  users: "Users",
  submissions: "Submissions",
  new: "New",
  edit: "Edit",
};

/**
 * Builds a breadcrumb trail from the path: starts at the dashboard, labels each known
 * segment, and skips numeric id segments (folding them into the href of the next
 * segment) so e.g. /admin/questions/5/submissions/new reads
 * Dashboard › Questions › Submissions › New.
 */
function buildCrumbs(pathname: string) {
  const parts = pathname.split("/").filter(Boolean); // ["admin", ...]
  const crumbs: { label: string; href: string }[] = [
    { label: "Dashboard", href: "/admin" },
  ];
  let href = "/admin";
  for (let i = 1; i < parts.length; i++) {
    const segment = parts[i];
    href += `/${segment}`;
    if (/^\d+$/.test(segment)) continue; // id segment — keep in href, no crumb
    crumbs.push({ label: labels[segment] ?? segment, href });
  }
  return crumbs;
}

export function AdminHeader() {
  const pathname = usePathname();
  const { resolvedTheme, setTheme } = useTheme();

  const crumbs = buildCrumbs(pathname);

  return (
    <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator
        orientation="vertical"
        className="mr-1 data-[orientation=vertical]:h-4"
      />
      <Breadcrumb>
        <BreadcrumbList>
          {crumbs.map((crumb, index) => {
            const isLast = index === crumbs.length - 1;
            return (
              <Fragment key={crumb.href}>
                {index > 0 ? (
                  <BreadcrumbSeparator className="hidden sm:block" />
                ) : null}
                <BreadcrumbItem className={isLast ? undefined : "hidden sm:block"}>
                  {isLast ? (
                    <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink asChild>
                      <Link href={crumb.href}>{crumb.label}</Link>
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>
              </Fragment>
            );
          })}
        </BreadcrumbList>
      </Breadcrumb>

      <div className="ml-auto flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
        >
          <Sun className="size-5 scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
          <Moon className="absolute size-5 scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </div>
    </header>
  );
}
