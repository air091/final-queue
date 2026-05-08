import { Outlet } from "react-router-dom";
import Sidebar from "../components/community_components/Sidebar";

export default function CommunityLayout() {
  return (
    <div className="w-full h-screen p-2 max-w-480 bg-[var(--color-background)] mx-auto flex gap-x-4 overflow-auto">
      <Sidebar />
      <main className="w-full">
        <Outlet />
      </main>
    </div>
  );
}
