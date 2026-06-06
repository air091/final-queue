import { Outlet } from "react-router-dom";
import Sidebar from "../components/community_components/Sidebar";
import Header from "../components/Header";
import { useState } from "react";

export default function CommunityLayout() {
  const [openSidebar, setOpenSidebar] = useState<boolean>(true);
  return (
    <div className="w-full max-w-[1920px] h-screen mx-auto overflow-hidden flex flex-col">
      <Header setOpenSidebar={setOpenSidebar} />
      <main className="relative flex flex-1 overflow-hidden bg-gradient-to-br from-white via-orange-50 to-white">
        {openSidebar && (
          <Sidebar />
        )}
  
        <div
          className="flex-1 overflow-y-auto"
          onClick={(e) => {
            const target = e.target as HTMLElement;

            const isInteractive = target.closest(
              "button, a, input, textarea, select, svg, [role='button']"
            );

            if (!isInteractive) {
              setOpenSidebar(false);
            }
          }}
        >
          <Outlet />
        </div>
      </main>
    </div>
  );
}
