import { Building2 } from "lucide-react";
import type { ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { EmpresaSupabase } from "@/services/empresasService";

interface EmpresaDetalhesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  empresa: EmpresaSupabase | null;
}

const Field = ({
  label,
  value,
}: {
  label: string;
  value?: string | boolean | null;
}) => {
  const display =
    typeof value === "boolean" ? (value ? "Ativo" : "Inativo") : value || "-";

  return (
    <div className="text-sm">
      <span className="font-medium text-muted-foreground">{label}: </span>
      <span className="text-foreground">{display}</span>
    </div>
  );
};

const Section = ({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) => (
  <section className="rounded-lg border p-4 space-y-3">
    <h3 className="text-sm font-semibold text-foreground">{title}</h3>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
      {children}
    </div>
  </section>
);

const EmpresaDetalhesDialog = ({
  open,
  onOpenChange,
  empresa,
}: EmpresaDetalhesDialogProps) => {
  if (!empresa) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" />
            {empresa.nome_fantasia || empresa.nome}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Section title="Dados Gerais">
            <Field label="Nome/Razão Social" value={empresa.nome} />
            <Field label="Nome Fantasia" value={empresa.nome_fantasia} />
            <Field label="Tipo de Cliente" value={empresa.tipo_cliente} />
            <Field label="Relação" value={empresa.tipo_relacao} />
            <Field label="CPF/CNPJ" value={empresa.cpf_cnpj} />
            <Field label="Status" value={empresa.ativo} />
          </Section>

          <Section title="Contato">
            <Field label="Contato" value={empresa.contato} />
            <Field label="Telefone" value={empresa.telefone} />
            <Field label="Celular" value={empresa.celular} />
            <Field label="E-mail" value={empresa.email} />
          </Section>

          <Section title="Endereço">
            <Field label="CEP" value={empresa.cep} />
            <Field label="Rua" value={empresa.rua} />
            <Field label="Número" value={empresa.numero} />
            <Field label="Complemento" value={empresa.complemento} />
            <Field label="Bairro" value={empresa.bairro} />
            <Field label="Cidade" value={empresa.cidade} />
            <Field label="UF" value={empresa.estado} />
          </Section>

          {empresa.observacoes && (
            <section className="rounded-lg border p-4 space-y-2">
              <h3 className="text-sm font-semibold text-foreground">
                Observações
              </h3>
              <p className="text-sm text-foreground whitespace-pre-wrap">
                {empresa.observacoes}
              </p>
            </section>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EmpresaDetalhesDialog;
