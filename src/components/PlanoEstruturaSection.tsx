import { Building2, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Plano, PlanoEquipamento } from "@/services/planosService";
import { getPlanoFrequenciaLabel } from "@/utils/planoFrequencia";

type Props = {
  plano: Plano;
  onGerenciar: (setorId?: string | null) => void;
};

const modoLabel = {
  por_setor: "Por setores",
  unidade_inteira: "Todos os equipamentos da unidade",
};

const PlanoEstruturaSection = ({ plano, onGerenciar }: Props) => {
  const equipamentos = plano.equipamentos || [];
  const setores = plano.setores || [];

  return (
    <Card className="mb-4">
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>Estrutura do plano</CardTitle>
            <p className="text-sm text-muted-foreground">
              {plano.empresa?.nome_fantasia || plano.empresa?.nome || "-"} / {modoLabel[plano.modo_organizacao]} / {getPlanoFrequenciaLabel(plano.frequencia)}
            </p>
          </div>
          <Button variant="outline" onClick={() => onGerenciar(null)}>
            <Settings2 className="mr-2 h-4 w-4" />
            Gerenciar estrutura
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {plano.modo_organizacao === "unidade_inteira" ? (
          <CardResumo
            titulo="Todos os equipamentos da unidade"
            equipamentos={equipamentos}
            onAbrir={() => onGerenciar(null)}
          />
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {setores.map((setor) => (
              <CardResumo
                key={setor.id}
                titulo={setor.nome}
                equipamentos={equipamentos.filter((item) => item.setor_id === setor.id)}
                onAbrir={() => onGerenciar(setor.id)}
              />
            ))}
            <CardResumo
              titulo="Sem setor"
              equipamentos={equipamentos.filter((item) => !item.setor_id)}
              onAbrir={() => onGerenciar("__sem_setor__")}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const CardResumo = ({
  titulo,
  equipamentos,
  onAbrir,
}: {
  titulo: string;
  equipamentos: PlanoEquipamento[];
  onAbrir: () => void;
}) => {
  const totais = equipamentos.reduce(
    (acc, item) => ({
      p: acc.p + (item.executar_preventiva ? 1 : 0),
      c: acc.c + (item.executar_calibracao ? 1 : 0),
      s: acc.s + (item.executar_seguranca_eletrica ? 1 : 0),
    }),
    { p: 0, c: 0, s: 0 }
  );

  return (
    <div className="rounded-lg border bg-background p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="font-medium">{titulo}</p>
          <p className="text-sm text-muted-foreground">{equipamentos.length} equipamento(s)</p>
        </div>
        <Building2 className="h-4 w-4 text-muted-foreground" />
      </div>
      <p className="mb-3 text-sm">P: {totais.p} | C: {totais.c} | S: {totais.s}</p>
      <Button size="sm" variant="outline" onClick={onAbrir}>Abrir setor</Button>
    </div>
  );
};

export default PlanoEstruturaSection;
