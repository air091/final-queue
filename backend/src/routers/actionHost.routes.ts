import express, { Router } from "express";

import { authenticate } from "../middlewares/auth.middleware.js";
import {
  acceptPlayer,
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
  "/actions/accept/community/:communityId/hosts/:hostId",
  authenticate,
  acceptPlayer,
);

export default router;
