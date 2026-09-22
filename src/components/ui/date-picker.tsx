import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { CalendarDays, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export function DatePicker({
  value,
  onChange,
  disabled,
  placeholder = "Choisir une date",
  id,
}: {
  value?: number;
  onChange: (value?: number) => void;
  disabled?: boolean;
  placeholder?: string;
  id?: string;
}) {
  const selected = value ? new Date(value) : undefined;

  return (
    <div className="flex items-center gap-2">
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            disabled={disabled}
            className={cn("h-10 flex-1 justify-start text-left font-normal", !selected && "text-muted-foreground")}
          >
            <CalendarDays className="mr-2 h-4 w-4" />
            {selected ? format(selected, "EEEE d MMMM yyyy", { locale: fr }) : placeholder}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={selected}
            onSelect={(date) => onChange(date ? new Date(date.getFullYear(), date.getMonth(), date.getDate(), 18).getTime() : undefined)}
            initialFocus
            locale={fr}
          />
          <div className="flex gap-2 border-t p-3">
            <Button type="button" variant="outline" size="sm" className="flex-1" onClick={() => {
              const today = new Date();
              onChange(new Date(today.getFullYear(), today.getMonth(), today.getDate(), 18).getTime());
            }}>Aujourd’hui</Button>
            <Button type="button" variant="outline" size="sm" className="flex-1" onClick={() => {
              const nextWeek = new Date();
              nextWeek.setDate(nextWeek.getDate() + 7);
              onChange(new Date(nextWeek.getFullYear(), nextWeek.getMonth(), nextWeek.getDate(), 18).getTime());
            }}>Dans 7 jours</Button>
          </div>
        </PopoverContent>
      </Popover>
      {selected && !disabled ? (
        <Button type="button" variant="ghost" size="icon" onClick={() => onChange(undefined)} aria-label="Effacer la date">
          <X className="h-4 w-4" />
        </Button>
      ) : null}
    </div>
  );
}
