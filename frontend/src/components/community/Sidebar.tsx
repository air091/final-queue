import axios from "axios";
import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";

type CommunitiesType = {
  id: string;
  profileUrl: string;
  communityName: string;
  description: string;
};

export default function Sidebar() {
  const [communities, setCommunities] = useState<CommunitiesType[]>([]);

  const getCommunities = async () => {
    try {
      const response = await axios.get("http://localhost:4000/api/community", {
        withCredentials: true,
      });
      console.log(response);
      setCommunities(response.data.communities);
    } catch (error) {
      if (axios.isAxiosError(error))
        console.error(error.response?.data?.message);
      else console.error("Login api failed:", error);
    }
  };

  useEffect(() => {
    getCommunities();
  }, []);

  return (
    <nav className="w-[200px]">
      <ul>
        <li>
          <NavLink
            to="/community/create"
            className="block hover:bg-amber-200 px-4 py-1 text-center rounded-md"
          >
            Create community
          </NavLink>
        </li>
        <hr className="my-2" />
        {communities.length > 0 ? (
          communities.map((community) => (
            <li key={community.id}>
              <NavLink
                to={`/community/${community.id}`}
                className={({ isActive }) =>
                  `flex items-center border gap-x-3 py-1 px-3 rounded-md
                    ${isActive ? "bg-amber-300" : "hover:bg-amber-200"}`
                }
              >
                <div className="border w-[32px] h-[32px] rounded-full">
                  <img
                    src={community.profileUrl}
                    alt={community.communityName}
                    className="block w-full h-full object-contain -z-10 rounded-full"
                  />
                </div>
                <span>{community.communityName}</span>
              </NavLink>
            </li>
          ))
        ) : (
          <p>No communities</p>
        )}
      </ul>
    </nav>
  );
}
