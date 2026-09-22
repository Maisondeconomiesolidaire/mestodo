import { Search, Rows3, SquareKanban } from "lucide-react";
import { useMemo, useState } from "react";
import { TaskCard } from "@/components/task-card";
import { TASK_STATUS_LABELS } from "@/components/todo-badges";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AssigneeAvatars } from "@/components/assignee-picker";
import { PriorityBadge } from "@/components/todo-badges";
import type { TaskId, TaskStatus, TodoNote, TodoTask } from "@/lib/todo-types";

const COLUMNS: TaskStatus[] = ["todo", "in_progress", "done"];

export function ProjectBoard({
  tasks,
  notes,
  canUpdate,
  onOpenTask,
  onToggleTask,
  onChangeTaskStatus,
}: {
  tasks: TodoTask[];
  notes: TodoNote[];
  canUpdate: boolean;
  onOpenTask: (id: TaskId) => void;
  onToggleTask: (task: TodoTask) => void;
  onChangeTaskStatus: (task: TodoTask, status: TaskStatus) => void;
}) {
  const [search, setSearch] = useState("");
  const [view, setView] = useState("board");
  const noteCount = useMemo(() => {
    const counts = new Map<string, number>();
    for (const note of notes) {
      if (note.taskId) counts.set(note.taskId, (counts.get(note.taskId) ?? 0) + 1);
    }
    return counts;
  }, [notes]);
  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("fr-FR");
    if (!term) return tasks;
    return tasks.filter((task) =>
      `${task.title} ${task.description ?? ""} ${task.assignees.map((person) => person.name).join(" ")}`
        .toLocaleLowerCase("fr-FR")
        .includes(term),
    );
  }, [search, tasks]);

  return (
    <Tabs value={view} onValueChange={setView}>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Rechercher une tâche" className="pl-9" />
        </div>
        <TabsList>
          <TabsTrigger value="board" className="gap-2"><SquareKanban className="h-4 w-4" />Tableau</TabsTrigger>
          <TabsTrigger value="list" className="gap-2"><Rows3 className="h-4 w-4" />Liste</TabsTrigger>
        </TabsList>
      </div>
      <TabsContent value="board" className="mt-0">
        <div className="grid gap-4 xl:grid-cols-3">
          {COLUMNS.map((status) => {
            const columnTasks = filtered.filter((task) => task.status === status);
            return (
              <section key={status} className="min-h-52 rounded-2xl border bg-muted/35 p-3">
                <div className="mb-3 flex items-center justify-between px-1">
                  <h2 className="text-sm font-semibold">{TASK_STATUS_LABELS[status]}</h2>
                  <Badge variant="secondary" className="tabular-nums">{columnTasks.length}</Badge>
                </div>
                <div className="grid gap-2">
                  {columnTasks.length === 0 ? (
                    <div className="rounded-xl border border-dashed bg-background/40 px-3 py-8 text-center text-xs text-muted-foreground">Aucune tâche</div>
                  ) : columnTasks.map((task) => (
                    <TaskCard
                      key={task._id}
                      task={task}
                      noteCount={noteCount.get(task._id) ?? 0}
                      canUpdate={canUpdate}
                      onOpen={() => onOpenTask(task._id)}
                      onStatusChange={(status) => onChangeTaskStatus(task, status)}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </TabsContent>
      <TabsContent value="list" className="mt-0">
        <div className="overflow-hidden rounded-xl border bg-card">
          <div className="hidden grid-cols-[36px_minmax(220px,1fr)_140px_120px_110px] gap-3 border-b bg-muted/40 px-4 py-2 text-xs font-medium text-muted-foreground md:grid">
            <span />
            <span>Tâche</span>
            <span>Responsables</span>
            <span>Priorité</span>
            <span>Statut</span>
          </div>
          {filtered.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground">Aucune tâche</p>
          ) : filtered.map((task) => (
            <div key={task._id} className="grid items-center gap-3 border-b px-4 py-3 last:border-b-0 md:grid-cols-[36px_minmax(220px,1fr)_140px_120px_110px]">
              <Checkbox checked={task.status === "done"} disabled={!canUpdate} onCheckedChange={() => onToggleTask(task)} aria-label={`Terminer ${task.title}`} />
              <Button variant="link" className="h-auto justify-start p-0 text-left font-medium text-foreground" onClick={() => onOpenTask(task._id)}>{task.title}</Button>
              <AssigneeAvatars assignees={task.assignees} />
              <PriorityBadge priority={task.priority} />
              <span className="text-xs text-muted-foreground">{TASK_STATUS_LABELS[task.status]}</span>
            </div>
          ))}
        </div>
      </TabsContent>
    </Tabs>
  );
}
