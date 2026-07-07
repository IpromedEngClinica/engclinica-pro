import { KeyboardEvent, useEffect, useRef, useState } from "react";
import { Check, ChevronsUpDown, Plus, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

type SearchableSelectOption =
  | string
  | {
      value: string;
      label: string;
      searchText?: string;
    };

interface SearchableSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  options: SearchableSelectOption[];
  placeholder?: string;
  emptyText?: string;
  onAddNew?: () => void;
  addNewLabel?: string;
  disabled?: boolean;
}

const SearchableSelect = ({
  value,
  onValueChange,
  options,
  placeholder = "Selecione...",
  emptyText = "Nenhum item encontrado.",
  onAddNew,
  addNewLabel = "Adicionar novo",
  disabled = false,
}: SearchableSelectProps) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const normalizedOptions = options.map((option) =>
    typeof option === "string"
      ? { value: option, label: option, searchText: option }
      : {
          value: option.value,
          label: option.label,
          searchText: [option.label, option.searchText, option.value]
            .filter(Boolean)
            .join(" "),
        }
  );
  const normalize = (text: string) =>
    text
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[.\-/]/g, "")
      .toLowerCase()
      .trim();
  const selectedOption = normalizedOptions.find((option) => option.value === value);
  const searchTerms = normalize(query).split(/\s+/).filter(Boolean);
  const filteredOptions = searchTerms.length
    ? normalizedOptions.filter((option) => {
        const searchable = normalize(option.searchText);
        return searchTerms.every((term) => searchable.includes(term));
      })
    : normalizedOptions;

  useEffect(() => {
    if (!open) return;

    const timeout = window.setTimeout(() => {
      searchInputRef.current?.focus();
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [open]);

  const handleTriggerKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;

    if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      setOpen(true);
      setQuery((current) => `${current}${event.key}`);
      event.preventDefault();
    }
  };

  return (
    <Popover
      open={open}
      onOpenChange={(value) => {
        setOpen(value);
        if (!value) setQuery("");
      }}
    >
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="w-full justify-between font-normal"
          onKeyDown={handleTriggerKeyDown}
        >
          <span className={cn("truncate", !value && "text-muted-foreground")}>
            {selectedOption?.label || value || placeholder}
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
        </div>
        <div className="max-h-[300px] overflow-y-auto p-1">
          {onAddNew && (
            <button
              type="button"
              onClick={() => {
                onAddNew();
                setOpen(false);
                setQuery("");
              }}
              className="flex w-full items-center rounded-sm px-2 py-2 text-left text-sm text-primary hover:bg-accent"
            >
              <Plus className="mr-2 h-4 w-4" />
              {addNewLabel}
            </button>
          )}

          {filteredOptions.length === 0 ? (
            <div className="px-2 py-6 text-center text-sm text-muted-foreground">
              {emptyText}
            </div>
          ) : (
            filteredOptions.map((option, index) => (
              <button
                key={`${option.value}-${index}`}
                type="button"
                onClick={() => {
                  onValueChange(option.value);
                  setOpen(false);
                  setQuery("");
                }}
                className="flex w-full items-center rounded-sm px-2 py-2 text-left text-sm hover:bg-accent"
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4 shrink-0",
                    value === option.value ? "opacity-100" : "opacity-0"
                  )}
                />
                <span className="min-w-0 whitespace-normal break-words">
                  {option.label}
                </span>
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default SearchableSelect;
