import { QueryClientProvider } from "@tanstack/react-query";
import { lazy } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import AppLayout from "./components/AppLayout";
import ConviteCadastro from "./pages/ConviteCadastro";
import NotFound from "./pages/NotFound";
import { DataProvider } from "./contexts/DataContext";
import Login from "./pages/Login";
import ProtectedRoute from "./components/ProtectedRoute";
import PermissionRoute from "./components/PermissionRoute";
import { AuthProvider } from "./contexts/AuthContext";
import { queryClient } from "./lib/queryClient";

const Dashboard = lazy(() => import("./pages/Dashboard"));
const Empresas = lazy(() => import("./pages/Empresas"));
const Equipamentos = lazy(() => import("./pages/Equipamentos"));
const Contratos = lazy(() => import("./pages/Contratos"));
const Planos = lazy(() => import("./pages/Planos"));
const PlanoDetalhes = lazy(() => import("./pages/PlanoDetalhes"));
const OrdensServico = lazy(() => import("./pages/OrdensServico"));
const Orcamentos = lazy(() => import("./pages/Orcamentos"));
const TiposEquipamento = lazy(() => import("./pages/TiposEquipamento"));
const TiposOS = lazy(() => import("./pages/TiposOS"));
const EstadosOS = lazy(() => import("./pages/EstadosOS"));
const Pecas = lazy(() => import("./pages/Pecas"));
const OrganizarSetores = lazy(() => import("./pages/OrganizarSetores"));
const Protocolos = lazy(() => import("./pages/Protocolos"));
const Procedimentos = lazy(() => import("./pages/Procedimentos"));
const LaudosObsolescencia = lazy(() => import("./pages/LaudosObsolescencia"));
const Calibracao = lazy(() => import("./pages/Calibracao"));
const SegurancaEletrica = lazy(() => import("./pages/SegurancaEletrica"));
const Relatorios = lazy(() => import("./pages/Relatorios"));
const Utilitarios = lazy(() => import("./pages/Utilitarios"));
const Auditoria = lazy(() => import("./pages/Auditoria"));
const UsuariosPermissoes = lazy(() => import("./pages/UsuariosPermissoes"));
const SupabaseTest = lazy(() => import("./pages/SupabaseTest"));

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <DataProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/convite/:token" element={<ConviteCadastro />} />

              <Route element={<ProtectedRoute />}>
                <Route element={<AppLayout />}>
                  <Route
                    path="/"
                    element={
                      <PermissionRoute permission="dashboard.visualizar">
                        <Dashboard />
                      </PermissionRoute>
                    }
                  />
                  <Route path="/supabase-test" element={<SupabaseTest />} />
                  <Route
                    path="/empresas"
                    element={
                      <PermissionRoute permission="empresas.visualizar">
                        <Empresas />
                      </PermissionRoute>
                    }
                  />
                  <Route
                    path="/equipamentos"
                    element={
                      <PermissionRoute permission="equipamentos.visualizar">
                        <Equipamentos />
                      </PermissionRoute>
                    }
                  />
                  <Route
                    path="/contratos"
                    element={
                      <PermissionRoute permission="contratos.visualizar">
                        <Contratos />
                      </PermissionRoute>
                    }
                  />
                  <Route
                    path="/planos"
                    element={
                      <PermissionRoute permission="planos.visualizar">
                        <Planos />
                      </PermissionRoute>
                    }
                  />
                  <Route
                    path="/planos/:planoId"
                    element={
                      <PermissionRoute permission="planos.visualizar">
                        <PlanoDetalhes />
                      </PermissionRoute>
                    }
                  />
                  <Route
                    path="/ordens-servico"
                    element={
                      <PermissionRoute permission="os.visualizar">
                        <OrdensServico />
                      </PermissionRoute>
                    }
                  />
                  <Route
                    path="/orcamentos"
                    element={
                      <PermissionRoute permission="orcamentos.visualizar">
                        <Orcamentos />
                      </PermissionRoute>
                    }
                  />
                  <Route
                    path="/protocolos"
                    element={
                      <PermissionRoute permission="protocolos.visualizar">
                        <Protocolos />
                      </PermissionRoute>
                    }
                  />
                  <Route
                    path="/laudos-obsolescencia"
                    element={
                      <PermissionRoute permission="laudos.visualizar">
                        <LaudosObsolescencia />
                      </PermissionRoute>
                    }
                  />
                  <Route
                    path="/procedimentos"
                    element={
                      <PermissionRoute permission="procedimentos.visualizar">
                        <Procedimentos />
                      </PermissionRoute>
                    }
                  />
                  <Route
                    path="/calibracao"
                    element={<Navigate to="/calibracao/execucoes" replace />}
                  />
                  <Route
                    path="/calibracao/execucoes"
                    element={
                      <PermissionRoute permission="calibracao.visualizar">
                        <Calibracao section="execucoes" />
                      </PermissionRoute>
                    }
                  />
                  <Route
                    path="/calibracao/padroes"
                    element={
                      <PermissionRoute permission="calibracao.gerenciar">
                        <Calibracao section="padroes" />
                      </PermissionRoute>
                    }
                  />
                  <Route
                    path="/calibracao/procedimentos"
                    element={
                      <PermissionRoute permission="calibracao.gerenciar">
                        <Calibracao section="procedimentos" />
                      </PermissionRoute>
                    }
                  />
                  <Route
                    path="/calibracao/configuracoes"
                    element={
                      <PermissionRoute permission="calibracao.gerenciar">
                        <Calibracao section="configuracoes" />
                      </PermissionRoute>
                    }
                  />
                  <Route
                    path="/seguranca-eletrica"
                    element={
                      <PermissionRoute permission="seguranca_eletrica.visualizar">
                        <SegurancaEletrica />
                      </PermissionRoute>
                    }
                  />
                  <Route
                    path="/relatorios"
                    element={
                      <PermissionRoute permission="relatorios.visualizar">
                        <Relatorios />
                      </PermissionRoute>
                    }
                  />
                  <Route
                    path="/utilitarios"
                    element={
                      <Navigate to="/utilitarios/termos-locacao" replace />
                    }
                  />
                  <Route
                    path="/utilitarios/termos-locacao"
                    element={
                      <PermissionRoute permission="utilitarios.visualizar">
                        <Utilitarios />
                      </PermissionRoute>
                    }
                  />
                  <Route
                    path="/utilitarios/cadastro-visita"
                    element={
                      <PermissionRoute permission="utilitarios.visualizar">
                        <Utilitarios />
                      </PermissionRoute>
                    }
                  />
                  <Route
                    path="/utilitarios/recibos"
                    element={
                      <PermissionRoute permission="utilitarios.visualizar">
                        <Utilitarios />
                      </PermissionRoute>
                    }
                  />
                  <Route
                    path="/utilitarios/vencimentos"
                    element={
                      <PermissionRoute permission="utilitarios.visualizar">
                        <Utilitarios />
                      </PermissionRoute>
                    }
                  />
                  <Route
                    path="/usuarios-permissoes"
                    element={<UsuariosPermissoes />}
                  />
                  <Route
                    path="/auditoria"
                    element={
                      <PermissionRoute permission="auditoria.visualizar">
                        <Auditoria />
                      </PermissionRoute>
                    }
                  />
                  <Route
                    path="/procedimentos-preventiva"
                    element={
                      <PermissionRoute permission="procedimentos.visualizar">
                        <Procedimentos />
                      </PermissionRoute>
                    }
                  />
                  <Route
                    path="/campos-gerenciais/tipos-equipamento"
                    element={
                      <PermissionRoute permission="campos_gerenciais.gerenciar">
                        <TiposEquipamento />
                      </PermissionRoute>
                    }
                  />
                  <Route
                    path="/campos-gerenciais/tipos-os"
                    element={
                      <PermissionRoute permission="campos_gerenciais.gerenciar">
                        <TiposOS />
                      </PermissionRoute>
                    }
                  />
                  <Route
                    path="/campos-gerenciais/estados-os"
                    element={
                      <PermissionRoute permission="campos_gerenciais.gerenciar">
                        <EstadosOS />
                      </PermissionRoute>
                    }
                  />
                  <Route
                    path="/campos-gerenciais/pecas"
                    element={
                      <PermissionRoute permission="campos_gerenciais.gerenciar">
                        <Pecas />
                      </PermissionRoute>
                    }
                  />
                  <Route
                    path="/campos-gerenciais/setores"
                    element={
                      <PermissionRoute permission="campos_gerenciais.gerenciar">
                        <OrganizarSetores />
                      </PermissionRoute>
                    }
                  />
                </Route>
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </DataProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
