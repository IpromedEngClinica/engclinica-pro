import { Button } from "@/components/ui/button";
import { MoreHorizontal } from "lucide-react";
import { getListPaginationItems } from "@/utils/listPagination";

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

  const paginationItems = getListPaginationItems(page, totalPages);

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
      <div className="flex flex-wrap items-center justify-center gap-1">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange(Math.max(1, page - 1))}
        >
          Anterior
        </Button>
        {paginationItems.map((item) => {
          if (typeof item !== "number") {
            return (
              <span
                key={item}
                className="flex h-8 w-8 items-center justify-center"
                aria-hidden="true"
              >
                <MoreHorizontal className="h-4 w-4" />
              </span>
            );
          }

          const isActive = item === page;
          return (
            <Button
              key={item}
              type="button"
              variant={isActive ? "default" : "ghost"}
              size="icon"
              className="h-8 w-8 rounded-full"
              aria-label={`Ir para a página ${item}`}
              aria-current={isActive ? "page" : undefined}
              onClick={() => onPageChange(item)}
            >
              {item}
            </Button>
          );
        })}
        <span className="sr-only">
          Página {page} de {totalPages}
        </span>
        <Button
          type="button"
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
