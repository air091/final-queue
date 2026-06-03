import axios from "axios";
import { Link } from "react-router-dom";
import { Search } from "lucide-react";
import { useEffect, useState } from "react";
import LoadingState from "../../components/LoadingState";
import { api } from "../../lib/api";

type CommunityType = {
  id: string;
  profileUrl: string;
  communityName: string;
  description: string;
  master: {
    username: string;
  };
};

export default function FindCommunity() {
  const [communities, setCommunities] = useState<CommunityType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadCommunities = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await api.get("/api/community/all");
        setCommunities(response.data.communities ?? []);
      } catch (loadError) {
        if (axios.isAxiosError(loadError)) {
          setError(
            loadError.response?.data?.message ??
              "Unable to load communities. Please try again.",
          );
        } else {
          setError("Unable to load communities. Please try again.");
        }
      } finally {
        setIsLoading(false);
      }
    };

    void loadCommunities();
  }, []);

  if (isLoading) {
    return (
      <LoadingState
        title="Finding communities"
        message="Loading communities you can join..."
      />
    );
  }

  return (
    <div className="p-4">
      <div className="mb-6 rounded-3xl border border-orange-100 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Search size={24} />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-500">
              Community
            </p>
            <h1 className="mt-2 text-2xl font-bold text-text">Find Community</h1>
          </div>
        </div>
      </div>

      {communities.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-orange-200 bg-white p-8 text-center shadow-sm">
          <p className="text-sm font-medium text-stone-700">
            No communities are available right now.
          </p>
          <p className="mt-2 text-sm text-stone-500">
            Check back later or create your own community.
          </p>
          <Link
            to="/community/create"
            className="mt-6 inline-flex items-center justify-center rounded-2xl bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-accent"
          >
            Create community
          </Link>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
  {communities.map((community) => (
    <Link
      key={community.id}
      to={`/community/${community.id}`}
      className="
        w-full
        md:w-[calc(50%-0.25rem)]
        lg:w-fit
        overflow-hidden rounded-3xl border border-orange-100
        bg-white p-5 text-left transition hover:shadow-lg
      "
    >
      <div className="flex items-center gap-3">
        <div className="relative h-14 w-14 overflow-hidden rounded-2xl bg-orange-50 shrink-0">
          {community.profileUrl ? (
            <img
              src={community.profileUrl}
              alt={community.communityName}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs font-semibold uppercase text-orange-500">
              No image
            </div>
          )}
        </div>

        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-text">
            {community.communityName}
          </h2>

          <p className="text-xs text-stone-500">
            Owner:{" "}
            <span className="font-bold">
              {community.master.username}
            </span>
          </p>

          <p className="mt-1 text-sm text-stone-500">
            {community.description}
          </p>
        </div>
      </div>
    </Link>
  ))}
</div>
      )}
    </div>
  );
}
