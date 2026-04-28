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
import OrdemServicoDetalhes from "./pages/OrdemServicoDetalhes";
import Orcamentos from "./pages/Orcamentos";
import TiposEquipamento from "./pages/TiposEquipamento";
import TiposOS from "./pages/TiposOS";
import EstadosOS from "./pages/EstadosOS";
import Pecas from "./pages/Pecas";
import NotFound from "./pages/NotFound";
import { DataProvider } from "./contexts/DataContext";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <DataProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route element={<AppLayout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/empresas" element={<Empresas />} />
              <Route path="/equipamentos" element={<Equipamentos />} />
              <Route path="/contratos" element={<Contratos />} />
              <Route path="/ordens-servico" element={<OrdensServico />} />
              <Route path="/ordens-servico/:id" element={<OrdemServicoDetalhes />} />
              <Route path="/orcamentos" element={<Orcamentos />} />
              <Route path="/campos-gerenciais/tipos-equipamento" element={<TiposEquipamento />} />
              <Route path="/campos-gerenciais/tipos-os" element={<TiposOS />} />
              <Route path="/campos-gerenciais/estados-os" element={<EstadosOS />} />
              <Route path="/campos-gerenciais/pecas" element={<Pecas />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </DataProvider>
  </QueryClientProvider>
);

export default App;
