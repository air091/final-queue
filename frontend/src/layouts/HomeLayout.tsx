import { Outlet } from "react-router-dom";
import Sidebar from "../components/home_components/Sidebar";
import Header from "../components/Header";
import { useState } from "react";

export default function HomeLayout() {
  const [openSidebar, setOpenSidebar] = useState<boolean>(true);

  return (
    <div className="w-full max-w-[1920px] h-screen bg-background mx-auto overflow-hidden flex flex-col ">
      <Header setOpenSidebar={setOpenSidebar} />
      <main className="flex flex-1 overflow-hidden">
        {openSidebar && <Sidebar />}

        <div className="flex-1 overflow-y-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
