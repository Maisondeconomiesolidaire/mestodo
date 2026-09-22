import { FormEvent, useEffect, useState } from "react";
import { useMutation } from "convex/react";
import { AlertCircle, Loader2 } from "lucide-react";
import { api } from "../../convex/_generated/api";
import { AssigneePicker } from "@/components/assignee-picker";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/ui/date-picker";
import { errorMessage, type Assignee, type DirectoryPerson, type ProjectId, type TaskPriority, type TodoProject } from "@/lib/todo-types";

export function TaskDialog({
  open,
  onOpenChange,
  projectId,
  projects,
  directory,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId?: ProjectId;
  projects: TodoProject[];
  directory: DirectoryPerson[];
}) {
  const createTask = useMutation(api.mestodo.createTask);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [assignees, setAssignees] = useState<Assignee[]>([]);
  const [dueAt, setDueAt] = useState<number>();
  const [targetProjectId, setTargetProjectId] = useState<ProjectId | undefined>(projectId);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const fallback = projects.find((project) => project.status === "active")?._id ?? projects[0]?._id;
    setTargetProjectId(projectId ?? fallback);
  }, [open, projectId, projects]);

  function reset() {
    setTitle("");
    setDescription("");
    setPriority("medium");
    setAssignees([]);
    setDueAt(undefined);
    setError(null);
  }

  function handleOpenChange(next: boolean) {
    onOpenChange(next);
    if (!next) reset();
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!targetProjectId) {
      setError("Créez d’abord un projet pour pouvoir y ajouter une tâche.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await createTask({
        projectId: targetProjectId,
        title,
        description: description || undefined,
        priority,
        assignees,
        dueAt,
      });
      handleOpenChange(false);
    } catch (caught) {
      setError(errorMessage(caught, "Création impossible."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <form onSubmit={(event) => void submit(event)} className="grid gap-5">
          <DialogHeader>
            <DialogTitle>Nouvelle tâche</DialogTitle>
            <DialogDescription>Ajoutez les détails utiles à l’exécution.</DialogDescription>
          </DialogHeader>
          {error ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
          <div className="grid gap-2">
            <Label htmlFor="task-title">Titre</Label>
            <Input id="task-title" value={title} onChange={(event) => setTitle(event.target.value)} autoFocus maxLength={180} required />
          </div>
          <div className="grid gap-2">
            <Label>Projet</Label>
            <Select value={targetProjectId} onValueChange={(value) => setTargetProjectId(value as ProjectId)} disabled={projects.length === 0}>
              <SelectTrigger><SelectValue placeholder="Choisir un projet" /></SelectTrigger>
              <SelectContent>
                {projects.map((project) => <SelectItem key={project._id} value={project._id}>{project.title}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="task-description">Description</Label>
            <Textarea id="task-description" value={description} onChange={(event) => setDescription(event.target.value)} rows={4} maxLength={4000} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>Priorité</Label>
              <Select value={priority} onValueChange={(value) => setPriority(value as TaskPriority)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Basse</SelectItem>
                  <SelectItem value="medium">Normale</SelectItem>
                  <SelectItem value="high">Haute</SelectItem>
                  <SelectItem value="urgent">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="task-date">Échéance</Label>
              <DatePicker id="task-date" value={dueAt} onChange={setDueAt} />
            </div>
          </div>
          <div className="grid gap-2">
            <Label>Copains</Label>
            <AssigneePicker directory={directory} value={assignees} onChange={setAssignees} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>Annuler</Button>
            <Button type="submit" disabled={saving || !title.trim() || !targetProjectId}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Créer la tâche
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
