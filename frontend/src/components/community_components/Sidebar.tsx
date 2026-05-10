import { NavLink } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Plus } from "lucide-react";
import { useCommunities } from "../../contexts/CommunitiesContext";

export default function Sidebar() {
  const { communities } = useCommunities();

  return (
    <nav
      className="
    h-full w-[274px] bg-white py-2

    xl:relative
    max-xl:absolute
    max-xl:left-0
    max-xl:top-0
    max-xl:z-50
  "
    >
      {/* Navigation */}
      <ul className="flex flex-col w-full gap-2">
        {/* Back */}
        <li>
          <NavLink
            to="/home"
            className="
              w-full
              flex items-center
              rounded-r-lg px-6 py-1 gap-x-2
              text-sm font-medium transition hover:bg-gray-100
              "
          >
            <div className="flex p-1 items-center rounded-xl transition">
              <ArrowLeft size={24} />
            </div>

            <span className="block">Home</span>
          </NavLink>
        </li>

        {/* Create Community */}
        <li>
          <NavLink
            to="/community/create"
            className={({ isActive }) =>
              `
             w-full
              flex items-center
              rounded-r-lg px-6 py-1 gap-x-2
              text-sm font-medium transition

            ${
              isActive
                ? "bg-primary/10 text-primary"
                : "text-text hover:bg-gray-100"
            }
          `
            }
          >
            <div className="flex p-1 items-center rounded-xl transition  text-primary">
              <Plus size={24} />
            </div>
            <span className="block">Create Community</span>
          </NavLink>
        </li>

        {/* Communities */}
        {communities.map((community) => (
          <li key={community.id}>
            <NavLink
              to={`/community/${community.id}`}
              className={({ isActive }) =>
                `
               w-full
              flex items-center
              rounded-r-lg px-6 py-1 gap-x-2
              text-sm font-medium transition

              ${
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-text hover:bg-gray-100"
              }
            `
              }
            >
              <div className="flex p-1 items-center rounded-xl transition">
                <div className="h-[24px] w-[24px] overflow-hidden rounded-xl border">
                  <img
                    src={community.profileUrl}
                    alt={community.communityName}
                    className="h-full w-full object-cover"
                  />
                </div>
              </div>

              <span className="block">{community.communityName}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
