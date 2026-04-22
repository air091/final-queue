import express, { Router } from "express";
import { authenticate } from "../middlewares/auth.middleware.js";
import { deleteHost, getHosts, host } from "../controllers/host.controller.js";

const router: Router = express.Router();

router.post("/community/:communityId/host", authenticate, host);
router.get("/community/:communityId/hosts", authenticate, getHosts);
router.delete("/community/:communityId/hosts", authenticate, deleteHost);

export default router;
