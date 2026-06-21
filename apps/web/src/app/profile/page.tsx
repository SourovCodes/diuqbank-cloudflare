import type { Metadata } from "next";

import { ProfileEditor } from "@/components/profile-editor";

export const metadata: Metadata = {
  title: "Edit profile",
  description: "Update your DIU Question Bank profile.",
};

export default function ProfilePage() {
  return <ProfileEditor />;
}
