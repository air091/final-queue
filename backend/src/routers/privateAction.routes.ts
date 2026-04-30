import express, { Router } from "express";
import { authenticate } from "../middlewares/auth.middleware.js";
import {
  acceptPlayer,
  assignPlayerToCourt,
  rejectPlayer,
} from "../controllers/privateAction.controller.js";

const router: Router = express.Router();

router.post(
  "/actions/accept/community/:communityId/hosts/:hostId/:playerId",
  authenticate,
  acceptPlayer,
);

router.post(
  "/actions/reject/community/:communityId/hosts/:hostId/:playerId",
  authenticate,
  rejectPlayer,
);

router.post(
  "/actions/courts/assign/community/:communityId/hosts/:hostId/courts/:courtId/:hostedPlayerId",
  authenticate,
  assignPlayerToCourt,
);

export default router;
