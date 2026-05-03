import express, { Router } from "express";
import {
  createCommunity,
  getCommunities,
  setCommunity,
  deleteCommunity,
  getCommunityById,
} from "../controllers/community.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import {
  createStaticPlayer,
  deleteHost,
  getHostById,
  getHosts,
  getHostWithPlayers,
  host,
} from "../controllers/host.controller.js";
import {
  createMatchCourt,
  createQueueCourt,
  deleteMatchCourt,
  endMatchCourt,
  getMatchCourts,
  getQueueCourts,
  renameMatchCourt,
  startMatchCourt,
} from "../controllers/court.controller.js";
import {
  getHostPayments,
  getHostPricing,
  upsertHostedPlayerPayment,
  upsertHostPricing,
} from "../controllers/payment.controller.js";

const router: Router = express.Router();

// COMMUNITY

router.post("/create", authenticate, createCommunity);
router.get("/", authenticate, getCommunities);
router.get("/:communityId", authenticate, getCommunityById);
router.patch("/:communityId", authenticate, setCommunity);
router.delete("/:communityId", authenticate, deleteCommunity);

// COMMUNITY HOST

router.post("/:communityId/host", authenticate, host);
router.get("/:communityId/hosts", authenticate, getHosts);
router.get("/:communityId/hosts/:hostId", authenticate, getHostById);
router.get(
  "/:communityId/hosts/:hostId/players",
  authenticate,
  getHostWithPlayers,
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
router.patch(
  "/:communityId/hosts/:hostId/payments/:hostedPlayerId",
  authenticate,
  upsertHostedPlayerPayment,
);

export default router;
