import { Outlet } from "react-router-dom";
import Sidebar from "../components/home_components/Sidebar";
import Header from "../components/Header";
import { useState } from "react";

export default function ProfileLayout() {
  const [openSidebar, setOpenSidebar] = useState<boolean>(true);

  return (
    <div className="w-full max-w-[1920px] h-screen bg-background mx-auto overflow-hidden flex flex-col">
      <Header setOpenSidebar={setOpenSidebar} />
      <main className="relative flex flex-1 overflow-hidden">
        {openSidebar && <Sidebar />}

        <div className="flex-1 overflow-y-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
