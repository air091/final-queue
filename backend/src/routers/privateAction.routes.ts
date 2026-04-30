import express, { Router } from "express";
import { authenticate } from "../middlewares/auth.middleware.js";
import {
  acceptPlayer,
  assignPlayerToCourt,
  banPlayer,
  rejectPlayer,
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
  "/courts/assign/community/:communityId/hosts/:hostId/courts/:courtId/:hostedPlayerId",
  authenticate,
  assignPlayerToCourt,
);

export default router;
