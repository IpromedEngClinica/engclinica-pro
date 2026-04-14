import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Building2,
  Cpu,
  FileText,
  ClipboardList,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useState } from "react";

const menuItems = [
  { icon: LayoutDashboard, label: "Painel", path: "/" },
  { icon: Building2, label: "Empresas", path: "/empresas" },
  { icon: Cpu, label: "Equipamentos", path: "/equipamentos" },
  { icon: FileText, label: "Contratos", path: "/contratos" },
  { icon: ClipboardList, label: "Ordens de Serviço", path: "/ordens-servico" },
];

const AppSidebar = () => {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

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
      </nav>

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
