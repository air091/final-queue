import axios from "axios";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { api } from "../lib/api";

type CommunitiesType = {
  id: string;
  profileUrl: string;
  communityName: string;
  description: string;
};

type CommunitiesContextType = {
  communities: CommunitiesType[];
  refetchCommunities: () => Promise<void>;
  isLoading: boolean;
};

const CommunitiesContext = createContext<CommunitiesContextType | undefined>(
  undefined,
);

type CommunitiesProviderProps = {
  children: ReactNode;
};

export function CommunitiesProvider({ children }: CommunitiesProviderProps) {
  const [communities, setCommunities] = useState<CommunitiesType[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const getCommunities = useCallback(async () => {
    try {
      const response = await api.get("/api/community");
      setCommunities(response.data.communities);
    } catch (error) {
      if (axios.isAxiosError(error)) console.error(error);
      else console.error(error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refetchCommunities = useCallback(async () => {
    await getCommunities();
  }, [getCommunities]);

  useEffect(() => {
    getCommunities();
  }, [getCommunities]);

  const value = {
    communities,
    refetchCommunities,
    isLoading,
  };

  return (
    <CommunitiesContext.Provider value={value}>
      {children}
    </CommunitiesContext.Provider>
  );
}

export function useCommunities() {
  const context = useContext(CommunitiesContext);
  if (!context) {
    throw new Error("useCommunities must be used within CommunitiesProvider");
  }
  return context;
}
