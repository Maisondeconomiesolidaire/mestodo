import { format, isBefore, startOfDay } from "date-fns";
import { fr } from "date-fns/locale";
import { CalendarDays, ChevronDown, Filter, MessageSquareText, Plus, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { AssigneeAvatars } from "@/components/assignee-picker";
import { TaskCard } from "@/components/task-card";
import { PriorityBadge, TASK_STATUS_LABELS } from "@/components/todo-badges";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { TaskId, TaskPriority, TaskStatus, TodoNote, TodoTask } from "@/lib/todo-types";

const COLUMNS: TaskStatus[] = ["todo", "in_progress", "done"];

export function ProjectBoard({
  view,
  tasks,
  notes,
  canCreate,
  canUpdate,
  onCreateTask,
  onOpenTask,
  onToggleTask,
  onChangeTaskStatus,
}: {
  view: "list" | "board";
  tasks: TodoTask[];
  notes: TodoNote[];
  canCreate: boolean;
  canUpdate: boolean;
  onCreateTask: () => void;
  onOpenTask: (id: TaskId) => void;
  onToggleTask: (task: TodoTask) => void;
  onChangeTaskStatus: (task: TodoTask, status: TaskStatus) => void;
}) {
  const [search, setSearch] = useState("");
  const [priorities, setPriorities] = useState<TaskPriority[]>([]);
  const rootTasks = useMemo(() => tasks.filter((task) => !task.parentTaskId), [tasks]);
  const noteCount = useMemo(() => {
    const counts = new Map<string, number>();
    for (const note of notes) if (note.taskId) counts.set(note.taskId, (counts.get(note.taskId) ?? 0) + 1);
    return counts;
  }, [notes]);
  const subtaskCount = useMemo(() => {
    const counts = new Map<string, number>();
    for (const task of tasks) if (task.parentTaskId) counts.set(task.parentTaskId, (counts.get(task.parentTaskId) ?? 0) + 1);
    return counts;
  }, [tasks]);
  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("fr-FR");
    return rootTasks.filter((task) => {
      const matchesTerm = !term || `${task.title} ${task.description ?? ""} ${task.assignees.map((person) => person.name).join(" ")}`.toLocaleLowerCase("fr-FR").includes(term);
      return matchesTerm && (priorities.length === 0 || priorities.includes(task.priority));
    });
  }, [priorities, rootTasks, search]);

  function togglePriority(priority: TaskPriority) {
    setPriorities((current) => current.includes(priority) ? current.filter((value) => value !== priority) : [...current, priority]);
  }

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 border-b pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Rechercher" className="h-9 pl-9" />
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button variant="outline" size="sm"><Filter className="mr-2 h-4 w-4" />Filtrer{priorities.length ? ` (${priorities.length})` : ""}</Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuLabel>Priorité</DropdownMenuLabel><DropdownMenuSeparator />
              {(["low", "medium", "high", "urgent"] as TaskPriority[]).map((priority) => <DropdownMenuCheckboxItem key={priority} checked={priorities.includes(priority)} onCheckedChange={() => togglePriority(priority)}>{priority === "low" ? "Basse" : priority === "medium" ? "Normale" : priority === "high" ? "Haute" : "Urgente"}</DropdownMenuCheckboxItem>)}
            </DropdownMenuContent>
          </DropdownMenu>
          {canCreate ? <Button size="sm" onClick={onCreateTask}><Plus className="mr-2 h-4 w-4" />Ajouter une tâche</Button> : null}
        </div>
      </div>

      {view === "board" ? (
        <div className="grid gap-4 xl:grid-cols-3">
          {COLUMNS.map((status) => {
            const columnTasks = filtered.filter((task) => task.status === status);
            return (
              <section key={status} className="min-h-64 rounded-xl bg-muted/45 p-3">
                <div className="mb-3 flex items-center justify-between px-1"><h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{TASK_STATUS_LABELS[status]}</h2><Badge variant="secondary" className="tabular-nums">{columnTasks.length}</Badge></div>
                <div className="grid gap-2">
                  {columnTasks.map((task) => <TaskCard key={task._id} task={task} noteCount={noteCount.get(task._id) ?? 0} subtaskCount={subtaskCount.get(task._id) ?? 0} canUpdate={canUpdate} onOpen={() => onOpenTask(task._id)} onStatusChange={(next) => onChangeTaskStatus(task, next)} />)}
                  {canCreate ? <Button variant="ghost" className="justify-start text-muted-foreground" onClick={onCreateTask}><Plus className="mr-2 h-4 w-4" />Ajouter une tâche</Button> : null}
                </div>
              </section>
            );
          })}
        </div>
      ) : (
        <div className="space-y-5">
          {COLUMNS.map((status) => {
            const sectionTasks = filtered.filter((task) => task.status === status);
            return (
              <Collapsible key={status} defaultOpen>
                <div className="overflow-hidden rounded-lg border bg-card">
                  <CollapsibleTrigger className="flex w-full items-center gap-2 border-b bg-muted/30 px-3 py-2 text-left hover:bg-muted/50">
                    <ChevronDown className="h-4 w-4" /><span className="text-sm font-semibold">{TASK_STATUS_LABELS[status]}</span><Badge variant="secondary" className="ml-1 tabular-nums">{sectionTasks.length}</Badge>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="hidden grid-cols-[38px_minmax(240px,1fr)_150px_115px_105px_70px] border-b px-3 py-2 text-[11px] font-medium text-muted-foreground lg:grid">
                      <span /><span>Nom de la tâche</span><span>Copains</span><span>Échéance</span><span>Priorité</span><span />
                    </div>
                    {sectionTasks.map((task) => {
                      const overdue = Boolean(task.dueAt && task.status !== "done" && isBefore(task.dueAt, startOfDay(new Date())));
                      return (
                        <div key={task._id} className="group grid min-h-12 grid-cols-[32px_minmax(150px,1fr)_auto] items-center gap-2 border-b px-3 last:border-b-0 hover:bg-muted/25 lg:grid-cols-[38px_minmax(240px,1fr)_150px_115px_105px_70px]">
                          <Checkbox checked={task.status === "done"} disabled={!canUpdate} onCheckedChange={() => onToggleTask(task)} aria-label={`Terminer ${task.title}`} />
                          <button type="button" onClick={() => onOpenTask(task._id)} className="min-w-0 py-3 text-left"><span className={cn("block truncate text-sm font-medium", task.status === "done" && "text-muted-foreground line-through")}>{task.title}</span>{task.description ? <span className="block truncate text-xs text-muted-foreground lg:hidden">{task.description}</span> : null}</button>
                          <div className="lg:hidden"><AssigneeAvatars assignees={task.assignees} /></div>
                          <div className="hidden lg:block"><AssigneeAvatars assignees={task.assignees} /></div>
                          <span className={cn("hidden items-center gap-1 text-xs text-muted-foreground lg:inline-flex", overdue && "font-medium text-destructive")}>{task.dueAt ? <><CalendarDays className="h-3.5 w-3.5" />{format(task.dueAt, "d MMM", { locale: fr })}</> : "—"}</span>
                          <span className="hidden lg:block"><PriorityBadge priority={task.priority} /></span>
                          <span className="hidden items-center justify-end gap-2 text-xs text-muted-foreground lg:flex">{subtaskCount.get(task._id) ? <span>{subtaskCount.get(task._id)} sous-t.</span> : null}{noteCount.get(task._id) ? <MessageSquareText className="h-3.5 w-3.5" /> : null}</span>
                        </div>
                      );
                    })}
                    {sectionTasks.length === 0 ? <p className="px-4 py-5 text-sm text-muted-foreground">Aucune tâche</p> : null}
                    {canCreate && status === "todo" ? <button type="button" onClick={onCreateTask} className="flex w-full items-center gap-2 px-4 py-3 text-sm text-muted-foreground hover:bg-muted/30 hover:text-foreground"><Plus className="h-4 w-4" />Ajouter une tâche</button> : null}
                  </CollapsibleContent>
                </div>
              </Collapsible>
            );
          })}
        </div>
      )}
    </div>
  );
}
