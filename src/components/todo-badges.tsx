import { AlertTriangle, ArrowDown, ArrowUp, Minus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ProjectStatus, TaskPriority, TaskStatus } from "@/lib/todo-types";

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  todo: "À faire",
  in_progress: "En cours",
  done: "Terminé",
};

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  active: "Actif",
  completed: "Terminé",
  archived: "Archivé",
};

export const PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: "Basse",
  medium: "Normale",
  high: "Haute",
  urgent: "Urgente",
};

const priorityStyles: Record<TaskPriority, string> = {
  low: "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300",
  medium: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-300",
  high: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300",
  urgent: "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300",
};

const priorityIcons = {
  low: ArrowDown,
  medium: Minus,
  high: ArrowUp,
  urgent: AlertTriangle,
};

export function PriorityBadge({ priority }: { priority: TaskPriority }) {
  const Icon = priorityIcons[priority];
  return (
    <Badge variant="outline" className={cn("gap-1 font-medium", priorityStyles[priority])}>
      <Icon className="h-3 w-3" />
      {PRIORITY_LABELS[priority]}
    </Badge>
  );
}

export function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  return (
    <Badge variant={status === "active" ? "default" : "secondary"}>
      {PROJECT_STATUS_LABELS[status]}
    </Badge>
  );
}
