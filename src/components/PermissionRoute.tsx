import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const PermissionRoute = ({
  permission,
  children,
}: {
  permission: string;
  children: JSX.Element;
}) => {
  const { loading, usuarioLoading, hasPermission } = useAuth();

  if (loading || usuarioLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-sm font-medium text-foreground">
          Validando permissoes...
        </p>
      </div>
    );
  }

  if (!hasPermission(permission)) {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default PermissionRoute;
