import express, { Router } from "express";
import {
  acceptFriendRequest,
  deleteFriendRequest,
  getFriendRequests,
  getFriends,
  rejectFriendRequest,
  removeFriend,
  searchFriendCandidates,
  sendFriendRequest,
} from "../controllers/friend.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";

const router: Router = express.Router();

router.get("/search", authenticate, searchFriendCandidates);
router.get("/", authenticate, getFriends);
router.get("/requests", authenticate, getFriendRequests);
router.post("/requests", authenticate, sendFriendRequest);
router.patch("/requests/:requestId/accept", authenticate, acceptFriendRequest);
router.patch("/requests/:requestId/reject", authenticate, rejectFriendRequest);
router.delete("/requests/:requestId", authenticate, deleteFriendRequest);
router.delete("/:friendId", authenticate, removeFriend);

export default router;
