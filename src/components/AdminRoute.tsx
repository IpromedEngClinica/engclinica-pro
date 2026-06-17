import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const AdminRoute = ({ children }: { children: JSX.Element }) => {
  const { loading, usuario, usuarioLoading } = useAuth();

  if (loading || usuarioLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-sm font-medium text-foreground">
          Validando permissões...
        </p>
      </div>
    );
  }

  if (usuario?.perfil !== "admin") {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default AdminRoute;
