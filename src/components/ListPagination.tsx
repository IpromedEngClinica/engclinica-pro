import { Button } from "@/components/ui/button";

type ListPaginationProps = {
  page: number;
  totalPages: number;
  totalItems: number;
  firstVisibleIndex: number;
  lastVisibleIndex: number;
  onPageChange: (page: number) => void;
  showTotal?: boolean;
  className?: string;
};

const ListPagination = ({
  page,
  totalPages,
  totalItems,
  firstVisibleIndex,
  lastVisibleIndex,
  onPageChange,
  showTotal = true,
  className,
}: ListPaginationProps) => {
  if (totalItems === 0) return null;

  return (
    <div
      className={`flex flex-col gap-3 border-t px-5 py-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between ${
        className || ""
      }`}
    >
      <span>
        {showTotal
          ? `Mostrando ${firstVisibleIndex}-${lastVisibleIndex} de ${totalItems}`
          : `Mostrando ${firstVisibleIndex}-${lastVisibleIndex}`}
      </span>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange(Math.max(1, page - 1))}
        >
          Anterior
        </Button>
        <span>
          {showTotal ? `Página ${page} de ${totalPages}` : `Página ${page}`}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
        >
          Próxima
        </Button>
      </div>
    </div>
  );
};

export default ListPagination;
