import type { Doc, Id } from "../../convex/_generated/dataModel";

export type TodoProject = Doc<"todoProjects">;
export type TodoTask = Doc<"todoTasks">;
export type TodoNote = Doc<"todoNotes">;
export type ProjectId = Id<"todoProjects">;
export type TaskId = Id<"todoTasks">;
export type NoteId = Id<"todoNotes">;
export type ProjectStatus = TodoProject["status"];
export type TaskStatus = TodoTask["status"];
export type TaskPriority = TodoTask["priority"];
export type Assignee = TodoTask["assignees"][number];
export type DirectoryPerson = {
  clerkId: string;
  name: string;
  imageUrl: string | null;
};

export type Access = {
  isAdmin: boolean;
  bootstrapMode: boolean;
  grants: Array<{ pageKey: string; actions: string[] }>;
};

export function canAccess(access: Access | undefined, action: string) {
  if (!access) return false;
  if (access.isAdmin || access.bootstrapMode) return true;
  return Boolean(
    access.grants.find((grant) => grant.pageKey === "mestodo:projets")?.actions.includes(action),
  );
}

export function errorMessage(error: unknown, fallback = "Une erreur est survenue.") {
  return error instanceof Error ? error.message : fallback;
}
