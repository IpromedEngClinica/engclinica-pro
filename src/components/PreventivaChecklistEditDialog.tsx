import PreventivaChecklistDialog from "@/components/PreventivaChecklistDialog";
import type { OrdemServicoSupabase } from "@/services/ordensServicoService";

type PreventivaChecklistEditDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ordemServico: OrdemServicoSupabase | null;
};

const PreventivaChecklistEditDialog = ({
  open,
  onOpenChange,
  ordemServico,
}: PreventivaChecklistEditDialogProps) => (
  <PreventivaChecklistDialog
    open={open}
    onOpenChange={onOpenChange}
    osExistenteId={ordemServico?.id || null}
    modo="usar_os_existente"
  />
);

export default PreventivaChecklistEditDialog;
