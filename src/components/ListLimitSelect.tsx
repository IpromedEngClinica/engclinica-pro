import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const DEFAULT_LIST_LIMIT = 25;
export const LIST_LIMIT_OPTIONS = [25, 50, 100, 150] as const;

type ListLimitSelectProps = {
  value: number;
  onChange: (value: number) => void;
  total?: number;
  className?: string;
};

const ListLimitSelect = ({
  value,
  onChange,
  className,
}: ListLimitSelectProps) => {
  return (
    <div
      className={`flex flex-wrap items-center gap-2 text-sm text-muted-foreground ${
        className || ""
      }`}
    >
      <span>Exibir:</span>
      <Select
        value={String(value)}
        onValueChange={(nextValue) => onChange(Number(nextValue))}
      >
        <SelectTrigger className="h-9 w-[120px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {LIST_LIMIT_OPTIONS.map((option) => (
            <SelectItem key={option} value={String(option)}>
              {option} itens
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default ListLimitSelect;
