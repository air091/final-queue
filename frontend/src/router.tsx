import { lazy, Suspense, type ReactNode } from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import RouteErrorBoundary from "./components/RouteErrorBoundary";

const NotFound = lazy(() => import("./pages/NotFound"));
const Login = lazy(() => import("./pages/auth/Login"));
const Register = lazy(() => import("./pages/auth/Register"));
const Home = lazy(() => import("./pages/Home"));
const HomeLayout = lazy(() => import("./layouts/HomeLayout"));
const Community = lazy(() => import("./pages/community_pages/Community"));
const CommunityLayout = lazy(() => import("./layouts/CommunityLayout"));
const CreateCommunity = lazy(
  () => import("./pages/community_pages/CreateCommunity")
);
const HostLayout = lazy(() => import("./layouts/HostLayout"));
const Dashboard = lazy(() => import("./pages/host_pages/Dashboard"));
const Match = lazy(() => import("./pages/host_pages/Match"));
const Payments = lazy(() => import("./pages/host_pages/Payments"));
const Players = lazy(() => import("./pages/host_pages/Players"));
const Profile = lazy(() => import("./pages/Profile"));
const ProfileLayout = lazy(() => import("./layouts/ProfileLayout"));
const Landing = lazy(() => import("./pages/Landing"));

const withSuspense = (children: ReactNode) => (
  <Suspense fallback={null}>{children}</Suspense>
);

const router = createBrowserRouter([
  // =========================
  // PUBLIC ROUTES
  // =========================
  {
    path: "/",
    element: withSuspense(<Landing />),
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: "/login",
    element: withSuspense(<Login />),
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: "/register",
    element: withSuspense(<Register />),
    errorElement: <RouteErrorBoundary />,
  },

  // =========================
  // PROTECTED ROUTES
  // =========================

  {
    element: <ProtectedRoute />,
    errorElement: <RouteErrorBoundary />,
    children: [
      {
        path: "/home",
        element: withSuspense(<HomeLayout />),
        children: [
          {
            index: true,
            element: withSuspense(<Home />),
          },
        ],
      },
      {
        path: "/profile",
        element: withSuspense(<ProfileLayout />),
        children: [
          {
            index: true,
            element: withSuspense(<Profile />),
          },
        ],
      },
      {
        path: "/community",
        element: withSuspense(<CommunityLayout />),
        children: [
          {
            path: "create",
            element: withSuspense(<CreateCommunity />),
          },
          {
            path: ":id",
            element: withSuspense(<Community />),
          },
        ],
      },
      {
        path: "/community/:communityId/hosts/:hostId",
        element: withSuspense(<HostLayout />),
        children: [
          {
            index: true,

            element: <Navigate to="dashboard" replace />,
          },
          {
            path: "dashboard",
            element: withSuspense(<Dashboard />),
          },
          {
            path: "players",
            element: withSuspense(<Players />),
          },
          {
            path: "match",
            element: withSuspense(<Match />),
          },
          {
            path: "payments",
            element: withSuspense(<Payments />),
          },
        ],
      },
    ],
  },

  // =========================
  // NOT FOUND
  // =========================

  {
    path: "*",
    element: withSuspense(<NotFound />),
    errorElement: <RouteErrorBoundary />,
  },
]);

export default router;
