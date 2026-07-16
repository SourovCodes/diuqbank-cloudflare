import { useAuth } from "../auth";
import { SidebarLayout, type NavSection } from "./SidebarLayout";
import { FileTextIcon, UserIcon, UploadIcon } from "./icons";

const navSections: NavSection[] = [
  {
    label: "Account",
    links: [{ to: "/profile", icon: UserIcon, text: "Edit profile" }],
  },
  {
    label: "Submit paper",
    links: [
      { to: "/submissions/new", icon: UploadIcon, text: "Upload a question" },
    ],
  },
  {
    label: "My submissions",
    links: [
      { to: "/submissions", icon: FileTextIcon, text: "Submissions", end: true },
    ],
  },
];

export function DashboardLayout() {
  const { user } = useAuth();

  return (
    <SidebarLayout
      sections={navSections}
      header={
        user && (
          <div className="mb-5 flex items-center gap-3 border-b border-gray-200 px-2.5 pb-5 dark:border-gray-800">
            {user.image ? (
              <img
                src={user.image}
                alt=""
                className="h-9 w-9 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 text-sm font-bold text-white">
                {user.name[0]?.toUpperCase() ?? "?"}
              </div>
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-gray-900 dark:text-gray-100">
                {user.name}
              </p>
              <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                @{user.username}
              </p>
            </div>
          </div>
        )
      }
    />
  );
}
