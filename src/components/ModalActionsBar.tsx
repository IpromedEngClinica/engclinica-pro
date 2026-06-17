import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type ModalActionsBarProps = {
  children: ReactNode;
  className?: string;
};

const ModalActionsBar = ({ children, className }: ModalActionsBarProps) => (
  <div
    className={cn(
      "mt-3 flex flex-wrap items-center gap-2 border-b pb-3",
      className
    )}
  >
    {children}
  </div>
);

export default ModalActionsBar;
