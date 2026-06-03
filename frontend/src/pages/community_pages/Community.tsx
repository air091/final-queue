import axios from "axios";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../../lib/api";
import LoadingState from "../../components/LoadingState";
import {
  AArrowDown,
  AArrowUp,
  EllipsisVertical,
  LoaderCircle,
  Plus,
  Search,
  SquarePen,
  Trophy,
  Trash,
  UserMinus,
  UserPlus,
  UsersRound,
  X,
} from "lucide-react";
import { useCommunities } from "../../contexts/CommunitiesContext";
import EditCommunityModal from "../../components/community_components/EditCommunityModal";
import { useAuth } from "../../hooks/useAuth";
import type {
  CommunityPlayerRecord,
  HostPlayerStatus,
  SkillLevelType,
} from "../../lib/host";
import { SKILL_LEVEL_OPTIONS, SkillLevelBadge } from "../../lib/skillLevels";

type MasterType = {
  id: string;
  profileUrl: string;
  username: string;
};

type CommunityAdminType = {
  id: string;
  account: MasterType;
};

type AdminCandidate = MasterType & {
  roleLabel: "Owner" | "Admin";
};

type CommunityType = {
  id: string;
  profileUrl: string;
  communityName: string;
  description: string;
  master: MasterType;
  admins: CommunityAdminType[];
  isMember: boolean;
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

type AddPlayerMode = "static" | "invite";
type PointsFilterMode = "all" | "month" | "day" | "weekday";

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
type AddAdminMode = "asPlayer" | "newAdmin";
type HostScheduleSortDirection = "asc" | "desc";
type CommunityPlayerNameSortDirection = "asc" | "desc";
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

const POINTS_WEEKDAY_OPTIONS = [
  { value: "0", label: "Sunday" },
  { value: "1", label: "Monday" },
  { value: "2", label: "Tuesday" },
  { value: "3", label: "Wednesday" },
  { value: "4", label: "Thursday" },
  { value: "5", label: "Friday" },
  { value: "6", label: "Saturday" },
] as const;

const getLocalDateInputValue = (date = new Date()) => {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 10);
};

const getLocalDateTimeInputValue = (value: string | null) => {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 16);
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
  weekday: string,
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

  if (mode === "weekday") {
    const parts = getDatePartsFromInput(month);
    if (!parts || parts.length !== 2) return {};

    const [year, monthNumber] = parts;
    const startDate = new Date(year, monthNumber - 1, 1);
    const endDate = new Date(year, monthNumber, 1);

    return {
      month,
      weekday,
      timezoneOffsetMinutes: new Date().getTimezoneOffset(),
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

const getHostScheduleTime = (host: HostsType) => {
  if (!host.startTime) return null;

  const time = new Date(host.startTime).getTime();
  return Number.isNaN(time) ? null : time;
};

export default function Community() {
  const { id } = useParams();
  const { refetchCommunities } = useCommunities();
  const { user } = useAuth();
  const [community, setCommunity] = useState<CommunityType | null>(null);
  const [communityHosts, setCommunityHosts] = useState<HostsType[]>([]);
  const [hostScheduleSortDirection, setHostScheduleSortDirection] =
    useState<HostScheduleSortDirection>("asc");
  const [communityPlayers, setCommunityPlayers] = useState<
    CommunityPlayerRecord[]
  >([]);
  const [communityPlayerWinPoints, setCommunityPlayerWinPoints] = useState<
    CommunityPlayerWinPointsRecord[]
  >([]);
  const [hostForm, setHostForm] = useState<HostFormState>(INITIAL_HOST_FORM);
  const [editingHostId, setEditingHostId] = useState<string | null>(null);
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
  const [pointsFilterWeekday, setPointsFilterWeekday] = useState(
    String(new Date().getDay()),
  );
  const [activePanel, setActivePanel] = useState<CommunityPanel>(null);
  const [isCreatingHost, setIsCreatingHost] = useState(false);
  const [isCreatingPlayers, setIsCreatingPlayers] = useState(false);
  const [isLoadingWinPoints, setIsLoadingWinPoints] = useState(false);
  const [savingCommunityPlayerId, setSavingCommunityPlayerId] = useState<
    string | null
  >(null);
  const [isDeletingCommunity, setIsDeletingCommunity] = useState(false);
  const [isLeavingCommunity, setIsLeavingCommunity] = useState(false);
  const [isAddPlayerModalOpen, setIsAddPlayerModalOpen] = useState(false);
  const [addPlayerMode, setAddPlayerMode] = useState<AddPlayerMode>("static");
  const [playerInviteSearchTerm, setPlayerInviteSearchTerm] = useState("");
  const [communityPlayerSearchTerm, setCommunityPlayerSearchTerm] =
    useState("");
  const [communityPlayerNameSortDirection, setCommunityPlayerNameSortDirection] =
    useState<CommunityPlayerNameSortDirection>("asc");
  const [playerInviteCandidates, setPlayerInviteCandidates] = useState<
    MasterType[]
  >([]);
  const [selectedPlayerInviteIds, setSelectedPlayerInviteIds] = useState<
    string[]
  >([]);
  const [isLoadingPlayerInviteCandidates, setIsLoadingPlayerInviteCandidates] =
    useState(false);
  const [isSendingPlayerInvites, setIsSendingPlayerInvites] = useState(false);
  const [playerInviteSuccess, setPlayerInviteSuccess] = useState<string | null>(
    null,
  );
  const [isAddAdminModalOpen, setIsAddAdminModalOpen] = useState(false);
  const [addAdminMode, setAddAdminMode] = useState<AddAdminMode>("asPlayer");
  const [selectedAdminPlayerIds, setSelectedAdminPlayerIds] = useState<
    string[]
  >([]);
  const [isApplyingAdminPlayerSelection, setIsApplyingAdminPlayerSelection] =
    useState(false);
  const [selectedNewAdminIds, setSelectedNewAdminIds] = useState<string[]>([]);
  const [isApplyingNewAdminSelection, setIsApplyingNewAdminSelection] =
    useState(false);
  const [removingAdminRoleId, setRemovingAdminRoleId] = useState<string | null>(
    null,
  );
  const [addAdminSuccess, setAddAdminSuccess] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isUpdatingCommunity, setIsUpdatingCommunity] = useState(false);
  const [isCommunityLoading, setIsCommunityLoading] = useState(true);
  const [isCommunityHostsLoading, setIsCommunityHostsLoading] = useState(true);
  const [isCommunityPlayersLoading, setIsCommunityPlayersLoading] =
    useState(true);
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

        const nameMultiplier =
          communityPlayerNameSortDirection === "asc" ? 1 : -1;

        return (
          firstPlayer.player.username.localeCompare(
            secondPlayer.player.username,
            undefined,
            { sensitivity: "base" },
          ) * nameMultiplier
        );
      }),
    [
      communityPlayerNameSortDirection,
      communityPlayers,
      winPointsByCommunityPlayerId,
    ],
  );

  const requestedCommunityPlayers = useMemo(
    () =>
      rankedCommunityPlayers.filter(
        (communityPlayer) => communityPlayer.status === "requested",
      ),
    [rankedCommunityPlayers],
  );

  const rosterCommunityPlayers = useMemo(
    () =>
      rankedCommunityPlayers.filter(
        (communityPlayer) => communityPlayer.status !== "requested",
      ),
    [rankedCommunityPlayers],
  );
  const searchedRequestedCommunityPlayers = useMemo(() => {
    const searchTerm = communityPlayerSearchTerm.trim().toLowerCase();
    if (!searchTerm) return requestedCommunityPlayers;

    return requestedCommunityPlayers.filter((communityPlayer) =>
      communityPlayer.player.username.toLowerCase().includes(searchTerm),
    );
  }, [communityPlayerSearchTerm, requestedCommunityPlayers]);
  const searchedRosterCommunityPlayers = useMemo(() => {
    const searchTerm = communityPlayerSearchTerm.trim().toLowerCase();
    if (!searchTerm) return rosterCommunityPlayers;

    return rosterCommunityPlayers.filter((communityPlayer) =>
      communityPlayer.player.username.toLowerCase().includes(searchTerm),
    );
  }, [communityPlayerSearchTerm, rosterCommunityPlayers]);

  const highestCommunityPlayerPoints = useMemo(
    () =>
      communityPlayers.reduce((highestPoints, communityPlayer) => {
        const playerPoints =
          winPointsByCommunityPlayerId.get(communityPlayer.id)?.points ?? 0;

        return Math.max(highestPoints, playerPoints);
      }, 0),
    [communityPlayers, winPointsByCommunityPlayerId],
  );

  const sortedCommunityHosts = useMemo(
    () =>
      [...communityHosts].sort((firstHost, secondHost) => {
        const firstTime = getHostScheduleTime(firstHost);
        const secondTime = getHostScheduleTime(secondHost);

        if (firstTime === null && secondTime === null) {
          return firstHost.hostName.localeCompare(secondHost.hostName);
        }

        if (firstTime === null) return 1;
        if (secondTime === null) return -1;

        const directionMultiplier =
          hostScheduleSortDirection === "asc" ? 1 : -1;
        const timeResult = (firstTime - secondTime) * directionMultiplier;

        if (timeResult !== 0) return timeResult;

        return firstHost.hostName.localeCompare(secondHost.hostName);
      }),
    [communityHosts, hostScheduleSortDirection],
  );

  const isCommunityOwner = Boolean(
    user && community && user.id === community.master.id,
  );
  const canManageCommunity = Boolean(community?.isMember);
  const canAddAdminAsPlayer = Boolean(user && community && community.isMember);
  const adminCandidates = useMemo<AdminCandidate[]>(() => {
    if (!community) return [];

    const candidates: AdminCandidate[] = [
      {
        ...community.master,
        roleLabel: "Owner",
      },
    ];

    community.admins.forEach((admin) => {
      if (
        candidates.some((candidate) => candidate.id === admin.account.id)
      ) {
        return;
      }

      candidates.push({
        ...admin.account,
        roleLabel: "Admin",
      });
    });

    return candidates;
  }, [community]);
  const adminAccountIds = useMemo(
    () =>
      new Set([
        ...(community ? [community.master.id] : []),
        ...(community?.admins.map((admin) => admin.account.id) ?? []),
      ]),
    [community],
  );
  const adminPlayerAccountIds = useMemo(
    () =>
      new Set(
        communityPlayers
          .map((communityPlayer) => communityPlayer.player.id)
          .filter((playerId): playerId is string => Boolean(playerId)),
      ),
    [communityPlayers],
  );
  const registeredCommunityAdminCandidates = useMemo(
    () =>
      communityPlayers
        .filter(
          (communityPlayer) =>
            communityPlayer.status === "accepted" &&
            Boolean(communityPlayer.player.id) &&
            communityPlayer.player.id !== community?.master.id &&
            !communityPlayer.player.isStatic,
        )
        .sort((firstPlayer, secondPlayer) =>
          firstPlayer.player.username.localeCompare(
            secondPlayer.player.username,
          ),
        ),
    [community, communityPlayers],
  );
  const selectedPointsRecord = selectedPointsHistoryPlayer
    ? winPointsByCommunityPlayerId.get(selectedPointsHistoryPlayer.id)
    : null;
  const hasAdminPlayerSelectionChanges = useMemo(() => {
    const selectedIds = new Set(selectedAdminPlayerIds);

    return adminCandidates.some((admin) => {
      const isSelected = selectedIds.has(admin.id);
      const isAlreadyPlayer = adminPlayerAccountIds.has(admin.id);

      return isSelected !== isAlreadyPlayer;
    });
  }, [adminCandidates, adminPlayerAccountIds, selectedAdminPlayerIds]);
  const hasNewAdminSelectionChanges = useMemo(() => {
    const selectedIds = new Set(selectedNewAdminIds);

    return registeredCommunityAdminCandidates.some((communityPlayer) => {
      const accountId = communityPlayer.player.id;
      if (!accountId || accountId === community?.master.id) return false;

      return selectedIds.has(accountId) !== adminAccountIds.has(accountId);
    });
  }, [
    adminAccountIds,
    community,
    registeredCommunityAdminCandidates,
    selectedNewAdminIds,
  ]);
  const pointsFilterLabel = useMemo(() => {
    if (pointsFilterMode === "all") return "All time";

    if (pointsFilterMode === "weekday") {
      const filterDate = new Date(`${pointsFilterMonth}-01T00:00:00`);
      const weekdayLabel =
        POINTS_WEEKDAY_OPTIONS.find(
          (option) => option.value === pointsFilterWeekday,
        )?.label ?? "Selected day";

      if (Number.isNaN(filterDate.getTime())) return `${weekdayLabel} sessions`;

      const monthLabel = new Intl.DateTimeFormat(undefined, {
        month: "long",
        year: "numeric",
      }).format(filterDate);

      return `${weekdayLabel}s in ${monthLabel}`;
    }

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
  }, [
    pointsFilterDay,
    pointsFilterMode,
    pointsFilterMonth,
    pointsFilterWeekday,
  ]);

  const getCommunityAPI = async () => {
    if (!id) {
      setIsCommunityLoading(false);
      return;
    }

    setIsCommunityLoading(true);
    setCommunityError(null);

    try {
      const response = await api.get(`/api/community/${id}`);
      setCommunity(response.data.community);
    } catch (error) {
      setCommunityError("Unable to load community details.");
      if (axios.isAxiosError(error)) console.error(error);
      else console.error("Get community api failed", error);
    } finally {
      setIsCommunityLoading(false);
    }
  };

  useEffect(() => {
    void getCommunityAPI();
  }, [id]);

  const getCommunityHostsAPI = async () => {
    if (!id) {
      setIsCommunityHostsLoading(false);
      return;
    }

    setIsCommunityHostsLoading(true);

    try {
      const response = await api.get(`/api/community/${id}/hosts/`);
      setCommunityHosts(response.data.hosts);
    } catch (error) {
      setCommunityError("Unable to load community hosts.");
      if (axios.isAxiosError(error)) console.error(error);
      else console.error("Get community hosts api failed", error);
    } finally {
      setIsCommunityHostsLoading(false);
    }
  };

  useEffect(() => {
    if (!id) {
      setIsCommunityHostsLoading(false);
      return;
    }

    if (!community) return;

    if (!community.isMember) {
      setIsCommunityHostsLoading(false);
      return;
    }

    void getCommunityHostsAPI();
  }, [id, community?.isMember]);

  const getCommunityPlayersAPI = async () => {
    if (!id) {
      setIsCommunityPlayersLoading(false);
      return;
    }

    setIsCommunityPlayersLoading(true);

    try {
      const response = await api.get(`/api/community/${id}/players`);
      setCommunityPlayers(response.data.players);
    } catch (error) {
      setCommunityError("Unable to load community players.");
      if (axios.isAxiosError(error)) console.error(error);
      else console.error("Get community players api failed", error);
    } finally {
      setIsCommunityPlayersLoading(false);
    }
  };

  useEffect(() => {
    if (!id) {
      setIsCommunityPlayersLoading(false);
      return;
    }

    if (!community) return;

    if (!community.isMember) {
      setIsCommunityPlayersLoading(false);
      return;
    }

    void getCommunityPlayersAPI();
  }, [id, community?.isMember]);

  const getCommunityPlayerWinPointsAPI = async () => {
    try {
      setIsLoadingWinPoints(true);
      const response = await api.get(
        `/api/community/${id}/players/win-points`,
        {
          params: {
            filter: pointsFilterMode,
            ...getPointFilterDateRangeParams(
              pointsFilterMode,
              pointsFilterMonth,
              pointsFilterDay,
              pointsFilterWeekday,
            ),
          },
        },
      );
      setCommunityPlayerWinPoints(response.data.players);
    } catch (error) {
      if (axios.isAxiosError(error)) console.error(error);
      else console.error("Get community player win points api failed", error);
    } finally {
      setIsLoadingWinPoints(false);
    }
  };

  useEffect(() => {
    if (!id) {
      setIsLoadingWinPoints(false);
      return;
    }

    if (!community) return;

    if (!community.isMember) {
      setCommunityPlayerWinPoints([]);
      setIsLoadingWinPoints(false);
      return;
    }

    void getCommunityPlayerWinPointsAPI();
  }, [
    id,
    community?.isMember,
    pointsFilterDay,
    pointsFilterMode,
    pointsFilterMonth,
    pointsFilterWeekday,
  ]);

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

  const resetHostForm = () => {
    setHostForm(INITIAL_HOST_FORM);
    setEditingHostId(null);
    setHostError(null);
  };

  const closeHostModal = () => {
    if (isCreatingHost) return;

    resetHostForm();
    setActivePanel(null);
  };

  const openCreateHostModal = () => {
    resetHostForm();
    setActivePanel("host");
  };

  const openEditHost = (
    event: React.MouseEvent<HTMLButtonElement>,
    host: HostsType,
  ) => {
    event.stopPropagation();

    setHostForm({
      hostName: host.hostName,
      sportName: host.sport,
      location: host.location ?? "",
      startTime: getLocalDateTimeInputValue(host.startTime),
      endTime: getLocalDateTimeInputValue(host.endTime),
      maxPlayers: host.maxPlayers > 0 ? String(host.maxPlayers) : "",
    });
    setEditingHostId(host.id);
    setHostError(null);
    setActivePanel("host");
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

      const hostPayload = {
        hostName: cleanedHostName || undefined,
        sportName: hostForm.sportName,
        location: cleanedLocation || (editingHostId ? null : undefined),
        startTime,
        endTime,
        maxPlayers,
      };
      const response = editingHostId
        ? await api.patch(
            `/api/community/${id}/hosts/${editingHostId}`,
            hostPayload,
          )
        : await api.post(`/api/community/${id}/host`, hostPayload);

      const savedHost = response.data.data as HostsType;
      setCommunityHosts((currentHosts) =>
        editingHostId
          ? currentHosts.map((currentHost) =>
              currentHost.id === savedHost.id ? savedHost : currentHost,
            )
          : [...currentHosts, savedHost],
      );
      setHostForm(INITIAL_HOST_FORM);
      setEditingHostId(null);
      setActivePanel(null);
    } catch (error) {
      setHostError(editingHostId ? "Unable to update host." : "Unable to create host.");

      if (axios.isAxiosError(error))
        console.error(error.response?.data ?? error);
      else console.error(editingHostId ? "Update host api failed" : "Create host api failed", error);
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
      const response = await api.post(
        `/api/community/${id}/players/static/bulk`,
        {
          usernames: uniqueNames,
          skillLevel: playerForm.skillLevel,
        },
      );
      const createdPlayers = response.data.players as CommunityPlayerRecord[];

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

  const closeAddPlayerModal = () => {
    if (isCreatingPlayers || isSendingPlayerInvites) return;

    setIsAddPlayerModalOpen(false);
    setPlayerError(null);
    setPlayerInviteSuccess(null);
    setSelectedPlayerInviteIds([]);
    setPlayerInviteSearchTerm("");
    setAddPlayerMode("static");
  };

  const loadPlayerInviteCandidates = async (query = playerInviteSearchTerm) => {
    if (!id) return;

    setIsLoadingPlayerInviteCandidates(true);
    setPlayerError(null);

    try {
      const response = await api.get(
        `/api/community/${id}/players/invite-candidates`,
        {
          params: {
            query: query.trim(),
          },
        },
      );

      setPlayerInviteCandidates(response.data.users as MasterType[]);
    } catch (error) {
      setPlayerError(
        axios.isAxiosError(error)
          ? (error.response?.data?.message ??
              "Unable to load registered players.")
          : "Unable to load registered players.",
      );

      if (axios.isAxiosError(error)) console.error(error.response?.data ?? error);
      else console.error("Load player invite candidates api failed", error);
    } finally {
      setIsLoadingPlayerInviteCandidates(false);
    }
  };

  useEffect(() => {
    if (!isAddPlayerModalOpen || addPlayerMode !== "invite") return;

    const timeoutId = window.setTimeout(() => {
      void loadPlayerInviteCandidates(playerInviteSearchTerm);
    }, 250);

    return () => window.clearTimeout(timeoutId);
  }, [addPlayerMode, id, isAddPlayerModalOpen, playerInviteSearchTerm]);

  const handleSelectPlayerInvite = (accountId: string, isSelected: boolean) => {
    setSelectedPlayerInviteIds((currentIds) => {
      if (isSelected) {
        return currentIds.includes(accountId)
          ? currentIds
          : [...currentIds, accountId];
      }

      return currentIds.filter((currentId) => currentId !== accountId);
    });
    setPlayerError(null);
    setPlayerInviteSuccess(null);
  };

  const handleSendPlayerInvites = async () => {
    if (!id || isSendingPlayerInvites) return;

    if (selectedPlayerInviteIds.length === 0) {
      setPlayerError("Select at least one registered player.");
      return;
    }

    setIsSendingPlayerInvites(true);
    setPlayerError(null);
    setPlayerInviteSuccess(null);

    try {
      await Promise.all(
        selectedPlayerInviteIds.map((accountId) =>
          api.post(`/api/community/${id}/players/invites`, { accountId }),
        ),
      );
      const inviteCount = selectedPlayerInviteIds.length;

      setSelectedPlayerInviteIds([]);
      setPlayerInviteCandidates((currentCandidates) =>
        currentCandidates.filter(
          (candidate) => !selectedPlayerInviteIds.includes(candidate.id),
        ),
      );
      setPlayerInviteSuccess(
        inviteCount === 1
          ? "Community invite sent."
          : `${inviteCount} community invites sent.`,
      );
    } catch (error) {
      setPlayerError(
        axios.isAxiosError(error)
          ? (error.response?.data?.message ?? "Unable to send invite.")
          : "Unable to send invite.",
      );

      if (axios.isAxiosError(error)) console.error(error.response?.data ?? error);
      else console.error("Send player invite api failed", error);
    } finally {
      setIsSendingPlayerInvites(false);
    }
  };

  const openAddAdminModal = () => {
    if (!canAddAdminAsPlayer) return;

    setAddAdminMode("asPlayer");
    setSelectedAdminPlayerIds(
      adminCandidates
        .filter((admin) => adminPlayerAccountIds.has(admin.id))
        .map((admin) => admin.id),
    );
    setSelectedNewAdminIds(
      registeredCommunityAdminCandidates
        .map((communityPlayer) => communityPlayer.player.id)
        .filter(
          (accountId): accountId is string =>
            typeof accountId === "string" && adminAccountIds.has(accountId),
        ),
    );
    setPlayerError(null);
    setAddAdminSuccess(null);
    setIsAddAdminModalOpen(true);
  };

  const closeAddAdminModal = () => {
    if (
      isApplyingNewAdminSelection ||
      isApplyingAdminPlayerSelection ||
      removingAdminRoleId
    )
      return;
    setIsAddAdminModalOpen(false);
    setPlayerError(null);
    setAddAdminSuccess(null);
    setSelectedAdminPlayerIds([]);
    setSelectedNewAdminIds([]);
  };

  const canManageAdminAsPlayer = (adminId: string) =>
    isCommunityOwner || adminId === user?.id || adminId === community?.master.id;

  const handleSelectAdminPlayer = (adminId: string, isSelected: boolean) => {
    setSelectedAdminPlayerIds((currentIds) => {
      if (isSelected) {
        return currentIds.includes(adminId)
          ? currentIds
          : [...currentIds, adminId];
      }

      return currentIds.filter((currentId) => currentId !== adminId);
    });
    setPlayerError(null);
    setAddAdminSuccess(null);
  };

  const handleSelectNewAdmin = (accountId: string, isSelected: boolean) => {
    setSelectedNewAdminIds((currentIds) => {
      if (isSelected) {
        return currentIds.includes(accountId)
          ? currentIds
          : [...currentIds, accountId];
      }

      return currentIds.filter((currentId) => currentId !== accountId);
    });
    setPlayerError(null);
    setAddAdminSuccess(null);
  };

  const handleApplyAdminPlayerSelection = async () => {
    if (!id || isApplyingAdminPlayerSelection) return;

    const selectedIds = new Set(selectedAdminPlayerIds);
    const manageableAdminIds = new Set(
      adminCandidates
        .filter((admin) => canManageAdminAsPlayer(admin.id))
        .map((admin) => admin.id),
    );
    const adminIdsToAdd = adminCandidates
      .filter(
        (admin) =>
          manageableAdminIds.has(admin.id) &&
          selectedIds.has(admin.id) &&
          !adminPlayerAccountIds.has(admin.id),
      )
      .map((admin) => admin.id);
    const adminIdsToRemove = adminCandidates
      .filter(
        (admin) =>
          manageableAdminIds.has(admin.id) &&
          !selectedIds.has(admin.id) &&
          adminPlayerAccountIds.has(admin.id),
      )
      .map((admin) => admin.id);

    if (adminIdsToAdd.length === 0 && adminIdsToRemove.length === 0) {
      setPlayerError("Select at least one change first.");
      return;
    }

    setIsApplyingAdminPlayerSelection(true);
    setPlayerError(null);
    setAddAdminSuccess(null);

    try {
      const addedPlayers = await Promise.all(
        adminIdsToAdd.map(async (adminId) => {
          const response = await api.post(`/api/community/${id}/players/admin`, {
            accountId: adminId,
          });

          return response.data.player as CommunityPlayerRecord;
        }),
      );

      const removedCommunityPlayerIds: Array<{
        adminId: string;
        communityPlayerId?: string;
      }> = await Promise.all(
        adminIdsToRemove.map(async (adminId) => {
          const response = await api.delete(
            `/api/community/${id}/players/admin`,
            {
              data: { accountId: adminId },
            },
          );

          return {
            adminId,
            communityPlayerId: response.data.communityPlayerId as
              | string
              | undefined,
          };
        }),
      );

      if (addedPlayers.length > 0) {
        setCommunityPlayers((currentPlayers) => [
          ...addedPlayers,
          ...currentPlayers.filter(
            (currentPlayer) =>
              !addedPlayers.some(
                (addedPlayer) => addedPlayer.id === currentPlayer.id,
              ),
          ),
        ]);
      }

      if (removedCommunityPlayerIds.length > 0) {
        setCommunityPlayers((currentPlayers) =>
          currentPlayers.filter(
            (currentPlayer) =>
              !removedCommunityPlayerIds.some((removedPlayer) =>
                removedPlayer.communityPlayerId
                  ? currentPlayer.id === removedPlayer.communityPlayerId
                  : currentPlayer.player.id === removedPlayer.adminId,
              ),
          ),
        );
        setCommunityPlayerWinPoints((currentPlayers) =>
          currentPlayers.filter(
            (currentPlayer) =>
              !removedCommunityPlayerIds.some(
                (removedPlayer) =>
                  removedPlayer.communityPlayerId &&
                  currentPlayer.communityPlayerId ===
                    removedPlayer.communityPlayerId,
              ),
          ),
        );
      }

      setAddAdminSuccess("Admin player selection updated.");
      void getCommunityPlayerWinPointsAPI();
    } catch (error) {
      setPlayerError("Unable to update admin players.");

      if (axios.isAxiosError(error))
        console.error(error.response?.data ?? error);
      else console.error("Apply admin player selection api failed", error);
    } finally {
      setIsApplyingAdminPlayerSelection(false);
    }
  };

  const handleApplyNewAdminSelection = async () => {
    if (!isCommunityOwner) {
      setPlayerError("Only the community owner can add new admins.");
      return;
    }

    if (!id || !community || isApplyingNewAdminSelection) return;

    const selectedIds = new Set(selectedNewAdminIds);
    const candidateAccountIds = registeredCommunityAdminCandidates
      .map((communityPlayer) => communityPlayer.player.id)
      .filter((accountId): accountId is string => Boolean(accountId));
    const accountIdsToAdd = candidateAccountIds.filter(
      (accountId) =>
        accountId !== community.master.id &&
        selectedIds.has(accountId) &&
        !adminAccountIds.has(accountId),
    );
    const accountIdsToRemove = candidateAccountIds.filter(
      (accountId) =>
        accountId !== community.master.id &&
        !selectedIds.has(accountId) &&
        adminAccountIds.has(accountId),
    );

    if (accountIdsToAdd.length === 0 && accountIdsToRemove.length === 0) {
      setPlayerError("Select at least one change first.");
      return;
    }

    setIsApplyingNewAdminSelection(true);
    setPlayerError(null);
    setAddAdminSuccess(null);

    try {
      const addedAdmins = await Promise.all(
        accountIdsToAdd.map(async (accountId) => {
          const response = await api.post(`/api/community/${id}/admins`, {
            accountId,
          });

          return response.data.admin as CommunityAdminType;
        }),
      );
      const removedPlayers = await Promise.all(
        accountIdsToRemove.map(async (accountId) => {
          const response = await api.delete(
            `/api/community/${id}/admins/${accountId}`,
          );

          return {
            accountId,
            player: response.data.player as CommunityPlayerRecord,
          };
        }),
      );

      setCommunity((currentCommunity) =>
        currentCommunity
          ? {
              ...currentCommunity,
              admins: [
                ...currentCommunity.admins.filter(
                  (currentAdmin) =>
                    !accountIdsToRemove.includes(currentAdmin.account.id) &&
                    !addedAdmins.some(
                      (admin) =>
                        admin.account.id === currentAdmin.account.id,
                    ),
                ),
                ...addedAdmins,
              ].sort((firstAdmin, secondAdmin) =>
                firstAdmin.account.username.localeCompare(
                  secondAdmin.account.username,
                ),
              ),
            }
          : currentCommunity,
      );

      removedPlayers.forEach(({ player }) =>
        updateCommunityPlayerInState(player),
      );
      setAddAdminSuccess("New admin selection updated.");
    } catch (error) {
      setPlayerError(
        axios.isAxiosError(error)
          ? (error.response?.data?.message ?? "Unable to update admin status.")
          : "Unable to update admin status.",
      );

      if (axios.isAxiosError(error)) console.error(error.response?.data ?? error);
      else console.error("Apply new admin selection api failed", error);
    } finally {
      setIsApplyingNewAdminSelection(false);
    }
  };

  const handleRemoveAdminRole = async (admin: AdminCandidate) => {
    if (!id || removingAdminRoleId) return;

    if (!isCommunityOwner) {
      setPlayerError("Only the community owner can remove admins.");
      return;
    }

    if (admin.id === community?.master.id) {
      setPlayerError("The community owner cannot be removed as admin.");
      return;
    }

    setRemovingAdminRoleId(admin.id);
    setPlayerError(null);
    setAddAdminSuccess(null);

    try {
      const response = await api.delete(
        `/api/community/${id}/admins/${admin.id}`,
      );
      const player = response.data.player as CommunityPlayerRecord;

      setCommunity((currentCommunity) =>
        currentCommunity
          ? {
              ...currentCommunity,
              admins: currentCommunity.admins.filter(
                (currentAdmin) => currentAdmin.account.id !== admin.id,
              ),
            }
          : currentCommunity,
      );
      setCommunityPlayers((currentPlayers) => [
        player,
        ...currentPlayers.filter(
          (currentPlayer) => currentPlayer.id !== player.id,
        ),
      ]);
      setSelectedAdminPlayerIds((currentIds) =>
        currentIds.includes(admin.id) ? currentIds : [...currentIds, admin.id],
      );
      setSelectedNewAdminIds((currentIds) =>
        currentIds.filter((currentId) => currentId !== admin.id),
      );
      setAddAdminSuccess(`${admin.username} is now a player.`);
    } catch (error) {
      setPlayerError(
        axios.isAxiosError(error)
          ? (error.response?.data?.message ?? "Unable to remove admin role.")
          : "Unable to remove admin role.",
      );

      if (axios.isAxiosError(error)) console.error(error.response?.data ?? error);
      else console.error("Remove community admin role api failed", error);
    } finally {
      setRemovingAdminRoleId(null);
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
      setCommunityPlayerEditError(
        axios.isAxiosError(error)
          ? (error.response?.data?.message ?? "Unable to update this player.")
          : "Unable to update this player.",
      );

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
    if (!isCommunityOwner) {
      setCommunityError("Only the community owner can delete this community.");
      return;
    }

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

  const handleLeaveCommunity = async () => {
    if (isCommunityOwner) {
      setCommunityError("Community owners cannot leave their own community.");
      return;
    }

    if (!id || !community || isLeavingCommunity) return;

    const confirmed = window.confirm(
      `Leave "${community.communityName}"? You will lose access to this community and its hosts.`,
    );

    if (!confirmed) return;

    setIsLeavingCommunity(true);
    setCommunityError(null);
    setOpenDropdownCommunity(false);

    try {
      await api.delete(`/api/community/${id}/leave`);
      await refetchCommunities();
      navigate("/community", { replace: true });
    } catch (error) {
      setCommunityError(
        axios.isAxiosError(error)
          ? (error.response?.data?.message ?? "Unable to leave community.")
          : "Unable to leave community.",
      );

      if (axios.isAxiosError(error))
        console.error(error.response?.data ?? error);
      else console.error("Leave community api failed", error);
    } finally {
      setIsLeavingCommunity(false);
    }
  };

  const handleEditCommunity = async (form: {
    profileUrl: string;
    communityName: string;
    description: string;
  }) => {
    if (!isCommunityOwner) {
      setEditCommunityError("Only the community owner can edit this community.");
      return;
    }

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

  const isInitialCommunityLoading =
    isCommunityLoading || isCommunityHostsLoading || isCommunityPlayersLoading;

  if (isInitialCommunityLoading) {
    return (
      <LoadingState
        title="Loading community"
        message="Fetching hosts, players, and rankings..."
      />
    );
  }

  if (!community && communityError) {
    return (
      <div className="flex min-h-[320px] w-full items-center justify-center px-4 py-10">
        <div className="w-full max-w-md rounded-3xl border border-red-100 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-red-600">{communityError}</p>
          <button
            type="button"
            onClick={() => {
              void getCommunityAPI();
              void getCommunityHostsAPI();
              void getCommunityPlayersAPI();
              void getCommunityPlayerWinPointsAPI();
            }}
            className="mt-4 w-fit rounded-2xl bg-text px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {isEditModalOpen && community && isCommunityOwner ? (
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
                <h4 className="text-lg font-semibold text-text">Edit player</h4>
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
                    disabled={
                      savingCommunityPlayerId === editingCommunityPlayer.id
                    }
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
                  disabled={
                    savingCommunityPlayerId === editingCommunityPlayer.id
                  }
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
                  disabled={
                    savingCommunityPlayerId === editingCommunityPlayer.id
                  }
                  className="rounded-xl border border-orange-100 bg-white px-4 py-2.5 text-sm text-stone-700 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:cursor-not-allowed disabled:bg-stone-50"
                >
                  {SKILL_LEVEL_OPTIONS.map((skillLevel) => (
                    <option key={skillLevel.value} value={skillLevel.value}>
                      {skillLevel.acronym} {skillLevel.label}
                    </option>
                  ))}
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
                  disabled={
                    savingCommunityPlayerId === editingCommunityPlayer.id
                  }
                  className="rounded-xl border border-stone-200 bg-white px-5 py-2.5 text-sm font-semibold text-stone-600 hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={
                    savingCommunityPlayerId === editingCommunityPlayer.id
                  }
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
          onClick={closeAddPlayerModal}
        >
          <div
            onClick={(event) => event.stopPropagation()}
            className="w-full max-w-lg rounded-3xl border border-orange-100 bg-white p-5 shadow-2xl"
          >
            <header className="flex items-start justify-between gap-4">
              <div>
                <h4 className="text-lg font-semibold text-text">Add players</h4>
              </div>

              <button
                type="button"
                onClick={closeAddPlayerModal}
                disabled={isCreatingPlayers || isSendingPlayerInvites}
                className="rounded-full p-3 text-sm font-semibold text-stone-500 hover:bg-stone-100 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </header>

            <div className="mt-5 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  setAddPlayerMode("static");
                  setPlayerError(null);
                  setPlayerInviteSuccess(null);
                }}
                className={`rounded-xl px-4 py-2 text-sm font-semibold transition cursor-pointer ${
                  addPlayerMode === "static"
                    ? "bg-primary text-white"
                    : "border border-orange-100 bg-white text-stone-700 hover:bg-orange-50"
                }`}
              >
                Static players
              </button>
              <button
                type="button"
                onClick={() => {
                  setAddPlayerMode("invite");
                  setPlayerError(null);
                  setPlayerInviteSuccess(null);
                }}
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition cursor-pointer ${
                  addPlayerMode === "invite"
                    ? "bg-primary text-white"
                    : "border border-orange-100 bg-white text-stone-700 hover:bg-orange-50"
                }`}
              >
                <UserPlus size={15} />
                Invite users
              </button>
            </div>

            {addPlayerMode === "static" ? (
            <form onSubmit={handleCreatePlayers} className="mt-5 grid gap-4">
              <label className="grid gap-2 text-sm">
                <span className="font-medium text-stone-700">Player names</span>
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
                  {SKILL_LEVEL_OPTIONS.map((skillLevel) => (
                    <option key={skillLevel.value} value={skillLevel.value}>
                      {skillLevel.acronym} {skillLevel.label}
                    </option>
                  ))}
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
                  onClick={closeAddPlayerModal}
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
            ) : (
              <div className="mt-5 overflow-hidden rounded-2xl border border-orange-100">
                <div className="border-b border-orange-100 bg-orange-50/30 p-3">
                  <div className="flex items-center gap-2 rounded-xl border border-orange-100 bg-white px-3 py-2">
                    <Search size={17} className="shrink-0 text-stone-400" />
                    <input
                      type="text"
                      value={playerInviteSearchTerm}
                      onChange={(event) =>
                        setPlayerInviteSearchTerm(event.target.value)
                      }
                      placeholder="Search users"
                      disabled={isSendingPlayerInvites}
                      className="min-w-0 flex-1 bg-transparent text-sm text-stone-700 outline-none placeholder:text-stone-400"
                    />
                  </div>
                </div>

                <div className="max-h-72 overflow-y-auto divide-y divide-orange-100 bg-white">
                  {isLoadingPlayerInviteCandidates ? (
                    <div className="px-4 py-8 text-center text-sm text-stone-500">
                      Loading users...
                    </div>
                  ) : playerInviteCandidates.length === 0 ? (
                    <div className="px-4 py-8 text-center text-sm text-stone-500">
                      No users available to invite.
                    </div>
                  ) : (
                    playerInviteCandidates.map((candidate) => {
                      const isSelected = selectedPlayerInviteIds.includes(
                        candidate.id,
                      );

                      return (
                        <label
                          key={candidate.id}
                          className="flex cursor-pointer items-center gap-3 px-4 py-3 transition hover:bg-orange-50/40"
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(event) =>
                              handleSelectPlayerInvite(
                                candidate.id,
                                event.target.checked,
                              )
                            }
                            disabled={isSendingPlayerInvites}
                            className="h-4 w-4 accent-primary"
                          />
                          <img
                            src={candidate.profileUrl}
                            alt={candidate.username}
                            className="h-10 w-10 shrink-0 rounded-full object-cover"
                          />
                          <span className="min-w-0 truncate text-sm font-semibold text-text">
                            {candidate.username}
                          </span>
                        </label>
                      );
                    })
                  )}
                </div>

                {playerError ? (
                  <p className="border-t border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
                    {playerError}
                  </p>
                ) : null}

                {playerInviteSuccess ? (
                  <p className="border-t border-green-100 bg-green-50 px-4 py-3 text-sm text-green-700">
                    {playerInviteSuccess}
                  </p>
                ) : null}

                <div className="flex justify-end gap-3 border-t border-orange-100 bg-orange-50/30 px-4 py-3">
                  <button
                    type="button"
                    onClick={closeAddPlayerModal}
                    disabled={isSendingPlayerInvites}
                    className="rounded-xl border border-stone-200 bg-white px-5 py-2.5 text-sm font-semibold text-stone-600 hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleSendPlayerInvites()}
                    disabled={
                      isSendingPlayerInvites ||
                      selectedPlayerInviteIds.length === 0
                    }
                    className="rounded-xl cursor-pointer bg-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-accent disabled:cursor-not-allowed disabled:bg-stone-200 disabled:text-stone-400"
                  >
                    {isSendingPlayerInvites
                      ? "Inviting..."
                      : `Send invites (${selectedPlayerInviteIds.length})`}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}
      {isAddAdminModalOpen && canAddAdminAsPlayer ? (
        <div
          className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 px-4"
          onClick={closeAddAdminModal}
        >
          <div
            onClick={(event) => event.stopPropagation()}
            className="w-full max-w-2xl rounded-3xl border border-orange-100 bg-white p-5 shadow-2xl"
          >
            <header className="flex items-start justify-between gap-4">
              <div>
                <h4 className="text-lg font-semibold text-text">Add admin</h4>
                <p className="mt-1 text-sm text-stone-500">
                  Select rows first, then apply the changes.
                </p>
              </div>

              <button
                type="button"
                onClick={closeAddAdminModal}
                disabled={Boolean(
                  isApplyingAdminPlayerSelection ||
                    isApplyingNewAdminSelection ||
                    removingAdminRoleId,
                )}
                className="rounded-full p-3 text-sm font-semibold text-stone-500 hover:bg-stone-100 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </header>

            {isCommunityOwner ? (
              <div className="mt-5 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setAddAdminMode("asPlayer");
                    setSelectedAdminPlayerIds(
                      adminCandidates
                        .filter((admin) => adminPlayerAccountIds.has(admin.id))
                        .map((admin) => admin.id),
                    );
                    setPlayerError(null);
                    setAddAdminSuccess(null);
                  }}
                  className={`rounded-xl px-4 py-2 text-sm font-semibold transition cursor-pointer ${
                    addAdminMode === "asPlayer"
                      ? "bg-primary text-white"
                      : "border border-orange-100 bg-white text-stone-700 hover:bg-orange-50"
                  }`}
                >
                  As Player
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAddAdminMode("newAdmin");
                    setSelectedNewAdminIds(
                      registeredCommunityAdminCandidates
                        .map((communityPlayer) => communityPlayer.player.id)
                        .filter(
                          (accountId): accountId is string =>
                            typeof accountId === "string" &&
                            adminAccountIds.has(accountId),
                        ),
                    );
                    setPlayerError(null);
                    setAddAdminSuccess(null);
                  }}
                  className={`rounded-xl px-4 py-2 text-sm font-semibold transition cursor-pointer ${
                    addAdminMode === "newAdmin"
                      ? "bg-primary text-white"
                      : "border border-orange-100 bg-white text-stone-700 hover:bg-orange-50"
                  }`}
                >
                  New Admin
                </button>
              </div>
            ) : null}

            {addAdminMode === "asPlayer" || !isCommunityOwner ? (
              <div className="mt-5 overflow-hidden rounded-2xl border border-orange-100">
                <table className="w-full text-sm">
                  <thead className="bg-orange-50/60">
                    <tr>
                      <th className="w-12 px-4 py-3 text-left text-xs font-semibold uppercase text-stone-500">
                        Player
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-stone-500">
                        Admin
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-stone-500">
                        Status
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-stone-500">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-orange-100 bg-white">
                    {adminCandidates.map((admin) => {
                      const isAlreadyPlayer =
                        communityPlayers.some(
                          (communityPlayer) =>
                            communityPlayer.player.id === admin.id,
                        );
                      const isOwner = admin.id === community?.master.id;
                      const canToggleAdmin =
                        isCommunityOwner ||
                        admin.id === user?.id ||
                        isOwner;
                      const isSelected =
                        selectedAdminPlayerIds.includes(admin.id);
                      const isRemovingAdminRole =
                        removingAdminRoleId === admin.id;

                      return (
                        <tr
                          key={admin.id}
                          className="transition hover:bg-orange-50/40"
                        >
                          <td className="px-4 py-3">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(event) =>
                                handleSelectAdminPlayer(
                                  admin.id,
                                  event.target.checked,
                                )
                              }
                              disabled={
                                isApplyingAdminPlayerSelection ||
                                !canToggleAdmin
                              }
                              className="h-4 w-4 accent-primary"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex min-w-0 items-center gap-3">
                              <img
                                src={admin.profileUrl}
                                alt={admin.username}
                                className="h-10 w-10 shrink-0 rounded-full object-cover"
                              />
                              <p className="truncate font-semibold text-text">
                                {admin.username}
                              </p>
                              <span className="rounded-full bg-orange-50 px-2 py-0.5 text-[10px] font-semibold text-primary">
                                {admin.roleLabel}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                isAlreadyPlayer
                                  ? "bg-green-50 text-green-700"
                                  : isSelected
                                    ? "bg-blue-50 text-blue-700"
                                    : "bg-stone-100 text-stone-600"
                              }`}
                            >
                              {isApplyingAdminPlayerSelection
                                ? "Saving..."
                                : isAlreadyPlayer
                                  ? isSelected
                                    ? "Player"
                                    : "Will remove"
                                  : isSelected
                                    ? "Selected"
                                    : "Admin only"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              type="button"
                              title="Remove as Admin."
                              aria-label={`Remove ${admin.username} as admin`}
                              onClick={() => void handleRemoveAdminRole(admin)}
                              disabled={
                                !isCommunityOwner ||
                                isOwner ||
                                Boolean(removingAdminRoleId) ||
                                isApplyingAdminPlayerSelection
                              }
                              className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-red-200 bg-white text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              <Trash size={15} />
                            </button>
                            {isRemovingAdminRole ? (
                              <span className="sr-only">Removing...</span>
                            ) : null}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {playerError ? (
                  <p className="border-t border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
                    {playerError}
                  </p>
                ) : null}

                {addAdminSuccess ? (
                  <p className="border-t border-green-100 bg-green-50 px-4 py-3 text-sm text-green-700">
                    {addAdminSuccess}
                  </p>
                ) : null}

                <div className="flex justify-end gap-3 border-t border-orange-100 bg-orange-50/30 px-4 py-3">
                  <button
                    type="button"
                    onClick={closeAddAdminModal}
                    disabled={
                      isApplyingAdminPlayerSelection ||
                      Boolean(removingAdminRoleId)
                    }
                    className="rounded-xl border border-stone-200 bg-white px-5 py-2.5 text-sm font-semibold text-stone-600 hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleApplyAdminPlayerSelection()}
                    disabled={
                      isApplyingAdminPlayerSelection ||
                      Boolean(removingAdminRoleId) ||
                      !hasAdminPlayerSelectionChanges
                    }
                    className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-accent disabled:cursor-not-allowed disabled:bg-stone-200 disabled:text-stone-400 cursor-pointer"
                  >
                    {isApplyingAdminPlayerSelection
                      ? "Saving..."
                      : "Save"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-5 overflow-hidden rounded-2xl border border-orange-100">
                <table className="w-full text-sm">
                  <thead className="bg-orange-50/60">
                    <tr>
                      <th className="w-12 px-4 py-3 text-left text-xs font-semibold uppercase text-stone-500">
                        Select
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-stone-500">
                        User
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-stone-500">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-orange-100 bg-white">
                    {isCommunityPlayersLoading ? (
                      <tr>
                        <td
                          colSpan={3}
                          className="px-4 py-8 text-center text-sm text-stone-500"
                        >
                          Loading players...
                        </td>
                      </tr>
                    ) : registeredCommunityAdminCandidates.length === 0 ? (
                      <tr>
                        <td
                          colSpan={3}
                          className="px-4 py-8 text-center text-sm text-stone-500"
                        >
                          No community players available.
                        </td>
                      </tr>
                    ) : (
                      registeredCommunityAdminCandidates.map(
                        (communityPlayer) => {
                          const accountId = communityPlayer.player.id;
                          if (!accountId) return null;

                          const isOwner = accountId === community?.master.id;
                          const isAdmin = adminAccountIds.has(accountId);
                          const isSelected =
                            selectedNewAdminIds.includes(accountId);

                        return (
                          <tr
                            key={communityPlayer.id}
                            className="transition hover:bg-orange-50/40"
                          >
                            <td className="px-4 py-3">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={(event) =>
                                  handleSelectNewAdmin(
                                    accountId,
                                    event.target.checked,
                                  )
                                }
                                disabled={
                                  isApplyingNewAdminSelection || isOwner
                                }
                                className="h-4 w-4 accent-primary"
                              />
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex min-w-0 items-center gap-3">
                                <img
                                  src={communityPlayer.player.profileUrl}
                                  alt={communityPlayer.player.username}
                                  className="h-10 w-10 shrink-0 rounded-full object-cover"
                                />
                                <p className="truncate font-semibold text-text">
                                  {communityPlayer.player.username}
                                </p>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                  isOwner
                                    ? "bg-orange-50 text-primary"
                                    : isAdmin
                                      ? "bg-green-50 text-green-700"
                                      : isSelected
                                        ? "bg-blue-50 text-blue-700"
                                        : "bg-stone-100 text-stone-600"
                                }`}
                              >
                                {isApplyingNewAdminSelection
                                  ? "Saving..."
                                  : isOwner
                                    ? "Owner"
                                    : isAdmin
                                      ? isSelected
                                        ? "Admin"
                                        : "Will remove"
                                      : isSelected
                                        ? "Selected"
                                        : "Player"}
                              </span>
                            </td>
                          </tr>
                        );
                        },
                      )
                    )}
                  </tbody>
                </table>

                {playerError ? (
                  <p className="border-t border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
                    {playerError}
                  </p>
                ) : null}

                {addAdminSuccess ? (
                  <p className="border-t border-green-100 bg-green-50 px-4 py-3 text-sm text-green-700">
                    {addAdminSuccess}
                  </p>
                ) : null}

                <div className="flex justify-end gap-3 border-t border-orange-100 bg-orange-50/30 px-4 py-3">
                  <button
                    type="button"
                    onClick={closeAddAdminModal}
                    disabled={isApplyingNewAdminSelection}
                    className="rounded-xl border border-stone-200 bg-white px-5 py-2.5 text-sm font-semibold text-stone-600 hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleApplyNewAdminSelection()}
                    disabled={
                      isApplyingNewAdminSelection ||
                      !hasNewAdminSelectionChanges
                    }
                    className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold cursor-pointer text-white transition hover:bg-accent disabled:cursor-not-allowed disabled:bg-stone-200 disabled:text-stone-400"
                  >
                    {isApplyingNewAdminSelection ? "Saving..." : "Save"}
                  </button>
                </div>
              </div>
            )}
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
            className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-orange-100 bg-white shadow-2xl"
          >
            <header className="flex shrink-0 items-start justify-between gap-4 border-b border-orange-100 px-5 py-4">
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

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-5">
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
                <div className="mt-4 grid gap-3">
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
                            {historyItem.reason === "payment"
                              ? "Attendance"
                              : "Win"}
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
              {community?.description?.trim() ? (
                <p className="mt-2 max-w-2xl text-sm text-stone-500">
                  {community.description}
                </p>
              ) : null}
            </div>
          </div>

          {community?.isMember ? (
            <div ref={dropdownRef} className="relative">
              <div
                onClick={() => setOpenDropdownCommunity((prev) => !prev)}
                className="p-1 rounded-full cursor-pointer hover:bg-primary/10"
              >
                <EllipsisVertical size={20} />
              </div>

              {openDropdownCommunity && (
                <div className="absolute right-0 z-10 border border-primary py-2 w-[240px] top-8 rounded-lg bg-white shadow-lg">
                  {isCommunityOwner ? (
                    <>
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
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => void handleLeaveCommunity()}
                      disabled={isLeavingCommunity}
                      className="flex w-full items-center gap-x-[16px] px-[16px] py-1 text-start text-[14px] cursor-pointer hover:bg-red-400 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <UserMinus size={18} />
                      {isLeavingCommunity ? "Leaving..." : "Leave community"}
                    </button>
                  )}
                </div>
              )}
            </div>
          ) : null}
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
            onClick={() => {
              if (!canManageCommunity) return;
              openCreateHostModal();
            }}
            disabled={!canManageCommunity}
            aria-pressed={activePanel === "host"}
            className={`flex items-center justify-between rounded-2xl border px-5 py-4 text-left transition ${
              !canManageCommunity
                ? "cursor-not-allowed border-gray-200 bg-gray-50 text-gray-400"
                : activePanel === "host"
                ? "cursor-pointer border-primary bg-primary text-white shadow-sm"
                : "cursor-pointer border-gray-200 bg-white text-text hover:border-primary/40 hover:bg-orange-50"
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
            onClick={() => {
              if (!canManageCommunity) return;
              setActivePanel((currentPanel) =>
                currentPanel === "players" ? null : "players",
              );
            }}
            disabled={!canManageCommunity}
            aria-pressed={activePanel === "players"}
            className={`flex items-center justify-between rounded-2xl border px-5 py-4 text-left transition ${
              !canManageCommunity
                ? "cursor-not-allowed border-gray-200 bg-gray-50 text-gray-400"
                : activePanel === "players"
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

            <span className="flex items-center gap-2">
              {requestedCommunityPlayers.length > 0 ? (
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    activePanel === "players"
                      ? "bg-yellow-200 text-yellow-950"
                      : "bg-yellow-100 text-yellow-800"
                  }`}
                >
                  {requestedCommunityPlayers.length} requests
                </span>
              ) : null}
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  activePanel === "players"
                    ? "bg-white/15 text-white"
                    : "bg-primary/10 text-primary"
                }`}
              >
                {communityPlayers.length}
              </span>
            </span>
          </button>
        </div>

        {activePanel === "host" ? (
          <div
            className="fixed inset-0 z-[900] flex items-center justify-center bg-black/40 px-4 py-6"
            onClick={closeHostModal}
          >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="host-form-title"
            className="max-h-[calc(100dvh-2rem)] w-full max-w-5xl overflow-y-auto rounded-3xl border border-gray-200 bg-white p-5 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 id="host-form-title" className="text-lg font-semibold text-text">
                  {editingHostId ? "Edit hosted match" : "Host a Match"}
                </h3>
              </div>

              <div className="flex items-center gap-x-2">
                {editingHostId ? (
                  <button
                    type="button"
                    onClick={resetHostForm}
                    className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-stone-600 transition hover:bg-gray-50 cursor-pointer"
                  >
                    Cancel edit
                  </button>
                ) : null}

                <button
                  type="button"
                  onClick={closeHostModal}
                  disabled={isCreatingHost}
                  className="rounded-full p-2 text-sm font-semibold text-stone-500 hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                  aria-label="Close host form"
                >
                  <X size={18} />
                </button>
              </div>
              
            </div>

            <form
              onSubmit={handleCreateHost}
              className="grid grid-cols-1 items-end gap-4 sm:grid-cols-2 lg:grid-cols-3"
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
                      {sportOption.charAt(0).toUpperCase() +
                        sportOption.slice(1)}
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
                {isCreatingHost
                  ? editingHostId
                    ? "Saving..."
                    : "Hosting..."
                  : editingHostId
                    ? "Save changes"
                    : "Host"}
              </button>
            </form>

            {hostError ? (
              <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                {hostError}
              </p>
            ) : null}
          </section>
          </div>
        ) : null}

        {activePanel === "players" ? (
          <div
            className="fixed inset-0 z-[900] flex items-center justify-center bg-black/40 px-4 py-6"
            onClick={() => setActivePanel(null)}
          >
            <section
              role="dialog"
              aria-modal="true"
              aria-labelledby="community-players-title"
              className="flex max-h-[calc(100dvh-2rem)] w-full max-w-6xl flex-col overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
            <div className="flex items-center shrink-0 flex-col gap-4 border-b border-gray-200 px-5 py-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h3
                  id="community-players-title"
                  className="text-lg font-semibold text-text"
                >
                  Community Players
                </h3>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <label className="flex min-w-[220px] flex-1 items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-stone-700 focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10">
                  <Search size={16} className="shrink-0 text-stone-400" />
                  <input
                    type="search"
                    value={communityPlayerSearchTerm}
                    onChange={(event) =>
                      setCommunityPlayerSearchTerm(event.target.value)
                    }
                    placeholder="Search players"
                    className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-stone-400"
                  />
                </label>

                <button
                  type="button"
                  title={`Sort players ${
                    communityPlayerNameSortDirection === "asc"
                      ? "descending"
                      : "ascending"
                  }`}
                  onClick={() =>
                    setCommunityPlayerNameSortDirection((currentDirection) =>
                      currentDirection === "asc" ? "desc" : "asc",
                    )
                  }
                  className="inline-flex items-center gap-1.5 rounded-xl border border-orange-200 bg-white px-3 py-2 text-xs font-semibold text-stone-600 transition hover:bg-orange-50 cursor-pointer"
                >
                  {communityPlayerNameSortDirection === "asc" ? (
                    <AArrowUp size={17} />
                  ) : (
                    <AArrowDown size={17} />
                  )}
                  {communityPlayerNameSortDirection === "asc"
                    ? "Ascending"
                    : "Descending"}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setAddPlayerMode("static");
                    setPlayerInviteSuccess(null);
                    setSelectedPlayerInviteIds([]);
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
                  onClick={openAddAdminModal}
                  className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-white transition hover:bg-accent"
                >
                  <UserPlus size={15} />
                  Add admin
                </button>

                {searchedRequestedCommunityPlayers.length > 0 ? (
                  <div className="rounded-full bg-yellow-100 px-3 py-1 text-sm font-semibold text-yellow-800">
                    {searchedRequestedCommunityPlayers.length} requests
                  </div>
                ) : null}

                <div className="rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
                  {isLoadingWinPoints ? "..." : `${communityPlayers.length}`}
                </div>

                <button
                  type="button"
                  onClick={() => setActivePanel(null)}
                  className="rounded-full p-2 text-sm font-semibold text-stone-500 hover:bg-stone-100 cursor-pointer"
                  aria-label="Close players modal"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="flex shrink-0 flex-col gap-3 border-b border-gray-100 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-wrap gap-2">
                {(["all", "month", "day", "weekday"] as const).map((filterMode) => (
                  <button
                    key={filterMode}
                    type="button"
                    onClick={() => setPointsFilterMode(filterMode)}
                    className={`rounded-xl px-3 py-2 text-xs font-semibold capitalize transition cursor-pointer ${
                      pointsFilterMode === filterMode
                        ? "bg-primary text-white"
                        : "cursor-pointer border border-gray-200 bg-white text-stone-600 hover:border-primary/40 hover:bg-orange-50"
                      }`}
                  >
                    {filterMode === "day"
                      ? "Daily"
                      : filterMode === "weekday"
                        ? "Month + day"
                        : filterMode}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {pointsFilterMode === "month" ? (
                  <input
                    type="month"
                    value={pointsFilterMonth}
                    onChange={(event) =>
                      setPointsFilterMonth(event.target.value)
                    }
                    className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-stone-700 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
                  />
                ) : null}

                {pointsFilterMode === "weekday" ? (
                  <>
                    <input
                      type="month"
                      value={pointsFilterMonth}
                      onChange={(event) =>
                        setPointsFilterMonth(event.target.value)
                      }
                      className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-stone-700 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
                    />
                    <select
                      value={pointsFilterWeekday}
                      onChange={(event) =>
                        setPointsFilterWeekday(event.target.value)
                      }
                      className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-stone-700 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
                    >
                      {POINTS_WEEKDAY_OPTIONS.map((weekdayOption) => (
                        <option
                          key={weekdayOption.value}
                          value={weekdayOption.value}
                        >
                          {weekdayOption.label}
                        </option>
                      ))}
                    </select>
                  </>
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

                {isLoadingWinPoints ? (
                  <span
                    aria-live="polite"
                    className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary"
                  >
                    <LoaderCircle className="animate-spin" size={13} />
                    Updating points...
                  </span>
                ) : null}
              </div>
            </div>

            {playerError && !isAddPlayerModalOpen ? (
              <p className="mx-5 mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                {playerError}
              </p>
            ) : null}

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-5">
              {searchedRequestedCommunityPlayers.length > 0 ? (
                <section className="mb-5 overflow-hidden rounded-2xl border border-yellow-200 bg-yellow-50/40">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-yellow-200 px-4 py-3">
                    <div>
                      <h4 className="text-sm font-semibold text-yellow-950">
                        Requested players
                      </h4>
                      <p className="text-xs text-yellow-800">
                        Review people waiting to join this community.
                      </p>
                    </div>
                    <span className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-semibold text-yellow-800">
                      {searchedRequestedCommunityPlayers.length}
                    </span>
                  </div>

                  <div className="divide-y divide-yellow-200 bg-white">
                    {searchedRequestedCommunityPlayers.map((communityPlayer) => (
                      <div
                        key={communityPlayer.id}
                        className="grid gap-3 px-4 py-3 md:grid-cols-[minmax(0,1fr)_auto]"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <img
                            src={communityPlayer.player.profileUrl}
                            alt={communityPlayer.player.username}
                            className="h-11 w-11 shrink-0 rounded-full object-cover"
                          />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-text">
                              {communityPlayer.player.username}
                            </p>
                            <div className="mt-1 flex flex-wrap gap-1.5">
                              <SkillLevelBadge
                                skillLevel={communityPlayer.player.skillLevel}
                              />
                              <span className="rounded-full bg-yellow-50 px-2 py-0.5 text-[10px] font-medium text-yellow-700">
                                requested
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 md:justify-end">
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
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              ) : null}

              <div
                className={`grid content-start gap-3 transition-opacity sm:grid-cols-2 xl:grid-cols-3 ${
                  isLoadingWinPoints ? "opacity-60" : "opacity-100"
                }`}
              >
                {searchedRosterCommunityPlayers.length > 0 ? (
                  searchedRosterCommunityPlayers.map((communityPlayer) => {
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
                              <SkillLevelBadge
                                skillLevel={communityPlayer.player.skillLevel}
                              />
                              <span
                                className={`rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${
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
                                onClick={() =>
                                  openEditCommunityPlayer(communityPlayer)
                                }
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
                                  void handleDeleteCommunityPlayer(
                                    communityPlayer,
                                  )
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
                                    savingCommunityPlayerId ===
                                    communityPlayer.id
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
                                    savingCommunityPlayerId ===
                                    communityPlayer.id
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
                                    savingCommunityPlayerId ===
                                    communityPlayer.id
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
                    {communityPlayerSearchTerm.trim()
                      ? "No players match your search."
                      : requestedCommunityPlayers.length > 0
                      ? "No approved community players yet."
                      : "No community players yet."}
                  </div>
                )}
              </div>
            </div>
            </section>
          </div>
        ) : null}

        <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white">
          <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
            <div>
              <h3 className="text-lg font-semibold text-text">Active Hosts</h3>
              <p className="text-sm text-gray-500">Manage match queues</p>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                onClick={() =>
                  setHostScheduleSortDirection((currentDirection) =>
                    currentDirection === "asc" ? "desc" : "asc",
                  )
                }
                className="inline-flex items-center gap-1.5 rounded-xl border border-orange-200 bg-white px-3 py-2 text-xs font-semibold text-stone-600 transition hover:bg-orange-50 cursor-pointer"
                aria-label={`Sort hosts ${
                  hostScheduleSortDirection === "asc"
                    ? "descending"
                    : "ascending"
                }`}
              >
                {hostScheduleSortDirection === "asc" ? (
                  <AArrowUp size={17} aria-hidden="true" />
                ) : (
                  <AArrowDown size={17} aria-hidden="true" />
                )}
                {hostScheduleSortDirection === "asc"
                  ? "Ascending"
                  : "Descending"}
              </button>

              <div className="rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
                {communityHosts.length}
              </div>
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
                    <button
                      type="button"
                      onClick={() =>
                        setHostScheduleSortDirection((currentDirection) =>
                          currentDirection === "asc" ? "desc" : "asc",
                        )
                      }
                      className="w-full flex items-center justify-between gap-1.5 rounded-md text-xs font-semibold uppercase text-gray-500 transition hover:text-text focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
                      aria-label={`Sort schedule ${
                        hostScheduleSortDirection === "asc"
                          ? "descending"
                          : "ascending"
                      }`}
                    >
                      <span>Schedule</span>
                      {hostScheduleSortDirection === "asc" ? (
                        <AArrowUp size={14} aria-hidden="true" />
                      ) : (
                        <AArrowDown size={14} aria-hidden="true" />
                      )}
                    </button>
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
                {sortedCommunityHosts.map((communityHost) => (
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
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={(event) => openEditHost(event, communityHost)}
                          className="w-fit rounded-full p-1 text-gray-500 transition hover:bg-orange-100 hover:text-primary cursor-pointer"
                          aria-label={`Edit ${communityHost.hostName}`}
                        >
                          <SquarePen size={18} />
                        </button>
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
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* MOBILE / TABLET CARDS (<1024px) */}
          <div className="grid gap-3 p-4 lg:hidden">
            {sortedCommunityHosts.map((communityHost) => (
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

                <div className="mt-4 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={(event) => openEditHost(event, communityHost)}
                    className="inline-flex items-center gap-2 rounded-xl border border-orange-200 px-3 py-2 text-xs font-medium text-primary transition hover:bg-orange-50 cursor-pointer"
                    aria-label={`Edit ${communityHost.hostName}`}
                  >
                    <SquarePen size={16} />
                    Edit
                  </button>
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
