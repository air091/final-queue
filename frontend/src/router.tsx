import { createBrowserRouter, Navigate } from "react-router-dom";
import NotFound from "./pages/NotFound";
import Login from "./pages/auth/Login";
import Home from "./pages/Home";
import HomeLayout from "./layouts/HomeLayout";
import Community from "./pages/community_pages/Community";
import CommunityLayout from "./layouts/CommunityLayout";
import CreateCommunity from "./pages/community_pages/CreateCommunity";
import HostLayout from "./layouts/HostLayout";
import Dashboard from "./pages/host_pages/Dashboard";
import Match from "./pages/host_pages/Match";
import Payments from "./pages/host_pages/Payments";
import Players from "./pages/host_pages/Players";
import Register from "./pages/auth/Register";

const router = createBrowserRouter([
  {
    path: "/login",
    element: <Login />,
  },
  {
    path: "/register",
    element: <Register />,
  },
  {
    path: "/",
    element: <HomeLayout />,
    children: [
      {
        index: true,
        element: <Home />,
      },
    ],
  },
  {
    path: "/community",
    element: <CommunityLayout />,
    children: [
      {
        path: ":id",
        element: <Community />,
      },
      {
        path: "create",
        element: <CreateCommunity />,
      },
    ],
  },
  {
    path: "/community/:communityId/hosts/:hostId",
    element: <HostLayout />,
    children: [
      {
        index: true,
        element: <Navigate to="dashboard" replace />,
      },
      {
        path: "dashboard",
        element: <Dashboard />,
      },
      {
        path: "players",
        element: <Players />,
      },
      {
        path: "match",
        element: <Match />,
      },
      {
        path: "payments",
        element: <Payments />,
      },
    ],
  },
  {
    path: "*",
    element: <NotFound />,
  },
]);

export default router;
