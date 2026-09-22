import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useClerk, useUser } from "@clerk/clerk-react";
import { AuthLoading, Authenticated, Unauthenticated, useAction, useMutation, useQuery } from "convex/react";
import { useTheme } from "next-themes";
import {
  Archive,
  CheckCircle2,
  ChevronDown,
  CircleDashed,
  ClipboardCheck,
  FolderKanban,
  ListTodo,
  Home,
  LayoutList,
  Loader2,
  LogOut,
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
import { ProjectsView } from "@/components/projects-view";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
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

type Location = "home" | "my_tasks" | "projects" | "project";
type ProjectTab = "overview" | "list" | "board" | "notes";

export default function App() {
  const signup = window.location.pathname.startsWith("/inscription");
  return (
    <>
      <AuthServiceFallback />
      <AuthLoading><div className="flex min-h-screen items-center justify-center bg-background"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div></AuthLoading>
      <Unauthenticated>
        <AuthSwitch
          appName="MesTodo"
          logoSrc="/mestodo-wordmark.svg"
          initialMode={signup ? "signup" : "signin"}
          welcomeTitle="Bienvenue sur MesTodo"
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
    projects,
    tasks: allTasks.filter((task) => !task.parentTaskId),
    selectedId: effectiveProjectId,
    selectedTaskId,
    location,
    onHome: () => { setLocation("home"); setSelectedTaskId(null); },
    onMyTasks: () => { setLocation("my_tasks"); setSelectedTaskId(null); },
    onProjects: () => { setLocation("projects"); setSelectedTaskId(null); },
    onSelect: openProject,
    onSelectTask: openWorkspaceTask,
    canCreate,
    onCreateProject: createProject,
    onCreateTask: () => setTaskDialogOpen(true),
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r bg-card lg:block"><ProjectSidebar {...sidebarProps} /></aside>
      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b bg-background/90 px-4 backdrop-blur-xl md:px-6">
          <Sheet><SheetTrigger asChild><Button variant="ghost" size="icon" className="lg:hidden" aria-label="Ouvrir la navigation"><Menu className="h-5 w-5" /></Button></SheetTrigger><SheetContent side="left" className="w-72 p-0"><ProjectSidebar {...sidebarProps} /></SheetContent></Sheet>
          <div className="min-w-0 flex-1"><span className="truncate text-sm font-semibold">{location === "home" ? "Accueil" : location === "my_tasks" ? "Mes tâches" : location === "projects" ? "Projets" : project?.title ?? "Projet"}</span></div>
          {canCreate ? <CreateMenu onCreateTask={() => setTaskDialogOpen(true)} onCreateProject={createProject} compact /> : null}
        </header>

        {error ? <div className="px-4 pt-4 md:px-7"><Alert variant="destructive"><AlertTitle>Action impossible</AlertTitle><AlertDescription>{error}</AlertDescription></Alert></div> : null}
        {workspace === undefined || (effectiveProjectId && data === undefined) ? <main className="p-5 md:p-7"><ProjectSkeleton /></main> : location === "home" ? (
          <main className="p-5 md:p-7 xl:p-9"><HomeView projects={projects} tasks={allTasks} currentClerkId={workspace.currentClerkId} canCreate={canCreate} canUpdate={canUpdate} onCreateTask={() => setTaskDialogOpen(true)} onCreateProject={createProject} onOpenProject={openProject} onOpenTask={openWorkspaceTask} onToggleTask={(task) => void changeTaskStatus(task, task.status === "done" ? "todo" : "done")} /></main>
        ) : location === "my_tasks" ? (
          <main className="p-5 md:p-7 xl:p-9"><MyTasksView projects={projects} tasks={allTasks} currentClerkId={workspace.currentClerkId} canCreate={canCreate} canUpdate={canUpdate} onCreateTask={() => setTaskDialogOpen(true)} onOpenTask={openWorkspaceTask} onToggleTask={(task) => void changeTaskStatus(task, task.status === "done" ? "todo" : "done")} onChangeTaskStatus={(task, status) => void changeTaskStatus(task, status)} /></main>
        ) : location === "projects" ? (
          <main className="p-5 md:p-7 xl:p-9"><ProjectsView projects={projects} canCreate={canCreate} onCreate={createProject} onOpen={openProject} /></main>
        ) : !project || !data ? (
          <main className="p-5 md:p-7"><EmptyWorkspace canCreate={canCreate} onCreate={createProject} /></main>
        ) : (
          <>
            <ProjectHeader project={project} tab={projectTab} onTabChange={setProjectTab} canUpdate={canUpdate} canDelete={canDelete} onEdit={() => { setEditingProject(project); setProjectDialogOpen(true); }} onStatusChange={(status) => void changeProjectStatus(status)} onDelete={() => setDeleteProjectOpen(true)} />
            <main className="p-4 md:p-6 xl:p-8">
              {directoryError ? <p className="mb-4 text-xs text-muted-foreground">L’annuaire des participants est temporairement indisponible.</p> : null}
              {projectTab === "overview" ? <ProjectOverview project={project} tasks={data.tasks} /> : projectTab === "notes" ? <ProjectNotes projectId={project._id} notes={data.notes} canCreate={canCreate} canDelete={canDelete} /> : <ProjectBoard view={projectTab} tasks={data.tasks} notes={data.notes} canCreate={canCreate} canUpdate={canUpdate} onCreateTask={() => setTaskDialogOpen(true)} onOpenTask={setSelectedTaskId} onToggleTask={(task) => void changeTaskStatus(task, task.status === "done" ? "todo" : "done")} onChangeTaskStatus={(task, status) => void changeTaskStatus(task, status)} />}
            </main>
            <TaskSheet open={Boolean(selectedTask)} onOpenChange={(open) => { if (!open) setSelectedTaskId(null); }} projectId={project._id} task={selectedTask} tasks={data.tasks} notes={data.notes} directory={directory} canUpdate={canUpdate} canCreate={canCreate} canDelete={canDelete} onOpenTask={setSelectedTaskId} onToggleTask={(task) => void changeTaskStatus(task, task.status === "done" ? "todo" : "done")} />
            <AlertDialog open={deleteProjectOpen} onOpenChange={setDeleteProjectOpen}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Supprimer « {project.title} » ?</AlertDialogTitle><AlertDialogDescription>Toutes les tâches, sous-tâches et notes seront supprimées.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Annuler</AlertDialogCancel><AlertDialogAction onClick={() => void destroyProject()} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Supprimer</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
          </>
        )}
      </div>
      <TaskDialog open={taskDialogOpen} onOpenChange={setTaskDialogOpen} projectId={effectiveProjectId ?? undefined} projects={projects} directory={directory} />
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
        <div className="min-w-0"><h1 className="truncate text-3xl font-bold tracking-tight">{project.title}</h1><p className="mt-1 text-sm text-muted-foreground">{project.taskCount} tâche{project.taskCount === 1 ? "" : "s"}</p></div>
        {canUpdate || canDelete ? <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" aria-label="Actions du projet"><MoreHorizontal className="h-5 w-5" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end" className="w-52"><DropdownMenuLabel>Projet</DropdownMenuLabel>{canUpdate ? <><DropdownMenuItem onSelect={onEdit}><Pencil className="mr-2 h-4 w-4" />Modifier</DropdownMenuItem><DropdownMenuSeparator />{(["active", "completed", "archived"] as ProjectStatus[]).map((status) => <DropdownMenuItem key={status} onSelect={() => onStatusChange(status)} disabled={status === project.status}>{status === "active" ? <CircleDashed className="mr-2 h-4 w-4" /> : status === "completed" ? <CheckCircle2 className="mr-2 h-4 w-4" /> : <Archive className="mr-2 h-4 w-4" />}{PROJECT_STATUS_LABELS[status]}</DropdownMenuItem>)}</> : null}{canDelete ? <><DropdownMenuSeparator /><DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={onDelete}><Trash2 className="mr-2 h-4 w-4" />Supprimer</DropdownMenuItem></> : null}</DropdownMenuContent></DropdownMenu> : null}
      </div>
      <nav className="mt-5 flex gap-1 overflow-x-auto" aria-label="Vues du projet">{tabs.map(({ value, label, icon: Icon }) => <button key={value} type="button" onClick={() => onTabChange(value)} className={cn("relative flex shrink-0 items-center gap-2 px-3 py-3 text-sm font-medium text-muted-foreground transition hover:text-foreground", tab === value && "text-foreground after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:rounded-full after:bg-primary")}><Icon className="h-4 w-4" />{label}</button>)}</nav>
    </div>
  );
}

function ProjectSidebar({ projects, tasks, selectedId, selectedTaskId, location, onHome, onMyTasks, onProjects, onSelect, onSelectTask, canCreate, onCreateProject, onCreateTask }: { projects: TodoProject[]; tasks: TodoTask[]; selectedId: ProjectId | null; selectedTaskId: TaskId | null; location: Location; onHome: () => void; onMyTasks: () => void; onProjects: () => void; onSelect: (id: ProjectId) => void; onSelectTask: (id: TaskId) => void; canCreate: boolean; onCreateProject: () => void; onCreateTask: () => void }) {
  const { user } = useUser();
  const { signOut } = useClerk();
  const userName = user?.firstName ?? user?.fullName ?? user?.primaryEmailAddress?.emailAddress ?? "Mon compte";
  const [projectLimit, setProjectLimit] = useState(10);
  const [taskLimit, setTaskLimit] = useState(10);
  const projectById = useMemo(() => new Map(projects.map((project) => [project._id, project])), [projects]);
  return (
    <div className="flex h-full flex-col bg-card">
      <div className="flex h-20 items-center border-b px-5"><button type="button" onClick={onHome} className="text-xl font-black tracking-[-0.04em] text-foreground">Mes<span className="text-primary">Todo</span></button></div>
      <div className="space-y-1 p-3">
        {canCreate ? <CreateMenu onCreateTask={onCreateTask} onCreateProject={onCreateProject} /> : null}
        <SidebarLink active={location === "home"} icon={Home} label="Accueil" onClick={onHome} />
      </div>
      <Separator />
      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-2 px-2 py-3">
          <SidebarCollection label="Projets" count={projects.length} active={location === "projects"} onOpenPage={onProjects}>
            {projects.slice(0, projectLimit).map((project) => <button key={project._id} type="button" onClick={() => onSelect(project._id)} className={cn("flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-muted-foreground transition hover:bg-muted hover:text-foreground", location === "project" && selectedId === project._id && "bg-muted font-semibold text-foreground")}><span className="min-w-0 flex-1 truncate">{project.title}</span><span className="text-[10px] tabular-nums text-muted-foreground">{project.completedTaskCount}/{project.taskCount}</span></button>)}
            {projects.length === 0 ? <p className="px-3 py-3 text-xs text-muted-foreground">Aucun projet</p> : null}
            {projectLimit < projects.length ? <LoadMoreButton onClick={() => setProjectLimit((limit) => limit + 10)} remaining={projects.length - projectLimit} /> : null}
          </SidebarCollection>
          <SidebarCollection label="Tâches" count={tasks.length} active={location === "my_tasks"} onOpenPage={onMyTasks}>
            {tasks.slice(0, taskLimit).map((task) => <button key={task._id} type="button" onClick={() => onSelectTask(task._id)} className={cn("block w-full rounded-lg px-3 py-2 text-left transition hover:bg-muted", selectedTaskId === task._id && "bg-muted")}><span className={cn("block truncate text-sm font-medium", task.status === "done" && "text-muted-foreground line-through")}>{task.title}</span><span className="mt-0.5 block truncate text-[10px] text-muted-foreground">{projectById.get(task.projectId)?.title ?? "Projet"}</span></button>)}
            {tasks.length === 0 ? <p className="px-3 py-3 text-xs text-muted-foreground">Aucune tâche</p> : null}
            {taskLimit < tasks.length ? <LoadMoreButton onClick={() => setTaskLimit((limit) => limit + 10)} remaining={tasks.length - taskLimit} /> : null}
          </SidebarCollection>
        </div>
      </ScrollArea>
      <div className="space-y-2 border-t p-3">
        <ThemeToggle expanded />
        <div className="flex min-w-0 items-center gap-3 rounded-xl bg-muted px-3 py-2">
          <Avatar className="h-9 w-9"><AvatarImage src={user?.imageUrl} alt="" /><AvatarFallback>{userName.slice(0, 2).toUpperCase()}</AvatarFallback></Avatar>
          <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{userName}</p><p className="truncate text-[11px] text-muted-foreground">{user?.primaryEmailAddress?.emailAddress}</p></div>
        </div>
        <Button type="button" variant="ghost" className="h-10 w-full text-muted-foreground" onClick={() => void signOut({ redirectUrl: "/connexion" })}><LogOut className="mr-2 h-4 w-4" />Déconnexion</Button>
      </div>
    </div>
  );
}

function SidebarCollection({ label, count, active, onOpenPage, children }: { label: string; count: number; active: boolean; onOpenPage: () => void; children: ReactNode }) {
  return (
    <Collapsible defaultOpen className="group/collapsible">
      <div className="flex items-center gap-1 px-2 py-1">
        <button type="button" onClick={onOpenPage} className={cn("min-w-0 flex-1 rounded-md px-1 py-1 text-left text-xs font-bold uppercase tracking-wide text-muted-foreground hover:text-foreground", active && "text-primary")}>{label}<span className="ml-2 font-medium tabular-nums opacity-60">{count}</span></button>
        <CollapsibleTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7" aria-label={`Replier ${label}`}><ChevronDown className="h-4 w-4 transition group-data-[state=closed]/collapsible:-rotate-90" /></Button></CollapsibleTrigger>
      </div>
      <CollapsibleContent className="grid gap-0.5 pb-2">{children}</CollapsibleContent>
    </Collapsible>
  );
}

function LoadMoreButton({ onClick, remaining }: { onClick: () => void; remaining: number }) {
  return <button type="button" onClick={onClick} className="w-full rounded-lg px-3 py-2 text-left text-xs font-semibold text-primary hover:bg-primary/5">Voir {Math.min(10, remaining)} de plus</button>;
}

function CreateMenu({ onCreateTask, onCreateProject, compact = false }: { onCreateTask: () => void; onCreateProject: () => void; compact?: boolean }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size={compact ? "sm" : "default"} className={compact ? undefined : "mb-3 h-11 w-full justify-start rounded-xl shadow-sm"}><Plus className="mr-2 h-4 w-4" />Créer<ChevronDown className="ml-auto h-4 w-4 opacity-70" /></Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={compact ? "end" : "start"} className="w-56">
        <DropdownMenuLabel>Créer dans MesTodo</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={onCreateTask}><ListTodo className="mr-2 h-4 w-4" /><span><span className="block font-medium">Nouvelle tâche</span><span className="block text-xs text-muted-foreground">À ranger dans un projet</span></span></DropdownMenuItem>
        <DropdownMenuItem onSelect={onCreateProject}><FolderKanban className="mr-2 h-4 w-4" /><span><span className="block font-medium">Nouveau projet</span><span className="block text-xs text-muted-foreground">Organiser un nouvel objectif</span></span></DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function SidebarLink({ active, icon: Icon, label, onClick }: { active: boolean; icon: typeof Home; label: string; onClick: () => void }) {
  return <button type="button" onClick={onClick} className={cn("flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground", active && "bg-primary text-primary-foreground shadow-[0_8px_18px_hsl(var(--primary)/0.22)] hover:bg-primary hover:text-primary-foreground")}><Icon className="h-[18px] w-[18px]" />{label}</button>;
}

function ThemeToggle({ expanded = false }: { expanded?: boolean }) {
  const { resolvedTheme, setTheme } = useTheme();
  const dark = resolvedTheme === "dark";
  return <Button variant="ghost" size={expanded ? "default" : "icon"} className={expanded ? "h-10 w-full text-muted-foreground" : undefined} onClick={() => setTheme(dark ? "light" : "dark")} aria-label={dark ? "Activer le thème clair" : "Activer le thème sombre"}>{dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}{expanded ? <span className="ml-2">{dark ? "Mode clair" : "Mode sombre"}</span> : null}</Button>;
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
