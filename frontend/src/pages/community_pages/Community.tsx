import axios from "axios";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../../lib/api";
import {
  EllipsisVertical,
  Plus,
  SquarePen,
  Trophy,
  Trash,
  UserPlus,
  UsersRound,
  X,
} from "lucide-react";
import { useCommunities } from "../../contexts/CommunitiesContext";
import EditCommunityModal from "../../components/community_components/EditCommunityModal";
import type {
  CommunityPlayerRecord,
  HostPlayerStatus,
  SkillLevelType,
} from "../../lib/host";

type MasterType = {
  id: string;
  profileUrl: string;
  username: string;
};

type CommunityType = {
  id: string;
  profileUrl: string;
  communityName: string;
  description: string;
  master: MasterType;
};

type HostsType = {
  id: string;
  hostName: string;
  sport: string;
  location: string | null;
  startTime: string | null;
  endTime: string | null;
  maxPlayers: number;
  status: string;
  _count: {
    players: number;
  };
};

type HostFormState = {
  hostName: string;
  sportName: string;
  location: string;
  startTime: string;
  endTime: string;
  maxPlayers: string;
};

type PlayerFormState = {
  names: string;
  skillLevel: SkillLevelType;
};

type PointsFilterMode = "all" | "month" | "day";

type CommunityPlayerPointHistoryItem = {
  id: string;
  points: number;
  reason: "win" | "payment" | string;
  team: string | null;
  joinedAt: string;
  match: {
    id: string;
    startedAt: string | null;
    endedAt: string | null;
    teamWinner: string;
    court: {
      id: string;
      name: string;
    } | null;
    host: {
      id: string;
      hostName: string;
      startTime: string | null;
    };
  };
};

type CommunityPlayerWinPointsRecord = {
  communityPlayerId: string;
  accountId: string;
  winCount: number;
  points: number;
  pointsHistory: CommunityPlayerPointHistoryItem[];
};

type CommunityPanel = "host" | "players" | null;
type CommunityPlayerEditForm = {
  username: string;
  skillLevel: SkillLevelType;
  imageFile: File | null;
  imagePreview: string | null;
};

const DEFAULT_SPORT_OPTIONS = ["badminton"];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

const INITIAL_HOST_FORM: HostFormState = {
  hostName: "",
  sportName: DEFAULT_SPORT_OPTIONS[0],
  location: "",
  startTime: "",
  endTime: "",
  maxPlayers: "",
};

const INITIAL_PLAYER_FORM: PlayerFormState = {
  names: "",
  skillLevel: "beginner",
};

const getLocalDateInputValue = (date = new Date()) => {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 10);
};

const getLocalMonthInputValue = (date = new Date()) =>
  getLocalDateInputValue(date).slice(0, 7);

const getDatePartsFromInput = (value: string) => {
  const parts = value.split("-").map(Number);
  if (parts.some((part) => !Number.isInteger(part))) return null;

  return parts;
};

const getPointFilterDateRangeParams = (
  mode: PointsFilterMode,
  month: string,
  day: string,
) => {
  if (mode === "day") {
    const parts = getDatePartsFromInput(day);
    if (!parts || parts.length !== 3) return {};

    const [year, monthNumber, dayNumber] = parts;
    const startDate = new Date(year, monthNumber - 1, dayNumber);
    const endDate = new Date(year, monthNumber - 1, dayNumber + 1);

    return {
      day,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    };
  }

  if (mode === "month") {
    const parts = getDatePartsFromInput(month);
    if (!parts || parts.length !== 2) return {};

    const [year, monthNumber] = parts;
    const startDate = new Date(year, monthNumber - 1, 1);
    const endDate = new Date(year, monthNumber, 1);

    return {
      month,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    };
  }

  return {};
};

const readFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }

      reject(new Error("Failed to read image file."));
    };

    reader.onerror = () => {
      reject(new Error("Failed to read image file."));
    };

    reader.readAsDataURL(file);
  });

const formatHostDateTime = (value: string | null) => {
  if (!value) return "Any time";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Any time";

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

export default function Community() {
  const { id } = useParams();
  const { refetchCommunities } = useCommunities();
  const [community, setCommunity] = useState<CommunityType | null>(null);
  const [communityHosts, setCommunityHosts] = useState<HostsType[]>([]);
  const [communityPlayers, setCommunityPlayers] = useState<
    CommunityPlayerRecord[]
  >([]);
  const [communityPlayerWinPoints, setCommunityPlayerWinPoints] = useState<
    CommunityPlayerWinPointsRecord[]
  >([]);
  const [hostForm, setHostForm] = useState<HostFormState>(INITIAL_HOST_FORM);
  const [playerForm, setPlayerForm] =
    useState<PlayerFormState>(INITIAL_PLAYER_FORM);
  const [pointsFilterMode, setPointsFilterMode] =
    useState<PointsFilterMode>("all");
  const [pointsFilterMonth, setPointsFilterMonth] = useState(
    getLocalMonthInputValue(),
  );
  const [pointsFilterDay, setPointsFilterDay] = useState(
    getLocalDateInputValue(),
  );
  const [activePanel, setActivePanel] = useState<CommunityPanel>(null);
  const [isCreatingHost, setIsCreatingHost] = useState(false);
  const [isCreatingPlayers, setIsCreatingPlayers] = useState(false);
  const [isTogglingAdminAsPlayer, setIsTogglingAdminAsPlayer] =
    useState(false);
  const [isLoadingWinPoints, setIsLoadingWinPoints] = useState(false);
  const [savingCommunityPlayerId, setSavingCommunityPlayerId] = useState<
    string | null
  >(null);
  const [isDeletingCommunity, setIsDeletingCommunity] = useState(false);
  const [isAddPlayerModalOpen, setIsAddPlayerModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isUpdatingCommunity, setIsUpdatingCommunity] = useState(false);
  const [deletingHostId, setDeletingHostId] = useState<string | null>(null);
  const [communityError, setCommunityError] = useState<string | null>(null);
  const [editCommunityError, setEditCommunityError] = useState<string | null>(
    null,
  );
  const [hostError, setHostError] = useState<string | null>(null);
  const [playerError, setPlayerError] = useState<string | null>(null);
  const [editingCommunityPlayer, setEditingCommunityPlayer] =
    useState<CommunityPlayerRecord | null>(null);
  const [selectedPointsHistoryPlayer, setSelectedPointsHistoryPlayer] =
    useState<CommunityPlayerRecord | null>(null);
  const [communityPlayerEditForm, setCommunityPlayerEditForm] =
    useState<CommunityPlayerEditForm>({
      username: "",
      skillLevel: "beginner",
      imageFile: null,
      imagePreview: null,
    });
  const [communityPlayerEditError, setCommunityPlayerEditError] = useState<
    string | null
  >(null);
  const navigate = useNavigate();

  const winPointsByCommunityPlayerId = useMemo(
    () =>
      new Map(
        communityPlayerWinPoints.map((playerPoints) => [
          playerPoints.communityPlayerId,
          playerPoints,
        ]),
      ),
    [communityPlayerWinPoints],
  );

  const rankedCommunityPlayers = useMemo(
    () =>
      [...communityPlayers].sort((firstPlayer, secondPlayer) => {
        const firstPoints =
          winPointsByCommunityPlayerId.get(firstPlayer.id)?.points ?? 0;
        const secondPoints =
          winPointsByCommunityPlayerId.get(secondPlayer.id)?.points ?? 0;

        if (secondPoints !== firstPoints) return secondPoints - firstPoints;

        return firstPlayer.player.username.localeCompare(
          secondPlayer.player.username,
        );
      }),
    [communityPlayers, winPointsByCommunityPlayerId],
  );

  const highestCommunityPlayerPoints = useMemo(
    () =>
      communityPlayers.reduce((highestPoints, communityPlayer) => {
        const playerPoints =
          winPointsByCommunityPlayerId.get(communityPlayer.id)?.points ?? 0;

        return Math.max(highestPoints, playerPoints);
      }, 0),
    [communityPlayers, winPointsByCommunityPlayerId],
  );

  const isAdminIncludedAsCommunityPlayer = communityPlayers.some(
    (communityPlayer) => communityPlayer.player.id === community?.master.id,
  );
  const selectedPointsRecord = selectedPointsHistoryPlayer
    ? winPointsByCommunityPlayerId.get(selectedPointsHistoryPlayer.id)
    : null;
  const pointsFilterLabel = useMemo(() => {
    if (pointsFilterMode === "all") return "All time";

    const filterDate = new Date(
      pointsFilterMode === "month"
        ? `${pointsFilterMonth}-01T00:00:00`
        : `${pointsFilterDay}T00:00:00`,
    );

    if (Number.isNaN(filterDate.getTime())) return "Selected period";

    return new Intl.DateTimeFormat(undefined, {
      ...(pointsFilterMode === "month"
        ? ({ month: "long", year: "numeric" } as const)
        : ({ dateStyle: "medium" } as const)),
    }).format(filterDate);
  }, [pointsFilterDay, pointsFilterMode, pointsFilterMonth]);

  const getCommunityAPI = async () => {
    try {
      const response = await api.get(`/api/community/${id}`);
      setCommunity(response.data.community);
    } catch (error) {
      if (axios.isAxiosError(error)) console.error(error);
      else console.error("Get community api failed", error);
    }
  };

  useEffect(() => {
    void getCommunityAPI();
  }, [id]);

  const getCommunityHostsAPI = async () => {
    try {
      const response = await api.get(`/api/community/${id}/hosts/`);
      setCommunityHosts(response.data.hosts);
    } catch (error) {
      if (axios.isAxiosError(error)) console.error(error);
      else console.error("Get community hosts api failed", error);
    }
  };

  useEffect(() => {
    void getCommunityHostsAPI();
  }, [id]);

  const getCommunityPlayersAPI = async () => {
    try {
      const response = await api.get(`/api/community/${id}/players`);
      setCommunityPlayers(response.data.players);
    } catch (error) {
      if (axios.isAxiosError(error)) console.error(error);
      else console.error("Get community players api failed", error);
    }
  };

  useEffect(() => {
    void getCommunityPlayersAPI();
  }, [id]);

  const getCommunityPlayerWinPointsAPI = async () => {
    try {
      setIsLoadingWinPoints(true);
      const response = await api.get(`/api/community/${id}/players/win-points`, {
        params: {
          filter: pointsFilterMode,
          ...getPointFilterDateRangeParams(
            pointsFilterMode,
            pointsFilterMonth,
            pointsFilterDay,
          ),
        },
      });
      setCommunityPlayerWinPoints(response.data.players);
    } catch (error) {
      if (axios.isAxiosError(error)) console.error(error);
      else console.error("Get community player win points api failed", error);
    } finally {
      setIsLoadingWinPoints(false);
    }
  };

  useEffect(() => {
    void getCommunityPlayerWinPointsAPI();
  }, [id, pointsFilterDay, pointsFilterMode, pointsFilterMonth]);

  const handleHostFormChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = event.target;
    setHostForm((currentForm) => ({ ...currentForm, [name]: value }));
  };

  const handlePlayerFormChange = (
    event: React.ChangeEvent<HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const { name, value } = event.target;
    setPlayerForm((currentForm) => ({ ...currentForm, [name]: value }));
  };

  const handleCreateHost = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!id || !hostForm.sportName.trim()) return;

    setIsCreatingHost(true);
    setHostError(null);

    try {
      const cleanedHostName = hostForm.hostName.trim();
      const cleanedLocation = hostForm.location.trim();
      const startTime = hostForm.startTime
        ? new Date(hostForm.startTime).toISOString()
        : undefined;
      const endTime = hostForm.endTime
        ? new Date(hostForm.endTime).toISOString()
        : undefined;
      const maxPlayers =
        hostForm.maxPlayers.trim() === ""
          ? undefined
          : Number(hostForm.maxPlayers);

      if (
        maxPlayers !== undefined &&
        (Number.isNaN(maxPlayers) || maxPlayers < 0)
      ) {
        setHostError("Max players must be 0 or more.");
        return;
      }

      const response = await api.post(`/api/community/${id}/host`, {
        hostName: cleanedHostName || undefined,
        sportName: hostForm.sportName,
        location: cleanedLocation || undefined,
        startTime,
        endTime,
        maxPlayers,
      });

      const newHost = response.data.data as HostsType;
      setCommunityHosts((currentHosts) => [...currentHosts, newHost]);
      setHostForm(INITIAL_HOST_FORM);
      setActivePanel(null);
    } catch (error) {
      setHostError("Unable to create host.");

      if (axios.isAxiosError(error))
        console.error(error.response?.data ?? error);
      else console.error("Create host api failed", error);
    } finally {
      setIsCreatingHost(false);
    }
  };

  const handleCreatePlayers = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    if (!id) return;

    const names = playerForm.names
      .split(/\r?\n/)
      .map((name) => name.trim())
      .filter(Boolean);
    const uniqueNames = Array.from(new Set(names));

    if (uniqueNames.length === 0) {
      setPlayerError("Add at least one player name.");
      return;
    }

    setIsCreatingPlayers(true);
    setPlayerError(null);

    try {
      const createdPlayers: CommunityPlayerRecord[] = [];

      for (const username of uniqueNames) {
        const response = await api.post(`/api/community/${id}/players/static`, {
          username,
          skillLevel: playerForm.skillLevel,
        });
        createdPlayers.push(response.data.player as CommunityPlayerRecord);
      }

      setCommunityPlayers((currentPlayers) => [
        ...createdPlayers,
        ...currentPlayers,
      ]);
      setPlayerForm(INITIAL_PLAYER_FORM);
      setIsAddPlayerModalOpen(false);
    } catch (error) {
      setPlayerError("Unable to add all community players.");

      if (axios.isAxiosError(error))
        console.error(error.response?.data ?? error);
      else console.error("Create community players api failed", error);
    } finally {
      setIsCreatingPlayers(false);
    }
  };

  const handleToggleAdminAsPlayer = async () => {
    if (!id || isTogglingAdminAsPlayer) {
      return;
    }

    setIsTogglingAdminAsPlayer(true);
    setPlayerError(null);

    try {
      if (isAdminIncludedAsCommunityPlayer) {
        const response = await api.delete(`/api/community/${id}/players/admin`);
        const removedCommunityPlayerId = response.data.communityPlayerId;

        if (removedCommunityPlayerId) {
          setCommunityPlayers((currentPlayers) =>
            currentPlayers.filter(
              (currentPlayer) => currentPlayer.id !== removedCommunityPlayerId,
            ),
          );
          setCommunityPlayerWinPoints((currentPlayers) =>
            currentPlayers.filter(
              (currentPlayer) =>
                currentPlayer.communityPlayerId !== removedCommunityPlayerId,
            ),
          );
        }
      } else {
        const response = await api.post(`/api/community/${id}/players/admin`);
        const adminPlayer = response.data.player as CommunityPlayerRecord;

        setCommunityPlayers((currentPlayers) => [
          adminPlayer,
          ...currentPlayers.filter(
            (currentPlayer) => currentPlayer.id !== adminPlayer.id,
          ),
        ]);
        void getCommunityPlayerWinPointsAPI();
      }
    } catch (error) {
      setPlayerError(
        isAdminIncludedAsCommunityPlayer
          ? "Unable to remove the admin from community players."
          : "Unable to add the admin as a community player.",
      );

      if (axios.isAxiosError(error))
        console.error(error.response?.data ?? error);
      else console.error("Toggle admin as community player api failed", error);
    } finally {
      setIsTogglingAdminAsPlayer(false);
    }
  };

  const updateCommunityPlayerInState = (player: CommunityPlayerRecord) => {
    setCommunityPlayers((currentPlayers) =>
      currentPlayers.map((currentPlayer) =>
        currentPlayer.id === player.id ? player : currentPlayer,
      ),
    );
  };

  const handleUpdateCommunityPlayerStatus = async (
    communityPlayerId: string,
    status: HostPlayerStatus,
  ) => {
    if (!id || savingCommunityPlayerId) return;

    setSavingCommunityPlayerId(communityPlayerId);
    setPlayerError(null);

    try {
      const response = await api.patch(
        `/api/community/${id}/players/${communityPlayerId}`,
        { status },
      );
      updateCommunityPlayerInState(
        response.data.player as CommunityPlayerRecord,
      );
    } catch (error) {
      setPlayerError("Unable to update player status.");

      if (axios.isAxiosError(error))
        console.error(error.response?.data ?? error);
      else console.error("Update community player status api failed", error);
    } finally {
      setSavingCommunityPlayerId(null);
    }
  };

  const openEditCommunityPlayer = (communityPlayer: CommunityPlayerRecord) => {
    setEditingCommunityPlayer(communityPlayer);
    setCommunityPlayerEditForm({
      username: communityPlayer.player.username,
      skillLevel: communityPlayer.player.skillLevel,
      imageFile: null,
      imagePreview: null,
    });
    setCommunityPlayerEditError(null);
  };

  const closeEditCommunityPlayer = () => {
    if (savingCommunityPlayerId) return;
    setEditingCommunityPlayer(null);
    setCommunityPlayerEditError(null);
    setCommunityPlayerEditForm({
      username: "",
      skillLevel: "beginner",
      imageFile: null,
      imagePreview: null,
    });
  };

  const handleCommunityPlayerImageChange = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setCommunityPlayerEditError("Choose an image file.");
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setCommunityPlayerEditError("Image must be 5MB or smaller.");
      return;
    }

    try {
      const imagePreview = await readFileAsDataUrl(file);
      setCommunityPlayerEditForm((currentForm) => ({
        ...currentForm,
        imageFile: file,
        imagePreview,
      }));
      setCommunityPlayerEditError(null);
    } catch {
      setCommunityPlayerEditError("Unable to read image file.");
    }
  };

  const handleSaveCommunityPlayerEdit = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (!id || !editingCommunityPlayer || savingCommunityPlayerId) return;

    const cleanUsername = communityPlayerEditForm.username.trim();
    if (!cleanUsername) {
      setCommunityPlayerEditError("Player name is required.");
      return;
    }

    setSavingCommunityPlayerId(editingCommunityPlayer.id);
    setCommunityPlayerEditError(null);

    try {
      const imageData = communityPlayerEditForm.imageFile
        ? await readFileAsDataUrl(communityPlayerEditForm.imageFile)
        : undefined;
      const response = await api.patch(
        `/api/community/${id}/players/${editingCommunityPlayer.id}`,
        {
          username: cleanUsername,
          skillLevel: communityPlayerEditForm.skillLevel,
          imageData,
        },
      );

      updateCommunityPlayerInState(
        response.data.player as CommunityPlayerRecord,
      );
      setEditingCommunityPlayer(null);
      setCommunityPlayerEditError(null);
      setCommunityPlayerEditForm({
        username: "",
        skillLevel: "beginner",
        imageFile: null,
        imagePreview: null,
      });
    } catch (error) {
      setCommunityPlayerEditError("Unable to update this player.");

      if (axios.isAxiosError(error))
        console.error(error.response?.data ?? error);
      else console.error("Update community player api failed", error);
    } finally {
      setSavingCommunityPlayerId(null);
    }
  };

  const handleDeleteCommunityPlayer = async (
    communityPlayer: CommunityPlayerRecord,
  ) => {
    if (!id || savingCommunityPlayerId) return;

    const actionLabel = communityPlayer.player.isStatic ? "Delete" : "Kick";
    const confirmed = window.confirm(
      `${actionLabel} "${communityPlayer.player.username}" from the community roster?`,
    );

    if (!confirmed) return;

    setSavingCommunityPlayerId(communityPlayer.id);
    setPlayerError(null);

    try {
      await api.delete(`/api/community/${id}/players/${communityPlayer.id}`);
      setCommunityPlayers((currentPlayers) =>
        currentPlayers.filter(
          (currentPlayer) => currentPlayer.id !== communityPlayer.id,
        ),
      );
      setCommunityPlayerWinPoints((currentPlayers) =>
        currentPlayers.filter(
          (currentPlayer) =>
            currentPlayer.communityPlayerId !== communityPlayer.id,
        ),
      );
    } catch (error) {
      setPlayerError(
        communityPlayer.player.isStatic
          ? "Unable to delete this player."
          : "Unable to kick this player.",
      );

      if (axios.isAxiosError(error))
        console.error(error.response?.data ?? error);
      else console.error("Delete community player api failed", error);
    } finally {
      setSavingCommunityPlayerId(null);
    }
  };

  const handleDeleteHost = async (
    event: React.MouseEvent<HTMLButtonElement>,
    host: HostsType,
  ) => {
    event.stopPropagation();

    if (!id || deletingHostId) return;

    const confirmed = window.confirm(
      `Delete "${host.hostName}"? This will remove the host and its related queue data.`,
    );

    if (!confirmed) return;

    setDeletingHostId(host.id);
    setHostError(null);

    try {
      await api.delete(`/api/community/${id}/host/${host.id}`);
      setCommunityHosts((currentHosts) =>
        currentHosts.filter((currentHost) => currentHost.id !== host.id),
      );
    } catch (error) {
      setHostError("Unable to delete host.");

      if (axios.isAxiosError(error))
        console.error(error.response?.data ?? error);
      else console.error("Delete host api failed", error);
    } finally {
      setDeletingHostId(null);
    }
  };

  const handleDeleteCommunity = async () => {
    if (!id || !community || isDeletingCommunity) return;

    const confirmed = window.confirm(
      `Delete "${community.communityName}"? This will remove the community, its hosts, and related queue data.`,
    );

    if (!confirmed) return;

    setIsDeletingCommunity(true);
    setCommunityError(null);
    setOpenDropdownCommunity(false);

    try {
      await api.delete(`/api/community/${id}`);
      await refetchCommunities();
      navigate("/community", { replace: true });
    } catch (error) {
      setCommunityError("Unable to delete community.");

      if (axios.isAxiosError(error))
        console.error(error.response?.data ?? error);
      else console.error("Delete community api failed", error);
    } finally {
      setIsDeletingCommunity(false);
    }
  };

  const handleEditCommunity = async (form: {
    profileUrl: string;
    communityName: string;
    description: string;
  }) => {
    if (!id || !community || isUpdatingCommunity) return;

    if (!form.communityName) {
      setEditCommunityError("Community name is required.");
      return;
    }

    setIsUpdatingCommunity(true);
    setEditCommunityError(null);

    try {
      const response = await api.patch(`/api/community/${id}`, {
        profileUrl: form.profileUrl,
        communityName: form.communityName,
        description: form.description,
      });

      const updatedCommunity = response.data.updatedCommunity as CommunityType;

      setCommunity((currentCommunity) =>
        currentCommunity
          ? {
              ...currentCommunity,
              ...updatedCommunity,
              master: currentCommunity.master,
            }
          : currentCommunity,
      );
      await refetchCommunities();
      setIsEditModalOpen(false);
    } catch (error) {
      setEditCommunityError("Unable to update community.");

      if (axios.isAxiosError(error))
        console.error(error.response?.data ?? error);
      else console.error("Update community api failed", error);
    } finally {
      setIsUpdatingCommunity(false);
    }
  };

  const [openDropdownCommunity, setOpenDropdownCommunity] =
    useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setOpenDropdownCommunity(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {isEditModalOpen && community ? (
        <EditCommunityModal
          profileUrl={community.profileUrl}
          communityName={community.communityName}
          description={community.description ?? ""}
          isSaving={isUpdatingCommunity}
          error={editCommunityError}
          onClose={() => {
            if (isUpdatingCommunity) return;
            setEditCommunityError(null);
            setIsEditModalOpen(false);
          }}
          onSave={handleEditCommunity}
        />
      ) : null}
      {editingCommunityPlayer ? (
        <div
          className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 px-4"
          onClick={closeEditCommunityPlayer}
        >
          <div
            onClick={(event) => event.stopPropagation()}
            className="w-full max-w-md rounded-3xl border border-orange-100 bg-white p-5 shadow-2xl"
          >
            <header className="flex items-start justify-between gap-4">
              <div>
                <h4 className="text-lg font-semibold text-text">
                  Edit player
                </h4>
                <p className="mt-1 text-sm text-stone-500">
                  Update this static community player.
                </p>
              </div>

              <button
                type="button"
                onClick={closeEditCommunityPlayer}
                disabled={savingCommunityPlayerId === editingCommunityPlayer.id}
                className="rounded-full p-3 text-sm font-semibold text-stone-500 hover:bg-stone-100 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </header>

            <form
              onSubmit={(event) => void handleSaveCommunityPlayerEdit(event)}
              className="mt-5 grid gap-5"
            >
              <div className="flex justify-center">
                <label
                  className="group relative h-24 w-24 cursor-pointer overflow-hidden rounded-full border border-orange-100 bg-orange-50"
                  title="Change player photo"
                >
                  <img
                    src={
                      communityPlayerEditForm.imagePreview ??
                      editingCommunityPlayer.player.profileUrl
                    }
                    alt={editingCommunityPlayer.player.username}
                    className="h-full w-full rounded-full object-cover"
                  />
                  <span className="absolute inset-0 flex items-center justify-center bg-black/0 text-xs font-semibold text-white opacity-0 transition group-hover:bg-black/45 group-hover:opacity-100">
                    Change
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    disabled={savingCommunityPlayerId === editingCommunityPlayer.id}
                    className="sr-only"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      event.target.value = "";
                      if (file) void handleCommunityPlayerImageChange(file);
                    }}
                  />
                </label>
              </div>

              <label className="grid gap-2 text-sm">
                <span className="font-medium text-stone-700">Player name</span>
                <input
                  type="text"
                  value={communityPlayerEditForm.username}
                  onChange={(event) =>
                    setCommunityPlayerEditForm((currentForm) => ({
                      ...currentForm,
                      username: event.target.value,
                    }))
                  }
                  disabled={savingCommunityPlayerId === editingCommunityPlayer.id}
                  className="rounded-xl border border-orange-100 bg-white px-4 py-2.5 text-sm text-stone-700 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:cursor-not-allowed disabled:bg-stone-50"
                />
              </label>

              <label className="grid gap-2 text-sm">
                <span className="font-medium text-stone-700">Skill level</span>
                <select
                  value={communityPlayerEditForm.skillLevel}
                  onChange={(event) =>
                    setCommunityPlayerEditForm((currentForm) => ({
                      ...currentForm,
                      skillLevel: event.target.value as SkillLevelType,
                    }))
                  }
                  disabled={savingCommunityPlayerId === editingCommunityPlayer.id}
                  className="rounded-xl border border-orange-100 bg-white px-4 py-2.5 text-sm text-stone-700 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:cursor-not-allowed disabled:bg-stone-50"
                >
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                  <option value="elite">Elite</option>
                </select>
              </label>

              {communityPlayerEditError ? (
                <p className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
                  {communityPlayerEditError}
                </p>
              ) : null}

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={closeEditCommunityPlayer}
                  disabled={savingCommunityPlayerId === editingCommunityPlayer.id}
                  className="rounded-xl border border-stone-200 bg-white px-5 py-2.5 text-sm font-semibold text-stone-600 hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={savingCommunityPlayerId === editingCommunityPlayer.id}
                  className={`rounded-xl px-5 py-2.5 text-sm font-semibold transition cursor-pointer ${
                    savingCommunityPlayerId === editingCommunityPlayer.id
                      ? "cursor-not-allowed bg-stone-200 text-stone-400"
                      : "bg-primary text-white hover:bg-accent"
                  }`}
                >
                  {savingCommunityPlayerId === editingCommunityPlayer.id
                    ? "Saving..."
                    : "Save changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
      {isAddPlayerModalOpen ? (
        <div
          className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 px-4"
          onClick={() => {
            if (isCreatingPlayers) return;
            setIsAddPlayerModalOpen(false);
            setPlayerError(null);
          }}
        >
          <div
            onClick={(event) => event.stopPropagation()}
            className="w-full max-w-md rounded-3xl border border-orange-100 bg-white p-5 shadow-2xl"
          >
            <header className="flex items-start justify-between gap-4">
              <div>
                <h4 className="text-lg font-semibold text-text">
                  Add players
                </h4>
                <p className="mt-1 text-sm text-stone-500">
                  Create static players for this community.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (isCreatingPlayers) return;
                  setIsAddPlayerModalOpen(false);
                  setPlayerError(null);
                }}
                disabled={isCreatingPlayers}
                className="rounded-full p-3 text-sm font-semibold text-stone-500 hover:bg-stone-100 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </header>

            <form
              onSubmit={handleCreatePlayers}
              className="mt-5 grid gap-4"
            >
              <label className="grid gap-2 text-sm">
                <span className="font-medium text-stone-700">
                  Player names
                </span>
                <textarea
                  name="names"
                  value={playerForm.names}
                  onChange={handlePlayerFormChange}
                  placeholder={"John\nDoe\nJane"}
                  rows={6}
                  disabled={isCreatingPlayers}
                  className="min-h-[150px] resize-y rounded-2xl border border-orange-100 bg-white px-4 py-3 text-sm text-stone-700 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:cursor-not-allowed disabled:bg-stone-50"
                />
              </label>

              <label className="grid gap-2 text-sm">
                <span className="font-medium text-stone-700">Skill level</span>
                <select
                  name="skillLevel"
                  value={playerForm.skillLevel}
                  onChange={handlePlayerFormChange}
                  disabled={isCreatingPlayers}
                  className="rounded-xl border border-orange-100 bg-white px-4 py-2.5 text-sm text-stone-700 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:cursor-not-allowed disabled:bg-stone-50"
                >
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                  <option value="elite">Elite</option>
                </select>
              </label>

              {playerError ? (
                <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                  {playerError}
                </p>
              ) : null}

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    if (isCreatingPlayers) return;
                    setIsAddPlayerModalOpen(false);
                    setPlayerError(null);
                  }}
                  disabled={isCreatingPlayers}
                  className="rounded-xl border border-stone-200 bg-white px-5 py-2.5 text-sm font-semibold text-stone-600 hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isCreatingPlayers}
                  className={`rounded-xl px-5 py-2.5 text-sm font-semibold transition cursor-pointer ${
                    isCreatingPlayers
                      ? "cursor-not-allowed bg-stone-200 text-stone-400"
                      : "bg-primary text-white hover:bg-accent"
                  }`}
                >
                  {isCreatingPlayers ? "Adding..." : "Add to community"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
      {selectedPointsHistoryPlayer ? (
        <div
          className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 px-4"
          onClick={() => setSelectedPointsHistoryPlayer(null)}
        >
          <div
            onClick={(event) => event.stopPropagation()}
            className="max-h-[85vh] w-full max-w-lg overflow-hidden rounded-3xl border border-orange-100 bg-white shadow-2xl"
          >
            <header className="flex items-start justify-between gap-4 border-b border-orange-100 px-5 py-4">
              <div className="flex min-w-0 items-center gap-3">
                <img
                  src={selectedPointsHistoryPlayer.player.profileUrl}
                  alt={selectedPointsHistoryPlayer.player.username}
                  className="h-12 w-12 rounded-full object-cover"
                />
                <div className="min-w-0">
                  <h4 className="truncate text-lg font-semibold text-text">
                    Points history
                  </h4>
                  <p className="truncate text-sm text-stone-500">
                    {selectedPointsHistoryPlayer.player.username}
                  </p>
                  <p className="mt-0.5 text-xs font-medium text-amber-700">
                    {pointsFilterLabel}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedPointsHistoryPlayer(null)}
                className="rounded-full p-3 text-sm font-semibold text-stone-500 hover:bg-stone-100 cursor-pointer"
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </header>

            <div className="grid gap-4 overflow-y-auto p-5">
              <div className="flex items-center justify-between rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
                <span className="text-sm font-medium text-amber-800">
                  Total points for {pointsFilterLabel}
                </span>
                <span className="inline-flex items-center gap-1 text-lg font-bold text-amber-700">
                  <Trophy size={16} />
                  {selectedPointsRecord?.points ?? 0}
                </span>
              </div>

              {(selectedPointsRecord?.pointsHistory.length ?? 0) > 0 ? (
                <div className="grid gap-3">
                  {selectedPointsRecord?.pointsHistory.map((historyItem) => (
                    <div
                      key={historyItem.id}
                      className="rounded-2xl border border-gray-200 bg-white p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-text">
                            {historyItem.match.host.hostName}
                          </p>
                          <p className="mt-1 text-xs text-stone-500">
                            {historyItem.reason === "payment"
                              ? "Payment completed"
                              : `${historyItem.match.court?.name ?? "Court"} - Team ${
                                  historyItem.team ?? "-"
                                }`}
                          </p>
                        </div>

                        <span
                          className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
                            historyItem.reason === "payment"
                              ? "bg-amber-50 text-amber-700"
                              : "bg-green-50 text-green-700"
                          }`}
                        >
                          +{historyItem.points}
                        </span>
                      </div>

                      <div className="mt-3 grid gap-1 text-xs text-stone-500">
                        <p>
                          Reason:{" "}
                          <span className="font-medium text-stone-700">
                            {historyItem.reason === "payment" ? "Paid" : "Win"}
                          </span>
                        </p>
                        {historyItem.reason === "win" ? (
                          <p>
                            Winner: Team{" "}
                            <span className="font-medium text-stone-700">
                              {historyItem.match.teamWinner}
                            </span>
                          </p>
                        ) : null}
                        <p>
                          Date:{" "}
                          <span className="font-medium text-stone-700">
                            {formatHostDateTime(
                              historyItem.match.endedAt ??
                                historyItem.match.startedAt ??
                                historyItem.joinedAt,
                            )}
                          </span>
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-gray-300 px-4 py-10 text-center text-sm text-gray-500">
                  No point history yet.
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
      <header className="border-b border-gray-200 bg-white px-4 py-5 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 overflow-hidden rounded-2xl border border-gray-200">
              <img
                src={community?.profileUrl}
                alt={community?.communityName}
                className="h-full w-full object-cover"
              />
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold text-text">
                  {community?.communityName}
                </h1>

                <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                  Badminton
                </span>
              </div>

              <p className="mt-1 text-sm text-gray-500">
                Hosted by{" "}
                <span className="font-medium text-text">
                  {community?.master.username}
                </span>
              </p>
            </div>
          </div>

          <div ref={dropdownRef} className="relative">
            <div
              onClick={() => setOpenDropdownCommunity((prev) => !prev)}
              className="p-1 rounded-full  cursor-pointer hover:bg-primary/10"
            >
              <EllipsisVertical size={20} />
            </div>

            {openDropdownCommunity && (
              <div className="absolute border border-primary py-2 w-[240px] top-8 -left-53 rounded-lg bg-white">
                <button
                  type="button"
                  onClick={() => {
                    setOpenDropdownCommunity(false);
                    setEditCommunityError(null);
                    setIsEditModalOpen(true);
                  }}
                  className="flex items-center px-[16px] gap-x-[16px] cursor-pointer hover:bg-blue-400 hover:text-white w-full text-start py-1 text-[14px]"
                >
                  <SquarePen size={18} /> Edit
                </button>
                <button
                  type="button"
                  onClick={() => void handleDeleteCommunity()}
                  disabled={isDeletingCommunity}
                  className="flex w-full items-center gap-x-[16px] px-[16px] py-1 text-start text-[14px] cursor-pointer hover:bg-red-400 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Trash size={18} />
                  {isDeletingCommunity ? "Deleting..." : "Delete"}
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <section className="flex flex-1 flex-col gap-5 p-4 sm:p-6">
        {communityError ? (
          <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {communityError}
          </p>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() =>
              setActivePanel((currentPanel) =>
                currentPanel === "host" ? null : "host",
              )
            }
            aria-pressed={activePanel === "host"}
            className={`flex items-center justify-between rounded-2xl border px-5 py-4 text-left transition cursor-pointer ${
              activePanel === "host"
                ? "border-primary bg-primary text-white shadow-sm"
                : "border-gray-200 bg-white text-text hover:border-primary/40 hover:bg-orange-50"
            }`}
          >
            <span className="flex items-center gap-3">
              <span
                className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                  activePanel === "host" ? "bg-white/15" : "bg-primary/10"
                }`}
              >
                <Plus size={20} />
              </span>
              <span>
                <span className="block text-sm font-semibold">
                  Host a Match
                </span>
                <span
                  className={`block text-xs ${
                    activePanel === "host" ? "text-white/75" : "text-gray-500"
                  }`}
                >
                  Create a new hosted match.
                </span>
              </span>
            </span>
          </button>

          <button
            type="button"
            onClick={() =>
              setActivePanel((currentPanel) =>
                currentPanel === "players" ? null : "players",
              )
            }
            aria-pressed={activePanel === "players"}
            className={`flex items-center justify-between rounded-2xl border px-5 py-4 text-left transition cursor-pointer ${
              activePanel === "players"
                ? "border-primary bg-primary text-white shadow-sm"
                : "border-gray-200 bg-white text-text hover:border-primary/40 hover:bg-orange-50"
            }`}
          >
            <span className="flex items-center gap-3">
              <span
                className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                  activePanel === "players" ? "bg-white/15" : "bg-primary/10"
                }`}
              >
                <UsersRound size={20} />
              </span>
              <span>
                <span className="block text-sm font-semibold">Players</span>
                <span
                  className={`block text-xs ${
                    activePanel === "players"
                      ? "text-white/75"
                      : "text-gray-500"
                  }`}
                >
                  Manage the community roster.
                </span>
              </span>
            </span>

            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                activePanel === "players"
                  ? "bg-white/15 text-white"
                  : "bg-primary/10 text-primary"
              }`}
            >
              {communityPlayers.length}
            </span>
          </button>
        </div>

        {activePanel === "host" ? (
          <section className="rounded-3xl border border-gray-200 bg-white p-5">
            <form
              onSubmit={handleCreateHost}
              className="grid grid-cols-1 items-end gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6"
            >
          <label>
            <span className="mb-2 block text-sm font-medium text-text">
              Name
            </span>
            <input
              type="text"
              name="hostName"
              value={hostForm.hostName}
              onChange={handleHostFormChange}
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
            />
          </label>

          <label>
            <span className="mb-2 block text-sm font-medium text-text">
              Sport
            </span>
            <select
              name="sportName"
              value={hostForm.sportName}
              onChange={handleHostFormChange}
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
            >
              {DEFAULT_SPORT_OPTIONS.map((sportOption) => (
                <option key={sportOption} value={sportOption}>
                  {sportOption.charAt(0).toUpperCase() + sportOption.slice(1)}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span className="mb-2 block text-sm font-medium text-text">
              Location
            </span>
            <input
              type="text"
              name="location"
              value={hostForm.location}
              onChange={handleHostFormChange}
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
            />
          </label>

          <label>
            <span className="mb-2 block text-sm font-medium text-text">
              Starts at
            </span>
            <input
              type="datetime-local"
              name="startTime"
              value={hostForm.startTime}
              onChange={handleHostFormChange}
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
            />
          </label>

          <label>
            <span className="mb-2 block text-sm font-medium text-text">
              Ends at
            </span>
            <input
              type="datetime-local"
              name="endTime"
              value={hostForm.endTime}
              onChange={handleHostFormChange}
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
            />
          </label>

          <label>
            <span className="mb-2 block text-sm font-medium text-text">
              Max players
            </span>
            <input
              type="number"
              name="maxPlayers"
              min="0"
              value={hostForm.maxPlayers}
              onChange={handleHostFormChange}
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
            />
          </label>

          <button
            type="submit"
            disabled={isCreatingHost}
            className={`
              h-[46px] w-full rounded-xl px-5 py-3 text-sm font-semibold transition cursor-pointer
              ${
                isCreatingHost
                  ? "cursor-not-allowed bg-gray-100 text-gray-400"
                  : "bg-primary text-white hover:bg-accent"
              }
            `}
          >
            {isCreatingHost ? "Hosting..." : "Host"}
          </button>
        </form>

        {hostError ? (
          <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {hostError}
          </p>
        ) : null}
          </section>
        ) : null}

        {activePanel === "players" ? (
          <section className="overflow-hidden rounded-3xl border border-gray-200 bg-white">
          <div className="flex flex-col gap-4 border-b border-gray-200 px-5 py-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-text">
                Community Players
              </h3>
              <p className="text-sm text-gray-500">
                Build a reusable roster for every hosted match.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setPlayerError(null);
                  setIsAddPlayerModalOpen(true);
                }}
                className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-orange-200 bg-white px-3 py-2 text-xs font-semibold text-primary transition hover:bg-orange-50"
              >
                <Plus size={15} />
                Add player
              </button>

              <button
                type="button"
                onClick={() => void handleToggleAdminAsPlayer()}
                disabled={isTogglingAdminAsPlayer}
                className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition ${
                  isTogglingAdminAsPlayer
                    ? "cursor-not-allowed bg-stone-100 text-stone-400"
                    : isAdminIncludedAsCommunityPlayer
                      ? "cursor-pointer border border-red-200 bg-white text-red-600 hover:bg-red-50"
                    : "cursor-pointer bg-primary text-white hover:bg-accent"
                }`}
              >
                <UserPlus size={15} />
                {isTogglingAdminAsPlayer
                  ? "Saving..."
                  : isAdminIncludedAsCommunityPlayer
                    ? "Remove admin"
                    : "Add admin"}
              </button>

              <div className="rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
                {isLoadingWinPoints ? "..." : `${communityPlayers.length}`}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 border-b border-gray-100 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-2">
              {(["all", "month", "day"] as const).map((filterMode) => (
                <button
                  key={filterMode}
                  type="button"
                  onClick={() => setPointsFilterMode(filterMode)}
                  className={`rounded-xl px-3 py-2 text-xs font-semibold capitalize transition ${
                    pointsFilterMode === filterMode
                      ? "bg-primary text-white"
                      : "cursor-pointer border border-gray-200 bg-white text-stone-600 hover:border-primary/40 hover:bg-orange-50"
                  }`}
                >
                  {filterMode === "day" ? "Daily" : filterMode}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {pointsFilterMode === "month" ? (
                <input
                  type="month"
                  value={pointsFilterMonth}
                  onChange={(event) => setPointsFilterMonth(event.target.value)}
                  className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-stone-700 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
                />
              ) : null}

              {pointsFilterMode === "day" ? (
                <input
                  type="date"
                  value={pointsFilterDay}
                  onChange={(event) => setPointsFilterDay(event.target.value)}
                  className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-stone-700 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
                />
              ) : null}

              <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                {pointsFilterLabel}
              </span>
            </div>
          </div>

          {playerError && !isAddPlayerModalOpen ? (
            <p className="mx-5 mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              {playerError}
            </p>
          ) : null}

          <div className="p-5">
            <div className="grid content-start gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {communityPlayers.length > 0 ? (
                rankedCommunityPlayers.map((communityPlayer) => {
                  const playerPoints =
                    winPointsByCommunityPlayerId.get(communityPlayer.id)
                      ?.points ?? 0;
                  const hasMostPoints =
                    highestCommunityPlayerPoints > 0 &&
                    playerPoints === highestCommunityPlayerPoints;

                  return (
                    <div
                      key={communityPlayer.id}
                      className="grid min-w-0 gap-3 rounded-2xl border border-gray-200 bg-white p-3"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <img
                          src={communityPlayer.player.profileUrl}
                          alt={communityPlayer.player.username}
                          className="h-11 w-11 rounded-full object-cover"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-text">
                            {communityPlayer.player.username}
                          </p>
                          <div className="mt-1 flex flex-wrap gap-1.5">
                            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium capitalize text-primary">
                              {communityPlayer.player.skillLevel}
                            </span>
                            <span
                              className={`rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ${
                                communityPlayer.status === "accepted"
                                  ? "bg-green-50 text-green-700"
                                  : communityPlayer.status === "requested"
                                    ? "bg-yellow-50 text-yellow-700"
                                    : communityPlayer.status === "banned"
                                      ? "bg-red-50 text-red-700"
                                      : "bg-stone-100 text-stone-600"
                              }`}
                            >
                              {communityPlayer.player.isStatic
                                ? "static"
                                : communityPlayer.status}
                            </span>
                          </div>
                        </div>

                        <div
                          className={`flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${
                            hasMostPoints
                              ? "border-yellow-400 bg-yellow-300 text-yellow-950 shadow-sm"
                              : "border-amber-200 bg-amber-50 text-amber-700"
                          }`}
                        >
                          <Trophy size={13} />
                          {playerPoints} pts
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedPointsHistoryPlayer(communityPlayer)
                          }
                          className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-amber-200 bg-white px-3 py-2 text-xs font-semibold text-amber-700 transition hover:bg-amber-50"
                        >
                          <Trophy size={14} />
                          History
                        </button>

                        {communityPlayer.player.isStatic ? (
                          <>
                            <button
                              type="button"
                              onClick={() => openEditCommunityPlayer(communityPlayer)}
                              disabled={
                                savingCommunityPlayerId === communityPlayer.id
                              }
                              className="rounded-xl border border-orange-200 bg-white px-3 py-2 text-xs font-semibold text-primary transition hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                void handleDeleteCommunityPlayer(communityPlayer)
                              }
                              disabled={
                                savingCommunityPlayerId === communityPlayer.id
                              }
                              className="rounded-xl border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
                            >
                              Delete
                            </button>
                          </>
                        ) : (
                          <>
                            {communityPlayer.status !== "accepted" ? (
                              <button
                                type="button"
                                onClick={() =>
                                  void handleUpdateCommunityPlayerStatus(
                                    communityPlayer.id,
                                    "accepted",
                                  )
                                }
                                disabled={
                                  savingCommunityPlayerId === communityPlayer.id
                                }
                                className="rounded-xl bg-green-100 px-3 py-2 text-xs font-semibold text-green-700 transition hover:bg-green-200 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
                              >
                                Accept
                              </button>
                            ) : null}
                            {communityPlayer.status === "requested" ? (
                              <button
                                type="button"
                                onClick={() =>
                                  void handleUpdateCommunityPlayerStatus(
                                    communityPlayer.id,
                                    "rejected",
                                  )
                                }
                                disabled={
                                  savingCommunityPlayerId === communityPlayer.id
                                }
                                className="rounded-xl bg-stone-100 px-3 py-2 text-xs font-semibold text-stone-700 transition hover:bg-stone-200 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
                              >
                                Reject
                              </button>
                            ) : null}
                            {communityPlayer.status !== "banned" ? (
                              <button
                                type="button"
                                onClick={() =>
                                  void handleUpdateCommunityPlayerStatus(
                                    communityPlayer.id,
                                    "banned",
                                  )
                                }
                                disabled={
                                  savingCommunityPlayerId === communityPlayer.id
                                }
                                className="rounded-xl border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
                              >
                                Ban
                              </button>
                            ) : null}
                            {!communityPlayer.player.isAdmin ? (
                              <button
                                type="button"
                                onClick={() =>
                                  void handleDeleteCommunityPlayer(
                                    communityPlayer,
                                  )
                                }
                                disabled={
                                  savingCommunityPlayerId ===
                                  communityPlayer.id
                                }
                                className="rounded-xl border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
                              >
                                Kick
                              </button>
                            ) : null}
                          </>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="rounded-2xl border border-dashed border-gray-300 px-4 py-10 text-center text-sm text-gray-500 sm:col-span-2 xl:col-span-3">
                  No community players yet.
                </div>
              )}
            </div>
          </div>
          </section>
        ) : null}

        <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white">
          <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
            <div>
              <h3 className="text-lg font-semibold text-text">Active Hosts</h3>
              <p className="text-sm text-gray-500">Manage match queues</p>
            </div>

            <div className="rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
              {communityHosts.length}
            </div>
          </div>

          {/* DESKTOP TABLE (>=1024px) */}
          <div className="hidden lg:block overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase text-gray-500">
                    Host
                  </th>
                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase text-gray-500">
                    Sport
                  </th>
                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase text-gray-500">
                    Location
                  </th>
                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase text-gray-500">
                    Schedule
                  </th>
                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase text-gray-500">
                    Players
                  </th>
                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase text-gray-500">
                    Capacity
                  </th>
                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase text-gray-500">
                    Status
                  </th>
                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase text-gray-500">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {communityHosts.map((communityHost) => (
                  <tr
                    key={communityHost.id}
                    onClick={() =>
                      navigate(`/community/${id}/hosts/${communityHost.id}`)
                    }
                    className="cursor-pointer transition hover:bg-gray-50"
                  >
                    <td className="px-5 py-4 font-medium text-text">
                      {communityHost.hostName}
                    </td>

                    <td className="px-5 py-4">
                      <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                        {communityHost.sport}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-gray-600">
                      {communityHost.location?.trim() || "TBD"}
                    </td>

                    <td className="px-5 py-4 text-gray-600">
                      <div className="min-w-[180px]">
                        <p>{formatHostDateTime(communityHost.startTime)}</p>
                        <p className="text-xs text-gray-400">
                          Ends {formatHostDateTime(communityHost.endTime)}
                        </p>
                      </div>
                    </td>

                    <td className="px-5 py-4 text-gray-600">
                      {communityHost._count.players}
                    </td>

                    <td className="px-5 py-4 text-gray-600">
                      {communityHost.maxPlayers > 0
                        ? `${communityHost.maxPlayers} players`
                        : "Open"}
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-medium ${
                          communityHost.status === "available"
                            ? "bg-green-50 text-green-600"
                            : "bg-red-50 text-red-600"
                        }`}
                      >
                        {communityHost.status}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-gray-600">
                      <button
                        type="button"
                        onClick={(event) =>
                          void handleDeleteHost(event, communityHost)
                        }
                        disabled={deletingHostId === communityHost.id}
                        className="w-fit rounded-full p-1 text-gray-500 transition hover:bg-red-400 hover:text-stone-200 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                        aria-label={`Delete ${communityHost.hostName}`}
                      >
                        <Trash size={20} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* MOBILE / TABLET CARDS (<1024px) */}
          <div className="grid gap-3 p-4 lg:hidden">
            {communityHosts.map((communityHost) => (
              <div
                key={communityHost.id}
                onClick={() =>
                  navigate(`/community/${id}/hosts/${communityHost.id}`)
                }
                className="cursor-pointer rounded-2xl border border-gray-200 bg-white p-4 transition hover:bg-gray-50"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="w-full">
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-x-3">
                        <p className="font-medium text-text">
                          {communityHost.hostName}
                        </p>
                        <span className="rounded-full bg-primary/10 px-3 py-1 text-primary text-[12px]">
                          {communityHost.sport}
                        </span>
                      </div>

                      <span
                        className={`rounded-full px-3 py-1 text-xs font-medium ${
                          communityHost.status === "available"
                            ? "bg-green-50 text-green-600"
                            : "bg-red-50 text-red-600"
                        }`}
                      >
                        {communityHost.status}
                      </span>
                    </div>

                    <p className="mt-1 text-xs text-gray-600">
                      Location:{" "}
                      <span className="font-medium">
                        {communityHost.location?.trim() || "TBD"}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-600">
                  <span>{communityHost._count.players} players joined</span>
                  <span>
                    {communityHost.maxPlayers > 0
                      ? `${communityHost.maxPlayers} players`
                      : "Open"}
                  </span>
                </div>

                <div className="mt-2 text-xs text-gray-600">
                  <p>
                    Starts:{" "}
                    <span className="font-medium">
                      {formatHostDateTime(communityHost.startTime)}
                    </span>
                  </p>
                  <p>
                    Ends:{" "}
                    <span className="font-medium">
                      {formatHostDateTime(communityHost.endTime)}
                    </span>
                  </p>
                </div>

                <div className="mt-4 flex justify-end">
                  <button
                    type="button"
                    onClick={(event) =>
                      void handleDeleteHost(event, communityHost)
                    }
                    disabled={deletingHostId === communityHost.id}
                    className="inline-flex items-center gap-2 rounded-xl border border-red-200 px-3 py-2 text-xs font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                    aria-label={`Delete ${communityHost.hostName}`}
                  >
                    <Trash size={16} />
                    {deletingHostId === communityHost.id
                      ? "Deleting..."
                      : "Delete"}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* EMPTY STATE */}
          {communityHosts.length === 0 && (
            <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
              <div className="text-4xl">Host</div>
              <h3 className="mt-4 text-lg font-semibold text-text">
                No hosts yet
              </h3>
              <p className="mt-2 text-sm text-gray-500">
                Create your first match host.
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
