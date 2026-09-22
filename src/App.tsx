import { useEffect, useState } from "react";
import { UserButton } from "@clerk/clerk-react";
import { AuthLoading, Authenticated, Unauthenticated, useAction, useMutation, useQuery } from "convex/react";
import { useTheme } from "next-themes";
import {
  Archive,
  CheckCircle2,
  ChevronDown,
  CircleDashed,
  ClipboardCheck,
  FolderKanban,
  Home,
  LayoutList,
  Loader2,
  Menu,
  Moon,
  MoreHorizontal,
  NotebookPen,
  Pencil,
  Plus,
  Rows3,
  SquareKanban,
  Sun,
  Trash2,
} from "lucide-react";
import { api } from "../convex/_generated/api";
import { AuthServiceFallback, AuthSwitch } from "@/components/ui/auth-switch";
import { ProjectBoard } from "@/components/project-board";
import { ProjectDialog } from "@/components/project-dialog";
import { ProjectNotes } from "@/components/project-notes";
import { TaskDialog } from "@/components/task-dialog";
import { TaskSheet } from "@/components/task-sheet";
import { HomeView, MyTasksView, ProjectOverview } from "@/components/workspace-views";
import { PROJECT_STATUS_LABELS } from "@/components/todo-badges";
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
type Location = "home" | "my_tasks" | "project";
type ProjectTab = "overview" | "list" | "board" | "notes";

export default function App() {
  const signup = window.location.pathname.startsWith("/inscription");
  return (
    <>
      <AuthServiceFallback />
      <AuthLoading><div className="flex min-h-screen items-center justify-center bg-background"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div></AuthLoading>
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
  const workspace = useQuery(api.mestodo.getWorkspace, canRead ? {} : "skip");
  const [location, setLocation] = useState<Location>("home");
  const [projectTab, setProjectTab] = useState<ProjectTab>("list");
  const [filter, setFilter] = useState<ProjectFilter>("active");
  const [selectedProjectId, setSelectedProjectId] = useState<ProjectId | null>(null);
  const selectedProjectExists = Boolean(selectedProjectId && workspace?.projects.some((project) => project._id === selectedProjectId));
  const effectiveProjectId = location === "project"
    ? selectedProjectExists ? selectedProjectId : workspace?.projects[0]?._id ?? null
    : null;
  const data = useQuery(api.mestodo.getProject, canRead && effectiveProjectId ? { projectId: effectiveProjectId } : "skip");
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
  const [deleteProjectOpen, setDeleteProjectOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!canRead) return;
    let cancelled = false;
    void listDirectory({})
      .then((people) => { if (!cancelled) setDirectory(people); })
      .catch(() => { if (!cancelled) setDirectoryError(true); });
    return () => { cancelled = true; };
  }, [canRead, listDirectory]);

  if (access === undefined) return <WorkspaceSkeleton />;
  if (!canRead) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-muted/25 p-6">
        <Card className="w-full max-w-md"><CardContent className="pt-6 text-center"><ClipboardCheck className="mx-auto h-9 w-9 text-muted-foreground" /><h1 className="mt-4 text-xl font-semibold">Accès non attribué</h1><p className="mt-2 text-sm text-muted-foreground">Le droit Mes Todo doit être activé dans Mes Outils.</p><Button className="mt-5" onClick={() => void requestAccess({ pageKey: "mestodo:projets", pageLabel: "Mes Todo", requestedAction: "read" })}>Demander l’accès</Button></CardContent></Card>
      </main>
    );
  }

  const projects = workspace?.projects ?? [];
  const allTasks = workspace?.tasks ?? [];
  const sidebarProjects = filter === "all" ? projects : projects.filter((project) => project.status === filter);
  const project = data?.project;
  const selectedTask = data?.tasks.find((task) => task._id === selectedTaskId);

  function openProject(id: ProjectId, tab: ProjectTab = "list") {
    setSelectedProjectId(id);
    setSelectedTaskId(null);
    setProjectTab(tab);
    setLocation("project");
  }

  function openWorkspaceTask(id: TaskId) {
    const task = allTasks.find((entry) => entry._id === id);
    if (!task) return;
    setSelectedProjectId(task.projectId);
    setProjectTab("list");
    setLocation("project");
    setSelectedTaskId(id);
  }

  async function changeProjectStatus(status: ProjectStatus) {
    if (!project) return;
    setError(null);
    try { await updateProject({ projectId: project._id, status }); }
    catch (caught) { setError(errorMessage(caught, "Mise à jour impossible.")); }
  }

  async function destroyProject() {
    if (!project) return;
    setError(null);
    try {
      await removeProject({ projectId: project._id });
      setSelectedProjectId(null);
      setLocation("home");
      setDeleteProjectOpen(false);
    } catch (caught) { setError(errorMessage(caught, "Suppression impossible.")); }
  }

  async function changeTaskStatus(task: TodoTask, status: TodoTask["status"]) {
    setError(null);
    try { await updateTask({ taskId: task._id, status }); }
    catch (caught) { setError(errorMessage(caught, "Mise à jour impossible.")); }
  }

  const createProject = () => { setEditingProject(undefined); setProjectDialogOpen(true); };
  const sidebarProps = {
    projects: sidebarProjects,
    selectedId: effectiveProjectId,
    location,
    filter,
    onFilterChange: setFilter,
    onHome: () => { setLocation("home"); setSelectedTaskId(null); },
    onMyTasks: () => { setLocation("my_tasks"); setSelectedTaskId(null); },
    onSelect: openProject,
    canCreate,
    onCreate: createProject,
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 border-r bg-sidebar lg:block"><ProjectSidebar {...sidebarProps} /></aside>
      <div className="lg:pl-60">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur md:px-6">
          <Sheet><SheetTrigger asChild><Button variant="ghost" size="icon" className="lg:hidden" aria-label="Ouvrir la navigation"><Menu className="h-5 w-5" /></Button></SheetTrigger><SheetContent side="left" className="w-72 p-0"><ProjectSidebar {...sidebarProps} /></SheetContent></Sheet>
          <div className="min-w-0 flex-1"><span className="truncate text-sm font-medium">{location === "home" ? "Accueil" : location === "my_tasks" ? "Mes tâches" : project?.title ?? "Projet"}</span></div>
          {canCreate ? <Button size="sm" onClick={project && location === "project" ? () => setTaskDialogOpen(true) : createProject}><Plus className="mr-1.5 h-4 w-4" />Créer</Button> : null}
          <ThemeToggle />
          <UserButton afterSignOutUrl="/connexion" />
        </header>

        {error ? <div className="px-4 pt-4 md:px-7"><Alert variant="destructive"><AlertTitle>Action impossible</AlertTitle><AlertDescription>{error}</AlertDescription></Alert></div> : null}
        {workspace === undefined || (effectiveProjectId && data === undefined) ? <main className="p-5 md:p-7"><ProjectSkeleton /></main> : location === "home" ? (
          <main className="p-5 md:p-7 xl:p-9"><HomeView projects={projects} tasks={allTasks} currentClerkId={workspace.currentClerkId} canCreate={canCreate} canUpdate={canUpdate} onCreateProject={createProject} onOpenProject={openProject} onOpenTask={openWorkspaceTask} onToggleTask={(task) => void changeTaskStatus(task, task.status === "done" ? "todo" : "done")} /></main>
        ) : location === "my_tasks" ? (
          <main className="p-5 md:p-7 xl:p-9"><MyTasksView projects={projects} tasks={allTasks} currentClerkId={workspace.currentClerkId} canUpdate={canUpdate} onOpenTask={openWorkspaceTask} onToggleTask={(task) => void changeTaskStatus(task, task.status === "done" ? "todo" : "done")} /></main>
        ) : !project || !data ? (
          <main className="p-5 md:p-7"><EmptyWorkspace canCreate={canCreate} onCreate={createProject} /></main>
        ) : (
          <>
            <ProjectHeader project={project} tab={projectTab} onTabChange={setProjectTab} canUpdate={canUpdate} canDelete={canDelete} onEdit={() => { setEditingProject(project); setProjectDialogOpen(true); }} onStatusChange={(status) => void changeProjectStatus(status)} onDelete={() => setDeleteProjectOpen(true)} />
            <main className="p-4 md:p-6 xl:p-8">
              {directoryError ? <p className="mb-4 text-xs text-muted-foreground">L’annuaire des responsables est temporairement indisponible.</p> : null}
              {projectTab === "overview" ? <ProjectOverview project={project} tasks={data.tasks} /> : projectTab === "notes" ? <ProjectNotes projectId={project._id} notes={data.notes} canCreate={canCreate} canDelete={canDelete} /> : <ProjectBoard view={projectTab} tasks={data.tasks} notes={data.notes} canCreate={canCreate} canUpdate={canUpdate} onCreateTask={() => setTaskDialogOpen(true)} onOpenTask={setSelectedTaskId} onToggleTask={(task) => void changeTaskStatus(task, task.status === "done" ? "todo" : "done")} onChangeTaskStatus={(task, status) => void changeTaskStatus(task, status)} />}
            </main>
            <TaskDialog open={taskDialogOpen} onOpenChange={setTaskDialogOpen} projectId={project._id} directory={directory} />
            <TaskSheet open={Boolean(selectedTask)} onOpenChange={(open) => { if (!open) setSelectedTaskId(null); }} projectId={project._id} task={selectedTask} tasks={data.tasks} notes={data.notes} directory={directory} canUpdate={canUpdate} canCreate={canCreate} canDelete={canDelete} onOpenTask={setSelectedTaskId} onToggleTask={(task) => void changeTaskStatus(task, task.status === "done" ? "todo" : "done")} />
            <AlertDialog open={deleteProjectOpen} onOpenChange={setDeleteProjectOpen}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Supprimer « {project.title} » ?</AlertDialogTitle><AlertDialogDescription>Toutes les tâches, sous-tâches et notes seront supprimées.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Annuler</AlertDialogCancel><AlertDialogAction onClick={() => void destroyProject()} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Supprimer</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
          </>
        )}
      </div>
      <ProjectDialog open={projectDialogOpen} onOpenChange={setProjectDialogOpen} project={editingProject} onSaved={(id) => { if (id) openProject(id); setEditingProject(undefined); }} />
    </div>
  );
}

function ProjectHeader({ project, tab, onTabChange, canUpdate, canDelete, onEdit, onStatusChange, onDelete }: { project: TodoProject; tab: ProjectTab; onTabChange: (tab: ProjectTab) => void; canUpdate: boolean; canDelete: boolean; onEdit: () => void; onStatusChange: (status: ProjectStatus) => void; onDelete: () => void }) {
  const tabs: Array<{ value: ProjectTab; label: string; icon: typeof LayoutList }> = [
    { value: "overview", label: "Aperçu", icon: Home }, { value: "list", label: "Liste", icon: Rows3 }, { value: "board", label: "Tableau", icon: SquareKanban }, { value: "notes", label: "Notes", icon: NotebookPen },
  ];
  return (
    <div className="border-b bg-card px-4 pt-5 md:px-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-white shadow-sm" style={{ backgroundColor: project.color ?? "#6366f1" }}><FolderKanban className="h-5 w-5" /></span><div className="min-w-0"><h1 className="truncate text-xl font-semibold">{project.title}</h1><p className="mt-0.5 text-xs text-muted-foreground">{project.taskCount} tâche{project.taskCount === 1 ? "" : "s"}</p></div></div>
        {canUpdate || canDelete ? <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" aria-label="Actions du projet"><MoreHorizontal className="h-5 w-5" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end" className="w-52"><DropdownMenuLabel>Projet</DropdownMenuLabel>{canUpdate ? <><DropdownMenuItem onSelect={onEdit}><Pencil className="mr-2 h-4 w-4" />Modifier</DropdownMenuItem><DropdownMenuSeparator />{(["active", "completed", "archived"] as ProjectStatus[]).map((status) => <DropdownMenuItem key={status} onSelect={() => onStatusChange(status)} disabled={status === project.status}>{status === "active" ? <CircleDashed className="mr-2 h-4 w-4" /> : status === "completed" ? <CheckCircle2 className="mr-2 h-4 w-4" /> : <Archive className="mr-2 h-4 w-4" />}{PROJECT_STATUS_LABELS[status]}</DropdownMenuItem>)}</> : null}{canDelete ? <><DropdownMenuSeparator /><DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={onDelete}><Trash2 className="mr-2 h-4 w-4" />Supprimer</DropdownMenuItem></> : null}</DropdownMenuContent></DropdownMenu> : null}
      </div>
      <nav className="mt-5 flex gap-1 overflow-x-auto" aria-label="Vues du projet">{tabs.map(({ value, label, icon: Icon }) => <button key={value} type="button" onClick={() => onTabChange(value)} className={cn("relative flex shrink-0 items-center gap-2 px-3 py-3 text-sm font-medium text-muted-foreground transition hover:text-foreground", tab === value && "text-foreground after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:rounded-full after:bg-primary")}><Icon className="h-4 w-4" />{label}</button>)}</nav>
    </div>
  );
}

function ProjectSidebar({ projects, selectedId, location, filter, onFilterChange, onHome, onMyTasks, onSelect, canCreate, onCreate }: { projects: TodoProject[]; selectedId: ProjectId | null; location: Location; filter: ProjectFilter; onFilterChange: (filter: ProjectFilter) => void; onHome: () => void; onMyTasks: () => void; onSelect: (id: ProjectId) => void; canCreate: boolean; onCreate: () => void }) {
  return (
    <div className="flex h-full flex-col bg-card">
      <div className="flex h-14 items-center border-b px-4"><img src="/logo.svg" alt="Mes Todo" className="h-8 w-auto dark:hidden" /><img src="/logo-dark.svg" alt="Mes Todo" className="hidden h-8 w-auto dark:block" /></div>
      <div className="space-y-1 p-3">
        {canCreate ? <Button className="mb-3 w-full justify-start" onClick={onCreate}><Plus className="mr-2 h-4 w-4" />Créer</Button> : null}
        <SidebarLink active={location === "home"} icon={Home} label="Accueil" onClick={onHome} />
        <SidebarLink active={location === "my_tasks"} icon={CheckCircle2} label="Mes tâches" onClick={onMyTasks} />
      </div>
      <Separator />
      <div className="flex items-center justify-between px-4 pb-2 pt-4"><span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Projets</span><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Filtrer les projets"><ChevronDown className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="start" className="w-52"><DropdownMenuItem onSelect={() => onFilterChange("all")}>Tous les projets</DropdownMenuItem>{(["active", "completed", "archived"] as ProjectStatus[]).map((status) => <DropdownMenuItem key={status} onSelect={() => onFilterChange(status)}>{PROJECT_STATUS_LABELS[status]}</DropdownMenuItem>)}</DropdownMenuContent></DropdownMenu></div>
      <ScrollArea className="min-h-0 flex-1"><div className="grid gap-0.5 px-2 pb-3">{projects.length ? projects.map((project) => <button key={project._id} type="button" onClick={() => onSelect(project._id)} className={cn("flex items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm transition hover:bg-muted", location === "project" && selectedId === project._id && "bg-muted font-medium text-foreground")}><span className="h-2.5 w-2.5 shrink-0 rounded" style={{ backgroundColor: project.color ?? "#6366f1" }} /><span className="min-w-0 flex-1 truncate">{project.title}</span><span className="text-[10px] tabular-nums text-muted-foreground">{project.completedTaskCount}/{project.taskCount}</span></button>) : <p className="px-3 py-5 text-xs text-muted-foreground">Aucun projet {filter !== "all" ? PROJECT_STATUS_LABELS[filter].toLowerCase() : ""}</p>}</div></ScrollArea>
      <div className="border-t p-3"><a href="https://mesoutils.groupemes.fr" className="block rounded-md px-2.5 py-2 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground">Retour à Mes Outils</a></div>
    </div>
  );
}

function SidebarLink({ active, icon: Icon, label, onClick }: { active: boolean; icon: typeof Home; label: string; onClick: () => void }) {
  return <button type="button" onClick={onClick} className={cn("flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm text-muted-foreground transition hover:bg-muted hover:text-foreground", active && "bg-muted font-medium text-foreground")}><Icon className="h-4 w-4" />{label}</button>;
}

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const dark = resolvedTheme === "dark";
  return <Button variant="ghost" size="icon" onClick={() => setTheme(dark ? "light" : "dark")} aria-label={dark ? "Activer le thème clair" : "Activer le thème sombre"}>{dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}</Button>;
}

function EmptyWorkspace({ canCreate, onCreate }: { canCreate: boolean; onCreate: () => void }) {
  return <div className="flex min-h-[65vh] items-center justify-center"><div className="max-w-sm text-center"><FolderKanban className="mx-auto h-10 w-10 text-muted-foreground" /><h2 className="mt-4 text-xl font-semibold">Aucun projet</h2>{canCreate ? <Button className="mt-5" onClick={onCreate}><Plus className="mr-2 h-4 w-4" />Créer un projet</Button> : null}</div></div>;
}

function WorkspaceSkeleton() {
  return <div className="grid min-h-screen grid-cols-[240px_1fr]"><Skeleton className="h-full rounded-none" /><div className="p-8"><ProjectSkeleton /></div></div>;
}

function ProjectSkeleton() {
  return <div className="space-y-6"><div className="space-y-2"><Skeleton className="h-8 w-64" /><Skeleton className="h-4 w-96 max-w-full" /></div><div className="grid gap-3 sm:grid-cols-3"><Skeleton className="h-24" /><Skeleton className="h-24" /><Skeleton className="h-24" /></div><Skeleton className="h-80" /></div>;
}
