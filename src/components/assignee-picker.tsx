import { CheckCircle2, ChevronDown, Eye, MessageCircleMore, ShieldCheck, UserRoundPlus } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { Assignee, DirectoryPerson, RaciRole } from "@/lib/todo-types";

export const RACI_ROLE_LABELS: Record<RaciRole, string> = {
  responsible: "Réalisateurs",
  accountable: "Approbateurs",
  consulted: "Consultés",
  informed: "Informés",
};

const RACI_ROLES: Array<{ role: RaciRole; description: string; icon: typeof CheckCircle2; className: string }> = [
  { role: "responsible", description: "Réalisent concrètement la tâche", icon: CheckCircle2, className: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-300" },
  { role: "accountable", description: "Valident le résultat final", icon: ShieldCheck, className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300" },
  { role: "consulted", description: "Apportent leur avis ou expertise", icon: MessageCircleMore, className: "bg-amber-500/10 text-amber-700 dark:text-amber-300" },
  { role: "informed", description: "Suivent l’avancement de la tâche", icon: Eye, className: "bg-sky-500/10 text-sky-600 dark:text-sky-300" },
];

function initials(name: string) {
  return name.split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("");
}

export function AssigneePicker({
  directory,
  value,
  onChange,
  disabled,
  role = "responsible",
}: {
  directory: DirectoryPerson[];
  value: Assignee[];
  onChange: (value: Assignee[]) => void;
  disabled?: boolean;
  role?: RaciRole;
}) {
  const roleValues = value.filter((person) => (person.role ?? "responsible") === role);
  const selected = new Set(roleValues.map((person) => person.clerkId));

  function toggle(person: DirectoryPerson) {
    if (selected.has(person.clerkId)) {
      onChange(value.filter((entry) => !(entry.clerkId === person.clerkId && (entry.role ?? "responsible") === role)));
      return;
    }
    onChange([
      ...value,
      {
        clerkId: person.clerkId,
        name: person.name,
        imageUrl: person.imageUrl ?? undefined,
        role,
      },
    ]);
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="outline" className="h-10 w-full justify-between font-normal" disabled={disabled}>
          <span className="flex min-w-0 items-center gap-2">
            <UserRoundPlus className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="truncate">
              {roleValues.length === 0
                ? "Ajouter des personnes"
                : roleValues.length === 1
                  ? roleValues[0].name
                  : `${roleValues.length} personnes`}
            </span>
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72">
        <DropdownMenuLabel>{RACI_ROLE_LABELS[role]}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {directory.length === 0 ? (
          <p className="px-2 py-3 text-sm text-muted-foreground">Annuaire indisponible</p>
        ) : directory.map((person) => (
          <DropdownMenuCheckboxItem
            key={person.clerkId}
            checked={selected.has(person.clerkId)}
            onSelect={(event) => event.preventDefault()}
            onCheckedChange={() => toggle(person)}
            className="gap-2"
          >
            <Avatar className="h-6 w-6">
              <AvatarImage src={person.imageUrl ?? undefined} alt="" />
              <AvatarFallback className="text-[10px]">{initials(person.name)}</AvatarFallback>
            </Avatar>
            <span className="truncate">{person.name}</span>
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function RaciAssignments({
  directory,
  value,
  onChange,
  disabled,
}: {
  directory: DirectoryPerson[];
  value: Assignee[];
  onChange: (value: Assignee[]) => void;
  disabled?: boolean;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {RACI_ROLES.map(({ role, description, icon: Icon, className }) => {
        const count = value.filter((person) => (person.role ?? "responsible") === role).length;
        return (
          <section key={role} className="rounded-xl border bg-muted/20 p-3">
            <div className="mb-3 flex items-start gap-2.5">
              <span className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-lg", className)}><Icon className="h-4 w-4" /></span>
              <div className="min-w-0"><div className="flex items-center gap-2"><h4 className="text-sm font-semibold">{RACI_ROLE_LABELS[role]}</h4>{count ? <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">{count}</span> : null}</div><p className="text-[11px] leading-4 text-muted-foreground">{description}</p></div>
            </div>
            <AssigneePicker directory={directory} value={value} onChange={onChange} disabled={disabled} role={role} />
          </section>
        );
      })}
    </div>
  );
}

export function AssigneeAvatars({ assignees }: { assignees: Assignee[] }) {
  if (assignees.length === 0) return null;
  const unique = assignees.filter((person, index) => assignees.findIndex((entry) => entry.clerkId === person.clerkId) === index);
  return (
    <div className="flex -space-x-2" aria-label={unique.map((person) => person.name).join(", ")}>
      {unique.slice(0, 3).map((person) => (
        <Avatar key={person.clerkId} className="h-7 w-7 border-2 border-card">
          <AvatarImage src={person.imageUrl} alt={person.name} />
          <AvatarFallback className="text-[9px]">{initials(person.name)}</AvatarFallback>
        </Avatar>
      ))}
      {unique.length > 3 ? (
        <span className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-card bg-muted text-[10px] font-semibold">
          +{unique.length - 3}
        </span>
      ) : null}
    </div>
  );
}
