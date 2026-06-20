import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { QuestionReader } from "@/components/question-reader";
import { getQuestion, getQuestionSubmissions } from "@/lib/api/server";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ id: string }> };

const parseId = (value: string) => {
  const id = Number.parseInt(value, 10);
  return Number.isInteger(id) && id > 0 ? id : null;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const id = parseId((await params).id);
  if (!id) return { title: "Question not found" };
  const question = await getQuestion(id);
  return question
    ? { title: question.title, description: `View submitted question papers for ${question.title}.` }
    : { title: "Question not found" };
}

export default async function QuestionPage({ params }: PageProps) {
  const id = parseId((await params).id);
  if (!id) notFound();

  const [question, submissions] = await Promise.all([
    getQuestion(id),
    getQuestionSubmissions(id),
  ]);

  if (!question || !submissions) notFound();
  return <QuestionReader question={question} submissions={submissions} />;
}
