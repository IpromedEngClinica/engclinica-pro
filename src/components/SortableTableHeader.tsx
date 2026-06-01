import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SortDirection } from "@/utils/sortUtils";

type SortableTableHeaderProps = {
  label: string;
  sortField: string;
  sortKey: string;
  sortDirection: SortDirection;
  onSort: (sortField: string) => void;
  className?: string;
};

const SortableTableHeader = ({
  label,
  sortField,
  sortKey,
  sortDirection,
  onSort,
  className,
}: SortableTableHeaderProps) => {
  const isActive = sortKey === sortField;

  return (
    <button
      type="button"
      className={cn(
        "inline-flex items-center gap-1 font-medium hover:text-primary",
        isActive && "text-primary",
        className
      )}
      onClick={() => onSort(sortField)}
    >
      {label}
      {!isActive ? (
        <ArrowUpDown className="h-3.5 w-3.5 opacity-40" />
      ) : sortDirection === "asc" ? (
        <ArrowUp className="h-3.5 w-3.5" />
      ) : (
        <ArrowDown className="h-3.5 w-3.5" />
      )}
    </button>
  );
};

export default SortableTableHeader;
