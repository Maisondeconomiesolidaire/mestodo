import { FormEvent, useState } from "react";
import { useMutation } from "convex/react";
import { MessageSquareText, Send, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { api } from "../../convex/_generated/api";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { errorMessage, type ProjectId, type TodoNote } from "@/lib/todo-types";

export function ProjectNotes({
  projectId,
  notes,
  canCreate,
  canDelete,
}: {
  projectId: ProjectId;
  notes: TodoNote[];
  canCreate: boolean;
  canDelete: boolean;
}) {
  const addNote = useMutation(api.mestodo.addNote);
  const removeNote = useMutation(api.mestodo.removeNote);
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const projectNotes = notes.filter((note) => !note.taskId);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!body.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await addNote({ projectId, body });
      setBody("");
    } catch (caught) {
      setError(errorMessage(caught, "Ajout impossible."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mx-auto max-w-3xl">
      {canCreate ? (
        <form onSubmit={(event) => void submit(event)} className="mb-5 rounded-xl border bg-card p-4">
          <Textarea value={body} onChange={(event) => setBody(event.target.value)} placeholder="Ajouter une note au projet" rows={3} maxLength={5000} />
          <div className="mt-3 flex justify-end">
            <Button type="submit" size="sm" disabled={saving || !body.trim()}>
              <Send className="mr-2 h-4 w-4" />Ajouter
            </Button>
          </div>
        </form>
      ) : null}
      {error ? <Alert variant="destructive" className="mb-4"><AlertDescription>{error}</AlertDescription></Alert> : null}
      <div className="grid gap-3">
        {projectNotes.length === 0 ? (
          <div className="rounded-xl border border-dashed py-12 text-center text-sm text-muted-foreground">
            <MessageSquareText className="mx-auto mb-3 h-6 w-6" />
            Aucune note
          </div>
        ) : projectNotes.map((note) => (
          <article key={note._id} className="rounded-xl border bg-card p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium">{note.authorName}</p>
                <p className="text-xs text-muted-foreground">{formatDistanceToNow(note.createdAt, { addSuffix: true, locale: fr })}</p>
              </div>
              {canDelete ? (
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => void removeNote({ noteId: note._id })} aria-label="Supprimer la note">
                  <Trash2 className="h-4 w-4" />
                </Button>
              ) : null}
            </div>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-6">{note.body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
