import { Navigate, Outlet } from "react-router-dom";

import { useAuth } from "../hooks/useAuth";

export default function ProtectedRoute() {
  const { user, isLoading } = useAuth();

  // Still checking auth
  if (isLoading) {
    return <div>Loading...</div>;
  }

  // Not logged in
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Logged in
  return <Outlet />;
}
