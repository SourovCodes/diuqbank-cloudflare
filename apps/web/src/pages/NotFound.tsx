import { useEffect } from "react";
import { StatusPage } from "../components/ui/StatusPage";

export default function NotFound() {
  useEffect(() => {
    document.title = "Page Not Found | DIUQBank";
  }, []);

  return (
    <StatusPage
      eyebrow="404"
      title="Page not found"
      description="The page you are looking for does not exist, may have moved, or the address may be mistyped."
      actions={[
        { label: "Browse Questions", to: "/questions" },
        { label: "Go Home", to: "/", variant: "secondary" },
      ]}
    />
  );
}
