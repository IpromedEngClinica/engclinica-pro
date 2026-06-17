import CamposGerenciaisList from "@/components/CamposGerenciaisList";
import {
  useAtualizarEstadoOS,
  useCriarEstadoOS,
  useDesativarEstadoOS,
  useEstadosOS,
} from "@/hooks/useCamposOS";
import { useOrdensServico } from "@/hooks/useOrdensServico";

const EstadosOS = () => {
  const { data: estadosOS = [] } = useEstadosOS();
  const { data: ordensServico = [] } = useOrdensServico();
  const criar = useCriarEstadoOS();
  const atualizar = useAtualizarEstadoOS();
  const desativar = useDesativarEstadoOS();
  const normalizar = (value: string | null | undefined) =>
    (value || "").trim().toLowerCase();

  return (
    <CamposGerenciaisList
      title="Estados da OS"
      description="Gerencie os estados das ordens de serviço disponíveis no sistema"
      items={estadosOS.map((estado) => estado.nome)}
      onAdd={async (nome) => {
        await criar.mutateAsync(nome);
      }}
      onRemove={async (index) => {
        await desativar.mutateAsync(estadosOS[index].id);
      }}
      onRename={async (index, nome) => {
        await atualizar.mutateAsync({ id: estadosOS[index].id, nome });
      }}
      placeholder="Novo estado da OS..."
      itemLabel="Estado da OS"
      canRemove={(index) => {
        const estado = estadosOS[index];
        const usados = ordensServico.filter(
          (os) =>
            os.estado_os_id === estado.id ||
            normalizar(os.estado_os?.nome) === normalizar(estado.nome)
        ).length;

        if (usados > 0) {
          return {
            ok: false,
            reason: `Existe(m) ${usados} OS com este estado.`,
          };
        }

        return { ok: true };
      }}
    />
  );
};

export default EstadosOS;
