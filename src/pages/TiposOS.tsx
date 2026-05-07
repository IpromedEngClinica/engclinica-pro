import CamposGerenciaisList from "@/components/CamposGerenciaisList";
import { useData } from "@/contexts/DataContext";

const TiposOS = () => {
  const { tiposOS, addTipoOS, removeTipoOS, renameTipoOS, ordensServico, orcamentos } = useData();
  return (
    <CamposGerenciaisList
      title="Tipos de OS"
      description="Gerencie os tipos de ordem de serviço disponíveis no sistema"
      items={tiposOS}
      onAdd={addTipoOS}
      onRemove={removeTipoOS}
      onRename={renameTipoOS}
      placeholder="Novo tipo de OS..."
      itemLabel="Tipo de OS"
      canRemove={(index) => {
        const nome = tiposOS[index];
        const usadosOS = ordensServico.filter((o) => o.tipoServico === nome).length;
        const usadosOrc = orcamentos.reduce(
          (acc, o) => acc + o.servicos.filter((s) => s.tipoServico === nome).length,
          0,
        );
        const total = usadosOS + usadosOrc;
        if (total > 0) {
          return {
            ok: false,
            reason: `Existe(m) ${total} registro(s) usando este tipo (OS/Orçamentos). Renomeie ou remova-os antes.`,
          };
        }
        return { ok: true };
      }}
    />
  );
};

export default TiposOS;
