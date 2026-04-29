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
  getMatchCourts,
  getQueueCourts,
} from "../controllers/court.controller.js";

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
router.delete("/:communityId/host/:hostId", authenticate, deleteHost);

// COURT

router.get("/:communityId/hosts/:hostId/courts", authenticate, getMatchCourts);
router.post(
  "/:communityId/hosts/:hostId/courts/add",
  authenticate,
  createMatchCourt,
);
router.delete(
  "/:communityId/hosts/:hostId/courts/:courtId",
  authenticate,
  deleteMatchCourt,
);

// QUEUE

router.get("/:communityId/hosts/:hostId/queues", authenticate, getQueueCourts);
router.post(
  "/:communityId/hosts/:hostId/queues/add",
  authenticate,
  createQueueCourt,
);

export default router;
