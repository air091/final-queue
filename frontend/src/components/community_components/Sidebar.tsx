import { NavLink } from "react-router-dom";
import { FaArrowLeft } from "react-icons/fa6";
import ProfileBar from "../ProfileBar";
import { useCommunities } from "../../contexts/CommunitiesContext";

export default function Sidebar() {
  const { communities } = useCommunities();

  return (
    <nav
      className="
      fixed bottom-0 left-0 right-0 z-50
      flex h-20 items-center justify-between gap-2
      border-t border-gray-200 bg-white px-2

      md:sticky md:top-4 md:h-[calc(100vh-2rem)]
      md:w-[90px] md:flex-col md:justify-between
      md:rounded-3xl md:border md:px-2 md:py-4

      lg:w-[240px]
    "
    >
      {/* Navigation */}
      <ul className="flex w-full md:grid md:gap-2">
        {/* Desktop Logo */}
        <div className="mb-4 hidden px-3 lg:block">
          <h2 className="text-lg font-bold text-text">SportQueue</h2>

          <p className="text-xs text-gray-500">Communities</p>
        </div>

        {/* Back */}
        <li>
          <NavLink
            to="/home"
            className={({ isActive }) =>
              `
            flex items-center justify-center gap-3
            rounded-2xl px-3 py-3
            text-sm font-medium transition

            md:justify-start

            ${
              isActive
                ? "bg-primary/10 text-primary"
                : "text-text hover:bg-gray-100"
            }
          `
            }
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-100 text-primary">
              <FaArrowLeft size={14} />
            </div>

            <span className="hidden lg:block">Home</span>
          </NavLink>
        </li>

        {/* Create Community */}
        <li>
          <NavLink
            to="/community/create"
            className={({ isActive }) =>
              `
            flex items-center justify-center gap-3
            rounded-2xl px-3 py-3
            text-sm font-medium transition

            md:justify-start

            ${
              isActive
                ? "bg-primary/10 text-primary"
                : "text-text hover:bg-gray-100"
            }
          `
            }
          >
            {({ isActive }) => (
              <>
                <div
                  className={`
                  flex h-9 w-9 items-center justify-center rounded-xl
                  ${
                    isActive
                      ? "bg-primary text-white"
                      : "bg-gray-100 text-primary"
                  }
                `}
                >
                  🏸
                </div>

                <span className="hidden lg:block">Create</span>
              </>
            )}
          </NavLink>
        </li>

        {/* Communities */}
        {communities.map((community) => (
          <li key={community.id}>
            <NavLink
              to={`/community/${community.id}`}
              className={({ isActive }) =>
                `
              flex items-center justify-center gap-3
              rounded-2xl px-3 py-3 transition

              md:justify-start

              ${
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-text hover:bg-gray-100"
              }
            `
              }
            >
              {({ isActive }) => (
                <>
                  <div
                    className={`
                    h-9 w-9 overflow-hidden rounded-xl border
                    ${isActive ? "border-primary" : "border-gray-200"}
                  `}
                  >
                    <img
                      src={community.profileUrl}
                      alt={community.communityName}
                      className="h-full w-full object-cover"
                    />
                  </div>

                  <span className="hidden truncate lg:block">
                    {community.communityName}
                  </span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>

      {/* Profile */}
      <div className="flex items-center justify-center md:w-full">
        <ProfileBar />
      </div>
    </nav>
  );
}
