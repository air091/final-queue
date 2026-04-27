import express, { Router } from "express";

import { authenticate } from "../middlewares/auth.middleware.js";
import {
  acceptPlayer,
  assignPlayerToCourt,
  getAvailableHosts,
  playerRequestToJoinHost,
} from "../controllers/actionHost.controller.js";
const router: Router = express.Router();

// PUBLIC HOST

router.get("/public/hosts/available", authenticate, getAvailableHosts);
router.post(
  "/actions/request/community/:communityId/hosts/:hostId",
  authenticate,
  playerRequestToJoinHost,
);

router.post(
  "/actions/accept/community/:communityId/hosts/:hostId/:playerId",
  authenticate,
  acceptPlayer,
);

// ASSIGN PLAYERS TO COURT & QUEUE

router.post(
  "/actions/courts/assign/community/:communityId/hosts/:hostId/courts/:courtId/:hostedPlayerId",
  authenticate,
  assignPlayerToCourt,
);

// router.post(
//   "/actions/queues/:queueId/assign/:hostedPlayerId",
//   authenticate,
//   assignPlayerToCourt,
// );

export default router;
