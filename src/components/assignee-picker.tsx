import { ChevronDown, UserRoundPlus } from "lucide-react";
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
import type { Assignee, DirectoryPerson } from "@/lib/todo-types";

function initials(name: string) {
  return name.split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("");
}

export function AssigneePicker({
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
  const selected = new Set(value.map((person) => person.clerkId));

  function toggle(person: DirectoryPerson) {
    if (selected.has(person.clerkId)) {
      onChange(value.filter((entry) => entry.clerkId !== person.clerkId));
      return;
    }
    onChange([
      ...value,
      {
        clerkId: person.clerkId,
        name: person.name,
        imageUrl: person.imageUrl ?? undefined,
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
              {value.length === 0
                ? "Aucun copain"
                : value.length === 1
                  ? value[0].name
                  : `${value.length} copains`}
            </span>
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72">
        <DropdownMenuLabel>Copains</DropdownMenuLabel>
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

export function AssigneeAvatars({ assignees }: { assignees: Assignee[] }) {
  if (assignees.length === 0) return null;
  return (
    <div className="flex -space-x-2" aria-label={assignees.map((person) => person.name).join(", ")}>
      {assignees.slice(0, 3).map((person) => (
        <Avatar key={person.clerkId} className="h-7 w-7 border-2 border-card">
          <AvatarImage src={person.imageUrl} alt={person.name} />
          <AvatarFallback className="text-[9px]">{initials(person.name)}</AvatarFallback>
        </Avatar>
      ))}
      {assignees.length > 3 ? (
        <span className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-card bg-muted text-[10px] font-semibold">
          +{assignees.length - 3}
        </span>
      ) : null}
    </div>
  );
}
