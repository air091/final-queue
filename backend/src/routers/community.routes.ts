import express, { Router } from "express";
import {
  createCommunity,
  getCommunities,
  setCommunity,
  deleteCommunity,
} from "../controllers/community.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";

const router: Router = express.Router();

router.post("/create", authenticate, createCommunity);
router.get("/", authenticate, getCommunities);
router.patch("/:communityId", authenticate, setCommunity);
router.delete("/:communityId", authenticate, deleteCommunity);

export default router;
