import { FormEvent, useEffect, useState } from "react";
import { useMutation } from "convex/react";
import { AlertCircle, CheckCircle2, ChevronLeft, Circle, ListChecks, Loader2, Plus, Send, Trash2 } from "lucide-react";
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
import { DatePicker } from "@/components/ui/date-picker";
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

export function TaskSheet({
  open,
  onOpenChange,
  projectId,
  task,
  tasks,
  notes,
  directory,
  canUpdate,
  canCreate,
  canDelete,
  onOpenTask,
  onToggleTask,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: ProjectId;
  task?: TodoTask;
  tasks: TodoTask[];
  notes: TodoNote[];
  directory: DirectoryPerson[];
  canUpdate: boolean;
  canCreate: boolean;
  canDelete: boolean;
  onOpenTask: (taskId: TodoTask["_id"]) => void;
  onToggleTask: (task: TodoTask) => void;
}) {
  const createTask = useMutation(api.mestodo.createTask);
  const updateTask = useMutation(api.mestodo.updateTask);
  const removeTask = useMutation(api.mestodo.removeTask);
  const addNote = useMutation(api.mestodo.addNote);
  const removeNote = useMutation(api.mestodo.removeNote);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<TaskStatus>("todo");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [assignees, setAssignees] = useState<Assignee[]>([]);
  const [dueAt, setDueAt] = useState<number>();
  const [noteBody, setNoteBody] = useState("");
  const [subtaskTitle, setSubtaskTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!task) return;
    setTitle(task.title);
    setDescription(task.description ?? "");
    setStatus(task.status);
    setPriority(task.priority);
    setAssignees(task.assignees);
    setDueAt(task.dueAt);
    setSubtaskTitle("");
    setError(null);
  }, [task]);

  if (!task) return null;
  const currentTask = task;
  const taskNotes = notes.filter((note) => note.taskId === currentTask._id);
  const parent = currentTask.parentTaskId ? tasks.find((entry) => entry._id === currentTask.parentTaskId) : undefined;
  const subtasks = tasks.filter((entry) => entry.parentTaskId === currentTask._id);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      await updateTask({
        taskId: currentTask._id,
        title,
        description: description || null,
        status,
        priority,
        assignees,
        dueAt: dueAt ?? null,
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
      await addNote({ projectId, taskId: currentTask._id, body: noteBody });
      setNoteBody("");
    } catch (caught) {
      setError(errorMessage(caught, "Ajout impossible."));
    } finally {
      setSaving(false);
    }
  }

  async function submitSubtask(event: FormEvent) {
    event.preventDefault();
    if (!subtaskTitle.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await createTask({
        projectId,
        parentTaskId: currentTask._id,
        title: subtaskTitle,
        priority: "medium",
        assignees: [],
      });
      setSubtaskTitle("");
    } catch (caught) {
      setError(errorMessage(caught, "Création impossible."));
    } finally {
      setSaving(false);
    }
  }

  async function destroy() {
    setSaving(true);
    try {
      await removeTask({ taskId: currentTask._id });
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
              {parent ? <button type="button" onClick={() => onOpenTask(parent._id)} className="mb-2 inline-flex w-fit items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"><ChevronLeft className="h-3.5 w-3.5" />{parent.title}</button> : null}
              <div className="flex items-center gap-3">
                <Button type="button" variant={task.status === "done" ? "default" : "outline"} size="icon" className="h-9 w-9 shrink-0 rounded-full" disabled={!canUpdate} onClick={() => onToggleTask(task)} aria-label={task.status === "done" ? "Rouvrir la tâche" : "Terminer la tâche"}>{task.status === "done" ? <CheckCircle2 className="h-5 w-5" /> : <Circle className="h-5 w-5" />}</Button>
                <div><SheetTitle>{task.status === "done" ? "Tâche terminée" : "Détail de la tâche"}</SheetTitle><SheetDescription>Projet, copains et activité</SheetDescription></div>
              </div>
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
                <DatePicker id="sheet-task-date" value={dueAt} onChange={setDueAt} disabled={!canUpdate} />
              </div>
              <div className="grid gap-2">
                <Label>Copains</Label>
                <AssigneePicker directory={directory} value={assignees} onChange={setAssignees} disabled={!canUpdate} />
              </div>
              {canUpdate ? (
                <Button onClick={() => void save()} disabled={saving || !title.trim()}>
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Enregistrer
                </Button>
              ) : null}
              <Separator />
              {!task.parentTaskId ? (
                <section>
                  <div className="flex items-center gap-2"><ListChecks className="h-4 w-4 text-muted-foreground" /><h3 className="text-sm font-semibold">Sous-tâches</h3><span className="text-xs text-muted-foreground">{subtasks.filter((entry) => entry.status === "done").length}/{subtasks.length}</span></div>
                  <div className="mt-3 overflow-hidden rounded-lg border">
                    {subtasks.map((subtask) => (
                      <div key={subtask._id} className="flex min-h-11 items-center gap-3 border-b px-3 last:border-0">
                        <button type="button" onClick={() => canUpdate && onToggleTask(subtask)} disabled={!canUpdate} className="text-muted-foreground hover:text-primary" aria-label={subtask.status === "done" ? "Rouvrir la sous-tâche" : "Terminer la sous-tâche"}>{subtask.status === "done" ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <Circle className="h-4 w-4" />}</button>
                        <button type="button" onClick={() => onOpenTask(subtask._id)} className="min-w-0 flex-1 py-2 text-left text-sm"><span className={subtask.status === "done" ? "line-through text-muted-foreground" : ""}>{subtask.title}</span></button>
                      </div>
                    ))}
                    {canCreate ? <form onSubmit={(event) => void submitSubtask(event)} className="flex items-center gap-2 px-3 py-2"><Plus className="h-4 w-4 text-muted-foreground" /><Input value={subtaskTitle} onChange={(event) => setSubtaskTitle(event.target.value)} placeholder="Ajouter une sous-tâche" className="h-8 border-0 px-0 shadow-none focus-visible:ring-0" maxLength={180} /><Button type="submit" size="sm" variant="ghost" disabled={saving || !subtaskTitle.trim()}>Ajouter</Button></form> : null}
                  </div>
                </section>
              ) : null}
              {!task.parentTaskId ? <Separator /> : null}
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
