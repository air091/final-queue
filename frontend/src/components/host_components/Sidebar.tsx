import { NavLink, useParams } from "react-router-dom";
import { FaArrowLeft } from "react-icons/fa6";
import { MdSpaceDashboard } from "react-icons/md";
import { HiUsers } from "react-icons/hi2";
import { GiMatchHead } from "react-icons/gi";
import { MdOutlinePayment } from "react-icons/md";
import ProfileBar from "../ProfileBar";

export default function Sidebar() {
  const { communityId, hostId } = useParams();
  return (
    <nav
      className="
      fixed bottom-0 left-0 right-0 z-50
      flex h-20 items-center justify-between
      border-t border-primary/10 bg-white px-2 shadow-lg

      md:sticky md:top-4 md:h-[calc(100vh-2rem)]
      md:w-[90px] md:flex-col md:rounded-3xl
      md:border md:p-3

      lg:w-[240px]
    "
    >
      {/* NAVIGATION */}
      <ul className="flex w-full md:grid md:gap-2">
        {/* BACK */}
        <li className="hidden md:block">
          <NavLink
            to={`/community/${communityId}`}
            className="
            mb-2 flex items-center gap-3
            rounded-2xl px-3 py-2
            text-sm font-medium text-text
            transition hover:bg-primary/5
          "
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-accent">
              <FaArrowLeft size={14} />
            </div>

            <span className="hidden lg:block">Back</span>
          </NavLink>
        </li>

        {[
          {
            path: `/community/${communityId}/hosts/${hostId}/dashboard`,
            label: "Dashboard",
            icon: <MdSpaceDashboard size={16} />,
          },
          {
            path: `/community/${communityId}/hosts/${hostId}/players`,
            label: "Players",
            icon: <HiUsers size={16} />,
          },
          {
            path: `/community/${communityId}/hosts/${hostId}/match`,
            label: "Match",
            icon: <GiMatchHead size={16} />,
          },
          {
            path: `/community/${communityId}/hosts/${hostId}/payments`,
            label: "Payments",
            icon: <MdOutlinePayment size={16} />,
          },
        ].map((item) => (
          <li key={item.label}>
            <NavLink
              to={item.path}
              className={({ isActive }) =>
                `
              flex items-center justify-center gap-3
              rounded-2xl px-3 py-2.5
              text-sm font-medium transition-all duration-200

              md:justify-start

              ${
                isActive
                  ? "bg-primary/10 text-accent"
                  : "text-text hover:bg-primary/5"
              }
            `
              }
            >
              {({ isActive }) => (
                <>
                  <div
                    className={`
                    flex h-9 w-9 items-center justify-center
                    rounded-xl transition
                    ${
                      isActive
                        ? "bg-primary text-white"
                        : "bg-primary/10 text-accent"
                    }
                  `}
                  >
                    {item.icon}
                  </div>

                  <span className="hidden lg:block">{item.label}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>

      {/* PROFILE */}
      <div className="hidden md:block md:w-full">
        <ProfileBar />
      </div>

      {/* MOBILE PROFILE */}
      <div className="md:hidden">
        <ProfileBar />
      </div>
    </nav>
  );
}
