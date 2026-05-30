import express, { Router } from "express";
import {
  acceptNotification,
  getNotifications,
  rejectNotification,
} from "../controllers/notification.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";

const router: Router = express.Router();

router.get("/", authenticate, getNotifications);
router.patch("/:notificationId/accept", authenticate, acceptNotification);
router.patch("/:notificationId/reject", authenticate, rejectNotification);

export default router;
