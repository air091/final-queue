import express, { Router } from "express";
import { authenticate } from "../middlewares/auth.middleware.js";
import {
  acceptPlayer,
  assignPlayerToCourt,
  banPlayer,
  rejectPlayer,
  removePlayerFromCourt,
  unbanPlayer,
} from "../controllers/privateAction.controller.js";

const router: Router = express.Router();

router.post(
  "/accept/community/:communityId/hosts/:hostId/:playerId",
  authenticate,
  acceptPlayer,
);

router.post(
  "/reject/community/:communityId/hosts/:hostId/:playerId",
  authenticate,
  rejectPlayer,
);

router.post(
  "/ban/community/:communityId/hosts/:hostId/:playerId",
  authenticate,
  banPlayer,
);

router.post(
  "/unban/community/:communityId/hosts/:hostId/:playerId",
  authenticate,
  unbanPlayer,
);

router.post(
  "/courts/assign/community/:communityId/hosts/:hostId/courts/:courtId/:hostedPlayerId",
  authenticate,
  assignPlayerToCourt,
);

router.post(
  "/courts/remove/slot/community/:communityId/hosts/:hostId/courts/:courtId/:hostedPlayerId",
  authenticate,
  removePlayerFromCourt,
);

export default router;
