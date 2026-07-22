import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarRange } from "lucide-react";
import type { DateRange } from "react-day-picker";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

type DateRangeFilterProps = {
  label: string;
  from: string;
  to: string;
  onChange: (range: { from: string; to: string }) => void;
};

const parseLocalDate = (value: string) => {
  if (!value) return undefined;

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);

  return Number.isNaN(date.getTime()) ? undefined : date;
};

const formatInputDate = (value?: Date) =>
  value ? format(value, "yyyy-MM-dd") : "";

const DateRangeFilter = ({
  label,
  from,
  to,
  onChange,
}: DateRangeFilterProps) => {
  const selected: DateRange | undefined = from
    ? {
        from: parseLocalDate(from),
        to: parseLocalDate(to),
      }
    : undefined;

  const formattedRange = (() => {
    if (!selected?.from) return "Selecionar intervalo";

    const start = format(selected.from, "dd/MM/yyyy", { locale: ptBR });
    if (!selected.to) return `A partir de ${start}`;

    const end = format(selected.to, "dd/MM/yyyy", { locale: ptBR });
    return `${start} a ${end}`;
  })();

  return (
    <div className="space-y-1.5">
      <span className="text-sm font-medium leading-none">{label}</span>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className={cn(
              "w-full justify-start text-left font-normal",
              !selected?.from && "text-muted-foreground"
            )}
            aria-label={`${label}: ${formattedRange}`}
          >
            <CalendarRange className="mr-2 h-4 w-4" />
            <span className="truncate">{formattedRange}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={selected?.from}
            selected={selected}
            onSelect={(range) =>
              onChange({
                from: formatInputDate(range?.from),
                to: formatInputDate(range?.to),
              })
            }
            numberOfMonths={2}
          />
          {(from || to) && (
            <div className="border-t p-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-full"
                onClick={() => onChange({ from: "", to: "" })}
              >
                Limpar período
              </Button>
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default DateRangeFilter;
