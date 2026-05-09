import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { RouterProvider } from "react-router-dom";
import router from "./router";
import { AuthProvider } from "./contexts/AuthContext";
import { CommunitiesProvider } from "./contexts/CommunitiesContext";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AuthProvider>
      <CommunitiesProvider>
        <RouterProvider router={router} />
      </CommunitiesProvider>
    </AuthProvider>
  </StrictMode>,
);
