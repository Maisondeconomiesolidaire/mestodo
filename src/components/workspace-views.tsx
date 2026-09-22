import { format, isBefore, startOfDay } from "date-fns";
import { fr } from "date-fns/locale";
import { CalendarDays, CheckCircle2, Circle, Columns3, FolderKanban, List, Plus, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { AssigneeAvatars } from "@/components/assignee-picker";
import { TaskCard } from "@/components/task-card";
import { PriorityBadge, TASK_STATUS_LABELS } from "@/components/todo-badges";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import type { ProjectId, TaskId, TaskStatus, TodoProject, TodoTask } from "@/lib/todo-types";

function ProjectCard({ project, onOpen }: { project: TodoProject; onOpen: () => void }) {
  const progress = project.taskCount ? Math.round((project.completedTaskCount / project.taskCount) * 100) : 0;
  return (
    <button type="button" onClick={onOpen} className="group rounded-xl border bg-card p-4 text-left transition hover:border-primary/30 hover:shadow-sm">
      <span className="block truncate text-lg font-bold tracking-tight">{project.title}</span>
      <span className="mt-1 block text-xs text-muted-foreground">{project.completedTaskCount}/{project.taskCount} tâches</span>
      <Progress value={progress} className="mt-4 h-1.5" />
    </button>
  );
}

function CompactTaskRow({
  task,
  project,
  canUpdate,
  onOpen,
  onToggle,
}: {
  task: TodoTask;
  project?: TodoProject;
  canUpdate: boolean;
  onOpen: () => void;
  onToggle: () => void;
}) {
  const overdue = Boolean(task.dueAt && task.status !== "done" && isBefore(task.dueAt, startOfDay(new Date())));
  return (
    <div className="grid min-h-12 grid-cols-[32px_minmax(160px,1fr)_auto] items-center gap-2 border-b px-3 last:border-b-0 md:grid-cols-[32px_minmax(220px,1fr)_150px_110px_auto]">
      <Checkbox checked={task.status === "done"} disabled={!canUpdate} onCheckedChange={onToggle} aria-label={`Terminer ${task.title}`} />
      <button type="button" onClick={onOpen} className="min-w-0 py-3 text-left">
        <span className={cn("block truncate text-sm font-medium", task.status === "done" && "text-muted-foreground line-through")}>{task.title}</span>
        {project ? <span className="block truncate text-xs text-muted-foreground md:hidden">{project.title}</span> : null}
      </button>
      <span className="hidden truncate text-xs text-muted-foreground md:block">{project?.title ?? "—"}</span>
      <span className={cn("hidden text-xs text-muted-foreground md:block", overdue && "font-medium text-destructive")}>
        {task.dueAt ? format(task.dueAt, "d MMM", { locale: fr }) : "—"}
      </span>
      <AssigneeAvatars assignees={task.assignees} />
    </div>
  );
}

export function HomeView({
  projects,
  tasks,
  currentClerkId,
  canCreate,
  canUpdate,
  onCreateTask,
  onCreateProject,
  onOpenProject,
  onOpenTask,
  onToggleTask,
}: {
  projects: TodoProject[];
  tasks: TodoTask[];
  currentClerkId: string;
  canCreate: boolean;
  canUpdate: boolean;
  onCreateTask: () => void;
  onCreateProject: () => void;
  onOpenProject: (id: ProjectId) => void;
  onOpenTask: (id: TaskId) => void;
  onToggleTask: (task: TodoTask) => void;
}) {
  const projectById = new Map(projects.map((project) => [project._id, project]));
  const myTasks = tasks
    .filter((task) => task.status !== "done" && task.assignees.some((person) => person.clerkId === currentClerkId && (person.role ?? "responsible") === "responsible"))
    .sort((a, b) => (a.dueAt ?? Number.MAX_SAFE_INTEGER) - (b.dueAt ?? Number.MAX_SAFE_INTEGER))
    .slice(0, 6);
  const activeProjects = projects.filter((project) => project.status === "active");
  const openTasks = tasks.filter((task) => !task.parentTaskId && task.status !== "done").length;

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div><h1 className="text-2xl font-semibold tracking-tight">Accueil</h1><p className="mt-1 text-sm text-muted-foreground">Vue d’ensemble</p></div>
        {canCreate ? <div className="flex items-center gap-2"><Button variant="outline" onClick={onCreateProject}><FolderKanban className="mr-2 h-4 w-4" />Nouveau projet</Button><Button onClick={onCreateTask}><Plus className="mr-2 h-4 w-4" />Nouvelle tâche</Button></div> : null}
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Card><CardContent className="flex items-center gap-3 p-4"><FolderKanban className="h-5 w-5 text-primary" /><div><p className="text-2xl font-semibold tabular-nums">{activeProjects.length}</p><p className="text-xs text-muted-foreground">Projets actifs</p></div></CardContent></Card>
        <Card><CardContent className="flex items-center gap-3 p-4"><Circle className="h-5 w-5 text-primary" /><div><p className="text-2xl font-semibold tabular-nums">{openTasks}</p><p className="text-xs text-muted-foreground">Tâches ouvertes</p></div></CardContent></Card>
        <Card><CardContent className="flex items-center gap-3 p-4"><CheckCircle2 className="h-5 w-5 text-emerald-600" /><div><p className="text-2xl font-semibold tabular-nums">{projects.reduce((sum, project) => sum + project.completedTaskCount, 0)}</p><p className="text-xs text-muted-foreground">Tâches terminées</p></div></CardContent></Card>
      </div>
      <section>
        <div className="mb-3 flex items-center justify-between"><h2 className="text-base font-semibold">Mes tâches à venir</h2></div>
        <div className="overflow-hidden rounded-xl border bg-card">
          {myTasks.length ? myTasks.map((task) => (
            <CompactTaskRow key={task._id} task={task} project={projectById.get(task.projectId)} canUpdate={canUpdate} onOpen={() => onOpenTask(task._id)} onToggle={() => onToggleTask(task)} />
          )) : <p className="px-4 py-8 text-center text-sm text-muted-foreground">Aucune tâche assignée</p>}
        </div>
      </section>
      <section>
        <h2 className="mb-3 text-base font-semibold">Projets</h2>
        {activeProjects.length ? <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{activeProjects.map((project) => <ProjectCard key={project._id} project={project} onOpen={() => onOpenProject(project._id)} />)}</div> : (
          <div className="rounded-xl border border-dashed p-8 text-center">{canCreate ? <Button variant="outline" onClick={onCreateProject}><Plus className="mr-2 h-4 w-4" />Nouveau projet</Button> : <span className="text-sm text-muted-foreground">Aucun projet actif</span>}</div>
        )}
      </section>
    </div>
  );
}

export function MyTasksView({
  projects,
  tasks,
  currentClerkId,
  canCreate,
  canUpdate,
  onCreateTask,
  onOpenTask,
  onToggleTask,
  onChangeTaskStatus,
}: {
  projects: TodoProject[];
  tasks: TodoTask[];
  currentClerkId: string;
  canCreate: boolean;
  canUpdate: boolean;
  onCreateTask: () => void;
  onOpenTask: (id: TaskId) => void;
  onToggleTask: (task: TodoTask) => void;
  onChangeTaskStatus: (task: TodoTask, status: TaskStatus) => void;
}) {
  const [view, setView] = useState<"list" | "board">("board");
  const [search, setSearch] = useState("");
  const projectById = useMemo(() => new Map(projects.map((project) => [project._id, project])), [projects]);
  const mine = useMemo(() => tasks.filter((task) => task.assignees.some((person) => person.clerkId === currentClerkId && (person.role ?? "responsible") === "responsible")), [currentClerkId, tasks]);
  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("fr-FR");
    if (!term) return mine;
    return mine.filter((task) => {
      const projectName = projectById.get(task.projectId)?.title ?? "";
      return `${task.title} ${task.description ?? ""} ${projectName}`.toLocaleLowerCase("fr-FR").includes(term);
    });
  }, [mine, projectById, search]);
  const subtaskCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const task of tasks) if (task.parentTaskId) counts.set(task.parentTaskId, (counts.get(task.parentTaskId) ?? 0) + 1);
    return counts;
  }, [tasks]);
  const groups = (["todo", "in_progress", "done"] as const).map((status) => ({ status, tasks: filtered.filter((task) => task.status === status) }));
  const openCount = mine.filter((task) => task.status !== "done").length;
  const overdueCount = mine.filter((task) => task.status !== "done" && task.dueAt && isBefore(task.dueAt, startOfDay(new Date()))).length;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="text-sm font-semibold text-primary">Mon travail</p><h1 className="mt-1 text-3xl font-bold tracking-tight">Mes tâches</h1><p className="mt-2 text-sm text-muted-foreground">{openCount} tâches ouvertes · {overdueCount} en retard</p></div>
        {canCreate ? <Button onClick={onCreateTask}><Plus className="mr-2 h-4 w-4" />Nouvelle tâche</Button> : null}
      </div>

      <div className="flex flex-col gap-3 rounded-xl border bg-card p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={view} onValueChange={(value) => setView(value as "list" | "board")}>
          <TabsList>
            <TabsTrigger value="list"><List className="mr-2 h-4 w-4" />Liste</TabsTrigger>
            <TabsTrigger value="board"><Columns3 className="mr-2 h-4 w-4" />Tableau</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative w-full sm:w-80"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Rechercher une tâche ou un projet" className="h-9 pl-9" /></div>
      </div>

      {view === "board" ? (
        <div className="grid items-start gap-4 xl:grid-cols-3">
          {groups.map((group) => (
            <section key={group.status} className="min-h-[28rem] rounded-2xl border bg-muted/35 p-3">
              <div className="mb-3 flex items-center justify-between px-1"><div className="flex items-center gap-2"><span className={cn("h-2.5 w-2.5 rounded-full", group.status === "todo" ? "bg-slate-400" : group.status === "in_progress" ? "bg-primary" : "bg-emerald-500")} /><h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{TASK_STATUS_LABELS[group.status]}</h2></div><Badge variant="secondary" className="tabular-nums">{group.tasks.length}</Badge></div>
              <div className="grid gap-2.5">
                {group.tasks.map((task) => (
                  <div key={task._id}>
                    <div className="mb-1.5 flex items-center gap-2 px-1 text-[11px] font-medium text-muted-foreground"><span className="h-2 w-2 rounded" style={{ backgroundColor: projectById.get(task.projectId)?.color ?? "#6366f1" }} /><span className="truncate">{projectById.get(task.projectId)?.title ?? "Projet"}</span></div>
                    <TaskCard task={task} noteCount={0} subtaskCount={subtaskCounts.get(task._id) ?? 0} canUpdate={canUpdate} onOpen={() => onOpenTask(task._id)} onStatusChange={(status) => onChangeTaskStatus(task, status)} />
                  </div>
                ))}
                {group.tasks.length === 0 ? <div className="grid min-h-28 place-items-center rounded-xl border border-dashed bg-background/40 text-sm text-muted-foreground">Aucune tâche</div> : null}
                {canCreate && group.status === "todo" ? <Button variant="ghost" className="justify-start text-muted-foreground" onClick={onCreateTask}><Plus className="mr-2 h-4 w-4" />Ajouter une tâche</Button> : null}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="space-y-5">
          {groups.map((group) => (
            <section key={group.status}>
              <div className="mb-2 flex items-center gap-2"><h2 className="text-sm font-semibold">{TASK_STATUS_LABELS[group.status]}</h2><Badge variant="secondary" className="tabular-nums">{group.tasks.length}</Badge></div>
              <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
                {group.tasks.length ? group.tasks.map((task) => <CompactTaskRow key={task._id} task={task} project={projectById.get(task.projectId)} canUpdate={canUpdate} onOpen={() => onOpenTask(task._id)} onToggle={() => onToggleTask(task)} />) : <p className="px-4 py-6 text-sm text-muted-foreground">Aucune tâche</p>}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

export function ProjectOverview({ project, tasks }: { project: TodoProject; tasks: TodoTask[] }) {
  const rootTasks = tasks.filter((task) => !task.parentTaskId);
  const progress = project.taskCount ? Math.round((project.completedTaskCount / project.taskCount) * 100) : 0;
  const nextTasks = rootTasks.filter((task) => task.status !== "done").sort((a, b) => (a.dueAt ?? Number.MAX_SAFE_INTEGER) - (b.dueAt ?? Number.MAX_SAFE_INTEGER)).slice(0, 5);
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(280px,.7fr)]">
      <Card>
        <CardHeader><CardTitle className="text-base">À venir</CardTitle></CardHeader>
        <CardContent className="space-y-1">
          {nextTasks.length ? nextTasks.map((task) => <div key={task._id} className="flex items-center gap-3 border-b py-3 last:border-0"><Circle className="h-4 w-4 text-muted-foreground" /><span className="min-w-0 flex-1 truncate text-sm">{task.title}</span><PriorityBadge priority={task.priority} />{task.dueAt ? <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><CalendarDays className="h-3.5 w-3.5" />{format(task.dueAt, "d MMM", { locale: fr })}</span> : null}</div>) : <p className="py-8 text-center text-sm text-muted-foreground">Aucune tâche à venir</p>}
        </CardContent>
      </Card>
      <div className="space-y-4">
        <Card><CardHeader><CardTitle className="text-base">Progression</CardTitle></CardHeader><CardContent><div className="mb-3 flex items-end justify-between"><span className="text-3xl font-semibold tabular-nums">{progress}%</span><span className="text-xs text-muted-foreground">{project.completedTaskCount}/{project.taskCount}</span></div><Progress value={progress} /></CardContent></Card>
        {project.description ? <Card><CardHeader><CardTitle className="text-base">Description</CardTitle></CardHeader><CardContent><p className="whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{project.description}</p></CardContent></Card> : null}
      </div>
    </div>
  );
}
