import { Fragment, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  ChevronDown,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Unlink,
} from "lucide-react";
import { toast } from "sonner";
import PageHeader from "@/components/PageHeader";
import SearchableSelect from "@/components/SearchableSelect";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useEmpresas } from "@/hooks/useEmpresas";
import {
  setoresOrganizacaoService,
  type SetorEquipamentoGrupo,
} from "@/services/setoresOrganizacaoService";

const normalizarBusca = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const formatEmpresaLabel = (numero: number | null | undefined, nome: string) =>
  `${String(numero || 0).padStart(3, "0")} - ${nome}`;

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Erro inesperado.";

const OrganizarSetores = () => {
  const queryClient = useQueryClient();
  const { data: empresas = [], isLoading: loadingEmpresas } = useEmpresas({
    statusFiltro: "todas",
  });
  const [empresaId, setEmpresaId] = useState("");
  const [somentePendentes, setSomentePendentes] = useState(true);
  const [busca, setBusca] = useState("");
  const [novoSetor, setNovoSetor] = useState("");
  const [setoresSelecionados, setSetoresSelecionados] = useState<Record<string, string>>(
    {}
  );
  const [locais, setLocais] = useState<Record<string, string>>({});
  const [gruposAbertos, setGruposAbertos] = useState<Record<string, boolean>>({});
  const [equipamentosSelecionados, setEquipamentosSelecionados] = useState<
    Record<string, string[]>
  >({});

  const empresasOptions = useMemo(
    () => empresas.map((empresa) => formatEmpresaLabel(empresa.numero_cadastro, empresa.nome)),
    [empresas]
  );

  const empresaIdPorLabel = useMemo(() => {
    const map = new Map<string, string>();
    empresas.forEach((empresa) => {
      map.set(formatEmpresaLabel(empresa.numero_cadastro, empresa.nome), empresa.id);
    });
    return map;
  }, [empresas]);

  const empresaSelecionada = useMemo(
    () => empresas.find((empresa) => empresa.id === empresaId) || null,
    [empresaId, empresas]
  );

  const empresaLabelSelecionada = useMemo(
    () =>
      empresaSelecionada
        ? formatEmpresaLabel(
            empresaSelecionada.numero_cadastro,
            empresaSelecionada.nome
          )
        : "",
    [empresaSelecionada]
  );

  const setoresQueryKey = ["organizacao-setores", empresaSelecionada?.id];
  const {
    data,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: setoresQueryKey,
    queryFn: () => setoresOrganizacaoService.carregarEmpresa(empresaSelecionada!.id),
    enabled: Boolean(empresaSelecionada?.id),
  });

  const setorOptions = useMemo(
    () => (data?.setores || []).map((setor) => setor.nome),
    [data?.setores]
  );

  const setorIdPorNome = useMemo(() => {
    const map = new Map<string, string>();
    (data?.setores || []).forEach((setor) => map.set(setor.nome, setor.id));
    return map;
  }, [data?.setores]);

  const setoresVazios = useMemo(() => {
    const setoresUsados = new Set(
      (data?.grupos || [])
        .flatMap((grupo) => grupo.equipamentos)
        .map((equipamento) => equipamento.empresa_setor_id)
        .filter((id): id is string => Boolean(id))
    );

    return (data?.setores || []).filter((setor) => !setoresUsados.has(setor.id));
  }, [data?.grupos, data?.setores]);

  useEffect(() => {
    if (!data?.grupos) {
      setSetoresSelecionados({});
      setLocais({});
      setEquipamentosSelecionados({});
      setGruposAbertos({});
      return;
    }

    const nextSetores: Record<string, string> = {};
    const nextLocais: Record<string, string> = {};
    const nextSelecionados: Record<string, string[]> = {};

    data.grupos.forEach((grupo) => {
      nextSetores[grupo.key] = grupo.setorOficialNome || "";
      nextLocais[grupo.key] = grupo.localInstalacao || "";
      nextSelecionados[grupo.key] = grupo.equipamentos.map(
        (equipamento) => equipamento.id
      );
    });

    setSetoresSelecionados(nextSetores);
    setLocais(nextLocais);
    setEquipamentosSelecionados(nextSelecionados);
  }, [data?.grupos]);

  const criarSetorMutation = useMutation({
    mutationFn: (nome: string) =>
      setoresOrganizacaoService.criarSetor(empresaSelecionada!.id, nome),
    onSuccess: () => {
      setNovoSetor("");
      queryClient.invalidateQueries({ queryKey: setoresQueryKey });
      queryClient.invalidateQueries({ queryKey: ["empresas"] });
      toast.success("Setor oficial criado.");
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const aplicarMutation = useMutation({
    mutationFn: (grupo: SetorEquipamentoGrupo) => {
      const setorNome = setoresSelecionados[grupo.key];
      const setorOficialId = setorNome ? setorIdPorNome.get(setorNome) : null;
      const equipamentoIds =
        equipamentosSelecionados[grupo.key] ||
        grupo.equipamentos.map((equipamento) => equipamento.id);

      if (!setorOficialId) {
        throw new Error("Selecione o setor oficial antes de aplicar.");
      }

      if (equipamentoIds.length === 0) {
        throw new Error("Selecione ao menos um equipamento.");
      }

      return setoresOrganizacaoService.aplicarMapeamento({
        empresaId: empresaSelecionada!.id,
        setorAtualOriginal: grupo.setorAtualOriginal,
        setorOficialId,
        localInstalacao: locais[grupo.key],
        equipamentoIds,
      });
    },
    onSuccess: (quantidade) => {
      queryClient.invalidateQueries({ queryKey: setoresQueryKey });
      queryClient.invalidateQueries({ queryKey: ["equipamentos"] });
      toast.success(`${quantidade} equipamento(s) atualizado(s).`);
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const removerEquipamentosMutation = useMutation({
    mutationFn: ({
      grupo,
      equipamentoIds,
    }: {
      grupo: SetorEquipamentoGrupo;
      equipamentoIds: string[];
    }) =>
      setoresOrganizacaoService.removerEquipamentosDoSetor(
        empresaSelecionada!.id,
        equipamentoIds
      ),
    onSuccess: (quantidade) => {
      queryClient.invalidateQueries({ queryKey: setoresQueryKey });
      queryClient.invalidateQueries({ queryKey: ["equipamentos"] });
      toast.success(`${quantidade} equipamento(s) removido(s) do setor.`);
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const limparSetoresVaziosMutation = useMutation({
    mutationFn: () =>
      setoresOrganizacaoService.limparSetoresVazios(empresaSelecionada!.id),
    onSuccess: (resultado) => {
      queryClient.invalidateQueries({ queryKey: setoresQueryKey });
      queryClient.invalidateQueries({ queryKey: ["empresas"] });

      if (resultado.quantidade === 0) {
        toast.info("Nenhum setor vazio encontrado.");
        return;
      }

      toast.success(`${resultado.quantidade} setor(es) vazio(s) removido(s).`);
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const gruposFiltrados = useMemo(() => {
    const termo = normalizarBusca(busca);
    return (data?.grupos || []).filter((grupo) => {
      if (somentePendentes && grupo.normalizado) return false;
      if (!termo) return true;

      const textoGrupo = normalizarBusca(
        [
          grupo.setorAtual,
          grupo.setorOficialNome,
          grupo.localInstalacao,
          ...grupo.equipamentos.slice(0, 3).map((equipamento) =>
            setoresOrganizacaoService.montarDescricaoEquipamento(equipamento)
          ),
        ]
          .filter(Boolean)
          .join(" ")
      );

      return textoGrupo.includes(termo);
    });
  }, [busca, data?.grupos, somentePendentes]);

  const criarSetor = () => {
    if (!empresaSelecionada?.id) {
      toast.error("Selecione uma empresa primeiro.");
      return;
    }

    criarSetorMutation.mutate(novoSetor);
  };

  const limparSetoresVazios = () => {
    if (!empresaSelecionada?.id) {
      toast.error("Selecione uma empresa primeiro.");
      return;
    }

    if (setoresVazios.length === 0) {
      toast.info("Nenhum setor vazio encontrado para este cliente.");
      return;
    }

    const preview = setoresVazios
      .slice(0, 8)
      .map((setor) => `- ${setor.nome}`)
      .join("\n");
    const restantes =
      setoresVazios.length > 8
        ? `\n... e mais ${setoresVazios.length - 8} setor(es).`
        : "";
    const confirmado = window.confirm(
      `Remover ${setoresVazios.length} setor(es) oficial(is) sem equipamentos vinculados?\n\n${preview}${restantes}`
    );

    if (!confirmado) return;

    limparSetoresVaziosMutation.mutate();
  };

  const getSelecionadosGrupo = (grupo: SetorEquipamentoGrupo) =>
    equipamentosSelecionados[grupo.key] ||
    grupo.equipamentos.map((equipamento) => equipamento.id);

  const setGrupoAberto = (grupoKey: string, aberto: boolean) => {
    setGruposAbertos((current) => ({
      ...current,
      [grupoKey]: aberto,
    }));
  };

  const toggleEquipamentoGrupo = (
    grupo: SetorEquipamentoGrupo,
    equipamentoId: string
  ) => {
    setEquipamentosSelecionados((current) => {
      const selecionados = new Set(
        current[grupo.key] ||
          grupo.equipamentos.map((equipamento) => equipamento.id)
      );

      if (selecionados.has(equipamentoId)) {
        selecionados.delete(equipamentoId);
      } else {
        selecionados.add(equipamentoId);
      }

      return {
        ...current,
        [grupo.key]: Array.from(selecionados),
      };
    });
  };

  const selecionarTodosGrupo = (grupo: SetorEquipamentoGrupo) => {
    setEquipamentosSelecionados((current) => ({
      ...current,
      [grupo.key]: grupo.equipamentos.map((equipamento) => equipamento.id),
    }));
  };

  const limparSelecaoGrupo = (grupo: SetorEquipamentoGrupo) => {
    setEquipamentosSelecionados((current) => ({
      ...current,
      [grupo.key]: [],
    }));
  };

  const removerSelecionadosDoSetor = (grupo: SetorEquipamentoGrupo) => {
    const equipamentoIds = getSelecionadosGrupo(grupo);

    if (equipamentoIds.length === 0) {
      toast.info("Selecione ao menos um equipamento.");
      return;
    }

    const confirmado = window.confirm(
      `Remover ${equipamentoIds.length} equipamento(s) deste setor oficial?\n\nOs equipamentos nao serao excluidos; eles ficarao sem setor para reorganizacao.`
    );

    if (!confirmado) return;

    removerEquipamentosMutation.mutate({ grupo, equipamentoIds });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Organizar Setores"
        description="Padronize os setores dos equipamentos por cliente e preserve local/sala como controle interno."
      >
        <Button
          variant="outline"
          onClick={() => refetch()}
          disabled={!empresaSelecionada || isFetching}
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Atualizar
        </Button>
      </PageHeader>

      <Card>
        <CardContent className="grid gap-4 pt-6 md:grid-cols-[minmax(280px,420px)_1fr]">
          <div className="space-y-2">
            <Label>Cliente</Label>
            <SearchableSelect
              value={empresaLabelSelecionada}
              onValueChange={(label) => {
                setEmpresaId(empresaIdPorLabel.get(label) || "");
                setBusca("");
              }}
              options={empresasOptions}
              placeholder={loadingEmpresas ? "Carregando clientes..." : "Selecione o cliente"}
              emptyText="Nenhum cliente encontrado."
            />
          </div>

          <div className="grid gap-3 rounded-md border bg-muted/20 p-4 sm:grid-cols-3">
            <div>
              <p className="text-xs text-muted-foreground">Equipamentos</p>
              <p className="text-xl font-semibold">
                {empresaSelecionada && isLoading ? "..." : data?.totalEquipamentos ?? "-"}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Grupos pendentes</p>
              <p className="text-xl font-semibold">
                {empresaSelecionada && isLoading ? "..." : data?.totalPendentes ?? "-"}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Setores oficiais</p>
              <p className="text-xl font-semibold">
                {empresaSelecionada && isLoading ? "..." : data?.setores.length ?? "-"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {empresaSelecionada && isFetching && (
        <div className="flex items-center gap-2 rounded-md border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Carregando setores e equipamentos de {empresaSelecionada.nome}...
        </div>
      )}

      {empresaSelecionada && isError && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Erro ao carregar setores: {getErrorMessage(error)}
        </div>
      )}

      {empresaSelecionada && (
        <div className="grid gap-6 xl:grid-cols-[320px_1fr]">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="text-base">Setores oficiais</CardTitle>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={limparSetoresVazios}
                  disabled={
                    isLoading ||
                    limparSetoresVaziosMutation.isPending ||
                    setoresVazios.length === 0
                  }
                  title="Remove setores oficiais sem equipamentos vinculados"
                >
                  {limparSetoresVaziosMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="mr-2 h-4 w-4" />
                  )}
                  Limpar vazios
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  value={novoSetor}
                  onChange={(event) => setNovoSetor(event.target.value)}
                  placeholder="Novo setor oficial"
                  onKeyDown={(event) => {
                    if (event.key === "Enter") criarSetor();
                  }}
                />
                <Button
                  type="button"
                  onClick={criarSetor}
                  disabled={criarSetorMutation.isPending}
                  size="icon"
                  title="Adicionar setor"
                >
                  {criarSetorMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                </Button>
              </div>

              <div className="max-h-[520px] space-y-2 overflow-y-auto pr-1">
                {isLoading ? (
                  <p className="text-sm text-muted-foreground">Carregando setores...</p>
                ) : data?.setores.length ? (
                  data.setores.map((setor) => (
                    <div key={setor.id} className="rounded-md border px-3 py-2 text-sm">
                      <p className="font-medium">{setor.nome}</p>
                      {(setor.cidade || setor.estado) && (
                        <p className="text-xs text-muted-foreground">
                          {[setor.cidade, setor.estado].filter(Boolean).join(" / ")}
                        </p>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Nenhum setor oficial cadastrado para este cliente.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <CardTitle className="text-base">Grupos de equipamentos</CardTitle>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="somente-pendentes"
                      checked={somentePendentes}
                      onCheckedChange={(checked) => setSomentePendentes(Boolean(checked))}
                    />
                    <Label htmlFor="somente-pendentes">Somente pendentes</Label>
                  </div>
                  <div className="relative min-w-[260px]">
                    <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={busca}
                      onChange={(event) => setBusca(event.target.value)}
                      className="pl-8"
                      placeholder="Buscar setor ou equipamento"
                    />
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Setor atual</TableHead>
                    <TableHead className="w-[90px] text-center">Qtd.</TableHead>
                    <TableHead>Exemplos</TableHead>
                    <TableHead className="min-w-[240px]">Setor oficial</TableHead>
                    <TableHead className="min-w-[180px]">Local/Sala</TableHead>
                    <TableHead className="w-[140px] text-right">Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                        Carregando equipamentos...
                      </TableCell>
                    </TableRow>
                  ) : gruposFiltrados.length ? (
                    gruposFiltrados.map((grupo) => {
                      const selecionados = getSelecionadosGrupo(grupo);
                      const aberto = Boolean(gruposAbertos[grupo.key]);

                      return (
                        <Fragment key={grupo.key}>
                      <TableRow>
                        <TableCell>
                          <div className="space-y-2">
                            <p className="font-medium">{grupo.setorAtual}</p>
                            <div className="flex flex-wrap items-center gap-2">
                              {grupo.normalizado ? (
                                <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-50">
                                  <CheckCircle2 className="mr-1 h-3 w-3" />
                                  Organizado
                                </Badge>
                              ) : (
                                <Badge variant="outline">Pendente</Badge>
                              )}
                              <Badge variant="secondary">
                                {selecionados.length}/{grupo.quantidade} selecionado(s)
                              </Badge>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-center font-medium">{grupo.quantidade}</TableCell>
                        <TableCell>
                          <div className="max-w-[360px] space-y-1 text-xs text-muted-foreground">
                            {grupo.equipamentos.slice(0, 3).map((equipamento) => (
                              <p key={equipamento.id} className="truncate">
                                {String(equipamento.numero_cadastro || "").padStart(3, "0")} -{" "}
                                {setoresOrganizacaoService.montarDescricaoEquipamento(equipamento)}
                              </p>
                            ))}
                            {grupo.equipamentos.length > 3 && (
                              <p>+ {grupo.equipamentos.length - 3} equipamento(s)</p>
                            )}
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs"
                              onClick={() => setGrupoAberto(grupo.key, !aberto)}
                            >
                              <ChevronDown
                                className={`mr-1 h-3.5 w-3.5 transition-transform ${
                                  aberto ? "rotate-180" : ""
                                }`}
                              />
                              {aberto ? "Ocultar equipamentos" : "Ver equipamentos"}
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell>
                          <SearchableSelect
                            value={setoresSelecionados[grupo.key] || ""}
                            onValueChange={(value) =>
                              setSetoresSelecionados((current) => ({
                                ...current,
                                [grupo.key]: value,
                              }))
                            }
                            options={setorOptions}
                            placeholder="Selecione o setor"
                            emptyText="Nenhum setor encontrado."
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={locais[grupo.key] || ""}
                            onChange={(event) =>
                              setLocais((current) => ({
                                ...current,
                                [grupo.key]: event.target.value,
                              }))
                            }
                            placeholder="Ex.: Sala 2, Emergência"
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            onClick={() => aplicarMutation.mutate(grupo)}
                            disabled={
                              aplicarMutation.isPending ||
                              !setoresSelecionados[grupo.key] ||
                              selecionados.length === 0
                            }
                          >
                            {aplicarMutation.isPending ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : null}
                            Aplicar seleção
                          </Button>
                        </TableCell>
                      </TableRow>

                      {aberto && (
                        <TableRow>
                          <TableCell colSpan={6} className="bg-muted/20 p-4">
                            <div className="space-y-3">
                              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                <div className="text-sm text-muted-foreground">
                                  Selecione apenas os equipamentos que devem receber a ação deste grupo.
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => selecionarTodosGrupo(grupo)}
                                  >
                                    Selecionar todos
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => limparSelecaoGrupo(grupo)}
                                  >
                                    Limpar seleção
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => removerSelecionadosDoSetor(grupo)}
                                    disabled={
                                      removerEquipamentosMutation.isPending ||
                                      selecionados.length === 0
                                    }
                                  >
                                    {removerEquipamentosMutation.isPending ? (
                                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    ) : (
                                      <Unlink className="mr-2 h-4 w-4" />
                                    )}
                                    Remover do setor
                                  </Button>
                                </div>
                              </div>

                              <div className="rounded-md border bg-background">
                                {grupo.equipamentos.map((equipamento) => {
                                  const checked = selecionados.includes(equipamento.id);
                                  const detalhes = [
                                    equipamento.fabricante,
                                    equipamento.modelo,
                                    equipamento.numero_serie
                                      ? `Série ${equipamento.numero_serie}`
                                      : null,
                                    equipamento.patrimonio
                                      ? `Patrimônio ${equipamento.patrimonio}`
                                      : null,
                                    equipamento.tag ? `TAG ${equipamento.tag}` : null,
                                  ]
                                    .filter(Boolean)
                                    .join(" | ");

                                  return (
                                    <label
                                      key={equipamento.id}
                                      className="flex cursor-pointer items-start gap-3 border-b px-3 py-2 last:border-b-0 hover:bg-muted/30"
                                    >
                                      <Checkbox
                                        checked={checked}
                                        onCheckedChange={() =>
                                          toggleEquipamentoGrupo(grupo, equipamento.id)
                                        }
                                        className="mt-0.5"
                                      />
                                      <div className="min-w-0 flex-1">
                                        <p className="text-sm font-medium">
                                          {String(equipamento.numero_cadastro || "").padStart(3, "0")} -{" "}
                                          {setoresOrganizacaoService.montarDescricaoEquipamento(equipamento)}
                                        </p>
                                        {detalhes && (
                                          <p className="truncate text-xs text-muted-foreground">
                                            {detalhes}
                                          </p>
                                        )}
                                        {equipamento.local_instalacao && (
                                          <p className="text-xs text-muted-foreground">
                                            Local/Sala: {equipamento.local_instalacao}
                                          </p>
                                        )}
                                      </div>
                                    </label>
                                  );
                                })}
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                        Nenhum grupo encontrado para os filtros atuais.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default OrganizarSetores;
