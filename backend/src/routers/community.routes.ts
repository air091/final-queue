import express, { Router } from "express";
import {
  createCommunity,
  createCommunityAdminRole,
  createCommunityAdminInvite,
  createCommunityPlayerInvite,
  createCommunityStaticPlayer,
  createCommunityStaticPlayers,
  createHostStaticPlayers,
  addCommunityPlayersToHost,
  deleteCommunityPlayer,
  getCommunities,
  getAllCommunities,
  getCommunityPlayers,
  getCommunityPlayerInviteCandidates,
  getCommunityPlayerWinPoints,
  includeCommunityAdminAsPlayer,
  leaveCommunity,
  removeCommunityAdminRole,
  removeCommunityAdminAsPlayer,
  updateCommunity,
  updateCommunityPlayer,
  deleteCommunity,
  getCommunityById,
} from "../controllers/community.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import {
  createStaticPlayer,
  deleteHost,
  endHostSession,
  getHostById,
  getPlayerMatchHistory,
  getHosts,
  getHostWithPlayers,
  host,
  includeHostAsPlayer,
  removeHostAsPlayer,
  requestCommunityPlayerToJoinHost,
  startHostSession,
  updateHost,
} from "../controllers/host.controller.js";
import {
  createMatchCourt,
  createQueueCourt,
  deleteMatchCourt,
  deleteQueueCourt,
  endMatchCourt,
  getMatchCourts,
  getQueueCourts,
  pauseMatchCourt,
  renameMatchCourt,
  renameQueueCourt,
  resumeMatchCourt,
  startMatchCourt,
  transferQueueToCourtAndStart,
} from "../controllers/court.controller.js";
import {
  getHostPayments,
  getHostPricing,
  upsertPlayerPayment,
  upsertHostPricing,
} from "../controllers/payment.controller.js";

const router: Router = express.Router();

// COMMUNITY

router.post("/create", authenticate, createCommunity);
router.get("/all", authenticate, getAllCommunities);
router.get("/", authenticate, getCommunities);
router.get("/:communityId", authenticate, getCommunityById);
router.patch("/:communityId", authenticate, updateCommunity);
router.delete("/:communityId/leave", authenticate, leaveCommunity);
router.delete("/:communityId", authenticate, deleteCommunity);
router.get("/:communityId/players", authenticate, getCommunityPlayers);
router.get(
  "/:communityId/players/invite-candidates",
  authenticate,
  getCommunityPlayerInviteCandidates,
);
router.get(
  "/:communityId/players/win-points",
  authenticate,
  getCommunityPlayerWinPoints,
);
router.post(
  "/:communityId/players/invites",
  authenticate,
  createCommunityPlayerInvite,
);
router.post(
  "/:communityId/players/admin",
  authenticate,
  includeCommunityAdminAsPlayer,
);
router.delete(
  "/:communityId/players/admin",
  authenticate,
  removeCommunityAdminAsPlayer,
);
router.post(
  "/:communityId/admin-invites",
  authenticate,
  createCommunityAdminInvite,
);
router.post(
  "/:communityId/admins",
  authenticate,
  createCommunityAdminRole,
);
router.delete(
  "/:communityId/admins/:accountId",
  authenticate,
  removeCommunityAdminRole,
);
router.post("/:communityId/players/static", authenticate, createCommunityStaticPlayer);
router.post(
  "/:communityId/players/static/bulk",
  authenticate,
  createCommunityStaticPlayers,
);
router.patch(
  "/:communityId/players/:communityPlayerId",
  authenticate,
  updateCommunityPlayer,
);
router.delete(
  "/:communityId/players/:communityPlayerId",
  authenticate,
  deleteCommunityPlayer,
);

// COMMUNITY HOST

router.post("/:communityId/host", authenticate, host);
router.get("/:communityId/hosts", authenticate, getHosts);
router.get("/:communityId/hosts/:hostId", authenticate, getHostById);
router.post(
  "/:communityId/hosts/:hostId/players/request",
  authenticate,
  requestCommunityPlayerToJoinHost,
);
router.patch("/:communityId/hosts/:hostId", authenticate, updateHost);
router.patch(
  "/:communityId/hosts/:hostId/end-session",
  authenticate,
  endHostSession,
);
router.patch(
  "/:communityId/hosts/:hostId/start-session",
  authenticate,
  startHostSession,
);
router.post(
  "/:communityId/hosts/:hostId/host-player",
  authenticate,
  includeHostAsPlayer,
);
router.delete(
  "/:communityId/hosts/:hostId/host-player",
  authenticate,
  removeHostAsPlayer,
);
router.get(
  "/:communityId/hosts/:hostId/players",
  authenticate,
  getHostWithPlayers,
);
router.post(
  "/:communityId/hosts/:hostId/players/from-community",
  authenticate,
  addCommunityPlayersToHost,
);
router.post(
  "/:communityId/hosts/:hostId/players/static/bulk",
  authenticate,
  createHostStaticPlayers,
);
router.get(
  "/:communityId/hosts/:hostId/players/:playerId/history",
  authenticate,
  getPlayerMatchHistory,
);
router.post(
  "/:communityId/hosts/:hostId/players/static",
  authenticate,
  createStaticPlayer,
);
router.delete("/:communityId/host/:hostId", authenticate, deleteHost);

// COURT

router.get("/:communityId/hosts/:hostId/courts", authenticate, getMatchCourts);
router.post(
  "/:communityId/hosts/:hostId/courts/add",
  authenticate,
  createMatchCourt,
);
router.patch(
  "/:communityId/hosts/:hostId/courts/:courtId",
  authenticate,
  renameMatchCourt,
);
router.delete(
  "/:communityId/hosts/:hostId/courts/:courtId",
  authenticate,
  deleteMatchCourt,
);
router.post(
  "/:communityId/hosts/:hostId/courts/:courtId/start",
  authenticate,
  startMatchCourt,
);
router.post(
  "/:communityId/hosts/:hostId/courts/:courtId/pause",
  authenticate,
  pauseMatchCourt,
);
router.post(
  "/:communityId/hosts/:hostId/courts/:courtId/resume",
  authenticate,
  resumeMatchCourt,
);
router.post(
  "/:communityId/hosts/:hostId/courts/:courtId/end",
  authenticate,
  endMatchCourt,
);

// QUEUE

router.get("/:communityId/hosts/:hostId/queues", authenticate, getQueueCourts);
router.post(
  "/:communityId/hosts/:hostId/queues/add",
  authenticate,
  createQueueCourt,
);
router.delete(
  "/:communityId/hosts/:hostId/queues/:queueId",
  authenticate,
  deleteQueueCourt,
);
router.patch(
  "/:communityId/hosts/:hostId/queues/:queueId",
  authenticate,
  renameQueueCourt,
);
router.post(
  "/:communityId/hosts/:hostId/queues/:queueId/transfer-to-court",
  authenticate,
  transferQueueToCourtAndStart,
);

// PAYMENTS

router.get(
  "/:communityId/hosts/:hostId/payments",
  authenticate,
  getHostPayments,
);
router.get(
  "/:communityId/hosts/:hostId/payments/pricing",
  authenticate,
  getHostPricing,
);
router.patch(
  "/:communityId/hosts/:hostId/payments/pricing",
  authenticate,
  upsertHostPricing,
);
router.post(
  "/:communityId/hosts/:hostId/players/:playerId/payment",
  authenticate,
  upsertPlayerPayment,
);

export default router;
