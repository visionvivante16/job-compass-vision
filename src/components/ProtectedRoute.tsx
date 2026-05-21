import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useUserRole } from "@/hooks/usePermissions";
import { FullPageLoader } from "@/components/FullPageLoader";

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles: ("founder" | "employer" | "user")[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const location = useLocation();
  const { user, isLoading: authLoading } = useAuth();
  const { data: userRole, isLoading: roleLoading } = useUserRole();

  // Show loading while auth or role is being determined
  if (authLoading || roleLoading) {
    return <FullPageLoader message="Checking access..." />;
  }

  // Not logged in - redirect to auth
  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // Role is still undefined after loading - treat as "user"
  const currentRole = userRole || "user";

  // Check if user's role is in allowed roles
  if (!allowedRoles.includes(currentRole as "founder" | "employer" | "user")) {
    // Redirect based on their actual role - but prevent loops by checking current path
    const targetPath = getRedirectPath(currentRole);
    
    // Prevent redirect loop - if already at target, just show forbidden
    if (location.pathname === targetPath) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="text-center space-y-4">
            <h1 className="text-2xl font-bold text-foreground">Access Denied</h1>
            <p className="text-muted-foreground">You don't have permission to view this page.</p>
          </div>
        </div>
      );
    }
    
    return <Navigate to={targetPath} replace />;
  }

  return <>{children}</>;
}

function getRedirectPath(role: string): string {
  switch (role) {
    case "founder":
      return "/founder/employers";
    case "employer":
      return "/employer";
    default:
      return "/dashboard";
  }
}
