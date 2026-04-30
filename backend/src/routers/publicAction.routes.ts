import express, { Router } from "express";
import { authenticate } from "../middlewares/auth.middleware.js";
import {
  getAvailableHosts,
  playerRequestToJoinHost,
} from "../controllers/publicAction.controller.js";
const router: Router = express.Router();

// PUBLIC HOST

router.get("/hosts/available", authenticate, getAvailableHosts);

router.post(
  "/actions/request/community/:communityId/hosts/:hostId",
  authenticate,
  playerRequestToJoinHost,
);

export default router;
