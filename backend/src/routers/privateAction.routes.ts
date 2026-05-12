import express, { Router } from "express";
import { authenticate } from "../middlewares/auth.middleware.js";
import {
  acceptPlayer,
  assignPlayerToCourt,
  banPlayer,
  rejectPlayer,
  removePlayerFromCourt,
  unbanPlayer,
  updateStaticPlayerName,
  updateStaticPlayerProfileUrl,
  updateStaticPlayerSkillLevel,
  assignPlayerToQueue,
  removePlayerFromQueue,
} from "../controllers/privateAction.controller.js";

// updateStaticPlayerProfileUrl,
//   updateStaticPlayerSkillLevel,

const router: Router = express.Router();

router.post(
  "/accept/community/:communityId/hosts/:hostId/players/:playerId",
  authenticate,
  acceptPlayer,
);

router.post(
  "/reject/community/:communityId/hosts/:hostId/players/:playerId",
  authenticate,
  rejectPlayer,
);

router.post(
  "/ban/community/:communityId/hosts/:hostId/players/:playerId",
  authenticate,
  banPlayer,
);

router.post(
  "/unban/community/:communityId/hosts/:hostId/players/:playerId",
  authenticate,
  unbanPlayer,
);

router.patch(
  "/static/community/:communityId/hosts/:hostId/:hostedPlayerId/skill-level",
  authenticate,
  updateStaticPlayerSkillLevel,
);

router.patch(
  "/static/community/:communityId/hosts/:hostId/:hostedPlayerId/profile-url",
  authenticate,
  updateStaticPlayerProfileUrl,
);

router.patch(
  "/static/community/:communityId/hosts/:hostId/:hostedPlayerId/name",
  authenticate,
  updateStaticPlayerName,
);

router.post(
  "/courts/assign/community/:communityId/hosts/:hostId/courts/:courtId/players/:playerId",
  authenticate,
  assignPlayerToCourt,
);

router.post(
  "/courts/remove/slot/community/:communityId/hosts/:hostId/courts/:courtId/players/:playerId",
  authenticate,
  removePlayerFromCourt,
);

router.post(
  "/queues/assign/community/:communityId/hosts/:hostId/queues/:queueId/players/:playerId",
  authenticate,
  assignPlayerToQueue,
);

router.post(
  "/queues/remove/slot/community/:communityId/hosts/:hostId/queues/:queueId/players/:playerId",
  authenticate,
  removePlayerFromQueue,
);

export default router;
