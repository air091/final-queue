import express, { Router } from "express";
import {
  login,
  logout,
  register,
  getCurrentUser,
  refresh,
} from "../controllers/auth.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";

const router: Router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post("/logout", logout);
router.post("/refresh", authenticate, refresh);
router.get("/check-auth", authenticate, getCurrentUser);

export default router;
