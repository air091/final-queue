import { NavLink } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Plus } from "lucide-react";
import { useCommunities } from "../../contexts/CommunitiesContext";

export default function Sidebar() {
  const { communities } = useCommunities();

  return (
    <nav className="w-[274px] h-full py-2">
      {/* Navigation */}
      <ul className="flex w-full md:grid md:gap-2">
        {/* Back */}
        <li>
          <NavLink
            to="/home"
            className={({ isActive }) =>
              `
            w-full
              flex items-center justify-center
              rounded-r-lg px-6 py-1 gap-x-2
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
            <div className="flex p-1 items-center justify-center rounded-xl transition">
              <ArrowLeft size={24} />
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
             w-full
              flex items-center justify-center
              rounded-r-lg px-6 py-1 gap-x-2
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
            <div className="flex p-1 items-center justify-center rounded-xl transition  text-primary">
              <Plus size={24} />
            </div>
            <span className="hidden lg:block">Create Community</span>
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
              flex items-center justify-center
              rounded-r-lg px-6 py-1 gap-x-2
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
              <div className="flex p-1 items-center justify-center rounded-xl transition">
                <div className="h-[24px] w-[24px] overflow-hidden rounded-xl border">
                  <img
                    src={community.profileUrl}
                    alt={community.communityName}
                    className="h-full w-full object-cover"
                  />
                </div>
              </div>

              <span className="hidden truncate lg:block">
                {community.communityName}
              </span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
