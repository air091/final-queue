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
    <div className="flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-xl rounded-3xl border border-gray-200 bg-white p-6 sm:p-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-text">Create Community</h1>

          <p className="mt-2 text-sm text-gray-500">
            Build your badminton community.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Name */}
          <div>
            <label
              htmlFor="communityName"
              className="mb-2 block text-sm font-medium text-text"
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
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
            />
          </div>

          {/* Description */}
          <div>
            <label
              htmlFor="description"
              className="mb-2 block text-sm font-medium text-text"
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
              className="w-full resize-none rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            className="w-full rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-accent"
          >
            Create Community
          </button>
        </form>
      </div>
    </div>
  );
}
