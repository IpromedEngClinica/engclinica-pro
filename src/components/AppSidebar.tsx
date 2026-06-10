import { Link, useLocation } from "react-router-dom";
import {
  BarChart3,
  Building2,
  CalendarCheck,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Cpu,
  FileBox,
  FileSignature,
  FileText,
  FileWarning,
  Gauge,
  LayoutDashboard,
  List,
  LogOut,
  Settings2,
  ShieldCheck,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";

type SidebarItem = {
  icon: LucideIcon;
  label: string;
  path: string;
  permission: string;
};

const menuItems: SidebarItem[] = [
  {
    icon: LayoutDashboard,
    label: "Painel",
    path: "/",
    permission: "dashboard.visualizar",
  },
  {
    icon: Building2,
    label: "Empresas",
    path: "/empresas",
    permission: "empresas.visualizar",
  },
  {
    icon: Cpu,
    label: "Equipamentos",
    path: "/equipamentos",
    permission: "equipamentos.visualizar",
  },
  {
    icon: ClipboardList,
    label: "Ordens de Serviço",
    path: "/ordens-servico",
    permission: "os.visualizar",
  },
  {
    icon: FileSignature,
    label: "Orçamentos",
    path: "/orcamentos",
    permission: "orcamentos.visualizar",
  },
];

const menuItemsAfterCalibracao: SidebarItem[] = [
  {
    icon: ShieldCheck,
    label: "Segurança Elétrica",
    path: "/seguranca-eletrica",
    permission: "seguranca_eletrica.visualizar",
  },
  {
    icon: BarChart3,
    label: "Relatórios",
    path: "/relatorios",
    permission: "relatorios.visualizar",
  },
  {
    icon: Users,
    label: "Usuários e Permissões",
    path: "/usuarios-permissoes",
    permission: "usuarios.gerenciar",
  },
  {
    icon: CalendarDays,
    label: "Planos",
    path: "/planos",
    permission: "planos.visualizar",
  },
  {
    icon: FileText,
    label: "Contratos",
    path: "/contratos",
    permission: "contratos.visualizar",
  },
  {
    icon: FileBox,
    label: "Protocolos",
    path: "/protocolos",
    permission: "protocolos.visualizar",
  },
  {
    icon: FileWarning,
    label: "Laudo de Obsolescência",
    path: "/laudos-obsolescencia",
    permission: "laudos.visualizar",
  },
  {
    icon: CalendarCheck,
    label: "Procedimentos Preventivos",
    path: "/procedimentos",
    permission: "procedimentos.visualizar",
  },
];

const calibracaoItems: SidebarItem[] = [
  {
    icon: List,
    label: "Calibrações Executadas",
    path: "/calibracao/execucoes",
    permission: "calibracao.visualizar",
  },
  {
    icon: List,
    label: "Padrões",
    path: "/calibracao/padroes",
    permission: "calibracao.gerenciar",
  },
  {
    icon: List,
    label: "Procedimentos",
    path: "/calibracao/procedimentos",
    permission: "calibracao.gerenciar",
  },
  {
    icon: List,
    label: "Configurações",
    path: "/calibracao/configuracoes",
    permission: "calibracao.gerenciar",
  },
];

const camposGerenciais: SidebarItem[] = [
  {
    icon: List,
    label: "Tipos de Equipamento",
    path: "/campos-gerenciais/tipos-equipamento",
    permission: "campos_gerenciais.gerenciar",
  },
  {
    icon: List,
    label: "Tipos de OS",
    path: "/campos-gerenciais/tipos-os",
    permission: "campos_gerenciais.gerenciar",
  },
  {
    icon: List,
    label: "Estados da OS",
    path: "/campos-gerenciais/estados-os",
    permission: "campos_gerenciais.gerenciar",
  },
  {
    icon: List,
    label: "Peças",
    path: "/campos-gerenciais/pecas",
    permission: "campos_gerenciais.gerenciar",
  },
];

const AppSidebar = () => {
  const location = useLocation();
  const { signOut, user, hasPermission } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [camposOpen, setCamposOpen] = useState(
    location.pathname.startsWith("/campos-gerenciais")
  );
  const [calibracaoOpen, setCalibracaoOpen] = useState(
    location.pathname.startsWith("/calibracao")
  );

  const visibleMenuItems = useMemo(
    () => menuItems.filter((item) => hasPermission(item.permission)),
    [hasPermission]
  );
  const visibleCalibracaoItems = useMemo(
    () => calibracaoItems.filter((item) => hasPermission(item.permission)),
    [hasPermission]
  );
  const visibleAfterCalibracaoItems = useMemo(
    () =>
      menuItemsAfterCalibracao.filter((item) =>
        hasPermission(item.permission)
      ),
    [hasPermission]
  );
  const visibleCamposGerenciais = useMemo(
    () => camposGerenciais.filter((item) => hasPermission(item.permission)),
    [hasPermission]
  );

  const renderLink = (item: SidebarItem, nested = false) => {
    const isActive =
      location.pathname === item.path ||
      (item.path !== "/" && location.pathname.startsWith(item.path));

    return (
      <Link
        key={item.path}
        to={item.path}
        className={`flex items-center gap-3 rounded-lg transition-colors ${
          nested ? "px-3 py-2 text-sm" : "px-3 py-2.5 text-sm font-medium"
        } ${
          isActive
            ? "bg-sidebar-primary text-sidebar-primary-foreground"
            : nested
              ? "text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        }`}
        title={collapsed ? item.label : undefined}
      >
        <item.icon className={`${nested ? "h-4 w-4" : "h-5 w-5"} shrink-0`} />
        {!collapsed && <span>{item.label}</span>}
      </Link>
    );
  };

  return (
    <aside
      className={`flex flex-col bg-sidebar text-sidebar-foreground transition-all duration-300 ${
        collapsed ? "w-16" : "w-64"
      } min-h-screen`}
    >
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

      <nav className="flex-1 py-4 px-2 space-y-1">
        {visibleMenuItems.map((item) => renderLink(item))}

        {visibleCalibracaoItems.length > 0 && (
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
                  <ChevronDown
                    className={`h-4 w-4 transition-transform ${
                      calibracaoOpen ? "rotate-180" : ""
                    }`}
                  />
                </>
              )}
            </button>
            {calibracaoOpen && !collapsed && (
              <div className="ml-4 mt-1 space-y-1">
                {visibleCalibracaoItems.map((item) => renderLink(item, true))}
              </div>
            )}
          </div>
        )}

        {visibleAfterCalibracaoItems.map((item) => renderLink(item))}

        {visibleCamposGerenciais.length > 0 && (
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
                  <ChevronDown
                    className={`w-4 h-4 transition-transform ${
                      camposOpen ? "rotate-180" : ""
                    }`}
                  />
                </>
              )}
            </button>
            {camposOpen && !collapsed && (
              <div className="ml-4 mt-1 space-y-1">
                {visibleCamposGerenciais.map((item) => renderLink(item, true))}
              </div>
            )}
          </div>
        )}
      </nav>

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

      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center justify-center py-3 border-t border-sidebar-border text-sidebar-muted hover:text-sidebar-foreground transition-colors"
      >
        {collapsed ? (
          <ChevronRight className="w-4 h-4" />
        ) : (
          <ChevronLeft className="w-4 h-4" />
        )}
      </button>
    </aside>
  );
};

export default AppSidebar;
