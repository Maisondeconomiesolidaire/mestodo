import { CalendarDays, MessageSquareText } from "lucide-react";
import { fr } from "date-fns/locale";
import { format, isBefore, startOfDay } from "date-fns";
import { AssigneeAvatars } from "@/components/assignee-picker";
import { PriorityBadge, TASK_STATUS_LABELS } from "@/components/todo-badges";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { TaskStatus, TodoTask } from "@/lib/todo-types";

export function TaskCard({
  task,
  noteCount,
  canUpdate,
  onOpen,
  onStatusChange,
}: {
  task: TodoTask;
  noteCount: number;
  canUpdate: boolean;
  onOpen: () => void;
  onStatusChange: (status: TaskStatus) => void;
}) {
  const overdue = Boolean(task.dueAt && task.status !== "done" && isBefore(task.dueAt, startOfDay(new Date())));

  return (
    <article
      className="group rounded-xl border bg-card p-3 shadow-sm transition hover:border-primary/30 hover:shadow-md"
    >
      <div className="flex items-start gap-3">
        <Checkbox
          checked={task.status === "done"}
          disabled={!canUpdate}
          onCheckedChange={(checked) => onStatusChange(checked ? "done" : "todo")}
          aria-label={task.status === "done" ? "Rouvrir la tâche" : "Terminer la tâche"}
          className="mt-0.5"
        />
        <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-left">
          <h3 className={cn("text-sm font-semibold leading-5", task.status === "done" && "text-muted-foreground line-through")}>{task.title}</h3>
          {task.description ? <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">{task.description}</p> : null}
        </button>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <PriorityBadge priority={task.priority} />
        {task.dueAt ? (
          <span className={cn("inline-flex items-center gap-1 text-xs text-muted-foreground", overdue && "font-medium text-destructive")}>
            <CalendarDays className="h-3.5 w-3.5" />
            {format(task.dueAt, "d MMM", { locale: fr })}
          </span>
        ) : null}
        {noteCount > 0 ? (
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <MessageSquareText className="h-3.5 w-3.5" /> {noteCount}
          </span>
        ) : null}
        <div className="ml-auto flex items-center gap-2">
          <AssigneeAvatars assignees={task.assignees} />
          {canUpdate ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
                  {TASK_STATUS_LABELS[task.status]}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {(["todo", "in_progress", "done"] as TaskStatus[]).map((status) => (
                  <DropdownMenuItem key={status} onSelect={() => onStatusChange(status)}>
                    {TASK_STATUS_LABELS[status]}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </div>
      </div>
    </article>
  );
}
