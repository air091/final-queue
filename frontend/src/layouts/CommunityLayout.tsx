import { Outlet } from "react-router-dom";
import Sidebar from "../components/community_components/Sidebar";

export default function CommunityLayout() {
  return (
    <div className="w-full max-w-480 border mx-auto my-0 flex gap-x-4">
      <Sidebar />
      <main className="w-full">
        <Outlet />
      </main>
    </div>
  );
}
