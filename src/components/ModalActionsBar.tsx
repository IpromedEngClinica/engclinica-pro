import type { ReactNode } from "react";

type ModalActionsBarProps = {
  children: ReactNode;
};

const ModalActionsBar = ({ children }: ModalActionsBarProps) => (
  <div className="mt-3 flex flex-wrap items-center gap-2 border-b pb-3">
    {children}
  </div>
);

export default ModalActionsBar;
