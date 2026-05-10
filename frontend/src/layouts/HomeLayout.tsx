import { Outlet } from "react-router-dom";
import Sidebar from "../components/home_components/Sidebar";
import Header from "../components/Header";

export default function HomeLayout() {
  return (
    <div className="w-full max-w-[1920px] min-h-screen bg-background mx-auto">
      <Header />
      <div className="mx-auto flex max-w-[1440px] gap-4 px-4 py-4">
        {/* Sidebar */}
        {/* <Sidebar /> */}
        {/* Main Content */}
        <main className="flex-1 pb-24 md:pb-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
