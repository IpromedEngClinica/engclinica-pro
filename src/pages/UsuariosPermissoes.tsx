import { Fragment, FormEvent, useMemo, useState } from "react";
import {
  AlertCircle,
  Copy,
  Loader2,
  Mail,
  PenLine,
  RefreshCw,
  ShieldCheck,
  UserPlus,
  Users,
  XCircle,
} from "lucide-react";
import MinhaAssinaturaDialog from "@/components/MinhaAssinaturaDialog";
import PageHeader from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import {
  useCancelarConviteUsuario,
  useCriarConviteUsuario,
  useAtualizarPermissaoPerfil,
  useUsuariosPermissoesConfig,
} from "@/hooks/useUsuariosPermissoes";
import {
  getPerfilLabel,
  perfilExigeCliente,
  PERFIS_CONFIGURAVEIS,
  PERFIS_USUARIO,
  type PerfilConfiguravel,
  type PerfilUsuario,
} from "@/services/usuariosPermissoesService";
import { useAuth } from "@/contexts/AuthContext";

const getEmpresaNome = (empresa?: {
  nome?: string | null;
  nome_fantasia?: string | null;
}) => empresa?.nome_fantasia || empresa?.nome || "-";

const getStatusBadgeVariant = (
  status: string
): "default" | "secondary" | "destructive" | "outline" => {
  if (status === "pendente") return "secondary";
  if (status === "aceito") return "default";
  if (status === "cancelado") return "outline";
  return "destructive";
};

const getDataLabel = (value?: string | null) =>
  value ? new Date(value).toLocaleDateString("pt-BR") : "-";

const UsuariosPermissoes = () => {
  const { usuario, usuarioLoading } = useAuth();
  const isAdmin = usuario?.perfil === "admin";
  const { data, isLoading, isError, error, refetch, isFetching } =
    useUsuariosPermissoesConfig(isAdmin);
  const atualizarPermissao = useAtualizarPermissaoPerfil();
  const criarConvite = useCriarConviteUsuario();
  const cancelarConvite = useCancelarConviteUsuario();

  const [conviteForm, setConviteForm] = useState({
    nome: "",
    email: "",
    perfil: "solicitante" as PerfilUsuario,
    empresaId: "",
    diasValidade: "7",
  });
  const [ultimoLink, setUltimoLink] = useState("");
  const [ultimoEmail, setUltimoEmail] = useState("");
  const [assinaturaOpen, setAssinaturaOpen] = useState(false);

  const contagemPorPerfil = useMemo(() => {
    const contagem = new Map<string, number>();
    (data?.usuarios || []).forEach((usuario) => {
      contagem.set(usuario.perfil, (contagem.get(usuario.perfil) || 0) + 1);
    });
    return contagem;
  }, [data?.usuarios]);

  const permissoesPorGrupo = useMemo(() => {
    const grupos = new Map<string, NonNullable<typeof data>["permissoes"]>();
    (data?.permissoes || []).forEach((permissao) => {
      grupos.set(permissao.grupo, [
        ...(grupos.get(permissao.grupo) || []),
        permissao,
      ]);
    });
    return [...grupos.entries()];
  }, [data]);

  const permissaoMap = useMemo(() => {
    const map = new Map<string, boolean>();
    (data?.perfilPermissoes || []).forEach((item) => {
      map.set(`${item.perfil}:${item.permissao_chave}`, item.permitido);
    });
    return map;
  }, [data?.perfilPermissoes]);

  const handlePermissaoChange = async (
    perfil: PerfilConfiguravel,
    permissaoChave: string,
    permitido: boolean
  ) => {
    try {
      await atualizarPermissao.mutateAsync({
        perfil,
        permissaoChave,
        permitido,
      });
      toast({ title: "Permissao atualizada." });
    } catch (err) {
      toast({
        title: "Erro ao atualizar permissao",
        description:
          err instanceof Error ? err.message : "Erro inesperado ao salvar.",
        variant: "destructive",
      });
    }
  };

  const handleCriarConvite = async (event: FormEvent) => {
    event.preventDefault();
    setUltimoLink("");

    try {
      const result = await criarConvite.mutateAsync({
        nome: conviteForm.nome,
        email: conviteForm.email,
        perfil: conviteForm.perfil,
        empresaId: conviteForm.empresaId || null,
        diasValidade: Number(conviteForm.diasValidade || 7),
      });

      setUltimoLink(result.link);
      setUltimoEmail(result.convite.email);
      setConviteForm((prev) => ({
        ...prev,
        nome: "",
        email: "",
        empresaId: "",
      }));
      toast({ title: "Convite criado." });
    } catch (err) {
      toast({
        title: "Erro ao criar convite",
        description:
          err instanceof Error ? err.message : "Erro inesperado ao criar.",
        variant: "destructive",
      });
    }
  };

  const handleCopiarLink = async () => {
    if (!ultimoLink) return;

    await navigator.clipboard.writeText(ultimoLink);
    toast({ title: "Link copiado." });
  };

  const handleCancelarConvite = async (conviteId: string) => {
    try {
      await cancelarConvite.mutateAsync(conviteId);
      toast({ title: "Convite cancelado." });
    } catch (err) {
      toast({
        title: "Erro ao cancelar convite",
        description:
          err instanceof Error ? err.message : "Erro inesperado ao cancelar.",
        variant: "destructive",
      });
    }
  };

  const emailHref = ultimoLink
    ? `mailto:${encodeURIComponent(ultimoEmail)}?subject=${encodeURIComponent(
        "Convite de acesso ao Ipromed - Sistema de Gestão"
      )}&body=${encodeURIComponent(
        `Voce recebeu um convite para acessar o Ipromed - Sistema de Gestão.\n\nAcesse o link abaixo para cadastrar sua senha:\n${ultimoLink}\n\nEste link e unico e perde a validade apos o uso.`
      )}`
    : "";

  if (usuarioLoading || !usuario || (isAdmin && isLoading)) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (isAdmin && isError) {
    return (
      <div className="p-6 lg:p-8">
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-destructive">
          <AlertCircle className="h-5 w-5" />
          <span>
            {error instanceof Error
              ? error.message
              : "Erro ao carregar usuarios e permissoes."}
          </span>
        </div>
      </div>
    );
  }

  const exigeCliente = perfilExigeCliente(conviteForm.perfil);

  if (!isAdmin) {
    return (
      <div className="p-6 lg:p-8">
        <PageHeader
          title="Usuários e Permissões"
          description="Gerencie os dados vinculados ao seu acesso."
        />

        <div className="max-w-2xl rounded-lg border bg-card p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <PenLine className="h-5 w-5 text-primary" />
                <h2 className="text-base font-semibold">Minha assinatura</h2>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Cadastre a assinatura usada automaticamente nas ordens de serviço e certificados vinculados ao seu usuário.
              </p>
            </div>
            <Button onClick={() => setAssinaturaOpen(true)}>
              <PenLine className="mr-2 h-4 w-4" />
              Cadastrar assinatura
            </Button>
          </div>
        </div>

        <MinhaAssinaturaDialog
          open={assinaturaOpen}
          onOpenChange={setAssinaturaOpen}
        />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8">
      <PageHeader
        title="Usuarios e Permissoes"
        description="Configure perfis e envie convites unicos para acesso autorizado."
      >
        <Button onClick={() => setAssinaturaOpen(true)}>
          <PenLine className="mr-2 h-4 w-4" />
          Minha assinatura
        </Button>
        <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
          {isFetching ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          Atualizar
        </Button>
      </PageHeader>

      <Tabs defaultValue="convites" className="space-y-4">
        <TabsList>
          <TabsTrigger value="convites">Convites</TabsTrigger>
          <TabsTrigger value="hierarquia">Hierarquia</TabsTrigger>
          <TabsTrigger value="permissoes">Permissoes</TabsTrigger>
        </TabsList>

        <TabsContent value="convites" className="space-y-4">
          <div className="rounded-lg border bg-card p-4">
            <div className="mb-4 flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" />
              <div>
                <h2 className="text-base font-semibold">Novo convite</h2>
                <p className="text-sm text-muted-foreground">
                  Apenas Admin cria convites. Para solicitantes, escolha o
                  cliente que define os dados visiveis ao usuario.
                </p>
              </div>
            </div>

            <form
              onSubmit={handleCriarConvite}
              className="grid gap-4 lg:grid-cols-12"
            >
              <div className="space-y-1.5 lg:col-span-3">
                <Label>Nome</Label>
                <Input
                  value={conviteForm.nome}
                  onChange={(event) =>
                    setConviteForm((prev) => ({
                      ...prev,
                      nome: event.target.value,
                    }))
                  }
                  placeholder="Nome do convidado"
                />
              </div>

              <div className="space-y-1.5 lg:col-span-3">
                <Label>E-mail</Label>
                <Input
                  type="email"
                  value={conviteForm.email}
                  onChange={(event) =>
                    setConviteForm((prev) => ({
                      ...prev,
                      email: event.target.value,
                    }))
                  }
                  placeholder="email@cliente.com"
                  required
                />
              </div>

              <div className="space-y-1.5 lg:col-span-2">
                <Label>Perfil</Label>
                <Select
                  value={conviteForm.perfil}
                  onValueChange={(value) =>
                    setConviteForm((prev) => ({
                      ...prev,
                      perfil: value as PerfilUsuario,
                      empresaId:
                        value === "solicitante" ? prev.empresaId : "",
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PERFIS_USUARIO.map((perfil) => (
                      <SelectItem key={perfil.value} value={perfil.value}>
                        {perfil.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5 lg:col-span-3">
                <Label>Cliente vinculado</Label>
                <Select
                  value={conviteForm.empresaId || undefined}
                  onValueChange={(value) =>
                    setConviteForm((prev) => ({
                      ...prev,
                      empresaId: value,
                    }))
                  }
                  disabled={!exigeCliente}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        exigeCliente ? "Selecione o cliente" : "Nao se aplica"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {(data?.empresas || []).map((empresa) => (
                      <SelectItem key={empresa.id} value={empresa.id}>
                        {getEmpresaNome(empresa)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5 lg:col-span-1">
                <Label>Dias</Label>
                <Input
                  type="number"
                  min={1}
                  max={30}
                  value={conviteForm.diasValidade}
                  onChange={(event) =>
                    setConviteForm((prev) => ({
                      ...prev,
                      diasValidade: event.target.value,
                    }))
                  }
                />
              </div>

              <div className="flex items-end lg:col-span-12">
                <Button type="submit" disabled={criarConvite.isPending}>
                  {criarConvite.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Mail className="mr-2 h-4 w-4" />
                  )}
                  Criar link de convite
                </Button>
              </div>
            </form>

            {ultimoLink && (
              <div className="mt-4 rounded-lg border bg-muted/30 p-3">
                <Label>Link gerado</Label>
                <div className="mt-2 flex flex-col gap-2 md:flex-row">
                  <Input readOnly value={ultimoLink} className="font-mono text-xs" />
                  <Button type="button" variant="outline" onClick={handleCopiarLink}>
                    <Copy className="mr-2 h-4 w-4" />
                    Copiar
                  </Button>
                  <Button asChild type="button" variant="outline">
                    <a href={emailHref}>
                      <Mail className="mr-2 h-4 w-4" />
                      Enviar e-mail
                    </a>
                  </Button>
                </div>
              </div>
            )}
          </div>

          <div className="rounded-lg border bg-card p-4">
            <div className="mb-4">
              <h2 className="text-base font-semibold">Convites emitidos</h2>
              <p className="text-sm text-muted-foreground">
                O token bruto nao fica salvo. Depois de criado, o link so pode
                ser copiado enquanto aparece na tela.
              </p>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Perfil</TableHead>
                  <TableHead>Cliente vinculado</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Expira em</TableHead>
                  <TableHead className="w-28 text-right">Acoes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data?.convites || []).map((convite) => (
                  <TableRow key={convite.id}>
                    <TableCell className="font-medium">
                      {convite.nome || "-"}
                    </TableCell>
                    <TableCell>{convite.email}</TableCell>
                    <TableCell>{getPerfilLabel(convite.perfil)}</TableCell>
                    <TableCell>{getEmpresaNome(convite.empresa)}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(convite.status)}>
                        {convite.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{getDataLabel(convite.expira_em)}</TableCell>
                    <TableCell className="text-right">
                      {convite.status === "pendente" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleCancelarConvite(convite.id)}
                          disabled={cancelarConvite.isPending}
                        >
                          <XCircle className="mr-2 h-4 w-4" />
                          Cancelar
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {!data?.convites.length && (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="py-8 text-center text-muted-foreground"
                    >
                      Nenhum convite criado ainda.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="hierarquia" className="space-y-4">
          <div className="rounded-lg border bg-card p-4">
            <div className="mb-4 flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              <h2 className="text-base font-semibold">Perfis do sistema</h2>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Perfil</TableHead>
                  <TableHead>Uso previsto</TableHead>
                  <TableHead className="text-right">Usuarios ativos</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {PERFIS_USUARIO.map((perfil) => (
                  <TableRow key={perfil.value}>
                    <TableCell className="font-medium">{perfil.label}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {perfil.description}
                    </TableCell>
                    <TableCell className="text-right">
                      {contagemPorPerfil.get(perfil.value) || 0}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="rounded-lg border bg-card p-4">
            <div className="mb-4 flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <h2 className="text-base font-semibold">Usuarios atuais</h2>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Perfil</TableHead>
                  <TableHead>Cliente vinculado</TableHead>
                  <TableHead>Assinatura</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data?.usuarios || []).map((usuario) => (
                  <TableRow key={usuario.id}>
                    <TableCell className="font-medium">{usuario.nome}</TableCell>
                    <TableCell>{usuario.email}</TableCell>
                    <TableCell>{getPerfilLabel(usuario.perfil)}</TableCell>
                    <TableCell>{getEmpresaNome(usuario.empresa)}</TableCell>
                    <TableCell>
                      {usuario.assinatura_storage_path ? "Cadastrada" : "Pendente"}
                    </TableCell>
                    <TableCell>{usuario.ativo ? "Ativo" : "Inativo"}</TableCell>
                  </TableRow>
                ))}
                {!data?.usuarios.length && (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="py-8 text-center text-muted-foreground"
                    >
                      Nenhum usuario encontrado.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="permissoes">
          <div className="rounded-lg border bg-card p-4">
            <div className="mb-4">
              <h2 className="text-base font-semibold">Matriz de permissoes</h2>
              <p className="text-sm text-muted-foreground">
                Admin sempre possui acesso total. Os demais perfis seguem a matriz
                abaixo.
              </p>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[280px]">Permissao</TableHead>
                    {PERFIS_CONFIGURAVEIS.map((perfil) => (
                      <TableHead key={perfil} className="text-center">
                        {getPerfilLabel(perfil)}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {permissoesPorGrupo.map(([grupo, permissoes]) => (
                    <Fragment key={grupo}>
                      <TableRow key={grupo} className="bg-muted/50">
                        <TableCell
                          colSpan={PERFIS_CONFIGURAVEIS.length + 1}
                          className="py-2 text-xs font-semibold uppercase text-muted-foreground"
                        >
                          {grupo}
                        </TableCell>
                      </TableRow>
                      {permissoes.map((permissao) => (
                        <TableRow key={permissao.chave}>
                          <TableCell>
                            <div className="font-medium">{permissao.nome}</div>
                            {permissao.descricao && (
                              <div className="text-xs text-muted-foreground">
                                {permissao.descricao}
                              </div>
                            )}
                          </TableCell>
                          {PERFIS_CONFIGURAVEIS.map((perfil) => (
                            <TableCell key={perfil} className="text-center">
                              <Checkbox
                                checked={
                                  permissaoMap.get(
                                    `${perfil}:${permissao.chave}`
                                  ) ?? false
                                }
                                onCheckedChange={(checked) =>
                                  handlePermissaoChange(
                                    perfil,
                                    permissao.chave,
                                    checked === true
                                  )
                                }
                                disabled={atualizarPermissao.isPending}
                              />
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </Fragment>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <MinhaAssinaturaDialog
        open={assinaturaOpen}
        onOpenChange={setAssinaturaOpen}
      />
    </div>
  );
};

export default UsuariosPermissoes;
