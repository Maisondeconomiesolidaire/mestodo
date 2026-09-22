import { FormEvent, useEffect, useState } from "react";
import { useMutation } from "convex/react";
import { AlertCircle, Loader2 } from "lucide-react";
import { api } from "../../convex/_generated/api";
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
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/ui/date-picker";
import { cn } from "@/lib/utils";
import { errorMessage, type ProjectId, type TodoProject } from "@/lib/todo-types";

const COLORS = ["#4f46e5", "#0891b2", "#059669", "#d97706", "#e11d48", "#7c3aed"];

export function ProjectDialog({
  open,
  onOpenChange,
  project,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project?: TodoProject;
  onSaved?: (id?: ProjectId) => void;
}) {
  const createProject = useMutation(api.mestodo.createProject);
  const updateProject = useMutation(api.mestodo.updateProject);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueAt, setDueAt] = useState<number>();
  const [color, setColor] = useState(COLORS[0]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setTitle(project?.title ?? "");
    setDescription(project?.description ?? "");
    setDueAt(project?.dueAt);
    setColor(project?.color ?? COLORS[0]);
    setError(null);
  }, [open, project]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (project) {
        await updateProject({
          projectId: project._id,
          title,
          description: description || null,
          dueAt: dueAt ?? null,
          color,
        });
        onSaved?.(project._id);
      } else {
        const id = await createProject({
          title,
          description: description || undefined,
          dueAt,
          color,
        });
        onSaved?.(id);
      }
      onOpenChange(false);
    } catch (caught) {
      setError(errorMessage(caught, "Enregistrement impossible."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={(event) => void submit(event)} className="grid gap-5">
          <DialogHeader>
            <DialogTitle>{project ? "Modifier le projet" : "Nouveau projet"}</DialogTitle>
            <DialogDescription>Projet, chantier ou dossier de travail.</DialogDescription>
          </DialogHeader>
          {error ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
          <div className="grid gap-2">
            <Label htmlFor="project-title">Nom</Label>
            <Input id="project-title" value={title} onChange={(event) => setTitle(event.target.value)} autoFocus maxLength={120} required />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="project-description">Description</Label>
            <Textarea id="project-description" value={description} onChange={(event) => setDescription(event.target.value)} rows={4} maxLength={2000} />
          </div>
          <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
            <div className="grid gap-2">
              <Label htmlFor="project-date">Échéance</Label>
              <DatePicker id="project-date" value={dueAt} onChange={setDueAt} />
            </div>
            <div className="grid gap-2">
              <Label>Couleur</Label>
              <div className="flex h-10 items-center gap-2">
                {COLORS.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setColor(option)}
                    aria-label={`Couleur ${option}`}
                    aria-pressed={color === option}
                    className={cn("h-7 w-7 rounded-full border-2 border-background ring-offset-2 ring-offset-background", color === option && "ring-2 ring-ring")}
                    style={{ backgroundColor: option }}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
            <Button type="submit" disabled={saving || !title.trim()}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {project ? "Enregistrer" : "Créer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
