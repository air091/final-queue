import { Navigate, Outlet } from "react-router-dom";

import LoadingState from "./LoadingState";
import { useAuth } from "../hooks/useAuth";

export default function ProtectedRoute() {
  const { user, isLoading } = useAuth();

  // Still checking auth
  if (isLoading) {
    return (
      <LoadingState
        variant="page"
        title="Checking your session"
        message="Confirming your login before opening the app..."
      />
    );
  }

  // Not logged in
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Logged in
  return <Outlet />;
}
