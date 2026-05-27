import CamposGerenciaisList from "@/components/CamposGerenciaisList";
import { useOrcamentos } from "@/hooks/useOrcamentos";
import {
  useAtualizarPeca,
  useCriarPeca,
  useDesativarPeca,
  usePecas,
} from "@/hooks/usePecas";

const Pecas = () => {
  const { data: pecas = [] } = usePecas();
  const { data: orcamentos = [] } = useOrcamentos();
  const criar = useCriarPeca();
  const atualizar = useAtualizarPeca();
  const desativar = useDesativarPeca();
  const normalizar = (value: string | null | undefined) =>
    (value || "").trim().toLowerCase();

  return (
    <CamposGerenciaisList
      title="Peças"
      description="Gerencie as peças disponíveis para uso em orçamentos"
      items={pecas.map((peca) => peca.nome)}
      onAdd={async (nome) => {
        await criar.mutateAsync(nome);
      }}
      onRemove={async (index) => {
        await desativar.mutateAsync(pecas[index].id);
      }}
      onRename={async (index, nome) => {
        await atualizar.mutateAsync({ id: pecas[index].id, nome });
      }}
      placeholder="Nova peça..."
      itemLabel="Peça"
      canRemove={(index) => {
        const peca = pecas[index];
        const usados = orcamentos.reduce(
          (acc, orcamento) =>
            acc +
            (orcamento.itens || []).filter(
              (item) =>
                item.peca_id === peca.id ||
                normalizar(item.peca_nome) === normalizar(peca.nome) ||
                normalizar(item.peca?.nome) === normalizar(peca.nome)
            ).length,
          0
        );

        if (usados > 0) {
          return {
            ok: false,
            reason: `Existe(m) ${usados} item(ns) de orçamento usando esta peça.`,
          };
        }

        return { ok: true };
      }}
    />
  );
};

export default Pecas;
