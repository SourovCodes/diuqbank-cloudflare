import Link from "next/link";
import { BookOpen } from "lucide-react";

export function SiteFooter() {
  return (
    <footer className="border-t border-border/40 bg-background">
      <div className="container mx-auto px-4 py-12">
        <div className="grid gap-8 md:grid-cols-3">
          <div className="space-y-4">
            <Link href="/" className="flex items-center gap-2"><span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground"><BookOpen className="size-5" /></span><span className="text-xl font-bold">DIU QBank</span></Link>
            <p className="max-w-sm text-sm text-muted-foreground">Access past exam questions from Daffodil International University. Study smarter with our comprehensive question bank.</p>
          </div>
          <div className="space-y-4"><h4 className="text-sm font-semibold">Resources</h4><ul className="space-y-2 text-sm text-muted-foreground"><li><Link className="hover:text-foreground" href="/questions">Questions</Link></li><li><a className="hover:text-foreground" href="https://diuqbank.sourovcodes.workers.dev/docs">API documentation</a></li></ul></div>
          <div className="space-y-4"><h4 className="text-sm font-semibold">Project</h4><p className="text-sm text-muted-foreground">Community-maintained question papers for DIU students.</p></div>
        </div>
        <div className="mt-8 border-t border-border/40 pt-8 text-center text-sm text-muted-foreground">© {new Date().getFullYear()} DIU Question Bank. All rights reserved.</div>
      </div>
    </footer>
  );
}
