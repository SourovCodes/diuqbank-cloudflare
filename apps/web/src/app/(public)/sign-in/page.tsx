import type { Metadata } from "next";

import { SignInPage } from "@/components/sign-in-page";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to your DIU Question Bank account.",
};

export default function Page() {
  return <SignInPage />;
}
