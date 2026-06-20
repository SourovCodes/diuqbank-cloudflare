"use client";

import Link from "next/link";
import { BookOpen, Menu, Moon, Sun, X } from "lucide-react";
import { useTheme } from "next-themes";
import { useState } from "react";
import { Button } from "@/components/ui/button";

const navigation = [
  { href: "/", label: "Home" },
  { href: "/questions", label: "Questions" },
];

export function SiteHeader() {
  const { resolvedTheme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground"><BookOpen className="size-5" /></span>
          <span className="text-xl font-bold">DIU QBank</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {navigation.map((item) => <Button key={item.href} variant="ghost" size="sm" asChild><Link href={item.href}>{item.label}</Link></Button>)}
        </nav>

        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}>
            <Sun className="size-5 scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
            <Moon className="absolute size-5 scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
            <span className="sr-only">Toggle theme</span>
          </Button>
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setOpen((value) => !value)}>
            {open ? <X /> : <Menu />}<span className="sr-only">Toggle menu</span>
          </Button>
        </div>
      </div>
      {open ? <nav className="border-t px-4 py-3 md:hidden">{navigation.map((item) => <Button key={item.href} variant="ghost" className="w-full justify-start" asChild><Link href={item.href} onClick={() => setOpen(false)}>{item.label}</Link></Button>)}</nav> : null}
    </header>
  );
}
