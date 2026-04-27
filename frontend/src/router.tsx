import { createBrowserRouter } from "react-router-dom";
import NotFound from "./pages/NotFound";
import Login from "./pages/auth/Login";
import Home from "./pages/Home";
import HomeLayout from "./layouts/HomeLayout";
import Community from "./pages/community_pages/Community";
import CommunityLayout from "./layouts/CommunityLayout";
import CreateCommunity from "./pages/community_pages/CreateCommunity";

const router = createBrowserRouter([
  {
    path: "/login",
    element: <Login />,
  },
  {
    path: "/",
    element: <HomeLayout />,
    children: [
      {
        path: "/",
        element: <Home />,
      },
    ],
  },
  {
    path: "/community",
    element: <CommunityLayout />,
    children: [
      {
        path: "community",
        element: <Community />,
      },
      {
        path: "/community/create",
        element: <CreateCommunity />,
      },
    ],
  },
  {
    path: "*",
    element: <NotFound />,
  },
]);

export default router;
