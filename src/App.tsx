import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import AppLayout from "./components/AppLayout";
import Dashboard from "./pages/Dashboard";
import Empresas from "./pages/Empresas";
import Equipamentos from "./pages/Equipamentos";
import Contratos from "./pages/Contratos";
import Planos from "./pages/Planos";
import PlanoDetalhes from "./pages/PlanoDetalhes";
import OrdensServico from "./pages/OrdensServico";
import Orcamentos from "./pages/Orcamentos";
import TiposEquipamento from "./pages/TiposEquipamento";
import TiposOS from "./pages/TiposOS";
import EstadosOS from "./pages/EstadosOS";
import Pecas from "./pages/Pecas";
import Protocolos from "./pages/Protocolos";
import Procedimentos from "./pages/Procedimentos";
import LaudosObsolescencia from "./pages/LaudosObsolescencia";
import Calibracao from "./pages/Calibracao";
import SegurancaEletrica from "./pages/SegurancaEletrica";
import Relatorios from "./pages/Relatorios";
import UsuariosPermissoes from "./pages/UsuariosPermissoes";
import ConviteCadastro from "./pages/ConviteCadastro";
import NotFound from "./pages/NotFound";
import { DataProvider } from "./contexts/DataContext";
import SupabaseTest from "./pages/SupabaseTest";
import Login from "./pages/Login";
import ProtectedRoute from "./components/ProtectedRoute";
import PermissionRoute from "./components/PermissionRoute";
import { AuthProvider } from "./contexts/AuthContext";

const queryClient = new QueryClient();

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
                    path="/usuarios-permissoes"
                    element={<UsuariosPermissoes />}
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
