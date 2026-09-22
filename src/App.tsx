import { useEffect, useState } from "react";
import { UserButton } from "@clerk/clerk-react";
import { AuthLoading, Authenticated, Unauthenticated, useAction, useMutation, useQuery } from "convex/react";
import { useTheme } from "next-themes";
import {
  Archive,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  CircleDashed,
  ClipboardCheck,
  FolderKanban,
  Loader2,
  Menu,
  Moon,
  MoreHorizontal,
  NotebookPen,
  Pencil,
  Plus,
  Sun,
  Trash2,
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { api } from "../convex/_generated/api";
import { AuthServiceFallback, AuthSwitch } from "@/components/ui/auth-switch";
import { ProjectBoard } from "@/components/project-board";
import { ProjectDialog } from "@/components/project-dialog";
import { ProjectNotes } from "@/components/project-notes";
import { TaskDialog } from "@/components/task-dialog";
import { TaskSheet } from "@/components/task-sheet";
import { ProjectStatusBadge, PROJECT_STATUS_LABELS } from "@/components/todo-badges";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  canAccess,
  errorMessage,
  type Access,
  type DirectoryPerson,
  type ProjectId,
  type ProjectStatus,
  type TaskId,
  type TodoProject,
  type TodoTask,
} from "@/lib/todo-types";

type ProjectFilter = "all" | ProjectStatus;
type WorkspaceSection = "tasks" | "notes";

export default function App() {
  const signup = window.location.pathname.startsWith("/inscription");
  return (
    <>
      <AuthServiceFallback />
      <AuthLoading>
        <div className="flex min-h-screen items-center justify-center bg-background">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </AuthLoading>
      <Unauthenticated>
        <AuthSwitch
          appName="Mes Todo"
          logoSrc="/logo.svg"
          initialMode={signup ? "signup" : "signin"}
          welcomeTitle="Bienvenue sur Mes Todo"
          signinSubtitle="Connectez-vous pour accéder aux projets et aux tâches."
          memberPanelDescription="Retrouvez les projets, les tâches et les notes de l'équipe."
        />
      </Unauthenticated>
      <Authenticated><Workspace /></Authenticated>
    </>
  );
}

function Workspace() {
  const access = useQuery(api.permissions.myAccess) as Access | undefined;
  const canRead = canAccess(access, "read");
  const canCreate = canAccess(access, "create");
  const canUpdate = canAccess(access, "update");
  const canDelete = canAccess(access, "delete");
  const [filter, setFilter] = useState<ProjectFilter>("all");
  const projects = useQuery(
    api.mestodo.listProjects,
    canRead ? { status: filter === "all" ? undefined : filter } : "skip",
  );
  const [selectedProjectId, setSelectedProjectId] = useState<ProjectId | null>(null);
  const effectiveProjectId = selectedProjectId && projects?.some((project) => project._id === selectedProjectId)
    ? selectedProjectId
    : projects?.[0]?._id ?? null;
  const data = useQuery(
    api.mestodo.getProject,
    canRead && effectiveProjectId ? { projectId: effectiveProjectId } : "skip",
  );
  const listDirectory = useAction(api.mestodo.listDirectory);
  const updateProject = useMutation(api.mestodo.updateProject);
  const removeProject = useMutation(api.mestodo.removeProject);
  const updateTask = useMutation(api.mestodo.updateTask);
  const requestAccess = useAction(api.permissions.requestAccess);
  const [directory, setDirectory] = useState<DirectoryPerson[]>([]);
  const [directoryError, setDirectoryError] = useState(false);
  const [projectDialogOpen, setProjectDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<TodoProject | undefined>();
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<TaskId | null>(null);
  const [section, setSection] = useState<WorkspaceSection>("tasks");
  const [deleteProjectOpen, setDeleteProjectOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!canRead) return;
    let cancelled = false;
    void listDirectory({})
      .then((people) => {
        if (!cancelled) setDirectory(people);
      })
      .catch(() => {
        if (!cancelled) setDirectoryError(true);
      });
    return () => { cancelled = true; };
  }, [canRead, listDirectory]);

  if (access === undefined) return <WorkspaceSkeleton />;
  if (!canRead) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-muted/25 p-6">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <ClipboardCheck className="mx-auto h-9 w-9 text-muted-foreground" />
            <h1 className="mt-4 text-xl font-semibold">Accès non attribué</h1>
            <p className="mt-2 text-sm text-muted-foreground">Le droit Mes Todo doit être activé dans Mes Outils.</p>
            <Button className="mt-5" onClick={() => void requestAccess({ pageKey: "mestodo:projets", pageLabel: "Mes Todo", requestedAction: "read" })}>
              Demander l’accès
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  const project = data?.project;
  const selectedTask = data?.tasks.find((task) => task._id === selectedTaskId);
  const progress = project?.taskCount
    ? Math.round((project.completedTaskCount / project.taskCount) * 100)
    : 0;

  async function changeProjectStatus(status: ProjectStatus) {
    if (!project) return;
    setError(null);
    try {
      await updateProject({ projectId: project._id, status });
    } catch (caught) {
      setError(errorMessage(caught, "Mise à jour impossible."));
    }
  }

  async function destroyProject() {
    if (!project) return;
    setError(null);
    try {
      await removeProject({ projectId: project._id });
      setSelectedProjectId(null);
      setDeleteProjectOpen(false);
    } catch (caught) {
      setError(errorMessage(caught, "Suppression impossible."));
    }
  }

  async function changeTaskStatus(task: TodoTask, status: TodoTask["status"]) {
    setError(null);
    try {
      await updateTask({ taskId: task._id, status });
    } catch (caught) {
      setError(errorMessage(caught, "Mise à jour impossible."));
    }
  }

  const sidebarProps = {
    projects: projects ?? [],
    selectedId: effectiveProjectId,
    filter,
    onFilterChange: setFilter,
    onSelect: (id: ProjectId) => { setSelectedProjectId(id); setSection("tasks"); },
    canCreate,
    onCreate: () => { setEditingProject(undefined); setProjectDialogOpen(true); },
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 border-r bg-card lg:block">
        <ProjectSidebar {...sidebarProps} />
      </aside>
      <div className="lg:pl-72">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b bg-background/90 px-4 backdrop-blur md:px-6">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Ouvrir la navigation"><Menu className="h-5 w-5" /></Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0"><ProjectSidebar {...sidebarProps} /></SheetContent>
          </Sheet>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-base font-semibold">{project?.title ?? "Mes Todo"}</h1>
          </div>
          <ThemeToggle />
          <UserButton afterSignOutUrl="/connexion" />
        </header>
        <main className="p-4 md:p-6 xl:p-8">
          {error ? (
            <Alert variant="destructive" className="mb-5">
              <AlertTitle>Action impossible</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
          {projects === undefined || (effectiveProjectId && data === undefined) ? (
            <ProjectSkeleton />
          ) : !project || !data ? (
            <EmptyWorkspace canCreate={canCreate} onCreate={() => { setEditingProject(undefined); setProjectDialogOpen(true); }} />
          ) : (
            <>
              <section className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: project.color ?? "#4f46e5" }} />
                    <h2 className="text-2xl font-bold tracking-tight">{project.title}</h2>
                    <ProjectStatusBadge status={project.status} />
                  </div>
                  {project.description ? <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{project.description}</p> : null}
                  <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                    <span>Créé par {project.createdByName}</span>
                    {project.dueAt ? <span className="inline-flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" />{format(project.dueAt, "d MMMM yyyy", { locale: fr })}</span> : null}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant={section === "tasks" ? "secondary" : "ghost"} onClick={() => setSection("tasks")}><FolderKanban className="mr-2 h-4 w-4" />Tâches</Button>
                  <Button variant={section === "notes" ? "secondary" : "ghost"} onClick={() => setSection("notes")}><NotebookPen className="mr-2 h-4 w-4" />Notes</Button>
                  {canCreate ? <Button onClick={() => setTaskDialogOpen(true)}><Plus className="mr-2 h-4 w-4" />Tâche</Button> : null}
                  {canUpdate || canDelete ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="outline" size="icon" aria-label="Actions du projet"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-52">
                        <DropdownMenuLabel>Projet</DropdownMenuLabel>
                        {canUpdate ? (
                          <>
                            <DropdownMenuItem onSelect={() => { setEditingProject(project); setProjectDialogOpen(true); }}><Pencil className="mr-2 h-4 w-4" />Modifier</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {(["active", "completed", "archived"] as ProjectStatus[]).map((status) => (
                              <DropdownMenuItem key={status} onSelect={() => void changeProjectStatus(status)} disabled={status === project.status}>
                                {status === "active" ? <CircleDashed className="mr-2 h-4 w-4" /> : status === "completed" ? <CheckCircle2 className="mr-2 h-4 w-4" /> : <Archive className="mr-2 h-4 w-4" />}
                                {PROJECT_STATUS_LABELS[status]}
                              </DropdownMenuItem>
                            ))}
                          </>
                        ) : null}
                        {canDelete ? (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => setDeleteProjectOpen(true)}><Trash2 className="mr-2 h-4 w-4" />Supprimer</DropdownMenuItem>
                          </>
                        ) : null}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : null}
                </div>
              </section>
              <section className="mb-6 grid gap-3 sm:grid-cols-3">
                <StatCard label="Tâches" value={project.taskCount} icon={<ClipboardCheck className="h-4 w-4" />} />
                <StatCard label="Terminées" value={project.completedTaskCount} icon={<CheckCircle2 className="h-4 w-4" />} />
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between text-sm"><span className="text-muted-foreground">Progression</span><span className="font-semibold tabular-nums">{progress}%</span></div>
                    <Progress value={progress} className="mt-3 h-2" />
                  </CardContent>
                </Card>
              </section>
              {directoryError ? <p className="mb-4 text-xs text-muted-foreground">L’annuaire des responsables est temporairement indisponible.</p> : null}
              {section === "tasks" ? (
                <ProjectBoard
                  tasks={data.tasks}
                  notes={data.notes}
                  canUpdate={canUpdate}
                  onOpenTask={setSelectedTaskId}
                  onToggleTask={(task) => void changeTaskStatus(task, task.status === "done" ? "todo" : "done")}
                  onChangeTaskStatus={(task, status) => void changeTaskStatus(task, status)}
                />
              ) : (
                <ProjectNotes projectId={project._id} notes={data.notes} canCreate={canCreate} canDelete={canDelete} />
              )}
              <TaskDialog open={taskDialogOpen} onOpenChange={setTaskDialogOpen} projectId={project._id} directory={directory} />
              <TaskSheet
                open={Boolean(selectedTask)}
                onOpenChange={(open) => { if (!open) setSelectedTaskId(null); }}
                projectId={project._id}
                task={selectedTask}
                notes={data.notes}
                directory={directory}
                canUpdate={canUpdate}
                canCreate={canCreate}
                canDelete={canDelete}
              />
              <AlertDialog open={deleteProjectOpen} onOpenChange={setDeleteProjectOpen}>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Supprimer « {project.title} » ?</AlertDialogTitle>
                    <AlertDialogDescription>Toutes les tâches et les notes de ce projet seront supprimées.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                    <AlertDialogAction onClick={() => void destroyProject()} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Supprimer</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}
        </main>
      </div>
      <ProjectDialog
        open={projectDialogOpen}
        onOpenChange={setProjectDialogOpen}
        project={editingProject}
        onSaved={(id) => { if (id) setSelectedProjectId(id); setEditingProject(undefined); }}
      />
    </div>
  );
}

function ProjectSidebar({
  projects,
  selectedId,
  filter,
  onFilterChange,
  onSelect,
  canCreate,
  onCreate,
}: {
  projects: TodoProject[];
  selectedId: ProjectId | null;
  filter: ProjectFilter;
  onFilterChange: (filter: ProjectFilter) => void;
  onSelect: (id: ProjectId) => void;
  canCreate: boolean;
  onCreate: () => void;
}) {
  return (
    <div className="flex h-full flex-col bg-card">
      <div className="flex h-16 items-center gap-3 border-b px-5">
        <img src="/logo.svg" alt="Mes Todo" className="h-9 w-auto dark:hidden" />
        <img src="/logo-dark.svg" alt="Mes Todo" className="hidden h-9 w-auto dark:block" />
      </div>
      <div className="p-4">
        {canCreate ? <Button className="w-full" onClick={onCreate}><Plus className="mr-2 h-4 w-4" />Nouveau projet</Button> : null}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="mt-3 w-full justify-between px-2 text-sm font-medium">
              {filter === "all" ? "Tous les projets" : PROJECT_STATUS_LABELS[filter]}
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-60">
            <DropdownMenuItem onSelect={() => onFilterChange("all")}>Tous les projets</DropdownMenuItem>
            {(["active", "completed", "archived"] as ProjectStatus[]).map((status) => (
              <DropdownMenuItem key={status} onSelect={() => onFilterChange(status)}>{PROJECT_STATUS_LABELS[status]}</DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <Separator />
      <ScrollArea className="min-h-0 flex-1">
        <div className="grid gap-1 p-3">
          {projects.length === 0 ? <p className="px-2 py-6 text-center text-xs text-muted-foreground">Aucun projet</p> : projects.map((project) => {
            const progress = project.taskCount ? Math.round((project.completedTaskCount / project.taskCount) * 100) : 0;
            return (
              <button
                key={project._id}
                type="button"
                onClick={() => onSelect(project._id)}
                className={cn("rounded-lg px-3 py-3 text-left transition-colors hover:bg-muted", selectedId === project._id && "bg-primary/10 text-primary hover:bg-primary/10")}
              >
                <span className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: project.color ?? "#4f46e5" }} />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">{project.title}</span>
                  <span className="text-[11px] tabular-nums text-muted-foreground">{project.completedTaskCount}/{project.taskCount}</span>
                </span>
                <span className="mt-2 block h-1 overflow-hidden rounded-full bg-muted">
                  <span className="block h-full rounded-full bg-primary" style={{ width: `${progress}%` }} />
                </span>
              </button>
            );
          })}
        </div>
      </ScrollArea>
      <div className="flex items-center justify-between border-t p-4 text-xs text-muted-foreground">
        <span>{projects.length} projet{projects.length === 1 ? "" : "s"}</span>
        <a href="https://mesoutils.groupemes.fr" className="font-medium hover:text-foreground">Mes Outils</a>
      </div>
    </div>
  );
}

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const dark = resolvedTheme === "dark";
  return (
    <Button variant="ghost" size="icon" onClick={() => setTheme(dark ? "light" : "dark")} aria-label={dark ? "Activer le thème clair" : "Activer le thème sombre"}>
      {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  );
}

function StatCard({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between p-4">
        <div><p className="text-sm text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-bold tabular-nums">{value}</p></div>
        <span className="rounded-lg bg-primary/10 p-2 text-primary">{icon}</span>
      </CardContent>
    </Card>
  );
}

function EmptyWorkspace({ canCreate, onCreate }: { canCreate: boolean; onCreate: () => void }) {
  return (
    <div className="flex min-h-[65vh] items-center justify-center">
      <div className="max-w-sm text-center">
        <FolderKanban className="mx-auto h-10 w-10 text-muted-foreground" />
        <h2 className="mt-4 text-xl font-semibold">Aucun projet</h2>
        {canCreate ? <Button className="mt-5" onClick={onCreate}><Plus className="mr-2 h-4 w-4" />Créer un projet</Button> : null}
      </div>
    </div>
  );
}

function WorkspaceSkeleton() {
  return <div className="grid min-h-screen grid-cols-[288px_1fr]"><Skeleton className="h-full rounded-none" /><div className="p-8"><ProjectSkeleton /></div></div>;
}

function ProjectSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2"><Skeleton className="h-8 w-64" /><Skeleton className="h-4 w-96 max-w-full" /></div>
      <div className="grid gap-3 sm:grid-cols-3"><Skeleton className="h-24" /><Skeleton className="h-24" /><Skeleton className="h-24" /></div>
      <div className="grid gap-4 xl:grid-cols-3"><Skeleton className="h-80" /><Skeleton className="h-80" /><Skeleton className="h-80" /></div>
    </div>
  );
}
