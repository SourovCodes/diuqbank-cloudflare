import type { Metadata } from "next";

import { SignInPage } from "@/components/sign-in-page";
import { getAuthConfig } from "@/lib/api/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to your DIU Question Bank account.",
};

export default async function Page() {
  const googleClientId = await getAuthConfig();

  return <SignInPage googleClientId={googleClientId} />;
}
