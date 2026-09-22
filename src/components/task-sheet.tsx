import { FormEvent, useEffect, useState } from "react";
import { useMutation } from "convex/react";
import { AlertCircle, Loader2, Send, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { api } from "../../convex/_generated/api";
import { AssigneePicker } from "@/components/assignee-picker";
import { PRIORITY_LABELS, TASK_STATUS_LABELS } from "@/components/todo-badges";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import {
  errorMessage,
  type Assignee,
  type DirectoryPerson,
  type ProjectId,
  type TaskPriority,
  type TaskStatus,
  type TodoNote,
  type TodoTask,
} from "@/lib/todo-types";

function inputDate(value?: number) {
  if (!value) return "";
  const date = new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function TaskSheet({
  open,
  onOpenChange,
  projectId,
  task,
  notes,
  directory,
  canUpdate,
  canCreate,
  canDelete,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: ProjectId;
  task?: TodoTask;
  notes: TodoNote[];
  directory: DirectoryPerson[];
  canUpdate: boolean;
  canCreate: boolean;
  canDelete: boolean;
}) {
  const updateTask = useMutation(api.mestodo.updateTask);
  const removeTask = useMutation(api.mestodo.removeTask);
  const addNote = useMutation(api.mestodo.addNote);
  const removeNote = useMutation(api.mestodo.removeNote);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<TaskStatus>("todo");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [assignees, setAssignees] = useState<Assignee[]>([]);
  const [dueAt, setDueAt] = useState("");
  const [noteBody, setNoteBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!task) return;
    setTitle(task.title);
    setDescription(task.description ?? "");
    setStatus(task.status);
    setPriority(task.priority);
    setAssignees(task.assignees);
    setDueAt(inputDate(task.dueAt));
    setError(null);
  }, [task]);

  if (!task) return null;
  const taskNotes = notes.filter((note) => note.taskId === task._id);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      await updateTask({
        taskId: task._id,
        title,
        description: description || null,
        status,
        priority,
        assignees,
        dueAt: dueAt ? new Date(`${dueAt}T18:00:00`).getTime() : null,
      });
    } catch (caught) {
      setError(errorMessage(caught, "Enregistrement impossible."));
    } finally {
      setSaving(false);
    }
  }

  async function submitNote(event: FormEvent) {
    event.preventDefault();
    if (!noteBody.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await addNote({ projectId, taskId: task._id, body: noteBody });
      setNoteBody("");
    } catch (caught) {
      setError(errorMessage(caught, "Ajout impossible."));
    } finally {
      setSaving(false);
    }
  }

  async function destroy() {
    setSaving(true);
    try {
      await removeTask({ taskId: task._id });
      onOpenChange(false);
    } catch (caught) {
      setError(errorMessage(caught, "Suppression impossible."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full p-0 sm:max-w-xl">
        <ScrollArea className="h-full">
          <div className="p-6">
            <SheetHeader className="pr-8">
              <SheetTitle>Détail de la tâche</SheetTitle>
              <SheetDescription>Informations, responsables et notes.</SheetDescription>
            </SheetHeader>
            <div className="mt-6 grid gap-5">
              {error ? (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              ) : null}
              <div className="grid gap-2">
                <Label htmlFor="sheet-task-title">Titre</Label>
                <Input id="sheet-task-title" value={title} onChange={(event) => setTitle(event.target.value)} disabled={!canUpdate} maxLength={180} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="sheet-task-description">Description</Label>
                <Textarea id="sheet-task-description" value={description} onChange={(event) => setDescription(event.target.value)} disabled={!canUpdate} rows={4} maxLength={4000} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label>Statut</Label>
                  <Select value={status} onValueChange={(value) => setStatus(value as TaskStatus)} disabled={!canUpdate}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(TASK_STATUS_LABELS).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Priorité</Label>
                  <Select value={priority} onValueChange={(value) => setPriority(value as TaskPriority)} disabled={!canUpdate}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(PRIORITY_LABELS).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="sheet-task-date">Échéance</Label>
                <Input id="sheet-task-date" type="date" value={dueAt} onChange={(event) => setDueAt(event.target.value)} disabled={!canUpdate} />
              </div>
              <div className="grid gap-2">
                <Label>Responsables</Label>
                <AssigneePicker directory={directory} value={assignees} onChange={setAssignees} disabled={!canUpdate} />
              </div>
              {canUpdate ? (
                <Button onClick={() => void save()} disabled={saving || !title.trim()}>
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Enregistrer
                </Button>
              ) : null}
              <Separator />
              <section>
                <h3 className="text-sm font-semibold">Notes</h3>
                {canCreate ? (
                  <form onSubmit={(event) => void submitNote(event)} className="mt-3 flex gap-2">
                    <Textarea value={noteBody} onChange={(event) => setNoteBody(event.target.value)} placeholder="Ajouter une note" rows={2} maxLength={5000} />
                    <Button type="submit" size="icon" className="shrink-0" disabled={saving || !noteBody.trim()} aria-label="Ajouter la note">
                      <Send className="h-4 w-4" />
                    </Button>
                  </form>
                ) : null}
                <div className="mt-4 grid gap-3">
                  {taskNotes.length === 0 ? <p className="text-sm text-muted-foreground">Aucune note</p> : taskNotes.map((note) => (
                    <article key={note._id} className="rounded-lg bg-muted/50 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-medium">{note.authorName}</p>
                          <p className="text-[11px] text-muted-foreground">{formatDistanceToNow(note.createdAt, { addSuffix: true, locale: fr })}</p>
                        </div>
                        {canDelete ? (
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => void removeNote({ noteId: note._id })} aria-label="Supprimer la note">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        ) : null}
                      </div>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-5">{note.body}</p>
                    </article>
                  ))}
                </div>
              </section>
              {canDelete ? (
                <>
                  <Separator />
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" className="text-destructive hover:text-destructive"><Trash2 className="mr-2 h-4 w-4" />Supprimer la tâche</Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Supprimer cette tâche ?</AlertDialogTitle>
                        <AlertDialogDescription>Les notes liées seront également supprimées.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction onClick={() => void destroy()} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Supprimer</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </>
              ) : null}
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
