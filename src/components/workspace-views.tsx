import { format, isBefore, startOfDay } from "date-fns";
import { fr } from "date-fns/locale";
import { CalendarDays, CheckCircle2, Circle, FolderKanban, Plus } from "lucide-react";
import { AssigneeAvatars } from "@/components/assignee-picker";
import { PriorityBadge, TASK_STATUS_LABELS } from "@/components/todo-badges";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { ProjectId, TaskId, TodoProject, TodoTask } from "@/lib/todo-types";

function ProjectCard({ project, onOpen }: { project: TodoProject; onOpen: () => void }) {
  const progress = project.taskCount ? Math.round((project.completedTaskCount / project.taskCount) * 100) : 0;
  return (
    <button type="button" onClick={onOpen} className="group rounded-xl border bg-card p-4 text-left transition hover:border-primary/30 hover:shadow-sm">
      <span className="flex items-center gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg text-white" style={{ backgroundColor: project.color ?? "#6366f1" }}>
          <FolderKanban className="h-5 w-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold">{project.title}</span>
          <span className="mt-1 block text-xs text-muted-foreground">{project.completedTaskCount}/{project.taskCount} tâches</span>
        </span>
      </span>
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
  onCreateProject: () => void;
  onOpenProject: (id: ProjectId) => void;
  onOpenTask: (id: TaskId) => void;
  onToggleTask: (task: TodoTask) => void;
}) {
  const projectById = new Map(projects.map((project) => [project._id, project]));
  const myTasks = tasks
    .filter((task) => task.status !== "done" && task.assignees.some((person) => person.clerkId === currentClerkId))
    .sort((a, b) => (a.dueAt ?? Number.MAX_SAFE_INTEGER) - (b.dueAt ?? Number.MAX_SAFE_INTEGER))
    .slice(0, 6);
  const activeProjects = projects.filter((project) => project.status === "active");
  const openTasks = tasks.filter((task) => !task.parentTaskId && task.status !== "done").length;

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="flex items-center justify-between gap-4">
        <div><h1 className="text-2xl font-semibold tracking-tight">Accueil</h1><p className="mt-1 text-sm text-muted-foreground">Vue d’ensemble</p></div>
        {canCreate ? <Button onClick={onCreateProject}><Plus className="mr-2 h-4 w-4" />Créer</Button> : null}
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
  canUpdate,
  onOpenTask,
  onToggleTask,
}: {
  projects: TodoProject[];
  tasks: TodoTask[];
  currentClerkId: string;
  canUpdate: boolean;
  onOpenTask: (id: TaskId) => void;
  onToggleTask: (task: TodoTask) => void;
}) {
  const projectById = new Map(projects.map((project) => [project._id, project]));
  const mine = tasks.filter((task) => task.assignees.some((person) => person.clerkId === currentClerkId));
  const groups = (["todo", "in_progress", "done"] as const).map((status) => ({ status, tasks: mine.filter((task) => task.status === status) }));
  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-7"><h1 className="text-2xl font-semibold tracking-tight">Mes tâches</h1><p className="mt-1 text-sm text-muted-foreground">{mine.filter((task) => task.status !== "done").length} tâches ouvertes</p></div>
      <div className="space-y-5">
        {groups.map((group) => (
          <section key={group.status}>
            <div className="mb-2 flex items-center gap-2"><h2 className="text-sm font-semibold">{TASK_STATUS_LABELS[group.status]}</h2><Badge variant="secondary" className="tabular-nums">{group.tasks.length}</Badge></div>
            <div className="overflow-hidden rounded-xl border bg-card">
              {group.tasks.length ? group.tasks.map((task) => <CompactTaskRow key={task._id} task={task} project={projectById.get(task.projectId)} canUpdate={canUpdate} onOpen={() => onOpenTask(task._id)} onToggle={() => onToggleTask(task)} />) : <p className="px-4 py-6 text-sm text-muted-foreground">Aucune tâche</p>}
            </div>
          </section>
        ))}
      </div>
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
