import axios from "axios";
import { useState } from "react";
import { api } from "../../lib/api";
import { useCommunities } from "../../contexts/CommunitiesContext";

type CommunityType = {
  communityName: string;
  description: string;
};

export default function CreateCommunity() {
  const { refetchCommunities } = useCommunities();
  const [communityInfo, setCommunityInfo] = useState<CommunityType>({
    communityName: "",
    description: "",
  });

  const createCommunity = async () => {
    try {
      const response = await api.post(
        "/api/community/create",
        {
          communityName: communityInfo.communityName,
          description: communityInfo.description,
        },
        { withCredentials: true },
      );
      console.log(response);

      setCommunityInfo({ communityName: "", description: "" });
      await refetchCommunities();
    } catch (error) {
      if (axios.isAxiosError(error)) console.error(error);
      else console.error(error);
    }
  };

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = event.target;
    setCommunityInfo((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event: React.SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    await createCommunity();
  };

  return (
    <div className="flex items-center justify-center px-6 py-10">
      <div className="w-full max-w-xl rounded-3xl border border-orange-100 bg-white p-8 shadow-sm">
        {/* HEADER */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[#0c090c]">
            Create Community
          </h1>
        </div>

        {/* FORM */}
        <form onSubmit={handleSubmit} className="grid gap-5">
          {/* COMMUNITY NAME */}
          <div>
            <label
              htmlFor="communityName"
              className="mb-2 block text-sm font-medium text-[#0c090c]"
            >
              Community Name
            </label>

            <input
              type="text"
              id="communityName"
              name="communityName"
              autoComplete="off"
              value={communityInfo.communityName}
              onChange={handleChange}
              placeholder="Enter community name"
              className="block w-full rounded-2xl border border-orange-100 bg-[#fffdf9] px-4 py-3 text-sm text-[#0c090c] outline-none transition-all duration-200 placeholder:text-stone-400 focus:border-[#ff6900] focus:ring-4 focus:ring-orange-100"
            />
          </div>

          {/* DESCRIPTION */}
          <div>
            <label
              htmlFor="description"
              className="mb-2 block text-sm font-medium text-[#0c090c]"
            >
              Description
            </label>

            <textarea
              id="description"
              name="description"
              autoComplete="off"
              value={communityInfo.description}
              onChange={handleChange}
              placeholder="Describe your community"
              rows={5}
              className="block w-full resize-none rounded-2xl border border-orange-100 bg-[#fffdf9] px-4 py-3 text-sm text-[#0c090c] outline-none transition-all duration-200 placeholder:text-stone-400 focus:border-[#ff6900] focus:ring-4 focus:ring-orange-100"
            />
          </div>

          {/* SUBMIT */}
          <button
            type="submit"
            className="mt-2 cursor-pointer rounded-2xl bg-[#ff6900] px-5 py-3 text-sm font-semibold text-white transition-all duration-200 hover:bg-[#e55d00]"
          >
            Create Community
          </button>
        </form>
      </div>
    </div>
  );
}
