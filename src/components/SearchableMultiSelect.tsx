import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronsUpDown, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export type SearchableMultiSelectOption = {
  value: string;
  label: string;
};

interface SearchableMultiSelectProps {
  value: string[];
  onValueChange: (value: string[]) => void;
  options: SearchableMultiSelectOption[];
  placeholder?: string;
  emptyText?: string;
  disabled?: boolean;
}

const normalize = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[.\-/]/g, "")
    .toLowerCase()
    .trim();

const SearchableMultiSelect = ({
  value,
  onValueChange,
  options,
  placeholder = "Selecione...",
  emptyText = "Nenhum item encontrado.",
  disabled = false,
}: SearchableMultiSelectProps) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const selected = useMemo(
    () => options.filter((option) => value.includes(option.value)),
    [options, value]
  );
  const selectedValues = useMemo(() => new Set(value), [value]);
  const searchTerms = normalize(query).split(/\s+/).filter(Boolean);
  const filteredOptions = searchTerms.length
    ? options.filter((option) => {
        const searchable = normalize(option.label);
        return searchTerms.every((term) => searchable.includes(term));
      })
    : options;

  useEffect(() => {
    if (!open) return;
    const timeout = window.setTimeout(() => {
      searchInputRef.current?.focus();
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [open]);

  const toggle = (optionValue: string) => {
    onValueChange(
      selectedValues.has(optionValue)
        ? value.filter((item) => item !== optionValue)
        : [...value, optionValue]
    );
  };

  const resumo =
    selected.length === 0
      ? ""
      : selected.length <= 2
        ? selected.map((option) => option.label).join(", ")
        : `${selected.length} tipos selecionados`;

  return (
    <Popover
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) setQuery("");
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="min-h-10 w-full justify-between font-normal"
        >
          <span className={cn("truncate", !resumo && "text-muted-foreground")}>
            {resumo || placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <div className="border-b p-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={searchInputRef}
              className="h-9 pl-8"
              placeholder="Buscar..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          {selected.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {selected.slice(0, 4).map((option) => (
                <Badge
                  key={option.value}
                  variant="secondary"
                  className="max-w-full gap-1 pr-1"
                >
                  <span className="truncate">{option.label}</span>
                  <button
                    type="button"
                    className="rounded-full hover:text-destructive"
                    onClick={() => toggle(option.value)}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
              {selected.length > 4 && (
                <Badge variant="outline">+{selected.length - 4}</Badge>
              )}
            </div>
          )}
        </div>
        <div className="max-h-[300px] overflow-y-auto p-1">
          {filteredOptions.length === 0 ? (
            <div className="px-2 py-6 text-center text-sm text-muted-foreground">
              {emptyText}
            </div>
          ) : (
            filteredOptions.map((option) => {
              const checked = selectedValues.has(option.value);
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => toggle(option.value)}
                  className="flex w-full items-center rounded-sm px-2 py-2 text-left text-sm hover:bg-accent"
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4 shrink-0",
                      checked ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <span className="min-w-0 whitespace-normal break-words">
                    {option.label}
                  </span>
                </button>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default SearchableMultiSelect;
