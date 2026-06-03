import { Link, Navigate } from "react-router-dom";
import { Plus, Search } from "lucide-react";

import LoadingState from "../../components/LoadingState";
import { useCommunities } from "../../contexts/CommunitiesContext";

export default function CommunityIndex() {
  const { communities, isLoading } = useCommunities();

  if (isLoading) {
    return (
      <LoadingState
        title="Loading communities"
        message="Finding the communities you belong to..."
      />
    );
  }

  const firstCommunity = communities[0];

  if (firstCommunity) {
    return <Navigate to={`/community/${firstCommunity.id}`} replace />;
  }

  return (
    <div className="flex min-h-[320px] w-full items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-3xl border border-dashed border-orange-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Plus size={24} />
        </div>
        <h2 className="mt-4 text-lg font-semibold text-text">
          No communities yet
        </h2>
        <p className="mt-2 text-sm text-stone-500">
          Create a community to start adding hosts and players.
        </p>
        <div className="mt-5 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            to="/community/create"
            className="inline-flex items-center gap-2 rounded-2xl bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-accent"
          >
            <Plus size={16} />
            Create community
          </Link>

          <Link
            to="/community/find"
            className="inline-flex items-center gap-2 rounded-2xl border border-orange-100 bg-white px-4 py-2 text-sm font-semibold text-stone-700 transition hover:bg-orange-50"
          >
            <Search size={16} />
            Find community
          </Link>
        </div>
      </div>
    </div>
  );
}
