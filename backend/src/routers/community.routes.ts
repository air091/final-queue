import express, { Router } from "express";
import {
  createCommunity,
  getCommunities,
  setCommunity,
  deleteCommunity,
} from "../controllers/community.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import {
  deleteHost,
  getAvailableHosts,
  getHosts,
  host,
} from "../controllers/host.controller.js";

const router: Router = express.Router();

// COMMUNITY

router.post("/create", authenticate, createCommunity);
router.get("/:communityId", authenticate, getCommunities);
router.patch("/:communityId", authenticate, setCommunity);
router.delete("/:communityId", authenticate, deleteCommunity);

// COMMUNITY HOST

router.post("/:communityId/host", authenticate, host);
router.get("/:communityId/hosts", authenticate, getHosts);
router.delete("/:communityId/host/:hostId", authenticate, deleteHost);

// PUBLIC HOST

router.get("/public/available", authenticate, getAvailableHosts);

export default router;
