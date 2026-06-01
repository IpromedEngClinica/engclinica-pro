import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import AppLayout from "./components/AppLayout";
import Dashboard from "./pages/Dashboard";
import Empresas from "./pages/Empresas";
import Equipamentos from "./pages/Equipamentos";
import Contratos from "./pages/Contratos";
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
import NotFound from "./pages/NotFound";
import { DataProvider } from "./contexts/DataContext";
import SupabaseTest from "./pages/SupabaseTest";
import Login from "./pages/Login";
import ProtectedRoute from "./components/ProtectedRoute";
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

              <Route element={<ProtectedRoute />}>
                <Route element={<AppLayout />}>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/supabase-test" element={<SupabaseTest />} />
                  <Route path="/empresas" element={<Empresas />} />
                  <Route path="/equipamentos" element={<Equipamentos />} />
                  <Route path="/contratos" element={<Contratos />} />
                  <Route path="/ordens-servico" element={<OrdensServico />} />
                  <Route path="/orcamentos" element={<Orcamentos />} />
                  <Route path="/protocolos" element={<Protocolos />} />
                  <Route
                    path="/laudos-obsolescencia"
                    element={<LaudosObsolescencia />}
                  />
                  <Route path="/procedimentos" element={<Procedimentos />} />
                  <Route path="/calibracao" element={<Calibracao />} />
                  <Route
                    path="/procedimentos-preventiva"
                    element={<Procedimentos />}
                  />
                  <Route
                    path="/campos-gerenciais/tipos-equipamento"
                    element={<TiposEquipamento />}
                  />
                  <Route
                    path="/campos-gerenciais/tipos-os"
                    element={<TiposOS />}
                  />
                  <Route
                    path="/campos-gerenciais/estados-os"
                    element={<EstadosOS />}
                  />
                  <Route
                    path="/campos-gerenciais/pecas"
                    element={<Pecas />}
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
