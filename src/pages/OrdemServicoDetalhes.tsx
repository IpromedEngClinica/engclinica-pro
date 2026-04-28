import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Pencil, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import SearchableSelect from "@/components/SearchableSelect";
import { useData } from "@/contexts/DataContext";
import { toast } from "@/hooks/use-toast";

interface CardProps {
  title: string;
  children: React.ReactNode;
}
const InfoCard = ({ title, children }: CardProps) => (
  <div className="rounded-lg border bg-card shadow-sm">
    <div className="inline-block -mt-3 ml-4 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-sm font-medium">
      {title}
    </div>
    <div className="p-5 pt-3 space-y-2 text-foreground">{children}</div>
  </div>
);

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="text-sm">
    <span className="font-semibold text-foreground">{label}: </span>
    <span className="text-foreground">{children}</span>
  </div>
);

const formatDate = (iso: string) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
};

const OrdemServicoDetalhes = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const {
    ordensServico,
    equipamentos,
    empresasList,
    empresas,
    tiposOS,
    estadosOS,
    updateOrdemServico,
  } = useData();

  const os = useMemo(
    () => ordensServico.find((o) => String(o.id) === String(id)),
    [ordensServico, id]
  );

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(() => ({
    dataCriacao: "",
    estado: "",
    responsavelTecnico: "",
    solicitante: "",
    equipamentoId: "",
    tipoServico: "",
    origemProblema: "",
    descricaoServico: "",
    observacoes: "",
  }));

  useEffect(() => {
    if (!os) return;
    setForm({
      dataCriacao: os.dataCriacao,
      estado: os.estado,
      responsavelTecnico: os.responsavelTecnico,
      solicitante: os.solicitante,
      equipamentoId: os.equipamentoId ? String(os.equipamentoId) : "",
      tipoServico: os.tipoServico,
      origemProblema: os.origemProblema,
      descricaoServico: os.descricaoServico,
      observacoes: os.observacoes,
    });
  }, [os]);

  if (!os) {
    return (
      <div className="p-8">
        <p className="text-foreground">Ordem de Serviço não encontrada.</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate("/ordens-servico")}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
        </Button>
      </div>
    );
  }

  const equipamento = equipamentos.find((e) => e.id === os.equipamentoId);
  const empresa = empresasList.find((c) => c.nome === os.solicitante);

  const equipamentosDoCliente = equipamentos.filter((e) => e.empresa === form.solicitante);
  const equipamentoOptions = equipamentosDoCliente.map((e) => `${e.tipo} - ${e.modelo} (${e.serie})`);
  const equipamentoLabel = (() => {
    const eq = equipamentos.find((e) => String(e.id) === form.equipamentoId);
    return eq ? `${eq.tipo} - ${eq.modelo} (${eq.serie})` : "";
  })();

  const update = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSolicitanteChange = (v: string) =>
    setForm((prev) => ({ ...prev, solicitante: v, equipamentoId: "" }));

  const handleEquipamentoChange = (label: string) => {
    const eq = equipamentosDoCliente.find((e) => `${e.tipo} - ${e.modelo} (${e.serie})` === label);
    update("equipamentoId", eq ? String(eq.id) : "");
  };

  const handleSave = () => {
    if (!form.solicitante || !form.equipamentoId || !form.tipoServico || !form.estado) {
      toast({ title: "Preencha os campos obrigatórios", variant: "destructive" });
      return;
    }
    updateOrdemServico(os.id, {
      dataCriacao: form.dataCriacao,
      estado: form.estado,
      responsavelTecnico: form.responsavelTecnico,
      solicitante: form.solicitante,
      equipamentoId: Number(form.equipamentoId),
      tipoServico: form.tipoServico,
      origemProblema: form.origemProblema,
      descricaoServico: form.descricaoServico,
      acessorios: os.acessorios,
      observacoes: form.observacoes,
    });
    toast({ title: "Ordem de Serviço atualizada com sucesso!" });
    setEditing(false);
  };

  const handleCancelEdit = () => {
    setForm({
      dataCriacao: os.dataCriacao,
      estado: os.estado,
      responsavelTecnico: os.responsavelTecnico,
      solicitante: os.solicitante,
      equipamentoId: os.equipamentoId ? String(os.equipamentoId) : "",
      tipoServico: os.tipoServico,
      origemProblema: os.origemProblema,
      descricaoServico: os.descricaoServico,
      observacoes: os.observacoes,
    });
    setEditing(false);
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/ordens-servico")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-semibold text-foreground">
            Ordem de Serviço <span className="text-muted-foreground">| nº {os.numero}</span>
          </h1>
        </div>
        <div className="flex gap-2">
          {editing ? (
            <>
              <Button variant="outline" onClick={handleCancelEdit}>
                <X className="w-4 h-4 mr-2" /> Cancelar
              </Button>
              <Button onClick={handleSave}>
                <Save className="w-4 h-4 mr-2" /> Salvar
              </Button>
            </>
          ) : (
            <Button onClick={() => setEditing(true)}>
              <Pencil className="w-4 h-4 mr-2" /> Editar
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Coluna Esquerda */}
        <div className="space-y-6">
          <InfoCard title="Dados Gerais">
            {editing ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="space-y-2">
                  <Label>Estado *</Label>
                  <SearchableSelect
                    value={form.estado}
                    onValueChange={(v) => update("estado", v)}
                    options={estadosOS}
                    placeholder="Selecione o estado"
                    emptyText="Nenhum estado encontrado."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Data de Criação</Label>
                  <Input
                    type="datetime-local"
                    value={form.dataCriacao}
                    onChange={(e) => update("dataCriacao", e.target.value)}
                  />
                </div>
              </div>
            ) : (
              <>
                <Field label="Estado">{os.estado}</Field>
                <Field label="Data de Criação">{formatDate(os.dataCriacao)}</Field>
              </>
            )}
          </InfoCard>

          <InfoCard title="Dados do Serviço">
            {editing ? (
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label>Tipo de Serviço *</Label>
                  <SearchableSelect
                    value={form.tipoServico}
                    onValueChange={(v) => update("tipoServico", v)}
                    options={tiposOS}
                    placeholder="Selecione o tipo de serviço"
                    emptyText="Nenhum tipo encontrado."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Origem do Problema</Label>
                  <Input
                    value={form.origemProblema}
                    onChange={(e) => update("origemProblema", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Descrição do Serviço</Label>
                  <Textarea
                    rows={4}
                    value={form.descricaoServico}
                    onChange={(e) => update("descricaoServico", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Responsável Técnico</Label>
                  <Input
                    value={form.responsavelTecnico}
                    onChange={(e) => update("responsavelTecnico", e.target.value)}
                  />
                </div>
              </div>
            ) : (
              <>
                <Field label="Tipo de Serviço">{os.tipoServico || "—"}</Field>
                <Field label="Origem do Problema">{os.origemProblema || "—"}</Field>
                <Field label="Descrição do Serviço">{os.descricaoServico || "—"}</Field>
                <Field label="Responsável Técnico">{os.responsavelTecnico || "—"}</Field>
              </>
            )}
          </InfoCard>

          <InfoCard title="Observações">
            {editing ? (
              <Textarea
                rows={4}
                value={form.observacoes}
                onChange={(e) => update("observacoes", e.target.value)}
              />
            ) : (
              <p className="text-sm whitespace-pre-wrap">{os.observacoes || "—"}</p>
            )}
          </InfoCard>
        </div>

        {/* Coluna Direita */}
        <div className="space-y-6">
          <InfoCard title="Dados do Solicitante">
            {editing ? (
              <div className="space-y-2 pt-2">
                <Label>Solicitante *</Label>
                <SearchableSelect
                  value={form.solicitante}
                  onValueChange={handleSolicitanteChange}
                  options={empresas}
                  placeholder="Selecione a empresa"
                  emptyText="Nenhuma empresa encontrada."
                />
              </div>
            ) : empresa ? (
              <>
                <Field label="Nome">
                  <Link
                    to={`/empresas?view=${empresa.id}`}
                    className="text-primary hover:underline font-medium"
                  >
                    {empresa.nome}
                  </Link>
                </Field>
                <Field label="Contato">{empresa.contato || "—"}</Field>
                <Field label="E-mail">{empresa.email || "—"}</Field>
                <Field label="Telefone">{empresa.telefone || empresa.celular || "—"}</Field>
                <Field label="Localização">
                  {[empresa.cidade, empresa.estado].filter(Boolean).join(" - ") || "—"}
                </Field>
              </>
            ) : (
              <Field label="Solicitante">{os.solicitante || "—"}</Field>
            )}
          </InfoCard>

          <InfoCard title="Instrumento / Equipamento">
            {editing ? (
              <div className="space-y-2 pt-2">
                <Label>Equipamento *</Label>
                <SearchableSelect
                  value={equipamentoLabel}
                  onValueChange={handleEquipamentoChange}
                  options={equipamentoOptions}
                  placeholder={
                    form.solicitante
                      ? "Selecione o equipamento do cliente"
                      : "Selecione um solicitante primeiro"
                  }
                  emptyText={
                    form.solicitante
                      ? "Nenhum equipamento cadastrado para este cliente."
                      : "Selecione um solicitante primeiro."
                  }
                />
              </div>
            ) : equipamento ? (
              <>
                <Field label="Tipo">
                  <Link
                    to={`/equipamentos?view=${equipamento.id}`}
                    className="text-primary hover:underline font-medium"
                  >
                    {equipamento.tipo}
                  </Link>
                </Field>
                <Field label="Fabricante">{equipamento.fabricante || "—"}</Field>
                <Field label="Modelo">{equipamento.modelo || "—"}</Field>
                <Field label="Identificação">{equipamento.tag || "—"}</Field>
                <Field label="Número de Série">{equipamento.serie || "—"}</Field>
                <Field label="Patrimônio">{equipamento.patrimonio || "—"}</Field>
                <Field label="Setor">{equipamento.setor || "—"}</Field>
              </>
            ) : (
              <Field label="Equipamento">—</Field>
            )}
          </InfoCard>

          <InfoCard title="Acessórios">
            {os.acessorios && os.acessorios.length > 0 ? (
              <ul className="list-disc list-inside text-sm space-y-1">
                {os.acessorios.map((a, i) => (
                  <li key={i}>{a}</li>
                ))}
              </ul>
            ) : (
              <p className="text-sm">Nenhum acessório registrado.</p>
            )}
          </InfoCard>
        </div>
      </div>
    </div>
  );
};

export default OrdemServicoDetalhes;
