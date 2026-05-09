import { Outlet } from "react-router-dom";
import Sidebar from "../components/home_components/Sidebar";

export default function HomeLayout() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex max-w-[1440px] gap-4 px-4 py-4">
        {/* Sidebar */}
        <Sidebar />

        {/* Main Content */}
        <main className="flex-1 pb-24 md:pb-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
