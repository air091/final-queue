import { Outlet } from "react-router-dom";
import Sidebar from "../components/community/Sidebar";

export default function CommunityLayout() {
  return (
    <div className="w-full max-w-[1920px] border mx-auto my-0 flex gap-x-4">
      <Sidebar />
      <main>
        <Outlet />
      </main>
    </div>
  );
}
