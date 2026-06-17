import CamposGerenciaisList from "@/components/CamposGerenciaisList";
import { useEquipamentos } from "@/hooks/useEquipamentos";
import {
  useAtualizarTipoEquipamento,
  useCriarTipoEquipamento,
  useDesativarTipoEquipamento,
  useTiposEquipamento,
} from "@/hooks/useTiposEquipamento";

const TiposEquipamento = () => {
  const { data: tipos = [] } = useTiposEquipamento();
  const { data: equipamentos = [] } = useEquipamentos();
  const criar = useCriarTipoEquipamento();
  const atualizar = useAtualizarTipoEquipamento();
  const desativar = useDesativarTipoEquipamento();
  const normalizar = (value: string | null | undefined) =>
    (value || "").trim().toLowerCase();

  return (
    <CamposGerenciaisList
      title="Tipos de Equipamento"
      description="Gerencie os tipos de equipamento disponíveis no sistema"
      items={tipos.map((tipo) => tipo.nome)}
      onAdd={async (nome) => {
        await criar.mutateAsync(nome);
      }}
      onRemove={async (index) => {
        await desativar.mutateAsync(tipos[index].id);
      }}
      onRename={async (index, nome) => {
        await atualizar.mutateAsync({ id: tipos[index].id, nome });
      }}
      placeholder="Novo tipo de equipamento..."
      itemLabel="Tipo de equipamento"
      canRemove={(index) => {
        const tipo = tipos[index];
        const usados = equipamentos.filter(
          (equipamento) =>
            equipamento.tipo_equipamento_id === tipo.id ||
            normalizar(equipamento.tipo_texto) === normalizar(tipo.nome)
        ).length;

        if (usados > 0) {
          return {
            ok: false,
            reason: `Existe(m) ${usados} equipamento(s) usando este tipo.`,
          };
        }

        return { ok: true };
      }}
    />
  );
};

export default TiposEquipamento;
