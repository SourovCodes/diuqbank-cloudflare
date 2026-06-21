import Link from "next/link";
import { BookOpen, Download, FileText, GraduationCap, Search, Upload, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const features = [
  { icon: FileText, title: "Extensive Collection", text: "Thousands of previous year question papers from various midterm and final exams.", color: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" },
  { icon: Download, title: "Easy Downloads", text: "Download question papers in PDF format for offline studying and printing.", color: "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400" },
  { icon: Upload, title: "Community Driven", text: "Students can contribute question papers to help fellow students succeed.", color: "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400" },
  { icon: GraduationCap, title: "All Departments", text: "Questions from CSE, EEE, BBA, English, Law, Pharmacy, and other DIU departments.", color: "bg-cyan-100 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400" },
  { icon: Users, title: "Verified Content", text: "Submissions are reviewed to ensure the quality and accuracy of question papers.", color: "bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400" },
  { icon: BookOpen, title: "Study Smart", text: "Understand exam patterns and focus on important topics to improve your grades.", color: "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400" },
];

export default function Home() {
  return (
    <div className="flex flex-col">
      <section className="relative overflow-hidden py-24 lg:py-32">
        <div className="container relative z-10 mx-auto px-4">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center rounded-full border bg-muted/50 px-4 py-1.5 text-sm"><span className="mr-2">📚</span>Daffodil International University</div>
            <h1 className="mb-6 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">DIU <span className="text-primary">Question Bank</span></h1>
            <p className="mb-8 text-lg text-muted-foreground sm:text-xl">Access past exam questions from all departments and courses. Study smarter with our comprehensive collection organized by semester and exam type.</p>
            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button size="lg" className="w-full sm:w-auto" asChild><Link href="/questions"><Search />Browse Questions</Link></Button>
              <Button variant="outline" size="lg" className="w-full sm:w-auto" asChild><a href="https://diuqbank.sourovcodes.workers.dev/docs"><Upload />API Documentation</a></Button>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-muted/30 py-24">
        <div className="container mx-auto px-4">
          <div className="mb-12 text-center"><h2 className="mb-4 text-3xl font-bold">Why Use DIU Question Bank?</h2><p className="mx-auto max-w-2xl text-muted-foreground">Everything you need to prepare for your exams. Access and study with past questions.</p></div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {features.map(({ icon: Icon, title, text, color }) => <Card key={title}><CardHeader><div className={`mb-4 flex size-12 items-center justify-center rounded-lg ${color}`}><Icon className="size-6" /></div><CardTitle>{title}</CardTitle><CardDescription>{text}</CardDescription></CardHeader></Card>)}
          </div>
        </div>
      </section>

      <section className="py-24">
        <div className="container mx-auto px-4">
          <div className="mb-12 text-center"><h2 className="mb-4 text-3xl font-bold">How It Works</h2><p className="mx-auto max-w-2xl text-muted-foreground">Simple and easy to use. Find what you need in seconds.</p></div>
          <div className="relative grid gap-12 md:grid-cols-3">
            <Step icon={Search} color="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" title="1. Find Your Paper">Filter by course, department, semester, and exam type.</Step>
            <Step icon={Download} color="bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400" title="2. Download & Study">View question papers online or download the PDF.</Step>
            <Step icon={Upload} color="bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400" title="3. Contribute Back">Use the Android app to submit papers for other students.</Step>
            <div className="absolute top-8 right-[15%] left-[15%] -z-10 hidden h-px bg-muted md:block" />
          </div>
        </div>
      </section>

      <section className="py-24 pt-0">
        <div className="container mx-auto px-4"><div className="rounded-2xl bg-primary p-8 text-center md:p-16"><h2 className="mb-4 text-3xl font-bold text-primary-foreground md:text-4xl">Ready to Ace Your Exams?</h2><p className="mx-auto mb-8 max-w-2xl text-primary-foreground/80 md:text-lg">Start exploring our collection of past exam questions.</p><Button size="lg" variant="secondary" asChild><Link href="/questions"><BookOpen />Browse Questions</Link></Button></div></div>
      </section>
    </div>
  );
}

function Step({ icon: Icon, color, title, children }: { icon: typeof Search; color: string; title: string; children: React.ReactNode }) {
  return <div className="relative z-10 text-center"><div className={`mx-auto mb-4 flex size-16 items-center justify-center rounded-full ${color}`}><Icon className="size-8" /></div><h3 className="mb-2 text-xl font-semibold">{title}</h3><p className="text-muted-foreground">{children}</p></div>;
}
