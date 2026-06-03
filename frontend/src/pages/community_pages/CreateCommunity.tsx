import axios from "axios";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../lib/api";
import { useCommunities } from "../../contexts/CommunitiesContext";

type CommunityType = {
  communityName: string;
  description: string;
};

export default function CreateCommunity() {
  const { refetchCommunities } = useCommunities();
  const navigate = useNavigate();
  const [communityInfo, setCommunityInfo] = useState<CommunityType>({
    communityName: "",
    description: "",
  });
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createCommunity = async () => {
    setError(null);
    setIsCreating(true);

    try {
      const response = await api.post(
        "/api/community/create",
        {
          communityName: communityInfo.communityName,
          description: communityInfo.description,
        },
        { withCredentials: true },
      );

      await refetchCommunities();

      const createdId =
        response.data?.community?.id ?? response.data?.id ?? null;
      if (createdId) {
        navigate(`/community/${createdId}`);
        return;
      }

      setCommunityInfo({ communityName: "", description: "" });
    } catch (createError) {
      if (axios.isAxiosError(createError)) {
        setError(
          createError.response?.data?.message ??
            "Unable to create community. Please try again.",
        );
      } else {
        setError("Unable to create community. Please try again.");
      }
    } finally {
      setIsCreating(false);
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
    <div className="flex min-h-[calc(100vh-5rem)] items-center justify-center px-4 py-10">
      <div className="w-full max-w-xl rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
        {/* Header */}
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-500">
            Community
          </p>
          <h1 className="mt-3 text-3xl font-bold text-text">Create a community</h1>
          <p className="mt-3 text-sm text-stone-500">
            Build your badminton community and add hosts, players, and admins.
          </p>
        </div>

        {error ? (
          <div className="mb-5 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

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
              className="w-full rounded-2xl border border-orange-100 bg-white px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
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
              className="w-full resize-none rounded-2xl border border-orange-100 bg-white px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={
              isCreating || communityInfo.communityName.trim() === ""
            }
            className={`w-full rounded-2xl px-5 py-3 text-sm font-semibold text-white transition ${
              isCreating || communityInfo.communityName.trim() === ""
                ? "cursor-not-allowed bg-stone-300"
                : "bg-primary hover:bg-accent"
            }`}
          >
            {isCreating ? "Creating community..." : "Create community"}
          </button>
        </form>
      </div>
    </div>
  );
}
