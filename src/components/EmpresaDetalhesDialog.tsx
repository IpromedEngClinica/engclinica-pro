import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Empresa } from "@/contexts/DataContext";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  empresa: Empresa | null;
}

const Card = ({ title, children }: { title: string; children: React.ReactNode }) => (
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
    <span className="text-foreground">{children || "—"}</span>
  </div>
);

const EmpresaDetalhesDialog = ({ open, onOpenChange, empresa }: Props) => {
  if (!empresa) return null;
  const localizacao = [empresa.cidade, empresa.estado].filter(Boolean).join(" - ");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b shrink-0">
          <DialogTitle className="text-xl text-foreground">{empresa.nome}</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto min-h-0 p-6 space-y-6">
          <Card title="Dados Gerais">
            <Field label="Nome">{empresa.nome}</Field>
            <Field label="Nome Fantasia">{empresa.nomeFantasia}</Field>
            <Field label="CPF/CNPJ">{empresa.cpfCnpj}</Field>
          </Card>

          <Card title="Informações de Contato">
            <Field label="Contato">{empresa.contato}</Field>
            <Field label="E-mail">{empresa.email}</Field>
            <Field label="Telefone">{empresa.telefone}</Field>
            <Field label="Celular">{empresa.celular}</Field>
          </Card>

          <Card title="Localização">
            <Field label="CEP">{empresa.cep}</Field>
            <Field label="Rua">{empresa.rua}</Field>
            <Field label="Número">{empresa.numero}</Field>
            <Field label="Complemento">{empresa.complemento}</Field>
            <Field label="Bairro">{empresa.bairro}</Field>
            <Field label="Cidade">{empresa.cidade}</Field>
            <Field label="Estado">{empresa.estado}</Field>
            <Field label="Localização">{localizacao}</Field>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EmpresaDetalhesDialog;
