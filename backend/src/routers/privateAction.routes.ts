import express, { Router } from "express";
import { authenticate } from "../middlewares/auth.middleware.js";
import {
  acceptPlayer,
  assignPlayerToCourt,
  banPlayer,
  rejectPlayer,
  removePlayerFromCourt,
  unbanPlayer,
  updateStaticPlayerProfileUrl,
  updateStaticPlayerSkillLevel,
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

export default router;
