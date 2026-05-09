import { Outlet } from "react-router-dom";
import Sidebar from "../components/home_components/Sidebar";

export default function HomeLayout() {
  return (
    <div className="min-h-screen w-full bg-[var(--color-background)]">
      <div className="mx-auto flex min-h-screen w-full max-w-[1440px] gap-4 p-2 md:p-4">
        {/* SIDEBAR */}
        <Sidebar />

        {/* MAIN CONTENT */}
        <main className="flex-1 overflow-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
