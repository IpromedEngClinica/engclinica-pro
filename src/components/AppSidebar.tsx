import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Building2,
  Cpu,
  FileText,
  CalendarDays,
  ClipboardList,
  FileSignature,
  FileBox,
  FileWarning,
  CalendarCheck,
  Gauge,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Settings2,
  List,
  LogOut,
} from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";

const menuItems = [
  { icon: LayoutDashboard, label: "Painel", path: "/" },
  { icon: Building2, label: "Empresas", path: "/empresas" },
  { icon: Cpu, label: "Equipamentos", path: "/equipamentos" },
  { icon: ClipboardList, label: "Ordens de Serviço", path: "/ordens-servico" },
  { icon: FileSignature, label: "Orçamentos", path: "/orcamentos" },
];

const menuItemsAfterCalibracao = [
  { icon: CalendarDays, label: "Planos", path: "/planos" },
  { icon: FileText, label: "Contratos", path: "/contratos" },
  { icon: FileBox, label: "Protocolos", path: "/protocolos" },
  { icon: FileWarning, label: "Laudo de Obsolescência", path: "/laudos-obsolescencia" },
  { icon: CalendarCheck, label: "Procedimentos Preventivos", path: "/procedimentos" },
];

const calibracaoItems = [
  { icon: List, label: "Calibrações Executadas", path: "/calibracao/execucoes" },
  { icon: List, label: "Padrões", path: "/calibracao/padroes" },
  { icon: List, label: "Procedimentos", path: "/calibracao/procedimentos" },
  { icon: List, label: "Configurações", path: "/calibracao/configuracoes" },
];

const camposGerenciais = [
  { icon: List, label: "Tipos de Equipamento", path: "/campos-gerenciais/tipos-equipamento" },
  { icon: List, label: "Tipos de OS", path: "/campos-gerenciais/tipos-os" },
  { icon: List, label: "Estados da OS", path: "/campos-gerenciais/estados-os" },
  { icon: List, label: "Peças", path: "/campos-gerenciais/pecas" },
];

const AppSidebar = () => {
  const location = useLocation();
  const { signOut, user } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [camposOpen, setCamposOpen] = useState(
    location.pathname.startsWith("/campos-gerenciais")
  );
  const [calibracaoOpen, setCalibracaoOpen] = useState(
    location.pathname.startsWith("/calibracao")
  );

  return (
    <aside
      className={`flex flex-col bg-sidebar text-sidebar-foreground transition-all duration-300 ${
        collapsed ? "w-16" : "w-64"
      } min-h-screen`}
    >
      {/* Logo area */}
      <div className="flex items-center gap-3 px-4 py-6 border-b border-sidebar-border">
        <div className="w-9 h-9 rounded-lg bg-sidebar-primary flex items-center justify-center shrink-0">
          <Cpu className="w-5 h-5 text-sidebar-primary-foreground" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <h1 className="text-sm font-bold leading-tight text-sidebar-foreground">
              EngClinica
            </h1>
            <p className="text-xs text-sidebar-muted">Engenharia Clínica</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-2 space-y-1">
        {menuItems.map((item) => {
          const isActive =
            location.pathname === item.path ||
            (item.path !== "/" && location.pathname.startsWith(item.path));
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              }`}
              title={collapsed ? item.label : undefined}
            >
              <item.icon className="w-5 h-5 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}

        <div className="pt-2">
          <button
            onClick={() => setCalibracaoOpen(!calibracaoOpen)}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            title={collapsed ? "Calibração" : undefined}
          >
            <Gauge className="h-5 w-5 shrink-0" />
            {!collapsed && (
              <>
                <span className="flex-1 text-left">Calibração</span>
                <ChevronDown className={`h-4 w-4 transition-transform ${calibracaoOpen ? "rotate-180" : ""}`} />
              </>
            )}
          </button>
          {calibracaoOpen && !collapsed && (
            <div className="ml-4 mt-1 space-y-1">
              {calibracaoItems.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                      isActive
                        ? "bg-sidebar-primary text-sidebar-primary-foreground"
                        : "text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    }`}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {menuItemsAfterCalibracao.map((item) => {
          const isActive =
            location.pathname === item.path ||
            (item.path !== "/" && location.pathname.startsWith(item.path));
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              }`}
              title={collapsed ? item.label : undefined}
            >
              <item.icon className="w-5 h-5 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}

        {/* Campos Gerenciais */}
        <div className="pt-2">
          <button
            onClick={() => setCamposOpen(!camposOpen)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground w-full"
            title={collapsed ? "Campos Gerenciais" : undefined}
          >
            <Settings2 className="w-5 h-5 shrink-0" />
            {!collapsed && (
              <>
                <span className="flex-1 text-left">Campos Gerenciais</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${camposOpen ? "rotate-180" : ""}`} />
              </>
            )}
          </button>
          {camposOpen && !collapsed && (
            <div className="ml-4 mt-1 space-y-1">
              {camposGerenciais.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                      isActive
                        ? "bg-sidebar-primary text-sidebar-primary-foreground"
                        : "text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    }`}
                  >
                    <item.icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </nav>

      {/* Auth area */}
      <div className="px-2 py-3 border-t border-sidebar-border">
        {!collapsed && (
          <div className="mb-2 px-2">
            <p className="text-xs font-medium text-sidebar-foreground truncate">
              {user?.email}
            </p>
            <p className="text-[11px] text-sidebar-muted">Usuário autenticado</p>
          </div>
        )}

        <button
          onClick={signOut}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          title={collapsed ? "Sair" : undefined}
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {!collapsed && <span>Sair</span>}
        </button>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center justify-center py-3 border-t border-sidebar-border text-sidebar-muted hover:text-sidebar-foreground transition-colors"
      >
        {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>
    </aside>
  );
};

export default AppSidebar;
