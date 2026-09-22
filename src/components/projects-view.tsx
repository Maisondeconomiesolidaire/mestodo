import { useMemo, useState } from "react";
import { format, isBefore, startOfDay } from "date-fns";
import { fr } from "date-fns/locale";
import { Archive, CalendarDays, CheckCircle2, FolderKanban, Plus, Search } from "lucide-react";
import { PROJECT_STATUS_LABELS } from "@/components/todo-badges";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import type { ProjectId, ProjectStatus, TodoProject } from "@/lib/todo-types";

type Filter = "all" | ProjectStatus;

export function ProjectsView({
  projects,
  canCreate,
  onCreate,
  onOpen,
}: {
  projects: TodoProject[];
  canCreate: boolean;
  onCreate: () => void;
  onOpen: (id: ProjectId) => void;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("active");
  const filtered = useMemo(() => {
    const term = query.trim().toLocaleLowerCase("fr-FR");
    return projects.filter((project) =>
      (filter === "all" || project.status === filter)
      && (!term || `${project.title} ${project.description ?? ""}`.toLocaleLowerCase("fr-FR").includes(term)),
    );
  }, [filter, projects, query]);

  const activeCount = projects.filter((project) => project.status === "active").length;
  const completedCount = projects.filter((project) => project.status === "completed").length;

  return (
    <div className="mx-auto max-w-7xl space-y-7">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-primary">Espace de travail</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">Projets</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">Pilotez les objectifs, les échéances et l’avancement de toute l’équipe depuis un seul endroit.</p>
        </div>
        {canCreate ? <Button onClick={onCreate} className="shadow-sm"><Plus className="mr-2 h-4 w-4" />Nouveau projet</Button> : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Metric icon={FolderKanban} value={activeCount} label="Projets actifs" />
        <Metric icon={CheckCircle2} value={completedCount} label="Projets terminés" />
        <Metric icon={Archive} value={projects.filter((project) => project.status === "archived").length} label="Projets archivés" />
      </div>

      <div className="flex flex-col gap-3 rounded-xl border bg-card p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={filter} onValueChange={(value) => setFilter(value as Filter)}>
          <TabsList className="h-9">
            <TabsTrigger value="active">Actifs</TabsTrigger>
            <TabsTrigger value="completed">Terminés</TabsTrigger>
            <TabsTrigger value="archived">Archivés</TabsTrigger>
            <TabsTrigger value="all">Tous</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Rechercher un projet" className="h-9 pl-9" />
        </div>
      </div>

      {filtered.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((project) => <ProjectTile key={project._id} project={project} onOpen={() => onOpen(project._id)} />)}
        </div>
      ) : (
        <div className="grid min-h-64 place-items-center rounded-2xl border border-dashed bg-muted/20 p-8 text-center">
          <div><FolderKanban className="mx-auto h-9 w-9 text-muted-foreground" /><h2 className="mt-4 font-semibold">Aucun projet trouvé</h2><p className="mt-1 text-sm text-muted-foreground">Modifiez vos filtres ou créez un nouveau projet.</p>{canCreate ? <Button variant="outline" className="mt-5" onClick={onCreate}><Plus className="mr-2 h-4 w-4" />Créer un projet</Button> : null}</div>
        </div>
      )}
    </div>
  );
}

function Metric({ icon: Icon, value, label }: { icon: typeof FolderKanban; value: number; label: string }) {
  return <Card className="border-0 shadow-sm ring-1 ring-border"><CardContent className="flex items-center gap-4 p-5"><span className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary"><Icon className="h-5 w-5" /></span><div><p className="text-2xl font-bold tabular-nums">{value}</p><p className="text-xs text-muted-foreground">{label}</p></div></CardContent></Card>;
}

function ProjectTile({ project, onOpen }: { project: TodoProject; onOpen: () => void }) {
  const progress = project.taskCount ? Math.round((project.completedTaskCount / project.taskCount) * 100) : 0;
  const overdue = Boolean(project.dueAt && project.status === "active" && isBefore(project.dueAt, startOfDay(new Date())));
  return (
    <button type="button" onClick={onOpen} className="group rounded-2xl border bg-card p-5 text-left shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md">
      <span className="block truncate text-xl font-bold tracking-tight group-hover:text-primary">{project.title}</span>
      <Badge variant="secondary" className="mt-2 text-[10px]">{PROJECT_STATUS_LABELS[project.status]}</Badge>
      <span className="mt-4 block min-h-10 line-clamp-2 text-sm leading-5 text-muted-foreground">{project.description || "Aucune description pour ce projet."}</span>
      <span className="mt-5 flex items-center justify-between text-xs"><span className="font-medium">{project.completedTaskCount}/{project.taskCount} tâches</span><span className="tabular-nums text-muted-foreground">{progress}%</span></span>
      <Progress value={progress} className="mt-2 h-1.5" />
      <span className={cn("mt-4 flex items-center gap-1.5 text-xs text-muted-foreground", overdue && "font-medium text-destructive")}><CalendarDays className="h-3.5 w-3.5" />{project.dueAt ? format(project.dueAt, "d MMMM yyyy", { locale: fr }) : "Aucune échéance"}</span>
    </button>
  );
}
