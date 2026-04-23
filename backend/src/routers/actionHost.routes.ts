import express, { Router } from "express";

import { authenticate } from "../middlewares/auth.middleware.js";
import {
  acceptPlayer,
  assignPlayerPositionCourt,
  getAvailableHosts,
  playerRequestToJoinMatch,
} from "../controllers/actionHost.controller.js";
const router: Router = express.Router();

// PUBLIC HOST

router.get("/public/hosts/available", authenticate, getAvailableHosts);
router.post(
  "/actions/request/community/:communityId/hosts/:hostId",
  authenticate,
  playerRequestToJoinMatch,
);

router.post(
  "/actions/accept/community/:communityId/hosts/:hostId/:playerId",
  authenticate,
  acceptPlayer,
);

// ASSIGN PLAYERS TO COURT & QUEUE

router.post(
  "/actions/courts/assign/:hostedPlayerId",
  authenticate,
  assignPlayerPositionCourt,
);

router.post(
  "/actions/queues/:queueId/assign/:hostedPlayerId",
  authenticate,
  assignPlayerPositionCourt,
);

export default router;
