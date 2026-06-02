import PlanoEquipamentosDialog from "@/components/PlanoEquipamentosDialog";
import type { Plano } from "@/services/planosService";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plano: Plano | null;
  setorId?: string | null;
};

const PlanoSetorEquipamentosDialog = ({ open, onOpenChange, plano, setorId }: Props) => (
  <PlanoEquipamentosDialog
    open={open}
    onOpenChange={onOpenChange}
    plano={plano}
    setorInicialId={setorId}
  />
);

export default PlanoSetorEquipamentosDialog;
