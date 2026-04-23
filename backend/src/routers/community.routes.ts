import express, { Router } from "express";
import {
  createCommunity,
  getCommunities,
  setCommunity,
  deleteCommunity,
} from "../controllers/community.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { deleteHost, getHosts, host } from "../controllers/host.controller.js";

const router: Router = express.Router();

// COMMUNITY

router.post("/create", authenticate, createCommunity);
router.get("/", authenticate, getCommunities);
router.patch("/:communityId", authenticate, setCommunity);
router.delete("/:communityId", authenticate, deleteCommunity);

// COMMUNITY HOST

router.post("/:communityId/host", authenticate, host);
router.get("/:communityId/hosts", authenticate, getHosts);
router.delete("/:communityId/host/:hostId", authenticate, deleteHost);

export default router;
