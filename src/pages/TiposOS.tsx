import CamposGerenciaisList from "@/components/CamposGerenciaisList";
import {
  useAtualizarTipoOS,
  useCriarTipoOS,
  useDesativarTipoOS,
  useTiposOS,
} from "@/hooks/useCamposOS";
import { useOrcamentos } from "@/hooks/useOrcamentos";
import { useOrdensServico } from "@/hooks/useOrdensServico";

const TiposOS = () => {
  const { data: tiposOS = [] } = useTiposOS();
  const { data: ordensServico = [] } = useOrdensServico();
  const { data: orcamentos = [] } = useOrcamentos();
  const criar = useCriarTipoOS();
  const atualizar = useAtualizarTipoOS();
  const desativar = useDesativarTipoOS();
  const normalizar = (value: string | null | undefined) =>
    (value || "").trim().toLowerCase();

  return (
    <CamposGerenciaisList
      title="Tipos de OS"
      description="Gerencie os tipos de ordem de serviço disponíveis no sistema"
      items={tiposOS.map((tipo) => tipo.nome)}
      onAdd={async (nome) => {
        await criar.mutateAsync(nome);
      }}
      onRemove={async (index) => {
        await desativar.mutateAsync(tiposOS[index].id);
      }}
      onRename={async (index, nome) => {
        await atualizar.mutateAsync({ id: tiposOS[index].id, nome });
      }}
      placeholder="Novo tipo de OS..."
      itemLabel="Tipo de OS"
      canRemove={(index) => {
        const tipo = tiposOS[index];
        const usadosOS = ordensServico.filter(
          (os) =>
            os.tipo_os_id === tipo.id ||
            normalizar(os.tipo_os?.nome) === normalizar(tipo.nome)
        ).length;
        const usadosOrcamentos = orcamentos.reduce(
          (acc, orcamento) =>
            acc +
            (orcamento.itens || []).filter(
              (item) =>
                item.tipo_servico_id === tipo.id ||
                normalizar(item.tipo_servico?.nome) === normalizar(tipo.nome)
            ).length,
          0
        );
        const total = usadosOS + usadosOrcamentos;

        if (total > 0) {
          return {
            ok: false,
            reason: `Existe(m) ${total} registro(s) usando este tipo.`,
          };
        }

        return { ok: true };
      }}
    />
  );
};

export default TiposOS;
