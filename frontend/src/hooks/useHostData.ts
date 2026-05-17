import type { Dispatch, SetStateAction } from "react";
import { useOutletContext } from "react-router-dom";
import type {
  AcceptedPlayers,
  CourtType,
  HostMeta,
  HostPaymentsData,
  HostPlayerRecord,
  FinishedMatchHistoryPayload,
  PlayerHistoryTarget,
  QueueType,
} from "../lib/host";

export type HostOutletContext = {
  playersInHost: HostPlayerRecord[];
  setPlayersInHost: Dispatch<SetStateAction<HostPlayerRecord[]>>;
  acceptedPlayers: AcceptedPlayers[];
  setAcceptedPlayers: Dispatch<SetStateAction<AcceptedPlayers[]>>;
  courts: CourtType[];
  setCourts: Dispatch<SetStateAction<CourtType[]>>;
  queues: QueueType[];
  setQueues: Dispatch<SetStateAction<QueueType[]>>;
  paymentsData: HostPaymentsData;
  setPaymentsData: Dispatch<SetStateAction<HostPaymentsData>>;
  host: HostMeta | null;
  historyLoadingPlayerId: string | null;
  openPlayerHistory: (player: PlayerHistoryTarget) => void;
  closePlayerHistory: () => void;
  addFinishedMatchToPlayerHistory: (match: FinishedMatchHistoryPayload) => void;
  refreshHostData: () => Promise<void>;
};

export const useHostData = () => useOutletContext<HostOutletContext>();
