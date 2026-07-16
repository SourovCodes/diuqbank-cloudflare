import { Link } from "react-router-dom";
import { useAuth } from "../auth";
import { SidebarLayout, type NavSection } from "./SidebarLayout";
import {
  ArrowLeftIcon,
  BookOpenIcon,
  CalendarIcon,
  DatabaseIcon,
  FileQuestionIcon,
  FileTextIcon,
  GaugeIcon,
  InboxIcon,
  LandmarkIcon,
  PenLineIcon,
  UsersIcon,
} from "./icons";

const navSections: NavSection[] = [
  {
    label: "Overview",
    links: [{ to: "/admin", icon: GaugeIcon, text: "Dashboard", end: true }],
  },
  {
    label: "Review",
    links: [
      {
        to: "/admin/manual-submissions",
        icon: InboxIcon,
        text: "Review queue",
      },
    ],
  },
  {
    label: "Content",
    links: [
      { to: "/admin/questions", icon: FileQuestionIcon, text: "Questions" },
      { to: "/admin/submissions", icon: FileTextIcon, text: "Submissions" },
    ],
  },
  {
    label: "Taxonomy",
    links: [
      { to: "/admin/departments", icon: LandmarkIcon, text: "Departments" },
      { to: "/admin/courses", icon: BookOpenIcon, text: "Courses" },
      { to: "/admin/semesters", icon: CalendarIcon, text: "Semesters" },
      { to: "/admin/exam-types", icon: PenLineIcon, text: "Exam types" },
    ],
  },
  {
    label: "People",
    links: [{ to: "/admin/users", icon: UsersIcon, text: "Users" }],
  },
  {
    label: "System",
    links: [{ to: "/admin/backups", icon: DatabaseIcon, text: "Backups" }],
  },
];

export function AdminLayout() {
  const { user } = useAuth();

  return (
    <SidebarLayout
      sections={navSections}
      header={
        <div className="mb-5 border-b border-gray-200 px-2.5 pb-5 dark:border-gray-800">
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Admin panel
          </p>
          {user && (
            <p className="mt-0.5 truncate text-xs text-gray-500 dark:text-gray-400">
              {user.name}
            </p>
          )}
          <Link
            to="/"
            className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 transition hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
          >
            <ArrowLeftIcon className="h-3.5 w-3.5" />
            Back to site
          </Link>
        </div>
      }
    />
  );
}
